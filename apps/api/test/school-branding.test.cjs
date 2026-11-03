const { test } = require('node:test');
const assert = require('node:assert/strict');
const { mkdtemp, readdir, rm, access, readFile } = require('node:fs/promises');
const { tmpdir } = require('node:os');
const { join, resolve } = require('node:path');
const { randomUUID } = require('node:crypto');
const { spawn, spawnSync } = require('node:child_process');
const { Pool } = require('pg');
const { PrismaClient } = require('@prisma/client');
const { authenticator } = require('otplib');
const sharp = require('sharp');

require('dotenv').config({
  path: resolve(__dirname, '../../../.env'),
  quiet: true,
});

const sourceUrl = new URL(process.env.DATABASE_URL || 'postgresql://syncacademy:test@127.0.0.1:55432/syncacademy');
const adminUrl = new URL(sourceUrl);
adminUrl.pathname = '/postgres';
const dbUrl = new URL(sourceUrl);
dbUrl.pathname = '/syncacademy_branding_test';
process.env.DATABASE_URL = dbUrl.toString();
process.env.REALTIME_DATABASE_URL = dbUrl.toString();
process.env.NODE_ENV = 'test';
process.env.PORT = '3109';
process.env.APP_ORIGIN = process.env.APP_ORIGIN || 'http://localhost:8080';
process.env.SESSION_SECRET = process.env.SESSION_SECRET || 's'.repeat(48);
process.env.DATA_ENCRYPTION_KEY = process.env.DATA_ENCRYPTION_KEY || 'a'.repeat(64);
process.env.SMTP_HOST = process.env.SMTP_HOST || 'localhost';
process.env.MAIL_FROM = process.env.MAIL_FROM || 'noreply@syncacademy.local';
process.env.ANNOUNCEMENT_MEDIA_PROVIDER = 'local';
process.env.REALTIME_TRANSPORT = 'local';
process.env.TRUSTED_PROXY_CIDRS = '';

test('Unit: slug validation, reserved names, hex color contract, and welcome message validation', async () => {
  const {
    RESERVED_SCHOOL_SLUGS,
    isReservedSchoolSlug,
    validateSchoolSlug,
    validateNullableSchoolSlug,
    validatePrimaryColor,
    validateWelcomeMessage,
    resolveBrandColorContract,
    publicSchoolLogoUrl,
  } = require('../dist/school-branding');

  // Valid slugs
  assert.equal(validateSchoolSlug('greenhill'), 'greenhill');
  assert.equal(validateSchoolSlug('st-marys-secondary-2026'), 'st-marys-secondary-2026');
  assert.equal(validateSchoolSlug('abc'), 'abc');
  assert.equal(validateSchoolSlug('a'.repeat(50)), 'a'.repeat(50));
  assert.equal(validateNullableSchoolSlug(null), null);

  // Reserved slugs
  const requiredReserved = [
    'admin', 'api', 'www', 'auth', 'login', 'logout', 'parent', 'parents',
    'teacher', 'teachers', 'academic', 'bursar', 'registrar', 'head',
    'super-admin', 'platform', 'public', 'help', 'support', 'status',
    'health', 'assets', 'static', 'schools', 's', 'workspace',
  ];
  for (const reserved of requiredReserved) {
    assert.equal(RESERVED_SCHOOL_SLUGS.has(reserved), true, `${reserved} must be in RESERVED_SCHOOL_SLUGS`);
    assert.equal(isReservedSchoolSlug(reserved), true);
    assert.throws(() => validateSchoolSlug(reserved), error => error.status === 400);
  }

  // Invalid slug formats
  const invalidSlugs = [
    '',
    'ab',
    'a'.repeat(51),
    'Greenhill',
    'GREENHILL',
    'green_hill',
    '-greenhill',
    'greenhill-',
    'green--hill',
    'green hill',
    'greenhill/academy',
    'greenhill.ac.tz',
    123,
    undefined,
  ];
  for (const invalid of invalidSlugs) {
    assert.throws(() => validateSchoolSlug(invalid), error => error.status === 400, `Slug ${String(invalid)} should be rejected`);
  }

  // Primary color validation & normalization
  assert.equal(validatePrimaryColor('#1B4D3E'), '#1B4D3E');
  assert.equal(validatePrimaryColor('#1b4d3e'), '#1B4D3E');
  assert.equal(validatePrimaryColor(null), null);

  const invalidColors = [
    '',
    '#fff',
    '#1B4D3EFF',
    '1B4D3E',
    'red',
    'rgb(27, 77, 62)',
    'hsl(160, 48%, 20%)',
    'var(--brand-color)',
    '#1B4D3E; color: red',
    'url(https://evil.example/x.css)',
    '<script>alert(1)</script>',
    '<style>body{display:none}</style>',
  ];
  for (const invalidColor of invalidColors) {
    assert.throws(() => validatePrimaryColor(invalidColor), error => error.status === 400, `Color ${invalidColor} should be rejected`);
  }

  // Accessible rendering contract
  const darkBrand = resolveBrandColorContract('#1B4D3E');
  assert.equal(darkBrand.effectivePrimaryColor, '#1B4D3E');
  assert.equal(darkBrand.foregroundColor, '#FFFFFF');
  assert.equal(darkBrand.textOnLightColor, '#1B4D3E');
  assert.equal(darkBrand.wcagAaOnWhite, true);

  const lightBrand = resolveBrandColorContract('#FFFF00');
  assert.equal(lightBrand.effectivePrimaryColor, '#FFFF00');
  assert.equal(lightBrand.foregroundColor, '#0F172A');
  assert.equal(lightBrand.textOnLightColor, '#1E293B');
  assert.equal(lightBrand.wcagAaOnWhite, false);

  const defaultBrand = resolveBrandColorContract(null);
  assert.equal(defaultBrand.effectivePrimaryColor, '#B45309');
  assert.equal(defaultBrand.foregroundColor, '#FFFFFF');
  assert.equal(defaultBrand.wcagAaOnWhite, true);

  // Welcome message validation
  assert.equal(validateWelcomeMessage('Welcome to Greenhill Academy'), 'Welcome to Greenhill Academy');
  assert.equal(validateWelcomeMessage('   '), null);
  assert.equal(validateWelcomeMessage(null), null);
  assert.equal(validateWelcomeMessage('A'.repeat(280)), 'A'.repeat(280));
  assert.throws(() => validateWelcomeMessage('A'.repeat(281)), error => error.status === 400);
  assert.throws(() => validateWelcomeMessage('Hello\nWorld'), error => error.status === 400);
  assert.throws(() => validateWelcomeMessage('Hello\u0000World'), error => error.status === 400);
  assert.throws(() => validateWelcomeMessage('Hello\u001B[31mWorld'), error => error.status === 400);
  assert.throws(() => validateWelcomeMessage('<script>alert(1)</script>'), error => error.status === 400);
  assert.throws(() => validateWelcomeMessage('<b>Welcome</b>'), error => error.status === 400);
  assert.throws(() => validateWelcomeMessage('Visit https://evil.example now'), error => error.status === 400);
  assert.throws(() => validateWelcomeMessage('data:text/html;base64,PHNjcmlwdD4='), error => error.status === 400);

  // Versioned logo URL helper
  const logoKey1 = `school-logos/${randomUUID()}/${randomUUID()}.png`;
  const logoKey2 = `school-logos/${randomUUID()}/${randomUUID()}.png`;
  const url1 = publicSchoolLogoUrl('greenhill', logoKey1);
  const url2 = publicSchoolLogoUrl('greenhill', logoKey2);
  assert.match(url1, /^\/api\/v1\/public\/schools\/greenhill\/logo\?v=[a-f0-9]{12}$/);
  assert.notEqual(url1, url2, 'Replacing logo key must produce a new versioned URL');
  assert.equal(publicSchoolLogoUrl(null, logoKey1), null);
  assert.equal(publicSchoolLogoUrl('greenhill', null), null);
});

test('Unit: Controlled School Theme System schema, import/export, CSS extractor, contrast & parent isolation', async () => {
  const {
    DEFAULT_SCHOOL_THEME_DOCUMENT,
    DEFAULT_SCHOOL_THEME_TOKENS,
    MAX_THEME_IMPORT_BYTES,
    validateSchoolThemeDocument,
    applySchoolThemePatch,
    parseAndValidateImportedTheme,
    extractControlledCssVariables,
    resolveThemeRuntimeContract,
    resolveParentSchoolIdentity,
    resolveSecondarySurfaceContract,
  } = require('../dist/school-branding');

  // 1. Default theme document validates cleanly and uses unified #B45309 primary (WCAG 2.2 AA 5.02:1)
  const validDefault = validateSchoolThemeDocument(DEFAULT_SCHOOL_THEME_DOCUMENT);
  assert.equal(validDefault.schemaVersion, 1);
  assert.equal(validDefault.tokens.colors.primary, '#B45309');
  assert.equal(validDefault.tokens.typography.fontFamily, 'inter');
  assert.equal(validDefault.tokens.radius, 'md');

  // F-11: Legacy #E87E24 (2.81:1 contrast on white) is rejected without exemption
  assert.throws(
    () => applySchoolThemePatch(DEFAULT_SCHOOL_THEME_DOCUMENT, {
      colors: { primary: '#E87E24' },
    }),
    error => error.status === 400 && /Primary brand color.*does not meet WCAG 2\.2 AA/.test(error.message),
    'Legacy #E87E24 primary color must be rejected by WCAG 2.2 AA check',
  );

  // F-12 & F-13: Dark and light secondary backgrounds & active nav distinction
  const darkSecondary = resolveSecondarySurfaceContract('#0F172A', '#B45309');
  assert.equal(darkSecondary.tone, 'dark');
  assert.equal(darkSecondary.meetsWcagAa, true);
  assert.equal(darkSecondary.foregroundColor, '#FFFFFF');
  assert.equal(darkSecondary.requiresActiveDistinction, false);

  const lightSecondary = resolveSecondarySurfaceContract('#F8FAFC', '#1E3A8A');
  assert.equal(lightSecondary.tone, 'light');
  assert.equal(lightSecondary.meetsWcagAa, true);
  assert.equal(lightSecondary.foregroundColor, '#0F172A');
  assert.equal(lightSecondary.mutedForegroundColor, '#475569');
  assert.equal(lightSecondary.requiresActiveDistinction, false);

  const validLightSecondaryDoc = applySchoolThemePatch(DEFAULT_SCHOOL_THEME_DOCUMENT, {
    colors: { primary: '#1E3A8A', secondary: '#F8FAFC' },
  });
  assert.equal(validLightSecondaryDoc.tokens.colors.secondary, '#F8FAFC');
  const lightRuntime = resolveThemeRuntimeContract(validLightSecondaryDoc);
  assert.equal(lightRuntime.cssVariables['--school-secondary-foreground'], '#0F172A');
  assert.equal(lightRuntime.cssVariables['--school-secondary-muted'], '#475569');

  // Identical primary and secondary colors preserve active navigation distinction via border/indicator
  const identicalColors = resolveSecondarySurfaceContract('#1E293B', '#1E293B');
  assert.equal(identicalColors.meetsWcagAa, true);
  assert.equal(identicalColors.requiresActiveDistinction, true);
  assert.equal(identicalColors.activeNavBorderColor, '#FFFFFF');
  assert.equal(identicalColors.activeNavIndicatorColor, '#FFFFFF');

  // 2. Malformed theme files rejected
  assert.throws(() => parseAndValidateImportedTheme('{invalid-json'), error => error.status === 400);
  assert.throws(() => parseAndValidateImportedTheme(null), error => error.status === 400);
  assert.throws(() => parseAndValidateImportedTheme([]), error => error.status === 400);

  // 3. Unsupported schema versions rejected
  for (const badVersion of [0, 2, '1', '1.0', null, undefined]) {
    assert.throws(
      () => validateSchoolThemeDocument({ ...DEFAULT_SCHOOL_THEME_DOCUMENT, schemaVersion: badVersion }),
      error => error.status === 400,
    );
  }

  // 4. Unexpected properties rejected at root, tokens, colors, semantic, typography
  assert.throws(
    () => validateSchoolThemeDocument({ ...DEFAULT_SCHOOL_THEME_DOCUMENT, tailwindConfig: {} }),
    error => error.status === 400,
  );
  assert.throws(
    () => validateSchoolThemeDocument({ ...DEFAULT_SCHOOL_THEME_DOCUMENT, customCss: 'body{color:red}' }),
    error => error.status === 400,
  );
  assert.throws(
    () => validateSchoolThemeDocument({ ...DEFAULT_SCHOOL_THEME_DOCUMENT, slug: 'greenhill' }),
    error => error.status === 400,
  );
  assert.throws(
    () => validateSchoolThemeDocument({ ...DEFAULT_SCHOOL_THEME_DOCUMENT, name: 'Spoofed School' }),
    error => error.status === 400,
  );
  assert.throws(
    () => validateSchoolThemeDocument({
      ...DEFAULT_SCHOOL_THEME_DOCUMENT,
      tokens: { ...DEFAULT_SCHOOL_THEME_TOKENS, sidebarWidth: '500px' },
    }),
    error => error.status === 400,
  );
  assert.throws(
    () => validateSchoolThemeDocument({
      ...DEFAULT_SCHOOL_THEME_DOCUMENT,
      tokens: {
        ...DEFAULT_SCHOOL_THEME_TOKENS,
        colors: { ...DEFAULT_SCHOOL_THEME_TOKENS.colors, border: '#000000' },
      },
    }),
    error => error.status === 400,
  );

  // 5. Oversized theme upload (> 16 KB) rejected
  const oversizedJson = JSON.stringify({
    ...DEFAULT_SCHOOL_THEME_DOCUMENT,
    welcomeMessage: 'A'.repeat(MAX_THEME_IMPORT_BYTES + 100),
  });
  assert.throws(() => parseAndValidateImportedTheme(oversizedJson), error => error.status === 400);

  // 6. Unsupported fonts and radii rejected
  assert.throws(
    () => applySchoolThemePatch(DEFAULT_SCHOOL_THEME_DOCUMENT, {
      tokens: { typography: { fontFamily: 'Comic Sans MS' } },
    }),
    error => error.status === 400,
  );
  assert.throws(
    () => applySchoolThemePatch(DEFAULT_SCHOOL_THEME_DOCUMENT, {
      tokens: { typography: { fontFamily: 'url(https://fonts.googleapis.com/css?family=Evil)' } },
    }),
    error => error.status === 400,
  );
  assert.throws(
    () => applySchoolThemePatch(DEFAULT_SCHOOL_THEME_DOCUMENT, {
      tokens: { radius: '999px' },
    }),
    error => error.status === 400,
  );

  // 7. Unreadable low-contrast text/background and primary/secondary combinations rejected (WCAG 2.2 AA)
  assert.throws(
    () => applySchoolThemePatch(DEFAULT_SCHOOL_THEME_DOCUMENT, {
      tokens: { colors: { background: '#111827', textMain: '#1E293B' } },
    }),
    error => error.status === 400,
    'Dark text on dark background must be rejected by WCAG AA check',
  );
  assert.throws(
    () => applySchoolThemePatch(DEFAULT_SCHOOL_THEME_DOCUMENT, {
      tokens: { colors: { surface: '#FFFFFF', textMuted: '#F3F4F6' } },
    }),
    error => error.status === 400,
    'Low-contrast muted text on white surface must be rejected',
  );
  assert.throws(
    () => applySchoolThemePatch(DEFAULT_SCHOOL_THEME_DOCUMENT, {
      colors: { primary: '#FFFF00' },
    }),
    error => error.status === 400 && /Primary brand color.*does not meet WCAG 2\.2 AA/.test(error.message),
    'Low-contrast yellow primary color (#FFFF00) must be rejected by WCAG 2.2 AA check',
  );
  assert.throws(
    () => applySchoolThemePatch(DEFAULT_SCHOOL_THEME_DOCUMENT, {
      colors: { secondary: '#CBD5E1' },
    }),
    error => error.status === 400 && /Secondary brand color.*does not meet WCAG 2\.2 AA/.test(error.message),
    'Low-contrast light slate secondary color (#CBD5E1) must be rejected by WCAG 2.2 AA check',
  );

  // 7b. Concise { schemaVersion: 1, colors: { primary, secondary }, welcomeMessage } format supported, semantic overrides rejected
  const conciseValidated = validateSchoolThemeDocument({
    schemaVersion: 1,
    colors: {
      primary: '#1E40AF',
      secondary: '#134E4A',
    },
    welcomeMessage: 'Welcome to St. Jude Academy',
  });
  assert.equal(conciseValidated.tokens.colors.primary, '#1E40AF');
  assert.equal(conciseValidated.tokens.colors.secondary, '#134E4A');
  assert.equal(conciseValidated.welcomeMessage, 'Welcome to St. Jude Academy');

  for (const semanticKey of ['success', 'warning', 'error', 'danger']) {
    assert.throws(
      () => validateSchoolThemeDocument({
        schemaVersion: 1,
        colors: {
          primary: '#1E40AF',
          secondary: '#134E4A',
          [semanticKey]: '#123456',
        },
        welcomeMessage: 'Welcome',
      }),
      error => error.status === 400,
      `Concise colors payload must reject semantic override "${semanticKey}"`,
    );
  }

  // 8. Controlled CSS variable extractor accepts safe `:root` `--sa-*` declarations and rejects malicious CSS
  const extractedTheme = extractControlledCssVariables(
    ':root { --sa-primary: #1b4d3e; --sa-secondary: #0f172a; --sa-radius: lg; --sa-font: plus-jakarta; }',
  );
  assert.equal(extractedTheme.tokens.colors.primary, '#1B4D3E');
  assert.equal(extractedTheme.tokens.colors.secondary, '#0F172A');
  assert.equal(extractedTheme.tokens.radius, 'lg');
  assert.equal(extractedTheme.tokens.typography.fontFamily, 'plus-jakarta');

  const maliciousCssPayloads = [
    'body { display: none; }',
    ':root { --sa-primary: #1B4D3E; } body { background: red; }',
    ':root { --sa-primary: url(https://evil.example/a.png); }',
    ':root { --sa-primary: expression(alert(1)); }',
    '@import url("https://evil.example/theme.css"); :root { --sa-primary: #1B4D3E; }',
    ':root { --sa-primary: var(--injected); }',
    ':root { /* comment */ --sa-primary: #1B4D3E; }',
    ':root { --unknown-token: #1B4D3E; }',
    ':root { background-image: data:image/svg+xml;base64,PHN2Zz4=; }',
  ];
  for (const badCss of maliciousCssPayloads) {
    assert.throws(
      () => extractControlledCssVariables(badCss),
      error => error.status === 400,
      `Malicious CSS must be rejected: ${badCss}`,
    );
  }

  // 9. Runtime CSS variables and Parent Theme Isolation verification
  const runtime = resolveThemeRuntimeContract(extractedTheme);
  assert.equal(runtime.cssVariables['--sa-primary'], '#1B4D3E');
  assert.equal(runtime.cssVariables['--sa-radius'], '12px');
  assert.equal(runtime.applicationPolicy.staffPortal.applyThemeTokens, true);
  assert.equal(runtime.applicationPolicy.teacherApp.applyAccentTokens, true);
  assert.equal(runtime.applicationPolicy.parentApp.applyThemeTokens, false);
  assert.equal(runtime.applicationPolicy.parentApp.globalBrandLocked, true);

  const parentIdentity = resolveParentSchoolIdentity({
    name: 'Greenhill Academy',
    slug: 'greenhill',
    logoStorageKey: `school-logos/${randomUUID()}/${randomUUID()}.png`,
  });
  assert.equal(parentIdentity.schoolName, 'Greenhill Academy');
  assert.equal(parentIdentity.themeTokensApplied, false);
  assert.equal(parentIdentity.globalBrandLocked, true);
  assert.deepEqual(parentIdentity.globalTokens, DEFAULT_SCHOOL_THEME_TOKENS);
});

test('Unit: school logo SVG/PNG/WebP validation, sanitization, metadata stripping, and rejection of unsafe formats', async () => {
  const {
    validateSchoolLogoPng,
    validateSchoolLogoUpload,
    sanitizeAndValidateSchoolLogoSvg,
    maxSchoolLogoBytes,
  } = require('../dist/announcement-media');

  const validPng = await sharp({
    create: { width: 800, height: 600, channels: 4, background: { r: 27, g: 77, b: 62, alpha: 1 } },
  })
    .withMetadata({ exif: { IFD0: { Copyright: 'Secret Metadata' } } })
    .png()
    .toBuffer();

  const processed = await validateSchoolLogoPng(validPng);
  assert.equal(processed.mimeType, 'image/png');
  assert.equal(processed.width, 512);
  assert.equal(processed.height, 384);
  const decodedMeta = await sharp(processed.bytes).metadata();
  assert.equal(decodedMeta.format, 'png');
  assert.equal(decodedMeta.exif, undefined, 'EXIF metadata must be stripped');

  // Valid WebP logo upload normalized into safe PNG raster preserving aspect ratio (horizontal 600x200 -> 512x171)
  const validWebp = await sharp({
    create: { width: 600, height: 200, channels: 4, background: { r: 30, g: 64, b: 175, alpha: 0.9 } },
  }).webp().toBuffer();
  const processedWebp = await validateSchoolLogoUpload(validWebp, 'image/webp');
  assert.equal(processedWebp.mimeType, 'image/png');
  assert.equal(processedWebp.width, 512);
  assert.equal(processedWebp.height, 171);

  // Valid SVG logo upload sanitized and normalized into safe PNG raster preserving aspect ratio (vertical 200x400 -> 256x512)
  const cleanSvg = Buffer.from(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 400" width="200" height="400"><rect x="10" y="10" width="180" height="380" rx="20" fill="#1B4D3E"/><circle cx="100" cy="200" r="60" fill="#FFFFFF"/></svg>',
  );
  const sanitizedSvg = sanitizeAndValidateSchoolLogoSvg(cleanSvg);
  assert.ok(sanitizedSvg.length > 0);
  const processedSvg = await validateSchoolLogoUpload(cleanSvg, 'image/svg+xml');
  assert.equal(processedSvg.mimeType, 'image/png');
  assert.equal(processedSvg.width, 256);
  assert.equal(processedSvg.height, 512);

  // F-10: Valid large SVG (1500x1500 within 2048px limit) scales raster density dynamically and succeeds cleanly
  const largeValidSvg = Buffer.from(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1500 1500" width="1500" height="1500"><rect width="1500" height="1500" rx="120" fill="#1E3A8A"/><circle cx="750" cy="750" r="500" fill="#FFFFFF"/></svg>',
  );
  const processedLargeSvg = await validateSchoolLogoUpload(largeValidSvg, 'image/svg+xml');
  assert.equal(processedLargeSvg.mimeType, 'image/png');
  assert.equal(processedLargeSvg.width, 512);
  assert.equal(processedLargeSvg.height, 512);

  // F-01: Valid SVG with XML numeric character references in allowed attributes decodes and renders cleanly
  const entityAttrSvg = Buffer.from(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120"><g transform="translate(10&#44; 10)"><rect width="100" height="100" fill="&#35;1B4D3E"/></g></svg>',
  );
  const processedEntitySvg = await validateSchoolLogoUpload(entityAttrSvg, 'image/svg+xml');
  assert.equal(processedEntitySvg.mimeType, 'image/png');
  assert.equal(processedEntitySvg.width, 240);
  assert.equal(processedEntitySvg.height, 240);

  // F-01: Quoted '>' inside attribute value is parsed as part of the attribute by quote-aware tag parser and rejected cleanly
  assert.throws(
    () => sanitizeAndValidateSchoolLogoSvg(
      Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><g id="a>b"><rect width="10" height="10"/></g></svg>'),
    ),
    error => error.status === 400 && /SVG id attribute/.test(error.message),
  );

  // Reject malicious SVGs (script, event handlers, foreignObject, XXE DOCTYPE/ENTITY, external URLs, data: URLs, style tags, anchors, <use>, <symbol>, recursive references, entity-encoded URIs, excessive depth/count/dimensions)
  const deepNestedSvg =
    '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100">' +
    '<g>'.repeat(18) +
    '<rect width="10" height="10"/>' +
    '</g>'.repeat(18) +
    '</svg>';
  const manyElementsSvg =
    '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100">' +
    '<rect width="1" height="1"/>'.repeat(505) +
    '</svg>';

  const maliciousSvgs = [
    '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><script>alert(1)</script></svg>',
    '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" onload="alert(1)"><rect width="100" height="100"/></svg>',
    '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" onclick="evil()"/></svg>',
    '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><foreignObject><div>HTML</div></foreignObject></svg>',
    '<!DOCTYPE svg [<!ENTITY xxe SYSTEM "file:///etc/passwd">]><svg xmlns="http://www.w3.org/2000/svg"><text>&xxe;</text></svg>',
    '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><image href="https://evil.example/logo.png"/></svg>',
    '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><use href="https://evil.example/defs.svg#icon"/></svg>',
    '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><defs><g id="a"><use href="#b"/></g><g id="b"><use href="#a"/></g></defs><use href="#a"/></svg>',
    '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><symbol id="s"><rect width="10" height="10"/></symbol><use href="#s"/></svg>',
    '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect fill="url(https://evil.example/grad)"/></svg>',
    '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect fill="url(&#104;&#116;&#116;&#112;&#115;://evil.example/grad)"/></svg>',
    '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect fill="&#x6a;&#x61;&#x76;&#x61;&#x73;&#x63;&#x72;&#x69;&#x70;&#x74;:alert(1)"/></svg>',
    '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect id="&unknownEntity;" width="10" height="10"/></svg>',
    '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><a href="javascript:alert(1)"><rect width="100" height="100"/></a></svg>',
    '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><style>rect { fill: url(https://evil.example/x); }</style><rect width="100" height="100"/></svg>',
    '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect style="background:url(data:text/html,evil)"/></svg>',
    '<svg xmlns="http://www.w3.org/2000/svg" width="100in" height="100in"><rect width="100" height="100"/></svg>',
    '<svg xmlns="http://www.w3.org/2000/svg" width="2000mm" height="2000mm"><rect width="100" height="100"/></svg>',
    '<svg xmlns="http://www.w3.org/2000/svg" width="3000px" height="300" viewBox="0 0 3000 300"><rect width="100" height="100"/></svg>',
    '<svg xmlns="http://www.w3.org/2000/svg" width="500" height="500" viewBox="0 0 5000 5000"><rect width="100" height="100"/></svg>',
    '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><g><rect width="10" height="10"></svg>',
    deepNestedSvg,
    manyElementsSvg,
  ];
  for (const badSvg of maliciousSvgs) {
    assert.throws(
      () => sanitizeAndValidateSchoolLogoSvg(Buffer.from(badSvg)),
      error => error.status === 400,
      `Malicious SVG must be rejected: ${badSvg}`,
    );
    await assert.rejects(
      validateSchoolLogoUpload(Buffer.from(badSvg), 'image/svg+xml'),
      error => error.status === 400,
    );
  }

  // Reject MIME spoofing (SVG sent as image/png, PNG sent as image/svg+xml, HTML sent as image/webp)
  await assert.rejects(validateSchoolLogoUpload(cleanSvg, 'image/png'), error => error.status === 400);
  await assert.rejects(validateSchoolLogoUpload(validPng, 'image/svg+xml'), error => error.status === 400);
  await assert.rejects(validateSchoolLogoUpload(Buffer.from('<html></html>'), 'image/webp'), error => error.status === 400);

  // Reject HTML & Script
  await assert.rejects(validateSchoolLogoPng(Buffer.from('<!DOCTYPE html><html><body><script>alert(1)</script></body></html>')), error => error.status === 400);
  await assert.rejects(validateSchoolLogoPng(Buffer.from('function exploit() { return true; }')), error => error.status === 400);

  // Reject PNG signature with corrupted body
  const corruptedPng = Buffer.concat([validPng.subarray(0, 32), Buffer.from('corrupted-raster-payload-bytes-0123456789')]);
  await assert.rejects(validateSchoolLogoPng(corruptedPng), error => error.status === 400);

  // Reject oversized (> 2 MB)
  await assert.rejects(validateSchoolLogoPng(Buffer.alloc(maxSchoolLogoBytes + 1, 0x89)), error => error.status === 400);

  // Reject excessive dimensions (> 2048px)
  const oversizedWidthPng = await sharp({
    create: { width: 2049, height: 64, channels: 3, background: '#ffffff' },
  }).png().toBuffer();
  await assert.rejects(validateSchoolLogoPng(oversizedWidthPng), error => error.status === 400);

  // Reject JPEG disguised as PNG buffer input
  const jpegBytes = await sharp(validPng).jpeg().toBuffer();
  await assert.rejects(validateSchoolLogoPng(jpegBytes), error => error.status === 400);
});

test('Unit: NV-05 secondary sidebar contrast is enforced after overlay compositing using shared vectors', async () => {
  const { resolveSecondarySurfaceContract, contrastRatio, applySchoolThemePatch, DEFAULT_SCHOOL_THEME_DOCUMENT, compositeOverlayHex } = require('../dist/school-branding');
  const vectors = JSON.parse(await readFile(resolve(__dirname, '../../../packages/shared-utils/test-vectors/secondary-surface-vectors.json'), 'utf8')).vectors;
  assert.ok(vectors.length >= 15);
  for (const vector of vectors) {
    const contract = resolveSecondarySurfaceContract(vector.secondary, '#B45309');
    assert.equal(contract.meetsWcagAa, vector.valid, `validity for ${vector.secondary}`);
    assert.equal(contract.tone, vector.tone, `tone for ${vector.secondary}`);
    assert.equal(contract.mutedForegroundColor, vector.mutedForeground, `muted for ${vector.secondary}`);
    assert.equal(contract.compositedSurfaceColor, vector.compositedSurface, `surface for ${vector.secondary}`);
    assert.equal(contract.compositedHoverColor, vector.compositedHover, `hover for ${vector.secondary}`);
    if (vector.valid) {
      // Campus selector, welcome surface and hover text, plus the non-text bullet on hover.
      for (const background of [vector.secondary, contract.compositedSurfaceColor, contract.compositedHoverColor]) {
        assert.ok(contrastRatio(background, contract.foregroundColor) >= 4.5, `foreground on ${background}`);
      }
      for (const background of [vector.secondary, contract.compositedSurfaceColor]) {
        assert.ok(contrastRatio(background, contract.mutedForegroundColor) >= 4.5, `muted on ${background}`);
      }
      assert.ok(contrastRatio(contract.compositedHoverColor, contract.mutedForegroundColor) >= 3, 'hover bullet is at least 3:1');
    }
  }

  // The #757575 boundary: passes against white as a base color but fails once overlays are composited.
  assert.ok(contrastRatio('#757575', '#FFFFFF') >= 4.5);
  assert.equal(compositeOverlayHex('#757575', [255, 255, 255], 0.08), '#808080');
  assert.throws(
    () => applySchoolThemePatch(DEFAULT_SCHOOL_THEME_DOCUMENT, { colors: { secondary: '#757575' } }),
    error => error.status === 400 && /after the translucent sidebar surface and hover overlays are composited/.test(error.message),
  );
  assert.equal(applySchoolThemePatch(DEFAULT_SCHOOL_THEME_DOCUMENT, { colors: { secondary: '#636363' } }).tokens.colors.secondary, '#636363');
  assert.throws(() => applySchoolThemePatch(DEFAULT_SCHOOL_THEME_DOCUMENT, { colors: { secondary: '#646464' } }), error => error.status === 400);

  // Identical primary and secondary keep the active navigation state distinguishable.
  const identical = resolveSecondarySurfaceContract('#1E293B', '#1E293B');
  assert.equal(identical.requiresActiveDistinction, true);
  assert.ok(contrastRatio(identical.activeNavBorderColor, '#1E293B') >= 3);
  assert.equal(identical.activeNavIndicatorColor, '#FFFFFF');
});

test('Unit: NV-04 SVG raster density honours viewBox, physical units, and rejects invalid dimensions', async () => {
  const { resolveSvgRasterDensity, validateSchoolLogoUpload } = require('../dist/announcement-media');
  const svg = attrs => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" ${attrs}><rect width="100" height="100" fill="#1B4D3E"/></svg>`);
  const root = attrs => `<svg xmlns="http://www.w3.org/2000/svg" ${attrs}>`;

  assert.equal(resolveSvgRasterDensity(root('viewBox="0 0 1500 1500"')), 98);
  assert.equal(resolveSvgRasterDensity(root('viewBox="0 0 2048 2048"')), 72);
  assert.equal(resolveSvgRasterDensity(root('viewBox="0 0 100 100"')), 144);
  assert.equal(resolveSvgRasterDensity(root('viewBox="0 0 100 100" width="1500" height="1500"')), 98, 'explicit dimensions win over viewBox');
  assert.equal(resolveSvgRasterDensity(root('viewBox="0 0 2000 1000" width="1000"')), 144, 'missing height follows viewBox aspect ratio');
  assert.equal(resolveSvgRasterDensity(root('viewBox="0 0 1500 1500" width="100%" height="100%"')), 98, 'percentages fall back to viewBox');
  assert.throws(() => resolveSvgRasterDensity(root('viewBox="0 0 1 100" width="1000"')), error => error.status === 400, 'derived height exceeds the limit');
  assert.throws(() => resolveSvgRasterDensity(root('viewBox="0 0 0 100"')), error => error.status === 400);
  assert.throws(() => resolveSvgRasterDensity(root('viewBox="0 0 NaN 100"')), error => error.status === 400);

  for (const [attrs, expected] of [
    ['viewBox="0 0 1500 1500"', 512],
    ['viewBox="0 0 2048 2048"', 512],
    ['viewBox="0 0 64 64"', 128],
    ['viewBox="0 0 100 100" width="1500" height="1500"', 512],
    ['width="20in" height="20in"', 512],
    ['width="10in" height="5in"', 512],
  ]) {
    const result = await validateSchoolLogoUpload(svg(attrs), 'image/svg+xml');
    assert.equal(result.mimeType, 'image/png', attrs);
    assert.ok(result.width <= expected && result.height <= expected, attrs);
    assert.equal(Math.max(result.width, result.height), expected, `${attrs} output size`);
  }

  for (const attrs of [
    'viewBox="0 0 0 100"',
    'viewBox="0 0 -5 5"',
    'viewBox="0 0 abc 5"',
    'viewBox="0 0 Infinity 5"',
    'viewBox="0 0 3000 3000"',
    'viewBox="0 0 1 100" width="1000"',
    'width="0" height="10"',
    'width="99999px" height="99999px"',
    'width="-5" height="5"',
  ]) {
    await assert.rejects(validateSchoolLogoUpload(svg(attrs), 'image/svg+xml'), error => error.status === 400, attrs);
  }
});

test('Unit: NV-03 serializer never derives values from draft or previous themes without includeDraft', async () => {
  const { formatAuthenticatedSchoolBranding, validateSchoolThemeDocument } = require('../dist/school-branding');
  const draft = validateSchoolThemeDocument({ schemaVersion: 1, colors: { primary: '#1E40AF', secondary: '#F8FAFC' }, welcomeMessage: 'Draft only' });
  const school = {
    id: randomUUID(), name: 'Draft School', slug: 'draft-school', logoStorageKey: null,
    publishedTheme: null, draftTheme: draft, previousPublishedTheme: draft, themeVersion: 0,
  };
  const redacted = formatAuthenticatedSchoolBranding(school, { includeDraft: false });
  assert.equal(redacted.primaryColor, null);
  assert.equal(redacted.secondaryColor, null);
  assert.equal(redacted.welcomeMessage, null);
  assert.equal(redacted.draftTheme, null);
  assert.equal(redacted.hasDraftTheme, false);
  assert.equal(redacted.canRollback, false);
  assert.equal(redacted.colorContract.effectivePrimaryColor, '#B45309');
  assert.equal(JSON.stringify(redacted).includes('#1E40AF'), false);
  assert.equal(JSON.stringify(redacted).includes('#F8FAFC'), false);
  const manager = formatAuthenticatedSchoolBranding(school);
  assert.equal(manager.secondaryColor, '#F8FAFC');
  assert.equal(manager.hasDraftTheme, true);
});

test('Integration: database constraints, RBAC, Theme Studio draft/preview/import/export/publish/rollback, parent isolation, logo lifecycle, public endpoints, and regressions', { timeout: 180000 }, async () => {
  const mediaRoot = await mkdtemp(join(tmpdir(), 'syncacademy-branding-media-'));
  process.env.ANNOUNCEMENT_MEDIA_DIRECTORY = mediaRoot;

  const provision = new Pool({ connectionString: adminUrl.toString(), connectionTimeoutMillis: 5000 });
  try {
    const exists = await provision.query('SELECT 1 FROM pg_database WHERE datname = $1', ['syncacademy_branding_test']);
    if (!exists.rows.length) {
      await provision.query('CREATE DATABASE syncacademy_branding_test');
    }
  } finally {
    await provision.end();
  }

  const db = new PrismaClient();
  const { passwordHash, encrypt } = require('../dist/security');

  const migrate = spawnSync(
    process.execPath,
    [resolve(__dirname, '../scripts/deploy-migrations.cjs')],
    { env: process.env, encoding: 'utf8' },
  );
  assert.equal(migrate.status, 0, `Migrations must apply cleanly: ${migrate.stderr || migrate.stdout}`);

  await db.$executeRawUnsafe(
    'TRUNCATE TABLE "PublicFormAttempt", "PublicFormBlock", "PlatformLeadActivity", "RegistryEvent", "Admission", "session", "Outbox", "Idempotency", "RateBucket", "AuditEvent", "SecurityEvent", "Invitation", "PasswordReset", "TeachingAssignment", "Enrollment", "Student", "Classroom", "AcademicYear", "Membership", "School", "User" CASCADE',
  );

  const api = spawn(process.execPath, ['dist/main.js'], {
    cwd: resolve(__dirname, '..'),
    env: process.env,
    stdio: 'ignore',
  });

  const base = `http://localhost:${process.env.PORT}/api/v1/`;
  const origin = process.env.APP_ORIGIN;
  const strongPassword = 'Only-for-isolated-tests-' + randomUUID();

  function createClient() {
    let cookie = '';
    return {
      get cookie() { return cookie; },
      async call(method, route, body, headers = {}) {
        const isRaw = Buffer.isBuffer(body);
        const response = await fetch(base + route, {
          method,
          headers: {
            Origin: origin,
            'X-Requested-With': 'SyncAcademy',
            ...(isRaw ? {} : { 'Content-Type': 'application/json' }),
            ...(cookie ? { Cookie: cookie } : {}),
            ...headers,
          },
          ...(body !== undefined ? { body: isRaw ? body : JSON.stringify(body) } : {}),
        });
        const set = response.headers.getSetCookie();
        if (set.length) cookie = set.map(c => c.split(';')[0]).join('; ');
        const contentType = response.headers.get('content-type') || '';
        const payload = response.status === 304
          ? null
          : contentType.includes('application/json')
            ? await response.json()
            : Buffer.from(await response.arrayBuffer());
        return {
          status: response.status,
          body: payload,
          headers: response.headers,
        };
      },
      async login(email, role, password = strongPassword) {
        return this.call('POST', 'auth/login', { email, password, role, rememberMe: false });
      },
    };
  }

  try {
    // Wait for API readiness
    for (let i = 0; i < 60; i++) {
      try {
        const ready = await fetch(base + 'health/ready');
        if (ready.ok) break;
      } catch {}
      await new Promise(r => setTimeout(r, 250));
    }

    // 1. Database constraint tests
    const legacySchool = await db.school.create({
      data: { name: 'Legacy Primary School', code: 'LPS', region: 'Dar es Salaam' },
    });
    assert.equal(legacySchool.slug, null, 'Existing/newly provisioned schools default to null slug');
    assert.equal(legacySchool.logoStorageKey, null);
    assert.equal(legacySchool.publishedTheme, null);
    assert.equal(legacySchool.draftTheme, null);
    assert.equal(legacySchool.previousPublishedTheme, null);
    assert.equal(legacySchool.themeVersion, 0);

    const secondLegacySchool = await db.school.create({
      data: { name: 'Second Legacy School', code: 'SLS', region: 'Arusha' },
    });
    assert.equal(secondLegacySchool.slug, null, 'Multiple schools can have null slugs simultaneously');

    // Database-level rejection of reserved slug, invalid slug format, invalid logoStorageKey, and non-object JSONB
    await assert.rejects(
      db.school.create({ data: { name: 'Reserved DB Test', code: 'RDT', region: 'Mwanza', slug: 'admin' } }),
      'Database CHECK constraint must reject reserved slug',
    );
    await assert.rejects(
      db.school.create({ data: { name: 'Invalid Format DB Test', code: 'IFD', region: 'Mwanza', slug: 'Invalid_Slug' } }),
      'Database CHECK constraint must reject invalid slug format',
    );
    await assert.rejects(
      db.school.create({ data: { name: 'Invalid Logo Key DB Test', code: 'ILK', region: 'Mwanza', logoStorageKey: '../evil.png' } }),
      'Database CHECK constraint must reject invalid logoStorageKey',
    );
    await assert.rejects(
      db.school.create({ data: { name: 'Invalid Theme JSON DB Test', code: 'ITJ', region: 'Mwanza', publishedTheme: ['not-an-object'] } }),
      'Database CHECK constraint must reject non-object publishedTheme',
    );

    // 2. Provision Super Admin, School A (Greenhill), School B (Kilimanjaro), Headmasters, and Teacher
    const totpSecret = authenticator.generateSecret();
    const superAdminUser = await db.user.create({
      data: {
        email: 'superadmin@syncacademy.test',
        name: 'Platform Super Admin',
        passwordHash: await passwordHash(strongPassword),
        platformAdmin: true,
        mfaSecret: encrypt(totpSecret),
      },
    });

    const superAdmin = createClient();
    const challenge = await superAdmin.call('POST', 'auth/platform/login', {
      email: superAdminUser.email,
      password: strongPassword,
    });
    assert.equal(challenge.status, 201);
    assert.equal(challenge.body.stage, 'totp');
    const verified = await superAdmin.call('POST', 'auth/platform/verify', {
      code: authenticator.generate(totpSecret),
    });
    assert.equal(verified.status, 201);
    assert.equal(verified.body.platformAdmin, true);

    const schoolACreated = await superAdmin.call(
      'POST',
      'schools',
      {
        name: 'Greenhill Academy',
        code: 'GHA',
        region: 'Dar es Salaam',
        headmasterName: 'Headmaster Greenhill',
        headmasterEmail: 'hm.greenhill@syncacademy.test',
      },
      { 'Idempotency-Key': randomUUID() },
    );
    assert.equal(schoolACreated.status, 201);
    const schoolA = schoolACreated.body.school;
    assert.equal(schoolA.code, 'GHA');
    assert.equal(schoolA.slug, null);
    assert.equal('logoStorageKey' in schoolA, false);
    assert.equal('draftTheme' in schoolA, false);
    assert.equal('previousPublishedTheme' in schoolA, false);
    assert.equal('publishedTheme' in schoolA, false, 'F-05: POST /schools must not expose publishedTheme');
    assert.equal('themeVersion' in schoolA, false, 'F-05: POST /schools must not expose themeVersion');

    const schoolsListRes = await superAdmin.call('GET', 'schools');
    assert.equal(schoolsListRes.status, 200);
    assert.ok(Array.isArray(schoolsListRes.body.items) && schoolsListRes.body.items.length > 0);
    for (const listed of schoolsListRes.body.items) {
      assert.equal('logoStorageKey' in listed, false, 'F-05: GET /schools must not expose logoStorageKey');
      assert.equal('draftTheme' in listed, false, 'F-05: GET /schools must not expose draftTheme');
      assert.equal('previousPublishedTheme' in listed, false, 'F-05: GET /schools must not expose previousPublishedTheme');
      assert.equal('publishedTheme' in listed, false, 'F-05: GET /schools must not expose publishedTheme');
      assert.equal('themeVersion' in listed, false, 'F-05: GET /schools must not expose themeVersion');
    }

    const schoolBCreated = await superAdmin.call(
      'POST',
      'schools',
      {
        name: 'Kilimanjaro Secondary',
        code: 'KSS',
        region: 'Kilimanjaro',
        headmasterName: 'Headmaster Kilimanjaro',
        headmasterEmail: 'hm.kilimanjaro@syncacademy.test',
      },
      { 'Idempotency-Key': randomUUID() },
    );
    assert.equal(schoolBCreated.status, 201);
    const schoolB = schoolBCreated.body.school;

    const hmGreenhillUser = await db.user.create({
      data: { email: 'hm.a@syncacademy.test', name: 'HM Greenhill', passwordHash: await passwordHash(strongPassword) },
    });
    await db.membership.create({ data: { schoolId: schoolA.id, userId: hmGreenhillUser.id, role: 'HEADMASTER' } });

    const hmKilimanjaroUser = await db.user.create({
      data: { email: 'hm.b@syncacademy.test', name: 'HM Kilimanjaro', passwordHash: await passwordHash(strongPassword) },
    });
    await db.membership.create({ data: { schoolId: schoolB.id, userId: hmKilimanjaroUser.id, role: 'HEADMASTER' } });

    const teacherGreenhillUser = await db.user.create({
      data: { email: 'teacher.a@syncacademy.test', name: 'Teacher Greenhill', passwordHash: await passwordHash(strongPassword) },
    });
    await db.membership.create({ data: { schoolId: schoolA.id, userId: teacherGreenhillUser.id, role: 'TEACHER' } });

    const hmA = createClient();
    assert.equal((await hmA.login(hmGreenhillUser.email, 'HEADMASTER')).status, 201);

    const hmB = createClient();
    assert.equal((await hmB.login(hmKilimanjaroUser.email, 'HEADMASTER')).status, 201);

    const teacherA = createClient();
    assert.equal((await teacherA.login(teacherGreenhillUser.email, 'TEACHER')).status, 201);

    const anonymous = createClient();

    // 3. Slug Authorization & Management Tests
    assert.equal((await anonymous.call('PATCH', `schools/${schoolA.id}/slug`, { slug: 'greenhill' })).status, 401);
    assert.equal((await hmA.call('PATCH', `schools/${schoolA.id}/slug`, { slug: 'greenhill' })).status, 403);
    assert.equal((await hmA.call('PATCH', `platform/schools/${schoolA.id}/slug`, { slug: 'greenhill' })).status, 403);
    assert.equal((await hmA.call('PATCH', `schools/${schoolA.id}/branding`, { slug: 'greenhill', primaryColor: '#1B4D3E' })).status, 403);
    assert.equal((await hmA.call('GET', `schools/${schoolA.id}/slug/audit`)).status, 403);
    assert.equal((await teacherA.call('PATCH', `schools/${schoolA.id}/slug`, { slug: 'greenhill' })).status, 403);

    // Super Admin assigns slugs to School A and School B
    const assignSlugA = await superAdmin.call('PATCH', `schools/${schoolA.id}/slug`, { slug: 'greenhill' });
    assert.equal(assignSlugA.status, 200);
    assert.equal(assignSlugA.body.slug, 'greenhill');

    const assignSlugB = await superAdmin.call('PATCH', `schools/${schoolB.id}/slug`, { slug: 'kilimanjaro' });
    assert.equal(assignSlugB.status, 200);
    assert.equal(assignSlugB.body.slug, 'kilimanjaro');

    // Duplicate slug on School B is rejected with 409 Conflict
    assert.equal((await superAdmin.call('PATCH', `platform/schools/${schoolB.id}/slug`, { slug: 'greenhill' })).status, 409);

    // 4. Controlled School Theme Studio: Draft, Preview, Validate, Import, Export, Publish, Rollback, and RBAC
    // Unauthenticated rejected
    assert.equal((await anonymous.call('GET', `schools/${schoolA.id}/theme`)).status, 401);
    assert.equal((await anonymous.call('PATCH', `schools/${schoolA.id}/theme/draft`, { primaryColor: '#1B4D3E' })).status, 401);

    // Cross-school Headmaster (School B) denied on all School A theme endpoints
    assert.equal((await hmB.call('GET', `schools/${schoolA.id}/theme`)).status, 403);
    assert.equal((await hmB.call('PATCH', `schools/${schoolA.id}/theme/draft`, { primaryColor: '#1B4D3E' })).status, 403);
    assert.equal((await hmB.call('GET', `schools/${schoolA.id}/theme/preview`)).status, 403);
    assert.equal((await hmB.call('POST', `schools/${schoolA.id}/theme/validate`, { format: 'css-variables', css: ':root { --sa-primary: #1B4D3E; }' })).status, 403);
    assert.equal((await hmB.call('POST', `schools/${schoolA.id}/theme/import`, { format: 'css-variables', css: ':root { --sa-primary: #1B4D3E; }' })).status, 403);
    assert.equal((await hmB.call('GET', `schools/${schoolA.id}/theme/export`)).status, 403);
    assert.equal((await hmB.call('POST', `schools/${schoolA.id}/theme/publish`)).status, 403);
    assert.equal((await hmB.call('POST', `schools/${schoolA.id}/theme/rollback`)).status, 403);

    // Teacher denied on Theme Studio management endpoints
    assert.equal((await teacherA.call('PATCH', `schools/${schoolA.id}/theme/draft`, { primaryColor: '#1B4D3E' })).status, 403);
    assert.equal((await teacherA.call('GET', `schools/${schoolA.id}/theme/preview`)).status, 403);
    assert.equal((await teacherA.call('POST', `schools/${schoolA.id}/theme/validate`, { format: 'css-variables', css: ':root { --sa-primary: #1B4D3E; }' })).status, 403);
    assert.equal((await teacherA.call('POST', `schools/${schoolA.id}/theme/import`, { format: 'css-variables', css: ':root { --sa-primary: #1B4D3E; }' })).status, 403);
    assert.equal((await teacherA.call('GET', `schools/${schoolA.id}/theme/export`)).status, 403);
    assert.equal((await teacherA.call('POST', `schools/${schoolA.id}/theme/publish`)).status, 403);
    assert.equal((await teacherA.call('POST', `schools/${schoolA.id}/theme/rollback`)).status, 403);

    // Headmaster A saves a draft theme
    const saveDraft = await hmA.call('PATCH', `schools/${schoolA.id}/theme/draft`, {
      tokens: {
        colors: {
          primary: '#1b4d3e',
          secondary: '#0f172a',
        },
        typography: {
          fontFamily: 'plus-jakarta',
        },
        radius: 'lg',
      },
      welcomeMessage: 'Draft Welcome to Greenhill Academy',
    });
    assert.equal(saveDraft.status, 200);
    assert.equal(saveDraft.body.hasDraftTheme, true);
    assert.equal(saveDraft.body.hasPublishedTheme, false);
    assert.equal(saveDraft.body.themeVersion, 0);
    assert.equal(saveDraft.body.draftTheme.tokens.colors.primary, '#1B4D3E');
    assert.equal(saveDraft.body.draftTheme.tokens.typography.fontFamily, 'plus-jakarta');
    assert.equal(saveDraft.body.draftTheme.tokens.radius, 'lg');

    // Public endpoint and non-manager Teacher do NOT see unpublished draft!
    const publicBeforePublish = await anonymous.call('GET', 'public/schools/greenhill/theme');
    assert.equal(publicBeforePublish.status, 200);
    assert.equal(publicBeforePublish.body.isCustomTheme, false);
    assert.equal(publicBeforePublish.body.primaryColor, null);
    assert.equal(publicBeforePublish.body.welcomeMessage, null);
    assert.equal('draftTheme' in publicBeforePublish.body, false);

    const teacherBeforePublish = await teacherA.call('GET', `schools/${schoolA.id}/theme`);
    assert.equal(teacherBeforePublish.status, 200);
    assert.equal(teacherBeforePublish.body.hasDraftTheme, false);
    assert.equal(teacherBeforePublish.body.draftTheme, null);

    // Headmaster A previews the draft theme
    const previewDraft = await hmA.call('GET', `schools/${schoolA.id}/theme/preview`);
    assert.equal(previewDraft.status, 200);
    assert.equal(previewDraft.body.source, 'draft');
    assert.equal(previewDraft.body.cssVariables['--sa-primary'], '#1B4D3E');
    assert.equal(previewDraft.body.cssVariables['--sa-radius'], '12px');

    // Headmaster A exports the draft theme JSON and validates it via /theme/validate
    const exportedDraft = await hmA.call('GET', `schools/${schoolA.id}/theme/export?target=draft`);
    assert.equal(exportedDraft.status, 200);
    assert.equal(exportedDraft.body.schemaVersion, 1);
    assert.equal(exportedDraft.body.tokens.colors.primary, '#1B4D3E');
    assert.equal('schoolId' in exportedDraft.body, false);

    const validatedJson = await hmA.call('POST', `schools/${schoolA.id}/theme/validate`, exportedDraft.body);
    assert.equal(validatedJson.status, 200);
    assert.equal(validatedJson.body.valid, true);

    // Reject malicious/invalid imports via /theme/validate and /theme/import
    assert.equal((await hmA.call('POST', `schools/${schoolA.id}/theme/validate`, { schemaVersion: 2, tokens: exportedDraft.body.tokens })).status, 400);
    assert.equal((await hmA.call('POST', `schools/${schoolA.id}/theme/validate`, { ...exportedDraft.body, extraProp: true })).status, 400);
    assert.equal((await hmA.call('POST', `schools/${schoolA.id}/theme/validate`, { format: 'css-variables', css: 'body { background: red; }' })).status, 400);
    assert.equal((await hmA.call('POST', `schools/${schoolA.id}/theme/import`, { format: 'css-variables', css: ':root { --sa-primary: url(https://evil.example/x); }' })).status, 400);

    // Publish the draft theme (version 1)
    const publishV1 = await hmA.call('POST', `schools/${schoolA.id}/theme/publish`);
    assert.equal(publishV1.status, 200);
    assert.equal(publishV1.body.themeVersion, 1);
    assert.equal(publishV1.body.hasPublishedTheme, true);
    assert.equal(publishV1.body.hasDraftTheme, false);
    assert.equal(publishV1.body.primaryColor, '#1B4D3E');
    assert.equal(publishV1.body.welcomeMessage, 'Draft Welcome to Greenhill Academy');

    // Public endpoint now serves Published Theme v1
    const publicV1 = await anonymous.call('GET', 'public/schools/greenhill/branding');
    assert.equal(publicV1.status, 200);
    assert.equal(publicV1.body.themeVersion, 1);
    assert.equal(publicV1.body.isCustomTheme, true);
    assert.equal(publicV1.body.primaryColor, '#1B4D3E');
    assert.equal(publicV1.body.theme.tokens.colors.primary, '#1B4D3E');
    assert.equal(publicV1.body.theme.tokens.radius, 'lg');

    // Import a controlled CSS variable theme into draft and publish as v2
    const importCss = await hmA.call('POST', `schools/${schoolA.id}/theme/import`, {
      format: 'css-variables',
      css: ':root { --sa-primary: #7C2D12; --sa-secondary: #1E293B; --sa-radius: sm; --sa-font: georgia-serif; }',
      welcomeMessage: 'Welcome to Greenhill Academy v2',
    });
    assert.equal(importCss.status, 200);
    assert.equal(importCss.body.hasDraftTheme, true);
    assert.equal(importCss.body.draftTheme.tokens.colors.primary, '#7C2D12');

    const publishV2 = await hmA.call('POST', `schools/${schoolA.id}/theme/publish`);
    assert.equal(publishV2.status, 200);
    assert.equal(publishV2.body.themeVersion, 2);
    assert.equal(publishV2.body.canRollback, true);
    assert.equal(publishV2.body.primaryColor, '#7C2D12');
    assert.equal(publishV2.body.welcomeMessage, 'Welcome to Greenhill Academy v2');

    // Rollback from v2 back to v1!
    const rollbackToV1 = await hmA.call('POST', `schools/${schoolA.id}/theme/rollback`);
    assert.equal(rollbackToV1.status, 200);
    assert.equal(rollbackToV1.body.themeVersion, 3);
    assert.equal(rollbackToV1.body.canRollback, false);
    assert.equal(rollbackToV1.body.primaryColor, '#1B4D3E');
    assert.equal(rollbackToV1.body.publishedTheme.tokens.typography.fontFamily, 'plus-jakarta');
    assert.equal(rollbackToV1.body.publishedTheme.tokens.radius, 'lg');

    // Direct branding update endpoint (backward compatibility) updates and publishes cleanly
    const updateBranding = await hmA.call('PATCH', `schools/${schoolA.id}/branding`, {
      primaryColor: '#1b4d3e',
      welcomeMessage: 'Welcome to Greenhill Academy',
    });
    assert.equal(updateBranding.status, 200);
    assert.equal(updateBranding.body.primaryColor, '#1B4D3E');
    assert.equal(updateBranding.body.welcomeMessage, 'Welcome to Greenhill Academy');

    // Super Admin updates School B theme & verify school switching isolation
    const saUpdateB = await superAdmin.call('PATCH', `schools/${schoolB.id}/branding`, {
      primaryColor: '#2563EB',
      welcomeMessage: 'Karibu Kilimanjaro Secondary School',
    });
    assert.equal(saUpdateB.status, 200);
    assert.equal(saUpdateB.body.primaryColor, '#2563EB');

    const publicSchoolA = await anonymous.call('GET', 'public/schools/greenhill/theme');
    const publicSchoolB = await anonymous.call('GET', 'public/schools/kilimanjaro/theme');
    assert.equal(publicSchoolA.body.primaryColor, '#1B4D3E');
    assert.equal(publicSchoolB.body.primaryColor, '#2563EB');
    assert.notEqual(publicSchoolA.body.welcomeMessage, publicSchoolB.body.welcomeMessage);

    // Parent Theme Isolation check: parent identity endpoint never applies custom school theme tokens
    const parentIdentityRes = await teacherA.call('GET', `schools/${schoolA.id}/theme/parent-identity`);
    assert.equal(parentIdentityRes.status, 200);
    assert.equal(parentIdentityRes.body.schoolName, 'Greenhill Academy');
    assert.equal(parentIdentityRes.body.themeTokensApplied, false);
    assert.equal(parentIdentityRes.body.globalBrandLocked, true);
    assert.equal(parentIdentityRes.body.globalTokens.colors.primary, '#B45309', 'Parent global brand primary must remain unified #B45309');

    // F-15: Optimistic concurrency check on theme mutations (expectedThemeVersion mismatch returns 409 Conflict)
    const currentBeforeConflict = await hmA.call('GET', `schools/${schoolA.id}/branding`);
    assert.equal(currentBeforeConflict.status, 200);
    const liveVersion = currentBeforeConflict.body.themeVersion;
    const staleVersionUpdate = await hmA.call('PATCH', `schools/${schoolA.id}/branding`, {
      colors: { primary: '#1E40AF', secondary: '#0F172A' },
      welcomeMessage: 'Stale write attempt',
      expectedThemeVersion: liveVersion - 1,
    });
    assert.equal(staleVersionUpdate.status, 409, 'Outdated expectedThemeVersion must be rejected with 409 Conflict');

    const matchingVersionUpdate = await hmA.call('PATCH', `schools/${schoolA.id}/branding`, {
      colors: { primary: '#1B4D3E', secondary: '#0F172A' },
      welcomeMessage: 'Welcome to Greenhill Academy',
      expectedThemeVersion: liveVersion,
    });
    assert.equal(matchingVersionUpdate.status, 200);
    assert.equal(matchingVersionUpdate.body.themeVersion, liveVersion + 1);

    // 5. Logo Upload, Validation, Replacement, and Orphan Cleanup Tests
    const png1 = await sharp({
      create: { width: 400, height: 400, channels: 4, background: { r: 27, g: 77, b: 62, alpha: 1 } },
    }).withMetadata({ exif: { IFD0: { Artist: 'ShouldBeRemoved' } } }).png().toBuffer();

    const png2 = await sharp({
      create: { width: 300, height: 300, channels: 4, background: { r: 15, g: 23, b: 42, alpha: 1 } },
    }).png().toBuffer();

    // Cross-school Headmaster and Teacher cannot upload logo
    assert.equal(
      (await hmB.call('PUT', `schools/${schoolA.id}/branding/logo`, png1, { 'Content-Type': 'image/png' })).status,
      403,
    );
    assert.equal(
      (await teacherA.call('PUT', `schools/${schoolA.id}/branding/logo`, png1, { 'Content-Type': 'image/png' })).status,
      403,
    );

    // Reject SVG with image/svg+xml and with spoofed image/png
    const svgPayload = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');
    assert.equal(
      (await hmA.call('PUT', `schools/${schoolA.id}/branding/logo`, svgPayload, { 'Content-Type': 'image/svg+xml' })).status,
      400,
    );
    assert.equal(
      (await hmA.call('PUT', `schools/${schoolA.id}/branding/logo`, svgPayload, { 'Content-Type': 'image/png' })).status,
      400,
    );

    // Upload initial valid PNG logo
    const uploadLogo1 = await hmA.call('PUT', `schools/${schoolA.id}/branding/logo`, png1, { 'Content-Type': 'image/png' });
    assert.equal(uploadLogo1.status, 200);
    assert.equal(uploadLogo1.body.hasLogo, true);
    assert.match(uploadLogo1.body.logoUrl, /^\/api\/v1\/public\/schools\/greenhill\/logo\?v=[a-f0-9]{12}$/);
    assert.equal('logoStorageKey' in uploadLogo1.body, false);

    const storedRecord1 = await db.school.findUnique({ where: { id: schoolA.id } });
    assert.match(storedRecord1.logoStorageKey, new RegExp(`^school-logos/${schoolA.id}/[0-9a-f-]{36}\\.png$`));

    // Fetch public logo 1
    const publicLogo1 = await anonymous.call('GET', 'public/schools/greenhill/logo');
    assert.equal(publicLogo1.status, 200);
    assert.equal(publicLogo1.headers.get('content-type'), 'image/png');
    assert.equal(publicLogo1.headers.get('content-disposition'), 'inline; filename="school-logo.png"');
    assert.ok(publicLogo1.headers.get('etag'));
    assert.ok(publicLogo1.headers.get('cache-control')?.includes('public'));
    const servedMeta1 = await sharp(publicLogo1.body).metadata();
    assert.equal(servedMeta1.format, 'png');
    assert.equal(servedMeta1.exif, undefined);

    // Conditional GET with ETag returns 304 Not Modified
    const cachedLogo1 = await anonymous.call('GET', 'public/schools/greenhill/logo', undefined, {
      'If-None-Match': publicLogo1.headers.get('etag'),
    });
    assert.equal(cachedLogo1.status, 304);

    // Replace logo with png2 and verify versioned URL changes and old file is cleaned up
    const uploadLogo2 = await hmA.call('PUT', `schools/${schoolA.id}/branding/logo`, png2, { 'Content-Type': 'image/png' });
    assert.equal(uploadLogo2.status, 200);
    assert.notEqual(uploadLogo2.body.logoUrl, uploadLogo1.body.logoUrl, 'Logo replacement must update versioned logoUrl');

    const storedRecord2 = await db.school.findUnique({ where: { id: schoolA.id } });
    assert.notEqual(storedRecord2.logoStorageKey, storedRecord1.logoStorageKey);
    const schoolLogoDir = join(mediaRoot, 'school-logos', schoolA.id);
    const filesOnDisk = await readdir(schoolLogoDir);
    assert.equal(filesOnDisk.length, 1, 'Old logo file must be cleaned up after replacement');
    assert.equal(`school-logos/${schoolA.id}/${filesOnDisk[0]}`, storedRecord2.logoStorageKey);

    const publicLogo2 = await anonymous.call('GET', 'public/schools/greenhill/logo');
    assert.equal(publicLogo2.status, 200);
    assert.notEqual(publicLogo2.headers.get('etag'), publicLogo1.headers.get('etag'));
    const servedMeta2 = await sharp(publicLogo2.body).metadata();
    assert.equal(servedMeta2.width, 300);

    // 6. Public School Branding Endpoint & Security Boundary Verification
    const publicBranding = await anonymous.call('GET', 'public/schools/greenhill/branding');
    assert.equal(publicBranding.status, 200);
    assert.equal(publicBranding.body.name, 'Greenhill Academy');
    assert.equal(publicBranding.body.slug, 'greenhill');
    assert.equal(publicBranding.body.logoUrl, uploadLogo2.body.logoUrl);
    assert.equal(publicBranding.body.primaryColor, '#1B4D3E');
    assert.equal(publicBranding.body.welcomeMessage, 'Welcome to Greenhill Academy');

    // Verify internal fields are NEVER exposed in public response
    const forbiddenFields = [
      'id', 'schoolId', 'code', 'logoStorageKey', 'draftTheme', 'previousPublishedTheme', 'active', 'region',
      'memberships', 'students', '_count', 'subscriptions', 'creditWallet', 'securityEvents',
    ];
    for (const field of forbiddenFields) {
      assert.equal(field in publicBranding.body, false, `Public branding must not expose ${field}`);
    }

    // Unknown slug returns controlled 404
    const unknownSlug = await anonymous.call('GET', 'public/schools/non-existent-school/branding');
    assert.equal(unknownSlug.status, 404);
    assert.equal(unknownSlug.body.message, 'School branding is unavailable.');

    // Invalid or reserved slug on public endpoints returns 400
    assert.equal((await anonymous.call('GET', 'public/schools/admin/branding')).status, 400);
    assert.equal((await anonymous.call('GET', 'public/schools/Invalid_Slug/branding')).status, 400);
    assert.equal((await anonymous.call('GET', 'public/schools/admin/logo')).status, 400);

    // Slug change does not move logo file and immediately serves logo under new slug
    await superAdmin.call('PATCH', `schools/${schoolA.id}/slug`, { slug: 'greenhill-tz' });
    const afterSlugChange = await db.school.findUnique({ where: { id: schoolA.id } });
    assert.equal(afterSlugChange.logoStorageKey, storedRecord2.logoStorageKey, 'Slug change must not move or rename logoStorageKey');
    assert.equal((await anonymous.call('GET', 'public/schools/greenhill/branding')).status, 404, 'Old slug is no longer active');
    const newSlugBranding = await anonymous.call('GET', 'public/schools/greenhill-tz/branding');
    assert.equal(newSlugBranding.status, 200);
    assert.match(newSlugBranding.body.logoUrl, /^\/api\/v1\/public\/schools\/greenhill-tz\/logo\?v=[a-f0-9]{12}$/);
    assert.equal((await anonymous.call('GET', 'public/schools/greenhill-tz/logo')).status, 200);

    // Restore slug 'greenhill'
    await superAdmin.call('PATCH', `schools/${schoolA.id}/slug`, { slug: 'greenhill' });

    // 7. Suspended School Behavior Verification
    const suspendRes = await superAdmin.call('PATCH', `schools/${schoolA.id}`, {
      active: false,
      reason: 'Suspended for billing verification test',
    });
    assert.equal(suspendRes.status, 200);
    assert.equal(suspendRes.body.active, false);

    // Suspended school does not expose public branding or logo, and blocks staff access
    assert.equal((await anonymous.call('GET', 'public/schools/greenhill/branding')).status, 404);
    assert.equal((await anonymous.call('GET', 'public/schools/greenhill/logo')).status, 404);
    assert.equal((await hmA.call('GET', `schools/${schoolA.id}/branding`)).status, 403);

    // Reactivate School A
    const reactivateRes = await superAdmin.call('PATCH', `schools/${schoolA.id}`, {
      active: true,
      reason: 'Reactivated after verification test',
    });
    assert.equal(reactivateRes.status, 200);
    assert.equal((await anonymous.call('GET', 'public/schools/greenhill/branding')).status, 200);
    assert.equal((await anonymous.call('GET', 'public/schools/greenhill/logo')).status, 200);

    // Missing storage object handled gracefully with 404 (no internal storage error leaked)
    await rm(join(mediaRoot, ...storedRecord2.logoStorageKey.split('/')), { force: true });
    const missingObjectLogo = await anonymous.call('GET', 'public/schools/greenhill/logo');
    assert.equal(missingObjectLogo.status, 404);
    assert.equal(missingObjectLogo.body.message, 'School logo is unavailable.');

    // Logo removal endpoint clears logoStorageKey cleanly
    const deleteLogoRes = await hmA.call('DELETE', `schools/${schoolA.id}/branding/logo`);
    assert.equal(deleteLogoRes.status, 200);
    assert.equal(deleteLogoRes.body.hasLogo, false);
    assert.equal(deleteLogoRes.body.logoUrl, null);
    assert.equal((await anonymous.call('GET', 'public/schools/greenhill/logo')).status, 404);

    // 7b. Upload valid SVG and WebP logos, test authenticated logo endpoint, WCAG contrast rejection, and Restore Default Branding
    const cleanSvgUpload = Buffer.from(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 120" width="240" height="120"><rect width="240" height="120" rx="16" fill="#1B4D3E"/><circle cx="60" cy="60" r="32" fill="#FFFFFF"/></svg>',
    );
    const svgUploadRes = await hmA.call('PUT', `schools/${schoolA.id}/branding/logo`, cleanSvgUpload, {
      'Content-Type': 'image/svg+xml',
    });
    assert.equal(svgUploadRes.status, 200);
    assert.equal(svgUploadRes.body.hasLogo, true);
    assert.ok(svgUploadRes.body.logoUrl);

    // Authenticated logo streaming endpoint serves normalized PNG with nosniff and ETag
    const authLogoRes = await teacherA.call('GET', `schools/${schoolA.id}/branding/logo`);
    assert.equal(authLogoRes.status, 200);
    assert.equal(authLogoRes.headers.get('content-type'), 'image/png');
    assert.equal(authLogoRes.headers.get('x-content-type-options'), 'nosniff');
    const authLogoMeta = await sharp(authLogoRes.body).metadata();
    assert.equal(authLogoMeta.format, 'png');
    assert.equal(authLogoMeta.width, 480);
    assert.equal(authLogoMeta.height, 240);

    // Cross-school user cannot fetch School A logo via authenticated endpoint
    assert.equal((await hmB.call('GET', `schools/${schoolA.id}/branding/logo`)).status, 403);

    // Upload valid WebP logo and verify replacement
    const cleanWebpUpload = await sharp({
      create: { width: 180, height: 180, channels: 4, background: { r: 30, g: 58, b: 138, alpha: 1 } },
    }).webp().toBuffer();
    const webpUploadRes = await hmA.call('PUT', `schools/${schoolA.id}/branding/logo`, cleanWebpUpload, {
      'Content-Type': 'image/webp',
    });
    assert.equal(webpUploadRes.status, 200);
    assert.notEqual(webpUploadRes.body.logoUrl, svgUploadRes.body.logoUrl);

    // Low-contrast primary or secondary colors rejected on draft/branding endpoints
    const badContrastDraft = await hmA.call('PATCH', `schools/${schoolA.id}/branding/draft`, {
      colors: { primary: '#FFFF00', secondary: '#0F172A' },
    });
    assert.equal(badContrastDraft.status, 400);

    // F-02 & F-17: Concurrent logo uploads for the same school must not delete the winning logo or leave broken logoStorageKey
    const concurrentPngA = await sharp({
      create: { width: 220, height: 220, channels: 4, background: { r: 27, g: 77, b: 62, alpha: 1 } },
    }).png().toBuffer();
    const concurrentPngB = await sharp({
      create: { width: 260, height: 260, channels: 4, background: { r: 30, g: 64, b: 175, alpha: 1 } },
    }).png().toBuffer();

    const [concResA, concResB] = await Promise.all([
      hmA.call('PUT', `schools/${schoolA.id}/branding/logo`, concurrentPngA, { 'Content-Type': 'image/png' }),
      superAdmin.call('PUT', `schools/${schoolA.id}/branding/logo`, concurrentPngB, { 'Content-Type': 'image/png' }),
    ]);
    assert.equal(concResA.status, 200);
    assert.equal(concResB.status, 200);
    const afterConcurrentSchool = await db.school.findUnique({ where: { id: schoolA.id } });
    assert.ok(afterConcurrentSchool.logoStorageKey, 'Winning concurrent upload must keep a valid logoStorageKey');
    const afterConcurrentServe = await anonymous.call('GET', 'public/schools/greenhill/logo');
    assert.equal(afterConcurrentServe.status, 200, 'Winning logo file must exist on disk after concurrent uploads');

    // F-14: Staged logo upload (?stage=true) + failed publish must NOT overwrite live logo or leave orphan staged file
    const liveKeyBeforeStage = afterConcurrentSchool.logoStorageKey;
    const stagedPng = await sharp({
      create: { width: 160, height: 160, channels: 4, background: { r: 180, g: 83, b: 9, alpha: 1 } },
    }).png().toBuffer();

    const stagedUploadRes = await hmA.call('PUT', `schools/${schoolA.id}/branding/logo?stage=true`, stagedPng, {
      'Content-Type': 'image/png',
    });
    assert.equal(stagedUploadRes.status, 200);
    assert.equal(stagedUploadRes.body.staged, true);
    assert.match(stagedUploadRes.body.stagedLogoKey, new RegExp(`^school-logos/${schoolA.id}/[0-9a-f-]{36}\\.png$`));

    const dbDuringStage = await db.school.findUnique({ where: { id: schoolA.id } });
    assert.equal(dbDuringStage.logoStorageKey, liveKeyBeforeStage, 'Staged upload must not mutate live logoStorageKey before publish');

    // Attempt atomic publish with invalid color -> must fail, preserve the live logo, and keep the staged object retryable (NV-01)
    const failedAtomicPublish = await hmA.call('PATCH', `schools/${schoolA.id}/branding`, {
      colors: { primary: '#FFFF00', secondary: '#0F172A' },
      stagedLogoKey: stagedUploadRes.body.stagedLogoKey,
    });
    assert.equal(failedAtomicPublish.status, 400);
    const dbAfterFailedAtomic = await db.school.findUnique({ where: { id: schoolA.id } });
    assert.equal(dbAfterFailedAtomic.logoStorageKey, liveKeyBeforeStage, 'Failed atomic publish must preserve previous live logoStorageKey');
    const filesAfterFailedAtomic = await readdir(join(mediaRoot, 'school-logos', schoolA.id));
    assert.equal(
      filesAfterFailedAtomic.includes(stagedUploadRes.body.stagedLogoKey.split('/').pop()),
      true,
      'NV-01: failed publish must not delete the staged object; it expires through the lifecycle cleanup',
    );
    assert.equal((await db.schoolLogoObject.findUnique({ where: { storageKey: stagedUploadRes.body.stagedLogoKey } })).status, 'STAGED');

    // Stage again and perform valid atomic publish -> commits both theme and logo together
    const stagedUploadRes2 = await hmA.call('PUT', `schools/${schoolA.id}/branding/logo?stage=true`, stagedPng, {
      'Content-Type': 'image/png',
    });
    assert.equal(stagedUploadRes2.status, 200);
    const validAtomicPublish = await hmA.call('PATCH', `schools/${schoolA.id}/branding`, {
      colors: { primary: '#1E3A8A', secondary: '#F8FAFC' },
      welcomeMessage: 'Atomic publish with light secondary',
      stagedLogoKey: stagedUploadRes2.body.stagedLogoKey,
      expectedThemeVersion: dbAfterFailedAtomic.themeVersion,
    });
    assert.equal(validAtomicPublish.status, 200);
    assert.equal(validAtomicPublish.body.hasLogo, true);
    assert.equal(validAtomicPublish.body.primaryColor, '#1E3A8A');
    assert.equal(validAtomicPublish.body.secondaryColor, '#F8FAFC');
    const dbAfterValidAtomic = await db.school.findUnique({ where: { id: schoolA.id } });
    assert.equal(dbAfterValidAtomic.logoStorageKey, stagedUploadRes2.body.stagedLogoKey);

    // F-14: Restore Default Branding completely resets both custom theme AND custom logo
    const resetBrandingRes = await hmA.call('POST', `schools/${schoolA.id}/branding/reset`, {
      expectedThemeVersion: validAtomicPublish.body.themeVersion,
    });
    assert.equal(resetBrandingRes.status, 200);
    assert.equal(resetBrandingRes.body.hasPublishedTheme, false);
    assert.equal(resetBrandingRes.body.hasDraftTheme, false);
    assert.equal(resetBrandingRes.body.hasLogo, false, 'POST /branding/reset must also reset custom logo');
    assert.equal(resetBrandingRes.body.logoUrl, null);
    assert.equal(resetBrandingRes.body.primaryColor, null);
    assert.equal(resetBrandingRes.body.welcomeMessage, null);
    assert.equal(resetBrandingRes.body.publishedTheme.tokens.colors.primary, '#B45309');
    assert.equal((await anonymous.call('GET', 'public/schools/greenhill/logo')).status, 404);
    const filesAfterFullReset = await readdir(join(mediaRoot, 'school-logos', schoolA.id));
    assert.deepEqual(
      filesAfterFullReset.filter(file => file !== stagedUploadRes.body.stagedLogoKey.split('/').pop()),
      [],
      'POST /branding/reset must remove custom logo file from storage (only the retained staged object may remain)',
    );

    // ===== NV-03: non-manager roles never receive unpublished (draft) branding =====
    const extraRoles = {};
    for (const role of ['REGISTRAR', 'BURSAR', 'ACADEMIC']) {
      const roleUser = await db.user.create({
        data: { email: `${role.toLowerCase()}.a@syncacademy.test`, name: role, passwordHash: await passwordHash(strongPassword) },
      });
      await db.membership.create({ data: { schoolId: schoolA.id, userId: roleUser.id, role } });
      extraRoles[role] = createClient();
      assert.equal((await extraRoles[role].login(roleUser.email, role)).status, 201);
    }
    extraRoles.TEACHER = teacherA;
    const nv3Before = await db.school.findUnique({ where: { id: schoolA.id } });
    assert.equal(nv3Before.publishedTheme, null, 'NV-03 precondition: no published theme');
    const nv3Draft = await hmA.call('PATCH', `schools/${schoolA.id}/branding/draft`, {
      colors: { primary: '#1E40AF', secondary: '#F8FAFC' },
      welcomeMessage: 'Unpublished welcome text',
    });
    assert.equal(nv3Draft.status, 200);
    for (const [role, client] of Object.entries(extraRoles)) {
      for (const route of [`schools/${schoolA.id}/branding`, `schools/${schoolA.id}/theme`]) {
        const response = await client.call('GET', route);
        assert.equal(response.status, 200, `${role} ${route}`);
        assert.equal(response.body.primaryColor, null, `${role} primaryColor`);
        assert.equal(response.body.secondaryColor, null, `${role} secondaryColor`);
        assert.equal(response.body.welcomeMessage, null, `${role} welcomeMessage`);
        assert.equal(response.body.draftTheme, null, `${role} draftTheme`);
        assert.equal(response.body.hasDraftTheme, false, `${role} hasDraftTheme`);
        const serialized = JSON.stringify(response.body);
        assert.equal(serialized.includes('#1E40AF') || serialized.includes('#F8FAFC') || serialized.includes('Unpublished welcome text'), false, `${role} leaks draft values`);
      }
    }
    for (const [label, client] of [['Headmaster', hmA], ['Super Admin', superAdmin]]) {
      const response = await client.call('GET', `schools/${schoolA.id}/branding`);
      assert.equal(response.status, 200, label);
      assert.equal(response.body.hasDraftTheme, true, label);
      assert.equal(response.body.draftTheme.tokens.colors.secondary, '#F8FAFC', label);
      assert.equal(response.body.secondaryColor, '#F8FAFC', label);
    }

    // ===== NV-01: failed requests and concurrency never delete an active or committed logo =====
    const fileExists = async key => access(join(mediaRoot, ...key.split('/'))).then(() => true, () => false);
    const stage = async (client, bytes = stagedPng) => {
      const response = await client.call('PUT', `schools/${schoolA.id}/branding/logo?stage=true`, bytes, { 'Content-Type': 'image/png' });
      assert.equal(response.status, 200);
      return response.body.stagedLogoKey;
    };
    const publishWith = (client, key, extra = {}) => client.call('PATCH', `schools/${schoolA.id}/branding`, {
      colors: { primary: '#1E3A8A', secondary: '#0F172A' }, stagedLogoKey: key, ...extra,
    });
    const directUpload = await superAdmin.call('PUT', `schools/${schoolA.id}/branding/logo`, png1, { 'Content-Type': 'image/png' });
    assert.equal(directUpload.status, 200);
    const activeKey = (await db.school.findUnique({ where: { id: schoolA.id } })).logoStorageKey;
    assert.ok(await fileExists(activeKey));
    assert.equal((await db.schoolLogoObject.findUnique({ where: { storageKey: activeKey } })).status, 'COMMITTED');
    const publicLogoStatus = async () => (await anonymous.call('GET', 'public/schools/greenhill/logo')).status;
    assert.equal(await publicLogoStatus(), 200);
    const versionNow = async () => (await db.school.findUnique({ where: { id: schoolA.id } })).themeVersion;

    // Active key passed as stagedLogoKey: rejected, never deleted (valid payload, invalid payload, stale version).
    for (const extra of [{}, { colors: { primary: '#FFFF00', secondary: '#0F172A' } }, { expectedThemeVersion: (await versionNow()) + 7 }]) {
      const attack = await publishWith(hmA, activeKey, extra);
      assert.ok([400, 409].includes(attack.status), `active key reuse rejected (${attack.status})`);
      assert.equal((await db.school.findUnique({ where: { id: schoolA.id } })).logoStorageKey, activeKey);
      assert.ok(await fileExists(activeKey), 'active logo object must survive');
      assert.equal(await publicLogoStatus(), 200);
    }
    const themePublishAttack = await hmA.call('POST', `schools/${schoolA.id}/theme/publish`, { stagedLogoKey: activeKey, expectedThemeVersion: (await versionNow()) + 3 });
    assert.ok([400, 409].includes(themePublishAttack.status));
    assert.ok(await fileExists(activeKey));
    assert.equal(await publicLogoStatus(), 200);

    // Stale version and invalid theme data keep both the active and the staged object (retryable).
    const retryKey = await stage(superAdmin);
    const staleAttempt = await publishWith(hmA, retryKey, { expectedThemeVersion: (await versionNow()) + 9 });
    assert.equal(staleAttempt.status, 409);
    const invalidAttempt = await publishWith(hmA, retryKey, { colors: { primary: '#FFFF00', secondary: '#0F172A' } });
    assert.equal(invalidAttempt.status, 400);
    assert.ok(await fileExists(activeKey));
    assert.ok(await fileExists(retryKey), 'staged object stays available after 409/400');
    assert.equal((await db.schoolLogoObject.findUnique({ where: { storageKey: retryKey } })).status, 'STAGED');
    assert.equal((await db.school.findUnique({ where: { id: schoolA.id } })).logoStorageKey, activeKey);

    // Retrying with the same staged key succeeds; the superseded logo is retired and deleted.
    const retried = await publishWith(hmA, retryKey, { expectedThemeVersion: await versionNow() });
    assert.equal(retried.status, 200);
    assert.equal((await db.school.findUnique({ where: { id: schoolA.id } })).logoStorageKey, retryKey);
    assert.equal(await fileExists(activeKey), false, 'superseded logo is deleted after commit');
    assert.equal(await db.schoolLogoObject.findUnique({ where: { storageKey: activeKey } }), null);
    assert.equal((await db.schoolLogoObject.findUnique({ where: { storageKey: retryKey } })).status, 'COMMITTED');
    assert.ok(await fileExists(retryKey));

    // A committed key cannot be replayed and a failed replay cannot delete it.
    const replay = await publishWith(hmA, retryKey);
    assert.equal(replay.status, 400);
    assert.ok(await fileExists(retryKey));
    assert.equal(await publicLogoStatus(), 200);

    // Cross-school staged keys are rejected (School B cannot adopt a key staged for School A).
    const crossKey = await stage(superAdmin);
    const crossAttempt = await superAdmin.call('PATCH', `schools/${schoolB.id}/branding`, {
      colors: { primary: '#2563EB', secondary: '#0F172A' }, stagedLogoKey: crossKey,
    });
    assert.equal(crossAttempt.status, 400);
    assert.ok(await fileExists(crossKey));
    assert.equal((await db.school.findUnique({ where: { id: schoolB.id } })).logoStorageKey, null);
    // A forged key with no staging record is also rejected, and nothing is deleted.
    const forgedKey = `school-logos/${schoolA.id}/${randomUUID()}.png`;
    const forgedWrite = await sharp({ create: { width: 8, height: 8, channels: 4, background: '#123456' } }).png().toBuffer();
    await require('node:fs/promises').writeFile(join(mediaRoot, ...forgedKey.split('/')), forgedWrite);
    assert.equal((await publishWith(hmA, forgedKey)).status, 400);
    assert.ok(await fileExists(forgedKey), 'unrecorded object is not touched by a rejected publish');
    await rm(join(mediaRoot, ...forgedKey.split('/')), { force: true });

    // Concurrent publishes with different staged keys: exactly one active logo survives, no broken reference.
    const raceKeyX = await stage(superAdmin);
    const raceKeyY = await stage(superAdmin);
    const [raceX, raceY] = await Promise.all([publishWith(hmA, raceKeyX), publishWith(superAdmin, raceKeyY)]);
    assert.ok([raceX.status, raceY.status].includes(200));
    const afterRace = await db.school.findUnique({ where: { id: schoolA.id } });
    assert.ok([raceKeyX, raceKeyY].includes(afterRace.logoStorageKey));
    assert.ok(await fileExists(afterRace.logoStorageKey), 'winning logo must exist');
    assert.equal(await publicLogoStatus(), 200);
    assert.equal(await db.schoolLogoObject.count({ where: { schoolId: schoolA.id, status: 'CLEANING' } }), 0);
    assert.equal(await fileExists(retryKey), false, 'previous logo retired after a winning publish');

    // Concurrent publishes of the SAME staged key: one commit wins, the other is rejected, logo intact.
    const sameKey = await stage(superAdmin);
    const sameResults = await Promise.all([publishWith(hmA, sameKey), publishWith(superAdmin, sameKey)]);
    assert.equal(sameResults.filter(response => response.status === 200).length, 1);
    assert.ok(sameResults.every(response => [200, 400, 409].includes(response.status)));
    assert.equal((await db.school.findUnique({ where: { id: schoolA.id } })).logoStorageKey, sameKey);
    assert.ok(await fileExists(sameKey));

    // Direct logo removal retires and deletes the object only after the database no longer references it.
    const removeRes = await hmA.call('DELETE', `schools/${schoolA.id}/branding/logo`);
    assert.equal(removeRes.status, 200);
    assert.equal(await fileExists(sameKey), false);
    assert.equal((await db.school.findUnique({ where: { id: schoolA.id } })).logoStorageKey, null);

    // ===== NV-02: staged logo lifecycle and cleanup =====
    const { cleanupSchoolLogos, recordStagedLogo, maxPendingStagedLogosPerSchool } = require('../dist/school-logo-lifecycle');
    // The test process loads config before the media directory is set, so deletions target the API's directory explicitly.
    const testDeleter = async key => { await rm(join(mediaRoot, ...key.split('/')), { force: true }); };
    const drain = async options => { let n = 0; while (n < 50 && await cleanupSchoolLogos(db, { deleteObject: testDeleter, ...options })) n++; return n; };
    await drain();

    const expiringKey = await stage(superAdmin);
    const expiringRow = await db.schoolLogoObject.findUnique({ where: { storageKey: expiringKey } });
    const ttlMs = expiringRow.expiresAt.getTime() - expiringRow.createdAt.getTime();
    assert.ok(Math.abs(ttlMs - 24 * 3600000) < 5000, 'default staging lifetime is 24 hours');
    assert.equal(expiringRow.schoolId, schoolA.id);
    await drain();
    assert.ok(await fileExists(expiringKey), 'non-expired staged objects remain available');
    assert.equal((await db.schoolLogoObject.findUnique({ where: { storageKey: expiringKey } })).status, 'STAGED');

    await db.schoolLogoObject.update({ where: { storageKey: expiringKey }, data: { expiresAt: new Date(Date.now() - 1000) } });
    assert.equal((await publishWith(hmA, expiringKey)).status, 400, 'expired staged keys cannot be committed');
    assert.ok(await drain() >= 1);
    assert.equal(await fileExists(expiringKey), false, 'expired staged objects are cleaned up');
    assert.equal(await db.schoolLogoObject.findUnique({ where: { storageKey: expiringKey } }), null);
    assert.equal(await cleanupSchoolLogos(db, { deleteObject: testDeleter }), false, 'repeated cleanup is a safe no-op');
    assert.equal(await cleanupSchoolLogos(db, { deleteObject: testDeleter }), false);

    // Committed and active logos are never deleted by cleanup, even if their rows are corrupted.
    const liveKey = await stage(superAdmin);
    assert.equal((await publishWith(hmA, liveKey)).status, 200);
    await db.schoolLogoObject.update({ where: { storageKey: liveKey }, data: { expiresAt: new Date(Date.now() - 86400000) } });
    await drain();
    assert.ok(await fileExists(liveKey), 'COMMITTED rows are never cleaned up');
    await db.schoolLogoObject.update({ where: { storageKey: liveKey }, data: { status: 'STAGED', committedAt: null } });
    await drain();
    assert.ok(await fileExists(liveKey), 'an object referenced by School.logoStorageKey is never deleted');
    assert.equal((await db.schoolLogoObject.findUnique({ where: { storageKey: liveKey } })).status, 'COMMITTED', 'cleanup heals a corrupted row');
    await db.schoolLogoObject.update({ where: { storageKey: liveKey }, data: { status: 'RETIRED' } });
    await drain();
    assert.ok(await fileExists(liveKey), 'RETIRED row for an active key is healed instead of deleted');
    assert.equal(await publicLogoStatus(), 200);

    // Storage deletion failure leaves the row retryable and corrupts nothing.
    const failingKey = await stage(superAdmin);
    await db.schoolLogoObject.update({ where: { storageKey: failingKey }, data: { expiresAt: new Date(Date.now() - 1000) } });
    const failed = await cleanupSchoolLogos(db, { deleteObject: async () => { throw new Error('simulated storage outage'); } });
    assert.equal(failed, false);
    assert.ok(await fileExists(failingKey));
    assert.equal((await db.schoolLogoObject.findUnique({ where: { storageKey: failingKey } })).status, 'CLEANING');
    assert.equal(await cleanupSchoolLogos(db, { deleteObject: testDeleter }), false, 'a live cleanup lease is respected');
    assert.equal(await cleanupSchoolLogos(db, { deleteObject: testDeleter, now: new Date(Date.now() + 10 * 60000) }), true, 'retry succeeds after the lease expires');
    assert.equal(await fileExists(failingKey), false);
    assert.equal(await db.schoolLogoObject.findUnique({ where: { storageKey: failingKey } }), null);
    assert.equal((await db.school.findUnique({ where: { id: schoolA.id } })).logoStorageKey, liveKey);

    // Concurrent publish and cleanup: whichever wins, the winning logo is intact and nothing dangles.
    await drain({ now: new Date(Date.now() + 48 * 3600000) });
    for (let attempt = 0; attempt < 4; attempt++) {
      const before = (await db.school.findUnique({ where: { id: schoolA.id } })).logoStorageKey;
      const contested = await stage(superAdmin);
      const farFuture = new Date(Date.now() + 48 * 3600000);
      const [publishResult] = await Promise.all([
        publishWith(hmA, contested),
        cleanupSchoolLogos(db, { deleteObject: testDeleter, now: farFuture }),
      ]);
      await drain();
      const current = (await db.school.findUnique({ where: { id: schoolA.id } })).logoStorageKey;
      assert.ok(await fileExists(current), 'the active logo always exists');
      if (publishResult.status === 200) {
        assert.equal(current, contested);
        assert.equal((await db.schoolLogoObject.findUnique({ where: { storageKey: contested } })).status, 'COMMITTED');
        assert.equal(await fileExists(before), false, 'superseded logo deleted only after the winner committed');
      } else {
        assert.ok([400, 409].includes(publishResult.status));
        assert.equal(current, before);
        if (publishResult.status === 400) assert.equal(await fileExists(contested), false, 'cleanup won the claim and removed the expired staged object');
      }
      assert.equal(await publicLogoStatus(), 200);
    }

    // Pending staged uploads are bounded per school.
    await db.schoolLogoObject.createMany({
      data: Array.from({ length: maxPendingStagedLogosPerSchool }, () => ({
        schoolId: schoolB.id, storageKey: `school-logos/${schoolB.id}/${randomUUID()}.png`, status: 'STAGED', expiresAt: new Date(Date.now() + 3600000),
      })),
    });
    const capped = await superAdmin.call('PUT', `schools/${schoolB.id}/branding/logo?stage=true`, stagedPng, { 'Content-Type': 'image/png' });
    assert.equal(capped.status, 429);
    assert.equal((await readdir(join(mediaRoot, 'school-logos', schoolB.id)).catch(() => [])).length, 0, 'rejected staged upload leaves no object behind');
    await db.schoolLogoObject.deleteMany({ where: { schoolId: schoolB.id } });

    // 8. Regression Checks (School profile update, workspace snapshot, immutable ID and code)
    const profileUpdate = await hmA.call('PATCH', `schools/${schoolA.id}/profile`, {
      name: 'Greenhill Academy International',
      region: 'Dar es Salaam',
      schoolType: 'Secondary',
      address: 'Masaki, Dar es Salaam',
      phone: '+255712345678',
      email: 'info@greenhill.ac.tz',
      website: 'https://greenhill.ac.tz',
    });
    assert.equal(profileUpdate.status, 200);
    assert.equal(profileUpdate.body.id, schoolA.id, 'School ID must remain unchanged');
    assert.equal(profileUpdate.body.code, 'GHA', 'School code must remain unchanged');
    assert.equal(profileUpdate.body.name, 'Greenhill Academy International');

    // Public branding reflects updated official school name from school profile
    const brandingAfterProfile = await anonymous.call('GET', 'public/schools/greenhill/branding');
    assert.equal(brandingAfterProfile.status, 200);
    assert.equal(brandingAfterProfile.body.name, 'Greenhill Academy International');

    // Existing workspace endpoint remains intact
    const workspaceRes = await hmA.call('GET', `schools/${schoolA.id}/workspace`);
    assert.equal(workspaceRes.status, 200);
    assert.equal(workspaceRes.body.school.id, schoolA.id);
    assert.equal(workspaceRes.body.school.code, 'GHA');
    assert.equal(workspaceRes.body.school.name, 'Greenhill Academy International');
  } finally {
    api.kill('SIGTERM');
    await db.$disconnect();
    await rm(mediaRoot, { recursive: true, force: true });
  }
});
