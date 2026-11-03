import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  HttpException,
  NotFoundException,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  Res,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import { Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import { Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { z } from 'zod';
import {
  deleteSchoolLogoObject,
  maxSchoolLogoBytes,
  mediaProvider,
  objectRequest,
  openObjectStream,
  validSchoolLogoKey,
  validateSchoolLogoUpload,
} from './announcement-media';
import { PlatformService } from './platform.service';
import {
  commitStagedLogo,
  discardStagedLogo,
  recordStagedLogo,
  releaseRetiredLogo,
  retireLogoKey,
} from './school-logo-lifecycle';
import { PublicFormProtectionService } from './public-form-protection.service';
import {
  DEFAULT_SCHOOL_THEME_DOCUMENT,
  applySchoolThemePatch,
  authenticatedSchoolLogoUrl,
  cloneThemeDocument,
  formatAuthenticatedSchoolBranding,
  formatPublicSchoolBranding,
  parseAndValidateImportedTheme,
  parseExpectedThemeVersion,
  publicSchoolLogoUrl,
  readStoredSchoolTheme,
  resolveParentSchoolIdentity,
  resolveSchoolByPublicSlug,
  resolveThemeRuntimeContract,
  schoolLogoVersion,
  validateNullableSchoolSlug,
  validateSchoolThemeDocument,
} from './school-branding';
import { digest } from './security';

const uuid = z.string().uuid();
const staffReaders: Role[] = ['HEADMASTER', 'REGISTRAR', 'ACADEMIC', 'TEACHER', 'BURSAR'];
const brandingManagers: Role[] = ['HEADMASTER'];

const parse = <S extends z.ZodTypeAny>(schema: S, value: unknown): z.output<S> => {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw new BadRequestException(result.error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`).join('; '));
  }
  return result.data;
};

const slugPatchSchema = z.object({
  slug: z.unknown(),
}).strict();

const logoQuerySchema = z.object({
  v: z.string().regex(/^[a-f0-9]{8,64}$/).optional(),
}).strict();

const logoUploadQuerySchema = z.object({
  stage: z.enum(['true', 'false']).optional(),
  expectedThemeVersion: z.coerce.number().int().min(0).optional(),
}).strict();

const exportQuerySchema = z.object({
  target: z.enum(['published', 'draft']).default('published'),
}).strict();

const publishBodySchema = z.object({
  theme: z.unknown().optional(),
  expectedThemeVersion: z.number().int().min(0).optional(),
  stagedLogoKey: z.string().optional(),
}).strict();

const lifecycleVersionBodySchema = z.object({
  expectedThemeVersion: z.number().int().min(0).optional(),
}).strict();

const schoolBrandingSelect = {
  id: true,
  name: true,
  code: true,
  slug: true,
  active: true,
  logoStorageKey: true,
  publishedTheme: true,
  draftTheme: true,
  previousPublishedTheme: true,
  themeVersion: true,
} as const;

@Controller('api/v1')
export class SchoolBrandingController {
  constructor(
    private readonly svc: PlatformService,
    private readonly publicForms: PublicFormProtectionService,
  ) {}

  @Get('public/schools/:slug/branding')
  async getPublicBranding(
    @Req() req: Request,
    @Param('slug') slug: string,
    @Res() res: Response,
  ) {
    return this.servePublicBranding(req, slug, res);
  }

  @Get('public/schools/:slug/theme')
  async getPublicTheme(
    @Req() req: Request,
    @Param('slug') slug: string,
    @Res() res: Response,
  ) {
    return this.servePublicBranding(req, slug, res);
  }

  private async servePublicBranding(
    req: Request,
    slug: string,
    res: Response,
  ) {
    this.publicForms.checkPublicReadRate(req.ip ?? req.socket.remoteAddress ?? 'unknown', 'public-branding');
    const school = await resolveSchoolByPublicSlug(this.svc.db, slug);
    const payload = formatPublicSchoolBranding(school);
    const etag = `"${digest(JSON.stringify(payload)).slice(0, 16)}"`;
    res.setHeader('ETag', etag);
    res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=30');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    if (req.get('if-none-match') === etag) {
      return res.status(304).end();
    }
    return res.status(200).json(payload);
  }

  @Get('public/schools/:slug/logo')
  async getPublicLogo(
    @Req() req: Request,
    @Param('slug') slug: string,
    @Query() query: unknown,
    @Res() res: Response,
  ) {
    this.publicForms.checkPublicReadRate(req.ip ?? req.socket.remoteAddress ?? 'unknown', 'public-logo');
    const q = parse(logoQuerySchema, query ?? {});
    const school = await resolveSchoolByPublicSlug(this.svc.db, slug);
    if (!school.logoStorageKey) {
      throw new NotFoundException('School logo is unavailable.');
    }
    const version = schoolLogoVersion(school.logoStorageKey)!;
    const etag = `"${version}"`;
    const cacheControl = q.v === version
      ? 'public, max-age=86400, immutable'
      : 'public, max-age=3600, must-revalidate';
    res.setHeader('ETag', etag);
    res.setHeader('Cache-Control', cacheControl);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    if (req.get('if-none-match') === etag) {
      return res.status(304).end();
    }
    let streamResult: Awaited<ReturnType<typeof openObjectStream>>;
    try {
      streamResult = await openObjectStream(school.logoStorageKey, mediaProvider());
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw new NotFoundException('School logo is unavailable.');
      }
      if (error instanceof HttpException && error.getStatus() < 500) {
        throw new NotFoundException('School logo is unavailable.');
      }
      throw new ServiceUnavailableException('School logo storage is unavailable.');
    }
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Disposition', 'inline; filename="school-logo.png"');
    if (streamResult.byteSize !== undefined) {
      res.setHeader('Content-Length', streamResult.byteSize);
    }
    let received = 0;
    const limit = new Transform({
      transform(chunk, _encoding, callback) {
        received += chunk.length;
        callback(received > maxSchoolLogoBytes ? new Error('Stored logo exceeds size limit') : null, chunk);
      },
    });
    try {
      await pipeline(streamResult.stream, limit, res);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ERR_STREAM_PREMATURE_CLOSE') {
        console.error(JSON.stringify({ event: 'school_logo_stream_failed' }));
      }
      res.destroy();
    }
  }

  @Get('schools/:schoolId/branding')
  async getSchoolBranding(
    @Req() req: Request,
    @Param('schoolId') schoolIdParam: string,
  ) {
    return this.readSchoolThemeState(req, schoolIdParam);
  }

  @Get('schools/:schoolId/theme')
  async getSchoolTheme(
    @Req() req: Request,
    @Param('schoolId') schoolIdParam: string,
  ) {
    return this.readSchoolThemeState(req, schoolIdParam);
  }

  private async readSchoolThemeState(req: Request, schoolIdParam: string) {
    const id = parse(uuid, schoolIdParam);
    const { user, memberships } = await this.svc.authorize(req, id, staffReaders);
    const isManager = user.platformAdmin || memberships.some(m => m.role === 'HEADMASTER');
    const school = await this.svc.db.school.findUnique({
      where: { id },
      select: schoolBrandingSelect,
    });
    if (!school) throw new NotFoundException('School not found.');
    // Non-managers receive published branding only; the serializer drops every
    // draft and previous-version input so nothing unpublished can be derived.
    return formatAuthenticatedSchoolBranding(school, { includeDraft: isManager });
  }

  @Get('schools/:schoolId/theme/parent-identity')
  async getParentSchoolIdentity(
    @Req() req: Request,
    @Param('schoolId') schoolIdParam: string,
  ) {
    const id = parse(uuid, schoolIdParam);
    await this.svc.authorize(req, id);
    const school = await this.svc.db.school.findUnique({
      where: { id },
      select: { id: true, name: true, slug: true, logoStorageKey: true },
    });
    if (!school) throw new NotFoundException('School not found.');
    return resolveParentSchoolIdentity(school);
  }

  @Get('schools/:schoolId/branding/logo')
  async getAuthenticatedSchoolLogo(
    @Req() req: Request,
    @Param('schoolId') schoolIdParam: string,
    @Query() query: unknown,
    @Res() res: Response,
  ) {
    const id = parse(uuid, schoolIdParam);
    await this.svc.authorize(req, id);
    const q = parse(logoQuerySchema, query ?? {});
    const school = await this.svc.db.school.findUnique({
      where: { id },
      select: { id: true, active: true, logoStorageKey: true },
    });
    if (!school || !school.active || !school.logoStorageKey) {
      throw new NotFoundException('School logo is unavailable.');
    }
    const version = schoolLogoVersion(school.logoStorageKey)!;
    const etag = `"${version}"`;
    const cacheControl = q.v === version
      ? 'private, max-age=86400, immutable'
      : 'private, max-age=3600, must-revalidate';
    res.setHeader('ETag', etag);
    res.setHeader('Cache-Control', cacheControl);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    if (req.get('if-none-match') === etag) {
      return res.status(304).end();
    }
    let streamResult: Awaited<ReturnType<typeof openObjectStream>>;
    try {
      streamResult = await openObjectStream(school.logoStorageKey, mediaProvider());
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw new NotFoundException('School logo is unavailable.');
      }
      if (error instanceof HttpException && error.getStatus() < 500) {
        throw new NotFoundException('School logo is unavailable.');
      }
      throw new ServiceUnavailableException('School logo storage is unavailable.');
    }
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Disposition', 'inline; filename="school-logo.png"');
    if (streamResult.byteSize !== undefined) {
      res.setHeader('Content-Length', streamResult.byteSize);
    }
    let received = 0;
    const limit = new Transform({
      transform(chunk, _encoding, callback) {
        received += chunk.length;
        callback(received > maxSchoolLogoBytes ? new Error('Stored logo exceeds size limit') : null, chunk);
      },
    });
    try {
      await pipeline(streamResult.stream, limit, res);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ERR_STREAM_PREMATURE_CLOSE') {
        console.error(JSON.stringify({ event: 'school_logo_stream_failed' }));
      }
      res.destroy();
    }
  }

  @Patch('schools/:schoolId/branding')
  async updateSchoolBranding(
    @Req() req: Request,
    @Param('schoolId') schoolIdParam: string,
    @Body() body: unknown,
  ) {
    const id = parse(uuid, schoolIdParam);
    const { user } = await this.svc.authorize(req, id, brandingManagers);
    await this.svc.rate(`school-theme-write:${user.id}`, 120, 3600);
    this.rejectSlugInBrandingPayload(body, user.platformAdmin);

    const expectedThemeVersion = this.extractExpectedVersion(req, body);
    const stagedLogoKey = this.extractStagedLogoKey(body, id);
    const provider = mediaProvider();

    if (stagedLogoKey) {
      try {
        const check = await openObjectStream(stagedLogoKey, provider);
        check.stream.destroy();
      } catch {
        throw new BadRequestException('Staged school logo is unavailable. Re-upload the logo and try again.');
      }
    }

    try {
      const { result, retiredLogoKey } = await this.svc.atomic(async tx => {
        const prior = await tx.school.findUnique({
          where: { id },
          select: schoolBrandingSelect,
        });
        if (!prior) throw new NotFoundException('School not found.');
        this.assertThemeVersionMatch(prior.themeVersion, expectedThemeVersion);

        const priorPublished = readStoredSchoolTheme(prior.publishedTheme);
        const nextTheme = applySchoolThemePatch(priorPublished, body);
        const nextVersion = prior.themeVersion + 1;
        const storedNext: Prisma.InputJsonValue = {
          ...nextTheme,
          updatedAt: new Date().toISOString(),
          updatedBy: user.id,
          revision: nextVersion,
        } as unknown as Prisma.InputJsonValue;

        let retiredLogoKey: string | null = null;
        if (stagedLogoKey) {
          // Only a live, unexpired staged upload of this school can be committed. The
          // active logo key, committed keys, and other schools' keys are all rejected.
          await commitStagedLogo(tx, id, stagedLogoKey);
          if (prior.logoStorageKey && prior.logoStorageKey !== stagedLogoKey) {
            await retireLogoKey(tx, id, prior.logoStorageKey);
            retiredLogoKey = prior.logoStorageKey;
          }
        }

        const updated = await tx.school.update({
          where: { id },
          data: {
            publishedTheme: storedNext,
            previousPublishedTheme: priorPublished
              ? (prior.publishedTheme as Prisma.InputJsonValue)
              : Prisma.DbNull,
            draftTheme: Prisma.DbNull,
            themeVersion: nextVersion,
            ...(stagedLogoKey ? { logoStorageKey: stagedLogoKey } : {}),
          },
          select: schoolBrandingSelect,
        });

        if (stagedLogoKey) {
          await tx.auditEvent.create({
            data: {
              actorId: user.id,
              schoolId: id,
              action: 'SCHOOL_LOGO_REPLACED',
              target: prior.logoStorageKey ? 'replaced' : 'initial',
            },
          });
        }

        const priorPrimary = priorPublished?.tokens.colors.primary ?? null;
        const nextPrimary = nextTheme.tokens.colors.primary;
        if (priorPrimary !== nextPrimary) {
          await tx.auditEvent.create({
            data: {
              actorId: user.id,
              schoolId: id,
              action: 'SCHOOL_PRIMARY_COLOR_UPDATED',
              target: `${priorPrimary ?? 'default'} -> ${nextPrimary}`,
            },
          });
        }

        const priorWelcome = priorPublished?.welcomeMessage ?? null;
        const nextWelcome = nextTheme.welcomeMessage;
        if (priorWelcome !== nextWelcome) {
          await tx.auditEvent.create({
            data: {
              actorId: user.id,
              schoolId: id,
              action: 'SCHOOL_WELCOME_MESSAGE_UPDATED',
              target: nextWelcome ? 'updated' : 'cleared',
            },
          });
        }

        await tx.auditEvent.create({
          data: {
            actorId: user.id,
            schoolId: id,
            action: 'SCHOOL_THEME_PUBLISHED',
            target: `v${nextVersion}`,
          },
        });

        return { result: formatAuthenticatedSchoolBranding(updated), retiredLogoKey };
      });

      await releaseRetiredLogo(this.svc.db, id, retiredLogoKey);
      return result;
    } catch (error) {
      // A failed publish (including a 409 version conflict) rolls the commit claim back,
      // so the staged object stays STAGED and retryable until it expires. It is never
      // deleted here, and the active logo is never touched on an error path.
      throw error;
    }
  }

  @Patch('schools/:schoolId/theme/draft')
  async updateSchoolThemeDraft(
    @Req() req: Request,
    @Param('schoolId') schoolIdParam: string,
    @Body() body: unknown,
  ) {
    return this.saveDraftTheme(req, schoolIdParam, body);
  }

  @Patch('schools/:schoolId/branding/draft')
  async updateSchoolBrandingDraft(
    @Req() req: Request,
    @Param('schoolId') schoolIdParam: string,
    @Body() body: unknown,
  ) {
    return this.saveDraftTheme(req, schoolIdParam, body);
  }

  private async saveDraftTheme(
    req: Request,
    schoolIdParam: string,
    body: unknown,
  ) {
    const id = parse(uuid, schoolIdParam);
    const { user } = await this.svc.authorize(req, id, brandingManagers);
    await this.svc.rate(`school-theme-write:${user.id}`, 120, 3600);
    this.rejectSlugInBrandingPayload(body, user.platformAdmin);
    const expectedThemeVersion = this.extractExpectedVersion(req, body);

    return this.svc.atomic(async tx => {
      const prior = await tx.school.findUnique({
        where: { id },
        select: schoolBrandingSelect,
      });
      if (!prior) throw new NotFoundException('School not found.');
      this.assertThemeVersionMatch(prior.themeVersion, expectedThemeVersion);

      const baseTheme =
        readStoredSchoolTheme(prior.draftTheme) ??
        readStoredSchoolTheme(prior.publishedTheme) ??
        DEFAULT_SCHOOL_THEME_DOCUMENT;
      const nextDraft = applySchoolThemePatch(baseTheme, body);
      const storedDraft: Prisma.InputJsonValue = {
        ...nextDraft,
        updatedAt: new Date().toISOString(),
        updatedBy: user.id,
      } as unknown as Prisma.InputJsonValue;

      const updated = await tx.school.update({
        where: { id },
        data: { draftTheme: storedDraft },
        select: schoolBrandingSelect,
      });

      await tx.auditEvent.create({
        data: {
          actorId: user.id,
          schoolId: id,
          action: 'SCHOOL_THEME_DRAFT_SAVED',
          target: `v${prior.themeVersion}:draft`,
        },
      });

      return formatAuthenticatedSchoolBranding(updated);
    });
  }

  @Get('schools/:schoolId/theme/preview')
  async previewSchoolTheme(
    @Req() req: Request,
    @Param('schoolId') schoolIdParam: string,
  ) {
    return this.readThemePreview(req, schoolIdParam);
  }

  @Get('schools/:schoolId/branding/preview')
  async previewSchoolBranding(
    @Req() req: Request,
    @Param('schoolId') schoolIdParam: string,
  ) {
    return this.readThemePreview(req, schoolIdParam);
  }

  private async readThemePreview(
    req: Request,
    schoolIdParam: string,
  ) {
    const id = parse(uuid, schoolIdParam);
    await this.svc.authorize(req, id, brandingManagers);
    const school = await this.svc.db.school.findUnique({
      where: { id },
      select: schoolBrandingSelect,
    });
    if (!school) throw new NotFoundException('School not found.');
    const draft = readStoredSchoolTheme(school.draftTheme);
    const published = readStoredSchoolTheme(school.publishedTheme);
    const activeTheme = draft ?? published ?? DEFAULT_SCHOOL_THEME_DOCUMENT;
    const source = draft ? 'draft' : published ? 'published' : 'default';
    const runtime = resolveThemeRuntimeContract(activeTheme);
    return {
      schoolId: school.id,
      name: school.name,
      slug: school.slug,
      logoUrl:
        publicSchoolLogoUrl(school.slug, school.logoStorageKey) ??
        authenticatedSchoolLogoUrl(school.id, school.logoStorageKey),
      source,
      themeVersion: school.themeVersion,
      theme: activeTheme,
      cssVariables: runtime.cssVariables,
      colorContract: runtime.colorContract,
      accessibility: runtime.accessibility,
      applicationPolicy: runtime.applicationPolicy,
    };
  }

  @Post('schools/:schoolId/theme/validate')
  @HttpCode(200)
  async validateSchoolTheme(
    @Req() req: Request,
    @Param('schoolId') schoolIdParam: string,
    @Body() body: unknown,
  ) {
    return this.validateThemePayload(req, schoolIdParam, body);
  }

  @Post('schools/:schoolId/branding/validate')
  @HttpCode(200)
  async validateSchoolBranding(
    @Req() req: Request,
    @Param('schoolId') schoolIdParam: string,
    @Body() body: unknown,
  ) {
    return this.validateThemePayload(req, schoolIdParam, body);
  }

  private async validateThemePayload(
    req: Request,
    schoolIdParam: string,
    body: unknown,
  ) {
    const id = parse(uuid, schoolIdParam);
    const { user } = await this.svc.authorize(req, id, brandingManagers);
    await this.svc.rate(`school-theme-validate:${user.id}`, 180, 3600);
    this.rejectSlugInBrandingPayload(body, user.platformAdmin);
    const validated = parseAndValidateImportedTheme(body);
    const runtime = resolveThemeRuntimeContract(validated);
    return {
      valid: true,
      theme: validated,
      cssVariables: runtime.cssVariables,
      colorContract: runtime.colorContract,
      accessibility: runtime.accessibility,
      applicationPolicy: runtime.applicationPolicy,
    };
  }

  @Post('schools/:schoolId/theme/import')
  @HttpCode(200)
  async importSchoolTheme(
    @Req() req: Request,
    @Param('schoolId') schoolIdParam: string,
    @Body() body: unknown,
  ) {
    const id = parse(uuid, schoolIdParam);
    const { user } = await this.svc.authorize(req, id, brandingManagers);
    await this.svc.rate(`school-theme-write:${user.id}`, 120, 3600);
    this.rejectSlugInBrandingPayload(body, user.platformAdmin);
    const expectedThemeVersion = this.extractExpectedVersion(req, body);

    return this.svc.atomic(async tx => {
      const prior = await tx.school.findUnique({
        where: { id },
        select: schoolBrandingSelect,
      });
      if (!prior) throw new NotFoundException('School not found.');
      this.assertThemeVersionMatch(prior.themeVersion, expectedThemeVersion);
      const baseTheme =
        readStoredSchoolTheme(prior.draftTheme) ??
        readStoredSchoolTheme(prior.publishedTheme) ??
        DEFAULT_SCHOOL_THEME_DOCUMENT;
      const imported = parseAndValidateImportedTheme(body, baseTheme);
      const storedDraft: Prisma.InputJsonValue = {
        ...imported,
        updatedAt: new Date().toISOString(),
        updatedBy: user.id,
      } as unknown as Prisma.InputJsonValue;

      const updated = await tx.school.update({
        where: { id },
        data: { draftTheme: storedDraft },
        select: schoolBrandingSelect,
      });

      await tx.auditEvent.create({
        data: {
          actorId: user.id,
          schoolId: id,
          action: 'SCHOOL_THEME_IMPORTED',
          target: `schema:v${imported.schemaVersion}`,
        },
      });

      return formatAuthenticatedSchoolBranding(updated);
    });
  }

  @Get('schools/:schoolId/theme/export')
  async exportSchoolTheme(
    @Req() req: Request,
    @Param('schoolId') schoolIdParam: string,
    @Query() query: unknown,
  ) {
    const id = parse(uuid, schoolIdParam);
    await this.svc.authorize(req, id, brandingManagers);
    const q = parse(exportQuerySchema, query ?? {});
    const school = await this.svc.db.school.findUnique({
      where: { id },
      select: schoolBrandingSelect,
    });
    if (!school) throw new NotFoundException('School not found.');
    const selected = q.target === 'draft'
      ? readStoredSchoolTheme(school.draftTheme) ?? readStoredSchoolTheme(school.publishedTheme) ?? DEFAULT_SCHOOL_THEME_DOCUMENT
      : readStoredSchoolTheme(school.publishedTheme) ?? DEFAULT_SCHOOL_THEME_DOCUMENT;
    return cloneThemeDocument(selected);
  }

  @Post('schools/:schoolId/theme/publish')
  @HttpCode(200)
  async publishSchoolTheme(
    @Req() req: Request,
    @Param('schoolId') schoolIdParam: string,
    @Body() body: unknown,
  ) {
    return this.executeThemePublish(req, schoolIdParam, body);
  }

  @Post('schools/:schoolId/branding/publish')
  @HttpCode(200)
  async publishSchoolBranding(
    @Req() req: Request,
    @Param('schoolId') schoolIdParam: string,
    @Body() body: unknown,
  ) {
    return this.executeThemePublish(req, schoolIdParam, body);
  }

  private async executeThemePublish(
    req: Request,
    schoolIdParam: string,
    body: unknown,
  ) {
    const id = parse(uuid, schoolIdParam);
    const { user } = await this.svc.authorize(req, id, brandingManagers);
    await this.svc.rate(`school-theme-write:${user.id}`, 120, 3600);
    const parsedBody = parse(publishBodySchema, body ?? {});
    const expectedThemeVersion = parsedBody.expectedThemeVersion ?? this.extractExpectedVersion(req, undefined);
    const stagedLogoKey = parsedBody.stagedLogoKey
      ? this.extractStagedLogoKey({ stagedLogoKey: parsedBody.stagedLogoKey }, id)
      : null;
    const provider = mediaProvider();

    if (stagedLogoKey) {
      try {
        const check = await openObjectStream(stagedLogoKey, provider);
        check.stream.destroy();
      } catch {
        throw new BadRequestException('Staged school logo is unavailable. Re-upload the logo and try again.');
      }
    }

    try {
      const { result, retiredLogoKey } = await this.svc.atomic(async tx => {
        const prior = await tx.school.findUnique({
          where: { id },
          select: schoolBrandingSelect,
        });
        if (!prior) throw new NotFoundException('School not found.');
        this.assertThemeVersionMatch(prior.themeVersion, expectedThemeVersion);

        const candidate = parsedBody.theme !== undefined
          ? validateSchoolThemeDocument(parsedBody.theme)
          : readStoredSchoolTheme(prior.draftTheme);

        if (!candidate) {
          throw new BadRequestException('No draft theme is available to publish.');
        }

        let retiredLogoKey: string | null = null;
        if (stagedLogoKey) {
          await commitStagedLogo(tx, id, stagedLogoKey);
          if (prior.logoStorageKey && prior.logoStorageKey !== stagedLogoKey) {
            await retireLogoKey(tx, id, prior.logoStorageKey);
            retiredLogoKey = prior.logoStorageKey;
          }
        }

        const priorPublished = readStoredSchoolTheme(prior.publishedTheme);
        const nextVersion = prior.themeVersion + 1;
        const storedPublished: Prisma.InputJsonValue = {
          ...candidate,
          updatedAt: new Date().toISOString(),
          updatedBy: user.id,
          revision: nextVersion,
        } as unknown as Prisma.InputJsonValue;

        const updated = await tx.school.update({
          where: { id },
          data: {
            publishedTheme: storedPublished,
            previousPublishedTheme: priorPublished
              ? (prior.publishedTheme as Prisma.InputJsonValue)
              : Prisma.DbNull,
            draftTheme: Prisma.DbNull,
            themeVersion: nextVersion,
            ...(stagedLogoKey ? { logoStorageKey: stagedLogoKey } : {}),
          },
          select: schoolBrandingSelect,
        });

        if (stagedLogoKey) {
          await tx.auditEvent.create({
            data: {
              actorId: user.id,
              schoolId: id,
              action: 'SCHOOL_LOGO_REPLACED',
              target: prior.logoStorageKey ? 'replaced' : 'initial',
            },
          });
        }

        await tx.auditEvent.create({
          data: {
            actorId: user.id,
            schoolId: id,
            action: 'SCHOOL_THEME_PUBLISHED',
            target: `v${nextVersion}`,
          },
        });

        return { result: formatAuthenticatedSchoolBranding(updated), retiredLogoKey };
      });

      await releaseRetiredLogo(this.svc.db, id, retiredLogoKey);
      return result;
    } catch (error) {
      // See updateSchoolBranding: staged objects are retained for retry and expire on their own.
      throw error;
    }
  }

  @Post('schools/:schoolId/theme/reset')
  @HttpCode(200)
  async resetSchoolTheme(
    @Req() req: Request,
    @Param('schoolId') schoolIdParam: string,
    @Body() body?: unknown,
  ) {
    return this.executeBrandingReset(req, schoolIdParam, body);
  }

  @Post('schools/:schoolId/branding/reset')
  @HttpCode(200)
  async resetSchoolBranding(
    @Req() req: Request,
    @Param('schoolId') schoolIdParam: string,
    @Body() body?: unknown,
  ) {
    return this.executeBrandingReset(req, schoolIdParam, body);
  }

  private async executeBrandingReset(
    req: Request,
    schoolIdParam: string,
    body?: unknown,
  ) {
    const id = parse(uuid, schoolIdParam);
    const { user } = await this.svc.authorize(req, id, brandingManagers);
    await this.svc.rate(`school-theme-write:${user.id}`, 120, 3600);
    const parsedBody = parse(lifecycleVersionBodySchema, body ?? {});
    const expectedThemeVersion = parsedBody.expectedThemeVersion ?? this.extractExpectedVersion(req, undefined);
    const { updated, retiredLogoKey } = await this.svc.atomic(async tx => {
      const prior = await tx.school.findUnique({
        where: { id },
        select: schoolBrandingSelect,
      });
      if (!prior) throw new NotFoundException('School not found.');
      this.assertThemeVersionMatch(prior.themeVersion, expectedThemeVersion);

      const priorPublished = readStoredSchoolTheme(prior.publishedTheme);
      const nextVersion = prior.themeVersion + 1;
      const previousLogoKey = prior.logoStorageKey;
      if (previousLogoKey) await retireLogoKey(tx, id, previousLogoKey);

      const school = await tx.school.update({
        where: { id },
        data: {
          publishedTheme: Prisma.DbNull,
          draftTheme: Prisma.DbNull,
          previousPublishedTheme: priorPublished
            ? (prior.publishedTheme as Prisma.InputJsonValue)
            : Prisma.DbNull,
          logoStorageKey: null,
          themeVersion: nextVersion,
        },
        select: schoolBrandingSelect,
      });

      if (previousLogoKey) {
        await tx.auditEvent.create({
          data: {
            actorId: user.id,
            schoolId: id,
            action: 'SCHOOL_LOGO_REMOVED',
            target: 'reset',
          },
        });
      }

      await tx.auditEvent.create({
        data: {
          actorId: user.id,
          schoolId: id,
          action: 'SCHOOL_BRANDING_RESET',
          target: `v${nextVersion}:default`,
        },
      });

      return { updated: school, retiredLogoKey: previousLogoKey };
    });

    await releaseRetiredLogo(this.svc.db, id, retiredLogoKey);

    return formatAuthenticatedSchoolBranding(updated);
  }

  @Post('schools/:schoolId/theme/rollback')
  @HttpCode(200)
  async rollbackSchoolTheme(
    @Req() req: Request,
    @Param('schoolId') schoolIdParam: string,
    @Body() body?: unknown,
  ) {
    const id = parse(uuid, schoolIdParam);
    const { user } = await this.svc.authorize(req, id, brandingManagers);
    await this.svc.rate(`school-theme-write:${user.id}`, 120, 3600);
    const parsedBody = parse(lifecycleVersionBodySchema, body ?? {});
    const expectedThemeVersion = parsedBody.expectedThemeVersion ?? this.extractExpectedVersion(req, undefined);

    return this.svc.atomic(async tx => {
      const prior = await tx.school.findUnique({
        where: { id },
        select: schoolBrandingSelect,
      });
      if (!prior) throw new NotFoundException('School not found.');
      this.assertThemeVersionMatch(prior.themeVersion, expectedThemeVersion);

      const previousPublished = readStoredSchoolTheme(prior.previousPublishedTheme);
      if (!previousPublished) {
        throw new BadRequestException('No previous published theme version is available for rollback.');
      }

      const nextVersion = prior.themeVersion + 1;
      const restoredPublished: Prisma.InputJsonValue = {
        ...previousPublished,
        updatedAt: new Date().toISOString(),
        updatedBy: user.id,
        revision: nextVersion,
      } as unknown as Prisma.InputJsonValue;

      const updated = await tx.school.update({
        where: { id },
        data: {
          publishedTheme: restoredPublished,
          previousPublishedTheme: Prisma.DbNull,
          themeVersion: nextVersion,
        },
        select: schoolBrandingSelect,
      });

      await tx.auditEvent.create({
        data: {
          actorId: user.id,
          schoolId: id,
          action: 'SCHOOL_THEME_ROLLED_BACK',
          target: `v${prior.themeVersion} -> v${nextVersion}`,
        },
      });

      return formatAuthenticatedSchoolBranding(updated);
    });
  }

  @Put('schools/:schoolId/branding/logo')
  async uploadSchoolLogo(
    @Req() req: Request,
    @Param('schoolId') schoolIdParam: string,
    @Query() query: unknown,
    @Body() body: unknown,
  ) {
    const id = parse(uuid, schoolIdParam);
    const { user } = await this.svc.authorize(req, id, brandingManagers);
    await this.svc.rate(`school-logo:${user.id}`, 30, 3600);
    const q = parse(logoUploadQuerySchema, query ?? {});
    const expectedThemeVersion = q.expectedThemeVersion ?? this.extractExpectedVersion(req, undefined);
    const contentType = req.get('content-type') ?? '';
    if (!Buffer.isBuffer(body)) {
      throw new BadRequestException('A valid SVG, PNG, or WebP school logo up to 2 MB is required.');
    }

    if (expectedThemeVersion !== undefined) {
      const current = await this.svc.db.school.findUnique({
        where: { id },
        select: { id: true, themeVersion: true },
      });
      if (!current) throw new NotFoundException('School not found.');
      this.assertThemeVersionMatch(current.themeVersion, expectedThemeVersion);
    }

    const image = await validateSchoolLogoUpload(body, contentType);
    const newKey = `school-logos/${id}/${randomUUID()}.png`;
    const provider = mediaProvider();

    await objectRequest('PUT', newKey, image.bytes, provider);
    try {
      await recordStagedLogo(this.svc.db, id, newKey, user.id);
    } catch (error) {
      // Nothing references this brand-new random key yet, so removing it is safe.
      await deleteSchoolLogoObject(newKey, id, provider);
      throw error;
    }

    if (q.stage === 'true') {
      return {
        staged: true as const,
        stagedLogoKey: newKey,
        width: image.width,
        height: image.height,
        mimeType: image.mimeType,
      };
    }

    try {
      const { updated, retiredLogoKey } = await this.svc.atomic(async tx => {
        const prior = await tx.school.findUnique({
          where: { id },
          select: schoolBrandingSelect,
        });
        if (!prior) throw new NotFoundException('School not found.');
        this.assertThemeVersionMatch(prior.themeVersion, expectedThemeVersion);
        await commitStagedLogo(tx, id, newKey);
        let retired: string | null = null;
        if (prior.logoStorageKey && prior.logoStorageKey !== newKey) {
          await retireLogoKey(tx, id, prior.logoStorageKey);
          retired = prior.logoStorageKey;
        }
        const school = await tx.school.update({
          where: { id },
          data: { logoStorageKey: newKey },
          select: schoolBrandingSelect,
        });
        await tx.auditEvent.create({
          data: {
            actorId: user.id,
            schoolId: id,
            action: 'SCHOOL_LOGO_REPLACED',
            target: prior.logoStorageKey ? 'replaced' : 'initial',
          },
        });
        return { updated: school, retiredLogoKey: retired };
      });

      await releaseRetiredLogo(this.svc.db, id, retiredLogoKey);
      return formatAuthenticatedSchoolBranding(updated);
    } catch (error) {
      // Conditional on the row still being STAGED: a committed (winning) logo is never removed.
      await discardStagedLogo(this.svc.db, id, newKey);
      throw error;
    }
  }

  @Delete('schools/:schoolId/branding/logo')
  async removeSchoolLogo(
    @Req() req: Request,
    @Param('schoolId') schoolIdParam: string,
    @Query() query: unknown,
  ) {
    const id = parse(uuid, schoolIdParam);
    const { user } = await this.svc.authorize(req, id, brandingManagers);
    await this.svc.rate(`school-logo:${user.id}`, 30, 3600);
    const q = parse(logoUploadQuerySchema, query ?? {});
    const expectedThemeVersion = q.expectedThemeVersion ?? this.extractExpectedVersion(req, undefined);
    const { updated, retiredLogoKey } = await this.svc.atomic(async tx => {
      const prior = await tx.school.findUnique({
        where: { id },
        select: schoolBrandingSelect,
      });
      if (!prior) throw new NotFoundException('School not found.');
      this.assertThemeVersionMatch(prior.themeVersion, expectedThemeVersion);
      if (!prior.logoStorageKey) return { updated: prior, retiredLogoKey: null as string | null };
      await retireLogoKey(tx, id, prior.logoStorageKey);

      const school = await tx.school.update({
        where: { id },
        data: { logoStorageKey: null },
        select: schoolBrandingSelect,
      });
      await tx.auditEvent.create({
        data: {
          actorId: user.id,
          schoolId: id,
          action: 'SCHOOL_LOGO_REMOVED',
          target: 'removed',
        },
      });
      return { updated: school, retiredLogoKey: prior.logoStorageKey as string | null };
    });

    await releaseRetiredLogo(this.svc.db, id, retiredLogoKey);
    return formatAuthenticatedSchoolBranding(updated);
  }

  private extractExpectedVersion(req: Request, body: unknown): number | undefined {
    if (body && typeof body === 'object' && !Array.isArray(body) && 'expectedThemeVersion' in (body as Record<string, unknown>)) {
      return parseExpectedThemeVersion((body as Record<string, unknown>).expectedThemeVersion);
    }
    const headerVal = req.get('x-expected-theme-version');
    if (headerVal !== undefined && headerVal.trim() !== '') {
      const parsedHeader = Number(headerVal);
      return parseExpectedThemeVersion(parsedHeader);
    }
    return undefined;
  }

  private extractStagedLogoKey(body: unknown, schoolId: string): string | null {
    if (!body || typeof body !== 'object' || Array.isArray(body) || !('stagedLogoKey' in (body as Record<string, unknown>))) {
      return null;
    }
    const rawKey = (body as Record<string, unknown>).stagedLogoKey;
    if (rawKey === null || rawKey === undefined) return null;
    if (typeof rawKey !== 'string' || !validSchoolLogoKey(rawKey, schoolId)) {
      throw new BadRequestException('Invalid stagedLogoKey for this school.');
    }
    return rawKey;
  }

  private assertThemeVersionMatch(actualVersion: number, expectedVersion: number | undefined): void {
    if (expectedVersion !== undefined && actualVersion !== expectedVersion) {
      throw new ConflictException(
        `School branding was updated by another administrator (expected version ${expectedVersion}, current version ${actualVersion}). Reload the latest branding state and try again.`,
      );
    }
  }

  @Patch('schools/:schoolId/slug')
  async updateSchoolSlug(
    @Req() req: Request,
    @Param('schoolId') schoolIdParam: string,
    @Body() body: unknown,
  ) {
    return this.assignOrChangeSlug(req, schoolIdParam, body);
  }

  @Patch('platform/schools/:schoolId/slug')
  async updatePlatformSchoolSlug(
    @Req() req: Request,
    @Param('schoolId') schoolIdParam: string,
    @Body() body: unknown,
  ) {
    return this.assignOrChangeSlug(req, schoolIdParam, body);
  }

  @Get('schools/:schoolId/slug/audit')
  async getSchoolSlugAudit(
    @Req() req: Request,
    @Param('schoolId') schoolIdParam: string,
  ) {
    return this.listSlugAuditEvents(req, schoolIdParam);
  }

  @Get('platform/schools/:schoolId/slug/audit')
  async getPlatformSchoolSlugAudit(
    @Req() req: Request,
    @Param('schoolId') schoolIdParam: string,
  ) {
    return this.listSlugAuditEvents(req, schoolIdParam);
  }

  private rejectSlugInBrandingPayload(body: unknown, isPlatformAdmin: boolean): void {
    if (body && typeof body === 'object' && !Array.isArray(body) && 'slug' in (body as Record<string, unknown>)) {
      if (!isPlatformAdmin) {
        throw new ForbiddenException('Only a Super Admin may assign or change a school slug.');
      }
      throw new BadRequestException('Use the dedicated slug endpoint to assign or change a school slug.');
    }
  }

  private async assignOrChangeSlug(
    req: Request,
    schoolIdParam: string,
    body: unknown,
  ) {
    const actor = await this.svc.administrator(req);
    const id = parse(uuid, schoolIdParam);
    const raw = parse(slugPatchSchema, body);
    const nextSlug = validateNullableSchoolSlug(raw.slug);

    return this.svc.atomic(async tx => {
      const prior = await tx.school.findUnique({
        where: { id },
        select: schoolBrandingSelect,
      });
      if (!prior) throw new NotFoundException('School not found.');

      if (nextSlug !== null && nextSlug !== prior.slug) {
        const existing = await tx.school.findUnique({
          where: { slug: nextSlug },
          select: { id: true },
        });
        if (existing && existing.id !== id) {
          throw new ConflictException('School slug is already in use.');
        }
      }

      if (nextSlug === prior.slug) {
        return {
          ...formatAuthenticatedSchoolBranding(prior),
          code: prior.code,
          previousSlug: prior.slug,
        };
      }

      const updated = await tx.school.update({
        where: { id },
        data: { slug: nextSlug },
        select: schoolBrandingSelect,
      });

      const action = prior.slug === null ? 'SCHOOL_SLUG_ASSIGNED' : 'SCHOOL_SLUG_CHANGED';
      await tx.auditEvent.create({
        data: {
          actorId: actor.id,
          schoolId: id,
          action,
          target: `${prior.slug ?? 'none'} -> ${updated.slug ?? 'none'}`,
        },
      });

      return {
        ...formatAuthenticatedSchoolBranding(updated),
        code: updated.code,
        previousSlug: prior.slug,
      };
    });
  }

  private async listSlugAuditEvents(req: Request, schoolIdParam: string) {
    await this.svc.administrator(req);
    const id = parse(uuid, schoolIdParam);
    const school = await this.svc.db.school.findUnique({
      where: { id },
      select: { id: true, name: true, code: true, slug: true },
    });
    if (!school) throw new NotFoundException('School not found.');
    const events = await this.svc.db.auditEvent.findMany({
      where: {
        schoolId: id,
        action: { in: ['SCHOOL_SLUG_ASSIGNED', 'SCHOOL_SLUG_CHANGED'] },
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: 100,
    });
    return {
      schoolId: school.id,
      slug: school.slug,
      items: events,
    };
  }
}
