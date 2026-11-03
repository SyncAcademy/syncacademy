import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import { digest } from './security';

export const DEFAULT_BRAND_PRIMARY_COLOR = '#B45309';
export const DEFAULT_BRAND_SECONDARY_COLOR = '#1E293B';
export const FALLBACK_TEXT_ON_LIGHT_COLOR = '#1E293B';
export const LIGHT_FOREGROUND_COLOR = '#FFFFFF';
export const LIGHT_MUTED_FOREGROUND_COLOR = '#E2E8F0';
export const DARK_FOREGROUND_COLOR = '#0F172A';
export const DARK_MUTED_FOREGROUND_COLOR = '#475569';

export const SCHOOL_SLUG_MIN_LENGTH = 3;
export const SCHOOL_SLUG_MAX_LENGTH = 50;
export const SCHOOL_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const HEX_COLOR_PATTERN = /^#[0-9A-Fa-f]{6}$/;
export const WELCOME_MESSAGE_MAX_LENGTH = 280;

export const SCHOOL_THEME_SCHEMA_VERSION = 1;
export const MAX_THEME_IMPORT_BYTES = 16 * 1024;

export const APPROVED_THEME_FONTS = {
  inter: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  'system-sans': "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  'plus-jakarta': "'Plus Jakarta Sans', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  'source-sans': "'Source Sans 3', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  'georgia-serif': "Georgia, 'Times New Roman', Times, serif",
} as const;

export type ThemeFontKey = keyof typeof APPROVED_THEME_FONTS;

export const APPROVED_THEME_RADII = {
  sm: '6px',
  md: '8px',
  lg: '12px',
} as const;

export type ThemeRadiusKey = keyof typeof APPROVED_THEME_RADII;

export interface SchoolThemeSemanticColors {
  success: string;
  warning: string;
  error: string;
  info: string;
}

export interface SchoolThemeColors {
  primary: string;
  secondary: string;
  background: string;
  surface: string;
  textMain: string;
  textMuted: string;
  semantic: SchoolThemeSemanticColors;
}

export interface SchoolThemeTypography {
  fontFamily: ThemeFontKey;
}

export interface SchoolThemeTokens {
  colors: SchoolThemeColors;
  typography: SchoolThemeTypography;
  radius: ThemeRadiusKey;
}

export interface SchoolThemeDocument {
  schemaVersion: typeof SCHOOL_THEME_SCHEMA_VERSION;
  tokens: SchoolThemeTokens;
  welcomeMessage: string | null;
}

export interface StoredSchoolThemeDocument extends SchoolThemeDocument {
  updatedAt: string;
  updatedBy?: string;
  revision?: number;
}

export const DEFAULT_SCHOOL_THEME_TOKENS: SchoolThemeTokens = Object.freeze({
  colors: Object.freeze({
    primary: DEFAULT_BRAND_PRIMARY_COLOR,
    secondary: DEFAULT_BRAND_SECONDARY_COLOR,
    background: '#F8F9FA',
    surface: '#FFFFFF',
    textMain: '#111827',
    textMuted: '#6B7280',
    semantic: Object.freeze({
      success: '#10B981',
      warning: '#D97706',
      error: '#EF4444',
      info: '#2563EB',
    }),
  }),
  typography: Object.freeze({
    fontFamily: 'inter' as ThemeFontKey,
  }),
  radius: 'md' as ThemeRadiusKey,
});

export const DEFAULT_SCHOOL_THEME_DOCUMENT: SchoolThemeDocument = Object.freeze({
  schemaVersion: SCHOOL_THEME_SCHEMA_VERSION,
  tokens: DEFAULT_SCHOOL_THEME_TOKENS,
  welcomeMessage: null,
});

export const THEME_APPLICATION_POLICY = Object.freeze({
  staffPortal: Object.freeze({
    applyThemeTokens: true,
    applyIdentity: true,
    preserveStructureAndNavigation: true,
  }),
  teacherApp: Object.freeze({
    applyAccentTokens: true,
    applyIdentity: true,
    preserveIdentityAndNavigation: true,
  }),
  parentApp: Object.freeze({
    applyThemeTokens: false,
    applyAccentTokens: false,
    allowIdentityInContentOnly: true,
    globalBrandLocked: true,
  }),
});

const CONTROL_CHAR_PATTERN = /[\u0000-\u001F\u007F-\u009F\u202A-\u202E\u2066-\u2069]/;
const HTML_TAG_CHAR_PATTERN = /[<>]/;
const UNSAFE_PAYLOAD_PATTERN = /(?:url\s*\(|expression\s*\(|javascript\s*:|vbscript\s*:|data\s*:|@import|@font-face|@keyframes|<script|<style|https?:\/\/|\/\/)/i;

const RESERVED_SLUGS = [
  'academic',
  'academic-setup',
  'accept-invitation',
  'admin',
  'api',
  'app',
  'assets',
  'audit',
  'audit-logs',
  'auth',
  'bursar',
  'class-teacher',
  'contact',
  'demo-requests',
  'faq',
  'head',
  'head-oversight',
  'headmaster',
  'health',
  'help',
  'invitation',
  'invitations',
  'login',
  'logout',
  'mail',
  'media',
  'parent',
  'parents',
  'platform',
  'platform-access',
  'portal',
  'privacy',
  'public',
  'r',
  'realtime',
  'recover',
  'register',
  'registrar',
  'request-demo',
  'reset',
  'reset-password',
  'root',
  's',
  'school-admin',
  'school-setup',
  'schools',
  'security',
  'socket-io',
  'static',
  'status',
  'student',
  'students',
  'super-admin',
  'support',
  'syncacademy',
  'system',
  'system-health',
  'teacher',
  'teachers',
  'teaching-responsibilities',
  'terms',
  'webhook',
  'webhooks',
  'workspace',
  'www',
] as const;

export const RESERVED_SCHOOL_SLUGS: ReadonlySet<string> = new Set(RESERVED_SLUGS);

export function isReservedSchoolSlug(slug: string): boolean {
  return RESERVED_SCHOOL_SLUGS.has(slug.trim().toLowerCase());
}

export function validateSchoolSlug(input: unknown): string {
  if (typeof input !== 'string') {
    throw new BadRequestException('School slug must be a string.');
  }
  if (input !== input.trim() || input.length < SCHOOL_SLUG_MIN_LENGTH || input.length > SCHOOL_SLUG_MAX_LENGTH) {
    throw new BadRequestException(`School slug must be between ${SCHOOL_SLUG_MIN_LENGTH} and ${SCHOOL_SLUG_MAX_LENGTH} characters.`);
  }
  if (isReservedSchoolSlug(input)) {
    throw new BadRequestException('This school slug is reserved by SyncAcademy and cannot be assigned.');
  }
  if (!SCHOOL_SLUG_PATTERN.test(input)) {
    throw new BadRequestException('School slug must contain only lowercase ASCII letters, numbers, and single internal hyphens.');
  }
  return input;
}

export function validateNullableSchoolSlug(input: unknown): string | null {
  if (input === null) return null;
  return validateSchoolSlug(input);
}

export function validateHexColor(input: unknown, label = 'Color'): string {
  if (typeof input !== 'string') {
    throw new BadRequestException(`${label} must be a 6-digit hexadecimal color such as #1B4D3E.`);
  }
  const trimmed = input.trim();
  if (UNSAFE_PAYLOAD_PATTERN.test(trimmed) || !HEX_COLOR_PATTERN.test(trimmed)) {
    throw new BadRequestException(`${label} must be a normalized 6-digit hexadecimal color (for example, #1B4D3E).`);
  }
  return trimmed.toUpperCase();
}

export function validatePrimaryColor(input: unknown): string | null {
  if (input === null) return null;
  return validateHexColor(input, 'Primary color');
}

export function validateThemeFont(input: unknown): ThemeFontKey {
  if (typeof input !== 'string') {
    throw new BadRequestException('Typography fontFamily must be one of the approved SyncAcademy font choices.');
  }
  const trimmed = input.trim();
  if (UNSAFE_PAYLOAD_PATTERN.test(trimmed) || !Object.prototype.hasOwnProperty.call(APPROVED_THEME_FONTS, trimmed)) {
    throw new BadRequestException(
      `Unsupported fontFamily "${trimmed}". Approved choices: ${Object.keys(APPROVED_THEME_FONTS).join(', ')}.`,
    );
  }
  return trimmed as ThemeFontKey;
}

export function validateThemeRadius(input: unknown): ThemeRadiusKey {
  if (typeof input !== 'string') {
    throw new BadRequestException('Component radius must be one of the approved SyncAcademy radius options (sm, md, lg).');
  }
  const trimmed = input.trim();
  if (UNSAFE_PAYLOAD_PATTERN.test(trimmed) || !Object.prototype.hasOwnProperty.call(APPROVED_THEME_RADII, trimmed)) {
    throw new BadRequestException(
      `Unsupported component radius "${trimmed}". Approved options: ${Object.keys(APPROVED_THEME_RADII).join(', ')}.`,
    );
  }
  return trimmed as ThemeRadiusKey;
}

export function validateWelcomeMessage(input: unknown): string | null {
  if (input === null) return null;
  if (typeof input !== 'string') {
    throw new BadRequestException('Welcome message must be plain text up to 280 characters or null.');
  }
  if (CONTROL_CHAR_PATTERN.test(input)) {
    throw new BadRequestException('Welcome message must not contain control characters.');
  }
  if (HTML_TAG_CHAR_PATTERN.test(input)) {
    throw new BadRequestException('Welcome message must be plain text and cannot contain HTML tags.');
  }
  if (UNSAFE_PAYLOAD_PATTERN.test(input)) {
    throw new BadRequestException('Welcome message must not contain external URLs, scripts, or CSS expressions.');
  }
  const trimmed = input.trim();
  if (trimmed.length > WELCOME_MESSAGE_MAX_LENGTH) {
    throw new BadRequestException(`Welcome message must not exceed ${WELCOME_MESSAGE_MAX_LENGTH} characters.`);
  }
  return trimmed.length === 0 ? null : trimmed;
}

function channelLuminance(channelByte: number): number {
  const srgb = channelByte / 255;
  return srgb <= 0.03928 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
}

export function relativeLuminance(hexColor: string): number {
  const normalized = validateHexColor(hexColor, 'Color');
  const r = parseInt(normalized.slice(1, 3), 16);
  const g = parseInt(normalized.slice(3, 5), 16);
  const b = parseInt(normalized.slice(5, 7), 16);
  return 0.2126 * channelLuminance(r) + 0.7152 * channelLuminance(g) + 0.0722 * channelLuminance(b);
}

export function contrastRatio(firstHex: string, secondHex: string): number {
  const first = relativeLuminance(firstHex);
  const second = relativeLuminance(secondHex);
  const lighter = Math.max(first, second);
  const darker = Math.min(first, second);
  return Math.round(((lighter + 0.05) / (darker + 0.05)) * 100) / 100;
}

function darkenHexColor(hexColor: string, factor = 0.12): string {
  const normalized = validateHexColor(hexColor);
  const r = Math.max(0, Math.round(parseInt(normalized.slice(1, 3), 16) * (1 - factor)));
  const g = Math.max(0, Math.round(parseInt(normalized.slice(3, 5), 16) * (1 - factor)));
  const b = Math.max(0, Math.round(parseInt(normalized.slice(5, 7), 16) * (1 - factor)));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`.toUpperCase();
}

export interface BrandColorContract {
  effectivePrimaryColor: string;
  foregroundColor: typeof LIGHT_FOREGROUND_COLOR | typeof DARK_FOREGROUND_COLOR;
  textOnLightColor: string;
  contrastOnWhite: number;
  contrastOnDark: number;
  wcagAaOnWhite: boolean;
  wcagAaLargeOnWhite: boolean;
}

export function resolveBrandColorContract(primaryColor: string | null): BrandColorContract {
  const effectivePrimaryColor = primaryColor ? validatePrimaryColor(primaryColor)! : DEFAULT_BRAND_PRIMARY_COLOR;
  const contrastOnWhite = contrastRatio(effectivePrimaryColor, LIGHT_FOREGROUND_COLOR);
  const contrastOnDark = contrastRatio(effectivePrimaryColor, DARK_FOREGROUND_COLOR);
  const wcagAaOnWhite = contrastOnWhite >= 4.5;
  const wcagAaLargeOnWhite = contrastOnWhite >= 3;
  const foregroundColor = contrastOnWhite >= 4.5 || contrastOnWhite >= contrastOnDark
    ? LIGHT_FOREGROUND_COLOR
    : DARK_FOREGROUND_COLOR;
  const textOnLightColor = wcagAaOnWhite ? effectivePrimaryColor : FALLBACK_TEXT_ON_LIGHT_COLOR;
  return {
    effectivePrimaryColor,
    foregroundColor,
    textOnLightColor,
    contrastOnWhite,
    contrastOnDark,
    wcagAaOnWhite,
    wcagAaLargeOnWhite,
  };
}

export interface SecondarySurfaceContract {
  effectiveSecondaryColor: string;
  tone: 'dark' | 'light';
  foregroundColor: typeof LIGHT_FOREGROUND_COLOR | typeof DARK_FOREGROUND_COLOR;
  mutedForegroundColor: string;
  logoAccentColor: string;
  surfaceBg: string;
  hoverBg: string;
  borderColor: string;
  /** Opaque colors produced by compositing the translucent overlays over the secondary color. */
  compositedSurfaceColor: string;
  compositedHoverColor: string;
  contrastOnWhite: number;
  contrastOnDarkMain: number;
  contrastOnDarkMuted: number;
  /** Lowest foreground contrast across the base, surface and hover backgrounds. */
  effectiveForegroundContrast: number;
  /** Lowest muted foreground contrast across the base and surface backgrounds. */
  effectiveMutedContrast: number;
  /** Muted foreground against the hover background (non-text bullet, 3:1 minimum). */
  compositedHoverMutedContrast: number;
  meetsWcagAa: boolean;
  primaryToSecondaryContrast: number;
  requiresActiveDistinction: boolean;
  activeNavBorderColor: string;
  activeNavIndicatorColor: string;
}

interface SidebarToneSpec {
  foreground: string;
  mutedCandidates: readonly string[];
  overlayRgb: readonly [number, number, number];
  surfaceAlpha: number;
  hoverAlpha: number;
  borderAlpha: number;
}

const SIDEBAR_TONE_SPECS: Record<'dark' | 'light', SidebarToneSpec> = {
  dark: {
    foreground: LIGHT_FOREGROUND_COLOR,
    mutedCandidates: [LIGHT_MUTED_FOREGROUND_COLOR, LIGHT_FOREGROUND_COLOR],
    overlayRgb: [255, 255, 255],
    surfaceAlpha: 0.08,
    hoverAlpha: 0.12,
    borderAlpha: 0.18,
  },
  light: {
    foreground: DARK_FOREGROUND_COLOR,
    mutedCandidates: [DARK_MUTED_FOREGROUND_COLOR, DARK_FOREGROUND_COLOR],
    overlayRgb: [15, 23, 42],
    surfaceAlpha: 0.06,
    hoverAlpha: 0.09,
    borderAlpha: 0.16,
  },
};

/** Alpha-composite an overlay over an opaque base color and return the rendered opaque HEX. */
export function compositeOverlayHex(baseHex: string, overlayRgb: readonly [number, number, number], alpha: number): string {
  const base = validateHexColor(baseHex, 'Color');
  const channels = [1, 3, 5].map((offset, index) => {
    const baseChannel = parseInt(base.slice(offset, offset + 2), 16);
    const mixed = Math.round(overlayRgb[index] * alpha + baseChannel * (1 - alpha));
    return Math.min(255, Math.max(0, mixed)).toString(16).padStart(2, '0');
  });
  return `#${channels.join('')}`.toUpperCase();
}

interface SidebarToneEvaluation {
  tone: 'dark' | 'light';
  passes: boolean;
  foreground: string;
  muted: string;
  surfaceHex: string;
  hoverHex: string;
  foregroundContrast: number;
  mutedContrast: number;
  hoverMutedContrast: number;
}

function evaluateSidebarTone(secondary: string, tone: 'dark' | 'light'): SidebarToneEvaluation {
  const spec = SIDEBAR_TONE_SPECS[tone];
  const surfaceHex = compositeOverlayHex(secondary, spec.overlayRgb, spec.surfaceAlpha);
  const hoverHex = compositeOverlayHex(secondary, spec.overlayRgb, spec.hoverAlpha);
  const foregroundContrast = Math.min(
    contrastRatio(secondary, spec.foreground),
    contrastRatio(surfaceHex, spec.foreground),
    contrastRatio(hoverHex, spec.foreground),
  );
  const mutedMetrics = (candidate: string) => ({
    text: Math.min(contrastRatio(secondary, candidate), contrastRatio(surfaceHex, candidate)),
    hover: contrastRatio(hoverHex, candidate),
  });
  const chosen = spec.mutedCandidates.find(candidate => {
    const metrics = mutedMetrics(candidate);
    return metrics.text >= 4.5 && metrics.hover >= 3;
  });
  const muted = chosen ?? spec.mutedCandidates[spec.mutedCandidates.length - 1];
  const metrics = mutedMetrics(muted);
  // Light sidebars keep the legacy brand-accent legibility rule for the wordmark.
  const accentOk = tone === 'dark' || contrastRatio(secondary, DEFAULT_BRAND_PRIMARY_COLOR) >= 4.5;
  return {
    tone,
    passes: foregroundContrast >= 4.5 && chosen !== undefined && accentOk,
    foreground: spec.foreground,
    muted,
    surfaceHex,
    hoverHex,
    foregroundContrast,
    mutedContrast: metrics.text,
    hoverMutedContrast: metrics.hover,
  };
}

export function resolveSecondarySurfaceContract(
  secondaryColorInput: string | null,
  primaryColorInput?: string | null,
): SecondarySurfaceContract {
  const effectiveSecondaryColor = secondaryColorInput
    ? validateHexColor(secondaryColorInput, 'Secondary color')
    : DEFAULT_BRAND_SECONDARY_COLOR;
  const effectivePrimaryColor = primaryColorInput
    ? validateHexColor(primaryColorInput, 'Primary color')
    : DEFAULT_BRAND_PRIMARY_COLOR;

  const contrastOnWhite = contrastRatio(effectiveSecondaryColor, LIGHT_FOREGROUND_COLOR);
  const contrastOnDarkMain = contrastRatio(effectiveSecondaryColor, DARK_FOREGROUND_COLOR);
  const contrastOnDarkMuted = contrastRatio(effectiveSecondaryColor, DARK_MUTED_FOREGROUND_COLOR);

  // Every pairing is evaluated on the final composited (rendered) background colors.
  const darkEvaluation = evaluateSidebarTone(effectiveSecondaryColor, 'dark');
  const lightEvaluation = evaluateSidebarTone(effectiveSecondaryColor, 'light');
  const evaluation = darkEvaluation.passes
    ? darkEvaluation
    : lightEvaluation.passes
      ? lightEvaluation
      : darkEvaluation;
  const { tone } = evaluation;
  const spec = SIDEBAR_TONE_SPECS[tone];

  const logoAccentColor = tone === 'dark'
    ? (contrastRatio(effectiveSecondaryColor, '#F59E0B') >= 4.5 ? '#F59E0B' : LIGHT_FOREGROUND_COLOR)
    : (contrastRatio(effectiveSecondaryColor, DEFAULT_BRAND_PRIMARY_COLOR) >= 4.5
        ? DEFAULT_BRAND_PRIMARY_COLOR
        : DARK_FOREGROUND_COLOR);

  const primaryToSecondaryContrast = contrastRatio(effectivePrimaryColor, effectiveSecondaryColor);
  const requiresActiveDistinction = primaryToSecondaryContrast < 1.8;
  const activeNavBorderColor = requiresActiveDistinction
    ? (tone === 'dark' ? LIGHT_FOREGROUND_COLOR : DARK_FOREGROUND_COLOR)
    : 'transparent';
  const activeNavIndicatorColor = LIGHT_FOREGROUND_COLOR;
  const rgb = spec.overlayRgb.join(', ');

  return {
    effectiveSecondaryColor,
    tone,
    foregroundColor: evaluation.foreground as SecondarySurfaceContract['foregroundColor'],
    mutedForegroundColor: evaluation.muted,
    logoAccentColor,
    surfaceBg: `rgba(${rgb}, ${spec.surfaceAlpha})`,
    hoverBg: `rgba(${rgb}, ${spec.hoverAlpha})`,
    borderColor: `rgba(${rgb}, ${spec.borderAlpha})`,
    compositedSurfaceColor: evaluation.surfaceHex,
    compositedHoverColor: evaluation.hoverHex,
    contrastOnWhite,
    contrastOnDarkMain,
    contrastOnDarkMuted,
    effectiveForegroundContrast: evaluation.foregroundContrast,
    effectiveMutedContrast: evaluation.mutedContrast,
    compositedHoverMutedContrast: evaluation.hoverMutedContrast,
    meetsWcagAa: evaluation.passes,
    primaryToSecondaryContrast,
    requiresActiveDistinction,
    activeNavBorderColor,
    activeNavIndicatorColor,
  };
}

export function parseExpectedThemeVersion(input: unknown): number | undefined {
  if (input === undefined || input === null) return undefined;
  if (typeof input !== 'number' || !Number.isInteger(input) || input < 0) {
    throw new BadRequestException('expectedThemeVersion must be a non-negative integer.');
  }
  return input;
}

function assertPlainObject(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new BadRequestException(`${label} must be a JSON object.`);
  }
  const proto = Object.getPrototypeOf(value);
  if (proto !== Object.prototype && proto !== null) {
    throw new BadRequestException(`${label} must be a plain JSON object.`);
  }
  for (const forbidden of ['__proto__', 'constructor', 'prototype']) {
    if (Object.prototype.hasOwnProperty.call(value, forbidden)) {
      throw new BadRequestException(`${label} contains a forbidden property "${forbidden}".`);
    }
  }
  return value as Record<string, unknown>;
}

function assertAllowedKeys(obj: Record<string, unknown>, allowed: readonly string[], contextLabel: string): void {
  const allowedSet = new Set(allowed);
  for (const key of Object.keys(obj)) {
    if (!allowedSet.has(key)) {
      throw new BadRequestException(`Unsupported property "${key}" in ${contextLabel}.`);
    }
  }
}

export function enforceThemeAccessibilityInvariants(tokens: SchoolThemeTokens): void {
  const primaryOnWhite = contrastRatio(tokens.colors.primary, LIGHT_FOREGROUND_COLOR);
  if (primaryOnWhite < 4.5) {
    throw new BadRequestException(
      `Primary brand color (${tokens.colors.primary}) does not meet WCAG 2.2 AA 4.5:1 contrast requirements against white (#FFFFFF) for buttons and active navigation; measured ${primaryOnWhite}:1. Choose a darker shade.`,
    );
  }
  const secondarySurface = resolveSecondarySurfaceContract(tokens.colors.secondary, tokens.colors.primary);
  if (!secondarySurface.meetsWcagAa) {
    throw new BadRequestException(
      `Secondary brand color (${tokens.colors.secondary}) does not meet WCAG 2.2 AA 4.5:1 contrast requirements for sidebar navigation text and labels (lowest measured text contrast ${Math.min(secondarySurface.effectiveForegroundContrast, secondarySurface.effectiveMutedContrast)}:1 after the translucent sidebar surface and hover overlays are composited; base color ${secondarySurface.contrastOnWhite}:1 against #FFFFFF). Choose a darker or lighter shade.`,
    );
  }
  const mainOnBg = contrastRatio(tokens.colors.textMain, tokens.colors.background);
  if (mainOnBg < 4.5) {
    throw new BadRequestException(
      `Main text color (${tokens.colors.textMain}) does not meet WCAG AA 4.5:1 contrast against background (${tokens.colors.background}); measured ${mainOnBg}:1.`,
    );
  }
  const mainOnSurface = contrastRatio(tokens.colors.textMain, tokens.colors.surface);
  if (mainOnSurface < 4.5) {
    throw new BadRequestException(
      `Main text color (${tokens.colors.textMain}) does not meet WCAG AA 4.5:1 contrast against surface (${tokens.colors.surface}); measured ${mainOnSurface}:1.`,
    );
  }
  const mutedOnBg = contrastRatio(tokens.colors.textMuted, tokens.colors.background);
  if (mutedOnBg < 3.0) {
    throw new BadRequestException(
      `Muted text color (${tokens.colors.textMuted}) does not meet minimum 3.0:1 legibility contrast against background (${tokens.colors.background}); measured ${mutedOnBg}:1.`,
    );
  }
  const mutedOnSurface = contrastRatio(tokens.colors.textMuted, tokens.colors.surface);
  if (mutedOnSurface < 3.0) {
    throw new BadRequestException(
      `Muted text color (${tokens.colors.textMuted}) does not meet minimum 3.0:1 legibility contrast against surface (${tokens.colors.surface}); measured ${mutedOnSurface}:1.`,
    );
  }
}

export function validateSchoolThemeDocument(input: unknown): SchoolThemeDocument {
  const root = assertPlainObject(input, 'Theme document');
  assertAllowedKeys(
    root,
    ['schemaVersion', 'tokens', 'colors', 'welcomeMessage', 'updatedAt', 'updatedBy', 'revision'],
    'theme document',
  );

  if (root.schemaVersion !== SCHOOL_THEME_SCHEMA_VERSION) {
    throw new BadRequestException(
      `Unsupported theme schemaVersion "${String(root.schemaVersion)}". Expected schemaVersion ${SCHOOL_THEME_SCHEMA_VERSION}.`,
    );
  }

  let tokens: SchoolThemeTokens;

  if (root.colors !== undefined && root.tokens === undefined) {
    const conciseColors = assertPlainObject(root.colors, 'Branding colors');
    assertAllowedKeys(conciseColors, ['primary', 'secondary'], 'branding colors');
    tokens = {
      colors: {
        primary: validateHexColor(conciseColors.primary, 'colors.primary'),
        secondary: validateHexColor(conciseColors.secondary, 'colors.secondary'),
        background: DEFAULT_SCHOOL_THEME_TOKENS.colors.background,
        surface: DEFAULT_SCHOOL_THEME_TOKENS.colors.surface,
        textMain: DEFAULT_SCHOOL_THEME_TOKENS.colors.textMain,
        textMuted: DEFAULT_SCHOOL_THEME_TOKENS.colors.textMuted,
        semantic: { ...DEFAULT_SCHOOL_THEME_TOKENS.colors.semantic },
      },
      typography: { ...DEFAULT_SCHOOL_THEME_TOKENS.typography },
      radius: DEFAULT_SCHOOL_THEME_TOKENS.radius,
    };
  } else {
    if (root.colors !== undefined && root.tokens !== undefined) {
      throw new BadRequestException('Provide either colors or tokens in theme document, not both.');
    }
    const tokensObj = assertPlainObject(root.tokens, 'Theme tokens');
    assertAllowedKeys(tokensObj, ['colors', 'typography', 'radius'], 'theme tokens');

    const colorsObj = assertPlainObject(tokensObj.colors, 'Theme colors');
    assertAllowedKeys(
      colorsObj,
      ['primary', 'secondary', 'background', 'surface', 'textMain', 'textMuted', 'semantic'],
      'theme colors',
    );

    const semanticObj = assertPlainObject(colorsObj.semantic, 'Semantic colors');
    assertAllowedKeys(semanticObj, ['success', 'warning', 'error', 'info'], 'semantic colors');

    const typographyObj = assertPlainObject(tokensObj.typography, 'Theme typography');
    assertAllowedKeys(typographyObj, ['fontFamily'], 'theme typography');

    tokens = {
      colors: {
        primary: validateHexColor(colorsObj.primary, 'colors.primary'),
        secondary: validateHexColor(colorsObj.secondary, 'colors.secondary'),
        background: validateHexColor(colorsObj.background, 'colors.background'),
        surface: validateHexColor(colorsObj.surface, 'colors.surface'),
        textMain: validateHexColor(colorsObj.textMain, 'colors.textMain'),
        textMuted: validateHexColor(colorsObj.textMuted, 'colors.textMuted'),
        semantic: {
          success: validateHexColor(semanticObj.success, 'colors.semantic.success'),
          warning: validateHexColor(semanticObj.warning, 'colors.semantic.warning'),
          error: validateHexColor(semanticObj.error, 'colors.semantic.error'),
          info: validateHexColor(semanticObj.info, 'colors.semantic.info'),
        },
      },
      typography: {
        fontFamily: validateThemeFont(typographyObj.fontFamily),
      },
      radius: validateThemeRadius(tokensObj.radius),
    };
  }

  enforceThemeAccessibilityInvariants(tokens);

  const welcomeMessage = root.welcomeMessage === undefined
    ? null
    : validateWelcomeMessage(root.welcomeMessage);

  return {
    schemaVersion: SCHOOL_THEME_SCHEMA_VERSION,
    tokens,
    welcomeMessage,
  };
}

export function cloneThemeDocument(theme: SchoolThemeDocument = DEFAULT_SCHOOL_THEME_DOCUMENT): SchoolThemeDocument {
  return {
    schemaVersion: SCHOOL_THEME_SCHEMA_VERSION,
    tokens: {
      colors: {
        primary: theme.tokens.colors.primary,
        secondary: theme.tokens.colors.secondary,
        background: theme.tokens.colors.background,
        surface: theme.tokens.colors.surface,
        textMain: theme.tokens.colors.textMain,
        textMuted: theme.tokens.colors.textMuted,
        semantic: {
          success: theme.tokens.colors.semantic.success,
          warning: theme.tokens.colors.semantic.warning,
          error: theme.tokens.colors.semantic.error,
          info: theme.tokens.colors.semantic.info,
        },
      },
      typography: {
        fontFamily: theme.tokens.typography.fontFamily,
      },
      radius: theme.tokens.radius,
    },
    welcomeMessage: theme.welcomeMessage,
  };
}

export function readStoredSchoolTheme(raw: unknown): SchoolThemeDocument | null {
  if (raw === null || raw === undefined) return null;
  try {
    return validateSchoolThemeDocument(raw);
  } catch {
    return null;
  }
}

export function applySchoolThemePatch(
  baseThemeInput: SchoolThemeDocument | null | undefined,
  patchInput: unknown,
): SchoolThemeDocument {
  const base = cloneThemeDocument(baseThemeInput ?? DEFAULT_SCHOOL_THEME_DOCUMENT);
  const patch = assertPlainObject(patchInput, 'Theme update payload');

  assertAllowedKeys(
    patch,
    ['schemaVersion', 'tokens', 'colors', 'primaryColor', 'secondaryColor', 'welcomeMessage', 'expectedThemeVersion', 'stagedLogoKey'],
    'theme update payload',
  );

  if (
    patch.tokens === undefined &&
    patch.colors === undefined &&
    patch.primaryColor === undefined &&
    patch.secondaryColor === undefined &&
    patch.welcomeMessage === undefined
  ) {
    throw new BadRequestException('Provide colors, theme tokens, primaryColor, secondaryColor, or welcomeMessage to update school branding.');
  }

  if (patch.schemaVersion !== undefined && patch.schemaVersion !== SCHOOL_THEME_SCHEMA_VERSION) {
    throw new BadRequestException(
      `Unsupported theme schemaVersion "${String(patch.schemaVersion)}". Expected schemaVersion ${SCHOOL_THEME_SCHEMA_VERSION}.`,
    );
  }

  if (patch.primaryColor !== undefined) {
    base.tokens.colors.primary = patch.primaryColor === null
      ? DEFAULT_SCHOOL_THEME_TOKENS.colors.primary
      : validateHexColor(patch.primaryColor, 'primaryColor');
  }

  if (patch.secondaryColor !== undefined) {
    base.tokens.colors.secondary = patch.secondaryColor === null
      ? DEFAULT_SCHOOL_THEME_TOKENS.colors.secondary
      : validateHexColor(patch.secondaryColor, 'secondaryColor');
  }

  if (patch.colors !== undefined) {
    const conciseColors = assertPlainObject(patch.colors, 'colors');
    assertAllowedKeys(conciseColors, ['primary', 'secondary'], 'colors');
    if (conciseColors.primary === undefined && conciseColors.secondary === undefined) {
      throw new BadRequestException('Provide primary or secondary inside colors.');
    }
    if (conciseColors.primary !== undefined) {
      base.tokens.colors.primary = conciseColors.primary === null
        ? DEFAULT_SCHOOL_THEME_TOKENS.colors.primary
        : validateHexColor(conciseColors.primary, 'colors.primary');
    }
    if (conciseColors.secondary !== undefined) {
      base.tokens.colors.secondary = conciseColors.secondary === null
        ? DEFAULT_SCHOOL_THEME_TOKENS.colors.secondary
        : validateHexColor(conciseColors.secondary, 'colors.secondary');
    }
  }

  if (patch.welcomeMessage !== undefined) {
    base.welcomeMessage = validateWelcomeMessage(patch.welcomeMessage);
  }

  if (patch.tokens !== undefined) {
    const tokensPatch = assertPlainObject(patch.tokens, 'tokens');
    assertAllowedKeys(tokensPatch, ['colors', 'typography', 'radius'], 'tokens');

    if (tokensPatch.colors !== undefined) {
      const colorsPatch = assertPlainObject(tokensPatch.colors, 'tokens.colors');
      assertAllowedKeys(
        colorsPatch,
        ['primary', 'secondary', 'background', 'surface', 'textMain', 'textMuted', 'semantic'],
        'tokens.colors',
      );
      if (colorsPatch.primary !== undefined) {
        base.tokens.colors.primary = validateHexColor(colorsPatch.primary, 'colors.primary');
      }
      if (colorsPatch.secondary !== undefined) {
        base.tokens.colors.secondary = validateHexColor(colorsPatch.secondary, 'colors.secondary');
      }
      if (colorsPatch.background !== undefined) {
        base.tokens.colors.background = validateHexColor(colorsPatch.background, 'colors.background');
      }
      if (colorsPatch.surface !== undefined) {
        base.tokens.colors.surface = validateHexColor(colorsPatch.surface, 'colors.surface');
      }
      if (colorsPatch.textMain !== undefined) {
        base.tokens.colors.textMain = validateHexColor(colorsPatch.textMain, 'colors.textMain');
      }
      if (colorsPatch.textMuted !== undefined) {
        base.tokens.colors.textMuted = validateHexColor(colorsPatch.textMuted, 'colors.textMuted');
      }
      if (colorsPatch.semantic !== undefined) {
        const semPatch = assertPlainObject(colorsPatch.semantic, 'tokens.colors.semantic');
        assertAllowedKeys(semPatch, ['success', 'warning', 'error', 'info'], 'tokens.colors.semantic');
        if (semPatch.success !== undefined) {
          base.tokens.colors.semantic.success = validateHexColor(semPatch.success, 'colors.semantic.success');
        }
        if (semPatch.warning !== undefined) {
          base.tokens.colors.semantic.warning = validateHexColor(semPatch.warning, 'colors.semantic.warning');
        }
        if (semPatch.error !== undefined) {
          base.tokens.colors.semantic.error = validateHexColor(semPatch.error, 'colors.semantic.error');
        }
        if (semPatch.info !== undefined) {
          base.tokens.colors.semantic.info = validateHexColor(semPatch.info, 'colors.semantic.info');
        }
      }
    }

    if (tokensPatch.typography !== undefined) {
      const typoPatch = assertPlainObject(tokensPatch.typography, 'tokens.typography');
      assertAllowedKeys(typoPatch, ['fontFamily'], 'tokens.typography');
      if (typoPatch.fontFamily !== undefined) {
        base.tokens.typography.fontFamily = validateThemeFont(typoPatch.fontFamily);
      }
    }

    if (tokensPatch.radius !== undefined) {
      base.tokens.radius = validateThemeRadius(tokensPatch.radius);
    }
  }

  return validateSchoolThemeDocument(base);
}

const CSS_VARIABLE_TOKEN_MAP: Readonly<Record<string, string>> = Object.freeze({
  '--sa-primary': 'colors.primary',
  '--sa-secondary': 'colors.secondary',
  '--sa-sidebar-bg': 'colors.secondary',
  '--sa-body-bg': 'colors.background',
  '--sa-surface-bg': 'colors.surface',
  '--sa-text-primary': 'colors.textMain',
  '--sa-text-secondary': 'colors.textMuted',
  '--sa-success': 'colors.semantic.success',
  '--sa-warning': 'colors.semantic.warning',
  '--sa-error': 'colors.semantic.error',
  '--sa-info': 'colors.semantic.info',
  '--sa-font': 'typography.fontFamily',
  '--sa-radius': 'radius',
});

/**
 * Controlled CSS Variable Extractor.
 * Never injects or executes CSS. Strictly extracts only whitelisted `--sa-*` custom
 * property values from a `:root { ... }` or flat declaration block and validates them
 * through the canonical theme validator. Rejects selectors, rules, `@import`, `url()`,
 * `var()`, `expression()`, comments, or unknown properties.
 */
export function extractControlledCssVariables(
  cssInput: unknown,
  baseTheme: SchoolThemeDocument = DEFAULT_SCHOOL_THEME_DOCUMENT,
): SchoolThemeDocument {
  if (typeof cssInput !== 'string') {
    throw new BadRequestException('Controlled CSS variable input must be a string.');
  }
  const byteLength = Buffer.byteLength(cssInput, 'utf8');
  if (byteLength > MAX_THEME_IMPORT_BYTES) {
    throw new BadRequestException(`Theme import exceeds maximum size of ${MAX_THEME_IMPORT_BYTES} bytes.`);
  }
  if (
    CONTROL_CHAR_PATTERN.test(cssInput) ||
    HTML_TAG_CHAR_PATTERN.test(cssInput) ||
    UNSAFE_PAYLOAD_PATTERN.test(cssInput) ||
    cssInput.includes('/*') ||
    cssInput.includes('*/') ||
    cssInput.includes('\\') ||
    /var\s*\(/i.test(cssInput)
  ) {
    throw new BadRequestException('CSS variable input contains disallowed syntax, comments, functions, or external references.');
  }

  const trimmed = cssInput.trim();
  if (!trimmed) {
    throw new BadRequestException('CSS variable input cannot be empty.');
  }

  let body = trimmed;
  if (trimmed.startsWith(':root')) {
    const match = /^:root\s*\{([\s\S]*)\}$/.exec(trimmed);
    if (!match || match[1].includes('{') || match[1].includes('}')) {
      throw new BadRequestException('Only a single :root { ... } custom-property block is permitted.');
    }
    body = match[1].trim();
  } else if (trimmed.includes('{') || trimmed.includes('}')) {
    throw new BadRequestException('Arbitrary CSS selectors and rule blocks are not permitted.');
  }

  const statements = body
    .split(';')
    .map(part => part.trim())
    .filter(Boolean);

  if (statements.length === 0 || statements.length > 32) {
    throw new BadRequestException('Provide between 1 and 32 approved --sa-* custom property declarations.');
  }

  const colorsPatch: Record<string, unknown> = {};
  const semanticPatch: Record<string, unknown> = {};
  const typographyPatch: Record<string, unknown> = {};
  let radiusPatch: unknown;

  for (const statement of statements) {
    const colonIndex = statement.indexOf(':');
    if (colonIndex <= 0) {
      throw new BadRequestException(`Malformed CSS declaration "${statement}".`);
    }
    const prop = statement.slice(0, colonIndex).trim();
    const rawValue = statement.slice(colonIndex + 1).trim();
    if (!Object.prototype.hasOwnProperty.call(CSS_VARIABLE_TOKEN_MAP, prop)) {
      throw new BadRequestException(`Unsupported CSS custom property "${prop}".`);
    }
    const mapped = CSS_VARIABLE_TOKEN_MAP[prop];
    if (mapped.startsWith('colors.semantic.')) {
      const key = mapped.slice('colors.semantic.'.length);
      semanticPatch[key] = rawValue;
    } else if (mapped.startsWith('colors.')) {
      const key = mapped.slice('colors.'.length);
      colorsPatch[key] = rawValue;
    } else if (mapped === 'typography.fontFamily') {
      typographyPatch.fontFamily = rawValue;
    } else if (mapped === 'radius') {
      radiusPatch = rawValue;
    }
  }

  const tokensPatch: Record<string, unknown> = {};
  if (Object.keys(colorsPatch).length > 0 || Object.keys(semanticPatch).length > 0) {
    tokensPatch.colors = {
      ...colorsPatch,
      ...(Object.keys(semanticPatch).length > 0 ? { semantic: semanticPatch } : {}),
    };
  }
  if (Object.keys(typographyPatch).length > 0) {
    tokensPatch.typography = typographyPatch;
  }
  if (radiusPatch !== undefined) {
    tokensPatch.radius = radiusPatch;
  }

  return applySchoolThemePatch(baseTheme, {
    schemaVersion: SCHOOL_THEME_SCHEMA_VERSION,
    tokens: tokensPatch,
  });
}

export function parseAndValidateImportedTheme(
  input: unknown,
  baseTheme: SchoolThemeDocument = DEFAULT_SCHOOL_THEME_DOCUMENT,
): SchoolThemeDocument {
  const serializedSize = typeof input === 'string'
    ? Buffer.byteLength(input, 'utf8')
    : Buffer.byteLength(JSON.stringify(input ?? {}), 'utf8');

  if (serializedSize > MAX_THEME_IMPORT_BYTES) {
    throw new BadRequestException(`Theme import exceeds maximum size of ${MAX_THEME_IMPORT_BYTES} bytes.`);
  }

  let parsed: unknown = input;
  if (typeof input === 'string') {
    try {
      parsed = JSON.parse(input);
    } catch {
      throw new BadRequestException('Malformed theme JSON payload.');
    }
  }

  const obj = assertPlainObject(parsed, 'Theme import payload');

  if (obj.format === 'css-variables') {
    assertAllowedKeys(obj, ['format', 'css', 'welcomeMessage', 'expectedThemeVersion'], 'CSS variable import payload');
    const extracted = extractControlledCssVariables(obj.css, baseTheme);
    if (obj.welcomeMessage !== undefined) {
      extracted.welcomeMessage = validateWelcomeMessage(obj.welcomeMessage);
    }
    return extracted;
  }

  if (obj.format !== undefined) {
    assertAllowedKeys(obj, ['format', 'theme', 'expectedThemeVersion'], 'wrapped theme import payload');
    if (obj.format !== 'json') {
      throw new BadRequestException(`Unsupported import format "${String(obj.format)}". Supported formats: json, css-variables.`);
    }
    return validateSchoolThemeDocument(obj.theme);
  }

  const { expectedThemeVersion: _expectedThemeVersion, ...docCandidate } = obj;
  return validateSchoolThemeDocument(docCandidate);
}

export interface ThemeRuntimeContract {
  cssVariables: Record<string, string>;
  colorContract: BrandColorContract;
  secondarySurface: SecondarySurfaceContract;
  accessibility: {
    textMainOnBackgroundContrast: number;
    textMainOnSurfaceContrast: number;
    textMutedOnBackgroundContrast: number;
    textMutedOnSurfaceContrast: number;
    primaryOnSurfaceContrast: number;
    primaryOnWhiteContrast: number;
    secondaryOnWhiteContrast: number;
    secondaryForegroundContrast: number;
    secondaryMutedContrast: number;
    secondaryTone: 'dark' | 'light';
    secondaryForegroundColor: typeof LIGHT_FOREGROUND_COLOR | typeof DARK_FOREGROUND_COLOR;
    secondaryMutedForegroundColor: string;
    primaryToSecondaryContrast: number;
    requiresActiveDistinction: boolean;
    meetsWcagAaText: boolean;
    meetsWcagAaPrimary: boolean;
    meetsWcagAaSecondary: boolean;
  };
  applicationPolicy: typeof THEME_APPLICATION_POLICY;
}

export function resolveThemeRuntimeContract(theme: SchoolThemeDocument): ThemeRuntimeContract {
  const colorContract = resolveBrandColorContract(theme.tokens.colors.primary);
  const secondarySurface = resolveSecondarySurfaceContract(
    theme.tokens.colors.secondary,
    theme.tokens.colors.primary,
  );
  const textMainOnBackgroundContrast = contrastRatio(theme.tokens.colors.textMain, theme.tokens.colors.background);
  const textMainOnSurfaceContrast = contrastRatio(theme.tokens.colors.textMain, theme.tokens.colors.surface);
  const textMutedOnBackgroundContrast = contrastRatio(theme.tokens.colors.textMuted, theme.tokens.colors.background);
  const textMutedOnSurfaceContrast = contrastRatio(theme.tokens.colors.textMuted, theme.tokens.colors.surface);
  const primaryOnSurfaceContrast = contrastRatio(theme.tokens.colors.primary, theme.tokens.colors.surface);
  const primaryHover = darkenHexColor(theme.tokens.colors.primary, 0.12);

  return {
    cssVariables: {
      '--school-primary': theme.tokens.colors.primary,
      '--school-primary-hover': primaryHover,
      '--school-primary-foreground': colorContract.foregroundColor,
      '--school-secondary': theme.tokens.colors.secondary,
      '--school-secondary-foreground': secondarySurface.foregroundColor,
      '--school-secondary-muted': secondarySurface.mutedForegroundColor,
      '--school-logo-accent': secondarySurface.logoAccentColor,
      '--school-secondary-surface': secondarySurface.surfaceBg,
      '--school-secondary-hover': secondarySurface.hoverBg,
      '--school-secondary-border': secondarySurface.borderColor,
      '--school-active-nav-border': secondarySurface.activeNavBorderColor,
      '--school-active-nav-indicator': secondarySurface.activeNavIndicatorColor,
      '--sa-primary': theme.tokens.colors.primary,
      '--sa-primary-hover': primaryHover,
      '--sa-primary-foreground': colorContract.foregroundColor,
      '--sa-secondary': theme.tokens.colors.secondary,
      '--sa-sidebar-bg': theme.tokens.colors.secondary,
      '--sa-sidebar-text': secondarySurface.foregroundColor,
      '--sa-sidebar-muted': secondarySurface.mutedForegroundColor,
      '--sa-sidebar-hover': secondarySurface.hoverBg,
      '--sa-sidebar-border': secondarySurface.borderColor,
      '--sa-active-nav-border': secondarySurface.activeNavBorderColor,
      '--sa-body-bg': theme.tokens.colors.background,
      '--sa-surface-bg': theme.tokens.colors.surface,
      '--sa-text-primary': theme.tokens.colors.textMain,
      '--sa-text-secondary': theme.tokens.colors.textMuted,
      '--sa-success': theme.tokens.colors.semantic.success,
      '--sa-warning': theme.tokens.colors.semantic.warning,
      '--sa-error': theme.tokens.colors.semantic.error,
      '--sa-info': theme.tokens.colors.semantic.info,
      '--sa-radius': APPROVED_THEME_RADII[theme.tokens.radius],
      '--sa-font': APPROVED_THEME_FONTS[theme.tokens.typography.fontFamily],
    },
    colorContract,
    secondarySurface,
    accessibility: {
      textMainOnBackgroundContrast,
      textMainOnSurfaceContrast,
      textMutedOnBackgroundContrast,
      textMutedOnSurfaceContrast,
      primaryOnSurfaceContrast,
      primaryOnWhiteContrast: colorContract.contrastOnWhite,
      secondaryOnWhiteContrast: secondarySurface.contrastOnWhite,
      secondaryForegroundContrast: secondarySurface.effectiveForegroundContrast,
      secondaryMutedContrast: secondarySurface.effectiveMutedContrast,
      secondaryTone: secondarySurface.tone,
      secondaryForegroundColor: secondarySurface.foregroundColor,
      secondaryMutedForegroundColor: secondarySurface.mutedForegroundColor,
      primaryToSecondaryContrast: secondarySurface.primaryToSecondaryContrast,
      requiresActiveDistinction: secondarySurface.requiresActiveDistinction,
      meetsWcagAaText: textMainOnBackgroundContrast >= 4.5 && textMainOnSurfaceContrast >= 4.5,
      meetsWcagAaPrimary: colorContract.contrastOnWhite >= 4.5,
      meetsWcagAaSecondary: secondarySurface.meetsWcagAa,
    },
    applicationPolicy: THEME_APPLICATION_POLICY,
  };
}

export function resolveParentSchoolIdentity(school: {
  id?: string;
  name: string;
  slug: string | null;
  logoStorageKey: string | null;
}) {
  return {
    schoolName: school.name,
    slug: school.slug,
    logoUrl:
      publicSchoolLogoUrl(school.slug, school.logoStorageKey) ??
      authenticatedSchoolLogoUrl(school.id, school.logoStorageKey),
    themeTokensApplied: false as const,
    globalBrandLocked: true as const,
    globalTokens: DEFAULT_SCHOOL_THEME_TOKENS,
  };
}

export function schoolLogoVersion(logoStorageKey: string | null | undefined): string | null {
  if (!logoStorageKey) return null;
  return digest(logoStorageKey).slice(0, 12);
}

export function publicSchoolLogoUrl(slug: string | null | undefined, logoStorageKey: string | null | undefined): string | null {
  const version = schoolLogoVersion(logoStorageKey);
  if (!slug || !version) return null;
  return `/api/v1/public/schools/${slug}/logo?v=${version}`;
}

export function authenticatedSchoolLogoUrl(
  schoolId: string | null | undefined,
  logoStorageKey: string | null | undefined,
): string | null {
  const version = schoolLogoVersion(logoStorageKey);
  if (!schoolId || !version) return null;
  return `/api/v1/schools/${schoolId}/branding/logo?v=${version}`;
}

export interface ResolvedPublicSchoolContext {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly logoStorageKey: string | null;
  readonly publishedTheme: SchoolThemeDocument | null;
  readonly themeVersion: number;
  readonly primaryColor: string | null;
  readonly welcomeMessage: string | null;
  readonly authorized: false;
}

type SchoolLookupClient = Pick<PrismaClient | Prisma.TransactionClient, 'school'>;

/**
 * Reusable server-side school lookup by public slug.
 *
 * Security & Tenant-Resolution Contract:
 * 1. Validates the slug format and reserved-name policy first.
 * 2. Resolves the school record and enforces the active school availability policy.
 * 3. Returns only internal branding/theme resolution context to trusted backend code.
 * 4. Never exposes draftTheme, previousPublishedTheme, or authorization (`authorized: false`).
 */
export async function resolveSchoolByPublicSlug(
  db: SchoolLookupClient,
  slugInput: unknown,
): Promise<ResolvedPublicSchoolContext> {
  const slug = validateSchoolSlug(slugInput);
  const school = await db.school.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      slug: true,
      active: true,
      logoStorageKey: true,
      publishedTheme: true,
      themeVersion: true,
    },
  });
  if (!school || !school.active || !school.slug) {
    throw new NotFoundException('School branding is unavailable.');
  }
  const publishedTheme = readStoredSchoolTheme(school.publishedTheme);
  return {
    id: school.id,
    name: school.name,
    slug: school.slug,
    logoStorageKey: school.logoStorageKey,
    publishedTheme,
    themeVersion: school.themeVersion,
    primaryColor: publishedTheme ? publishedTheme.tokens.colors.primary : null,
    welcomeMessage: publishedTheme ? publishedTheme.welcomeMessage : null,
    authorized: false,
  };
}

export function formatPublicSchoolBranding(school: {
  name: string;
  slug: string;
  logoStorageKey: string | null;
  publishedTheme?: unknown;
  themeVersion?: number;
}) {
  const published = readStoredSchoolTheme(school.publishedTheme);
  const effectiveTheme = published ?? DEFAULT_SCHOOL_THEME_DOCUMENT;
  const runtime = resolveThemeRuntimeContract(effectiveTheme);
  const primaryColor = published ? published.tokens.colors.primary : null;
  const secondaryColor = published ? published.tokens.colors.secondary : null;
  const welcomeMessage = published ? published.welcomeMessage : null;
  return {
    name: school.name,
    slug: school.slug,
    logoUrl: publicSchoolLogoUrl(school.slug, school.logoStorageKey),
    primaryColor,
    secondaryColor,
    welcomeMessage,
    colorContract: resolveBrandColorContract(primaryColor),
    themeVersion: school.themeVersion ?? 0,
    isCustomTheme: !!published,
    theme: {
      schemaVersion: effectiveTheme.schemaVersion,
      colors: {
        primary: effectiveTheme.tokens.colors.primary,
        secondary: effectiveTheme.tokens.colors.secondary,
      },
      tokens: effectiveTheme.tokens,
      welcomeMessage: effectiveTheme.welcomeMessage,
      cssVariables: runtime.cssVariables,
      accessibility: runtime.accessibility,
      applicationPolicy: runtime.applicationPolicy,
    },
  };
}

export function formatAuthenticatedSchoolBranding(school: {
  id: string;
  name: string;
  slug: string | null;
  logoStorageKey: string | null;
  publishedTheme?: unknown;
  draftTheme?: unknown;
  previousPublishedTheme?: unknown;
  themeVersion?: number;
}, options: { includeDraft?: boolean } = {}) {
  // Non-manager callers must never receive any value derived from unpublished
  // or previous theme state, so those inputs are dropped before serialization.
  const includeDraft = options.includeDraft !== false;
  const published = readStoredSchoolTheme(school.publishedTheme);
  const draft = includeDraft ? readStoredSchoolTheme(school.draftTheme) : null;
  const previousPublished = includeDraft ? readStoredSchoolTheme(school.previousPublishedTheme) : null;
  const activePublishedTheme = published ?? DEFAULT_SCHOOL_THEME_DOCUMENT;
  const activePreviewTheme = draft ?? activePublishedTheme;
  const publishedRuntime = resolveThemeRuntimeContract(activePublishedTheme);
  const previewRuntime = resolveThemeRuntimeContract(activePreviewTheme);
  const primaryColor = published
    ? published.tokens.colors.primary
    : draft
      ? draft.tokens.colors.primary
      : null;
  const secondaryColor = published
    ? published.tokens.colors.secondary
    : draft
      ? draft.tokens.colors.secondary
      : null;
  const welcomeMessage = published
    ? published.welcomeMessage
    : draft
      ? draft.welcomeMessage
      : null;

  return {
    schoolId: school.id,
    name: school.name,
    slug: school.slug,
    hasLogo: !!school.logoStorageKey,
    logoUrl:
      publicSchoolLogoUrl(school.slug, school.logoStorageKey) ??
      authenticatedSchoolLogoUrl(school.id, school.logoStorageKey),
    publicLogoUrl: publicSchoolLogoUrl(school.slug, school.logoStorageKey),
    authenticatedLogoUrl: authenticatedSchoolLogoUrl(school.id, school.logoStorageKey),
    primaryColor,
    secondaryColor,
    welcomeMessage,
    colors: {
      primary: activePublishedTheme.tokens.colors.primary,
      secondary: activePublishedTheme.tokens.colors.secondary,
    },
    colorContract: resolveBrandColorContract(primaryColor),
    themeVersion: school.themeVersion ?? 0,
    hasPublishedTheme: !!published,
    hasDraftTheme: !!draft,
    canRollback: !!previousPublished,
    publishedTheme: {
      ...activePublishedTheme,
      colors: {
        primary: activePublishedTheme.tokens.colors.primary,
        secondary: activePublishedTheme.tokens.colors.secondary,
      },
      isCustom: !!published,
      cssVariables: publishedRuntime.cssVariables,
      accessibility: publishedRuntime.accessibility,
    },
    draftTheme: draft
      ? {
          ...draft,
          colors: {
            primary: draft.tokens.colors.primary,
            secondary: draft.tokens.colors.secondary,
          },
          cssVariables: previewRuntime.cssVariables,
          accessibility: previewRuntime.accessibility,
        }
      : null,
    applicationPolicy: THEME_APPLICATION_POLICY,
  };
}
