import { DOCUMENT } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { DestroyRef, Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService } from './auth.service';
import { PlatformAppService } from './platform-app.service';
import { SchoolApiService } from './school-api.service';

export const DEFAULT_SCHOOL_PRIMARY = '#B45309';
export const DEFAULT_SCHOOL_PRIMARY_HOVER = '#92400E';
export const DEFAULT_SCHOOL_SECONDARY = '#1E293B';
export const DEFAULT_SCHOOL_FOREGROUND = '#FFFFFF';
export const DEFAULT_SCHOOL_MUTED_LIGHT = '#E2E8F0';
export const DEFAULT_SCHOOL_DARK_FOREGROUND = '#0F172A';
export const DEFAULT_SCHOOL_DARK_MUTED = '#475569';
export const WELCOME_MESSAGE_MAX_LENGTH = 280;

export interface SecondarySurfaceTokens {
  tone: 'dark' | 'light';
  foregroundColor: string;
  mutedForegroundColor: string;
  logoAccentColor: string;
  surfaceBg: string;
  hoverBg: string;
  borderColor: string;
  compositedSurfaceColor: string;
  compositedHoverColor: string;
  compositedHoverMutedContrast: number;
  contrastOnWhite: number;
  contrastOnDarkMain: number;
  contrastOnDarkMuted: number;
  effectiveForegroundContrast: number;
  effectiveMutedContrast: number;
  meetsWcagAa: boolean;
  primaryToSecondaryContrast: number;
  requiresActiveDistinction: boolean;
  activeNavBorderColor: string;
  activeNavIndicatorColor: string;
}

export interface SchoolBrandingThemeBlock {
  schemaVersion: number;
  colors?: {
    primary: string;
    secondary: string;
  };
  tokens: {
    colors: {
      primary: string;
      secondary: string;
      background: string;
      surface: string;
      textMain: string;
      textMuted: string;
      semantic: {
        success: string;
        warning: string;
        error: string;
        info: string;
      };
    };
    typography: {
      fontFamily: string;
    };
    radius: string;
  };
  welcomeMessage: string | null;
  isCustom?: boolean;
  cssVariables: Record<string, string>;
  accessibility: {
    primaryOnWhiteContrast?: number;
    secondaryOnWhiteContrast?: number;
    meetsWcagAaPrimary?: boolean;
    meetsWcagAaSecondary?: boolean;
    meetsWcagAaText: boolean;
  };
}

export interface SchoolBrandingState {
  schoolId: string;
  name: string;
  slug: string | null;
  hasLogo: boolean;
  logoUrl: string | null;
  publicLogoUrl?: string | null;
  authenticatedLogoUrl?: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  welcomeMessage: string | null;
  colors: {
    primary: string;
    secondary: string;
  };
  themeVersion: number;
  hasPublishedTheme: boolean;
  hasDraftTheme: boolean;
  canRollback: boolean;
  publishedTheme: SchoolBrandingThemeBlock;
  draftTheme: SchoolBrandingThemeBlock | null;
}

export interface BrandColorValidationResult {
  valid: boolean;
  normalized: string;
  contrastOnWhite: number;
  effectiveContrast?: number;
  tone?: 'dark' | 'light';
  meetsWcagAa: boolean;
  message: string;
}

const HEX_COLOR_REGEX = /^#[0-9A-Fa-f]{6}$/;
const UNSAFE_TEXT_REGEX = /(?:url\s*\(|expression\s*\(|javascript\s*:|vbscript\s*:|data\s*:|@import|@font-face|@keyframes|<script|<style|https?:\/\/|\/\/|[<>])/i;
const CONTROL_CHAR_REGEX = /[\u0000-\u001F\u007F-\u009F\u202A-\u202E\u2066-\u2069]/;

function channelLuminance(byte: number): number {
  const srgb = byte / 255;
  return srgb <= 0.03928 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
}

export function computeRelativeLuminance(hex: string): number {
  const clean = hex.trim().toUpperCase();
  if (!HEX_COLOR_REGEX.test(clean)) return 0;
  const r = parseInt(clean.slice(1, 3), 16);
  const g = parseInt(clean.slice(3, 5), 16);
  const b = parseInt(clean.slice(5, 7), 16);
  return 0.2126 * channelLuminance(r) + 0.7152 * channelLuminance(g) + 0.0722 * channelLuminance(b);
}

export function computeContrastRatio(firstHex: string, secondHex: string): number {
  const first = computeRelativeLuminance(firstHex);
  const second = computeRelativeLuminance(secondHex);
  const lighter = Math.max(first, second);
  const darker = Math.min(first, second);
  return Math.round(((lighter + 0.05) / (darker + 0.05)) * 100) / 100;
}

export function darkenHex(hex: string, factor = 0.12): string {
  const clean = hex.trim().toUpperCase();
  if (!HEX_COLOR_REGEX.test(clean)) return DEFAULT_SCHOOL_PRIMARY_HOVER;
  const r = Math.max(0, Math.round(parseInt(clean.slice(1, 3), 16) * (1 - factor)));
  const g = Math.max(0, Math.round(parseInt(clean.slice(3, 5), 16) * (1 - factor)));
  const b = Math.max(0, Math.round(parseInt(clean.slice(5, 7), 16) * (1 - factor)));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`.toUpperCase();
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
    foreground: DEFAULT_SCHOOL_FOREGROUND,
    mutedCandidates: [DEFAULT_SCHOOL_MUTED_LIGHT, DEFAULT_SCHOOL_FOREGROUND],
    overlayRgb: [255, 255, 255],
    surfaceAlpha: 0.08,
    hoverAlpha: 0.12,
    borderAlpha: 0.18,
  },
  light: {
    foreground: DEFAULT_SCHOOL_DARK_FOREGROUND,
    mutedCandidates: [DEFAULT_SCHOOL_DARK_MUTED, DEFAULT_SCHOOL_DARK_FOREGROUND],
    overlayRgb: [15, 23, 42],
    surfaceAlpha: 0.06,
    hoverAlpha: 0.09,
    borderAlpha: 0.16,
  },
};

/** Alpha-composite an overlay over an opaque base color and return the rendered opaque HEX. */
export function compositeOverlayHex(
  baseHex: string,
  overlayRgb: readonly [number, number, number],
  alpha: number,
): string {
  const base = baseHex.trim().toUpperCase();
  const channels = [1, 3, 5].map((offset, index) => {
    const baseChannel = parseInt(base.slice(offset, offset + 2), 16);
    const mixed = Math.round(overlayRgb[index] * alpha + baseChannel * (1 - alpha));
    return Math.min(255, Math.max(0, mixed)).toString(16).padStart(2, '0');
  });
  return `#${channels.join('')}`.toUpperCase();
}

function evaluateSidebarTone(secondary: string, tone: 'dark' | 'light') {
  const spec = SIDEBAR_TONE_SPECS[tone];
  const surfaceHex = compositeOverlayHex(secondary, spec.overlayRgb, spec.surfaceAlpha);
  const hoverHex = compositeOverlayHex(secondary, spec.overlayRgb, spec.hoverAlpha);
  const foregroundContrast = Math.min(
    computeContrastRatio(secondary, spec.foreground),
    computeContrastRatio(surfaceHex, spec.foreground),
    computeContrastRatio(hoverHex, spec.foreground),
  );
  const mutedMetrics = (candidate: string) => ({
    text: Math.min(computeContrastRatio(secondary, candidate), computeContrastRatio(surfaceHex, candidate)),
    hover: computeContrastRatio(hoverHex, candidate),
  });
  const chosen = spec.mutedCandidates.find(candidate => {
    const metrics = mutedMetrics(candidate);
    return metrics.text >= 4.5 && metrics.hover >= 3;
  });
  const muted = chosen ?? spec.mutedCandidates[spec.mutedCandidates.length - 1];
  const metrics = mutedMetrics(muted);
  const accentOk = tone === 'dark' || computeContrastRatio(secondary, DEFAULT_SCHOOL_PRIMARY) >= 4.5;
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

export function resolveSecondarySurfaceTokens(
  secondaryHexInput: string,
  primaryHexInput: string = DEFAULT_SCHOOL_PRIMARY,
): SecondarySurfaceTokens {
  const cleanSecondary = HEX_COLOR_REGEX.test((secondaryHexInput ?? '').trim())
    ? secondaryHexInput.trim().toUpperCase()
    : DEFAULT_SCHOOL_SECONDARY;
  const cleanPrimary = HEX_COLOR_REGEX.test((primaryHexInput ?? '').trim())
    ? primaryHexInput.trim().toUpperCase()
    : DEFAULT_SCHOOL_PRIMARY;

  const contrastOnWhite = computeContrastRatio(cleanSecondary, DEFAULT_SCHOOL_FOREGROUND);
  const contrastOnDarkMain = computeContrastRatio(cleanSecondary, DEFAULT_SCHOOL_DARK_FOREGROUND);
  const contrastOnDarkMuted = computeContrastRatio(cleanSecondary, DEFAULT_SCHOOL_DARK_MUTED);

  // Every pairing is evaluated on the final composited (rendered) background colors.
  const darkEvaluation = evaluateSidebarTone(cleanSecondary, 'dark');
  const lightEvaluation = evaluateSidebarTone(cleanSecondary, 'light');
  const evaluation = darkEvaluation.passes
    ? darkEvaluation
    : lightEvaluation.passes
      ? lightEvaluation
      : darkEvaluation;
  const tone = evaluation.tone;
  const spec = SIDEBAR_TONE_SPECS[tone];

  const logoAccentColor = tone === 'dark'
    ? (computeContrastRatio(cleanSecondary, '#F59E0B') >= 4.5 ? '#F59E0B' : DEFAULT_SCHOOL_FOREGROUND)
    : (computeContrastRatio(cleanSecondary, DEFAULT_SCHOOL_PRIMARY) >= 4.5
        ? DEFAULT_SCHOOL_PRIMARY
        : DEFAULT_SCHOOL_DARK_FOREGROUND);

  const primaryToSecondaryContrast = computeContrastRatio(cleanPrimary, cleanSecondary);
  const requiresActiveDistinction = primaryToSecondaryContrast < 1.8;
  const activeNavBorderColor = requiresActiveDistinction
    ? (tone === 'dark' ? DEFAULT_SCHOOL_FOREGROUND : DEFAULT_SCHOOL_DARK_FOREGROUND)
    : 'transparent';
  const activeNavIndicatorColor = DEFAULT_SCHOOL_FOREGROUND;
  const rgb = spec.overlayRgb.join(', ');

  return {
    tone,
    foregroundColor: evaluation.foreground,
    mutedForegroundColor: evaluation.muted,
    logoAccentColor,
    surfaceBg: `rgba(${rgb}, ${spec.surfaceAlpha})`,
    hoverBg: `rgba(${rgb}, ${spec.hoverAlpha})`,
    borderColor: `rgba(${rgb}, ${spec.borderAlpha})`,
    compositedSurfaceColor: evaluation.surfaceHex,
    compositedHoverColor: evaluation.hoverHex,
    compositedHoverMutedContrast: evaluation.hoverMutedContrast,
    contrastOnWhite,
    contrastOnDarkMain,
    contrastOnDarkMuted,
    effectiveForegroundContrast: evaluation.foregroundContrast,
    effectiveMutedContrast: evaluation.mutedContrast,
    meetsWcagAa: evaluation.passes,
    primaryToSecondaryContrast,
    requiresActiveDistinction,
    activeNavBorderColor,
    activeNavIndicatorColor,
  };
}

export function validateBrandHexColor(raw: string, label: 'Primary' | 'Secondary'): BrandColorValidationResult {
  const trimmed = (raw ?? '').trim().toUpperCase();
  if (!HEX_COLOR_REGEX.test(trimmed)) {
    return {
      valid: false,
      normalized: trimmed,
      contrastOnWhite: 0,
      effectiveContrast: 0,
      meetsWcagAa: false,
      message: `${label} color must be a 6-digit hexadecimal value such as #1B4D3E.`,
    };
  }
  const contrastOnWhite = computeContrastRatio(trimmed, DEFAULT_SCHOOL_FOREGROUND);
  if (label === 'Secondary') {
    const surface = resolveSecondarySurfaceTokens(trimmed);
    if (!surface.meetsWcagAa) {
      return {
        valid: false,
        normalized: trimmed,
        contrastOnWhite,
        effectiveContrast: surface.effectiveMutedContrast,
        tone: surface.tone,
        meetsWcagAa: false,
        message: `Secondary color (${trimmed}) has ${surface.contrastOnWhite}:1 contrast against #FFFFFF, and the lowest text contrast is ${Math.min(surface.effectiveForegroundContrast, surface.effectiveMutedContrast)}:1 once the translucent sidebar surface and hover overlays are composited. WCAG 2.2 AA requires at least 4.5:1 so sidebar navigation and labels remain readable. Choose a darker or lighter shade.`,
      };
    }
    const fgLabel = surface.tone === 'dark' ? '#FFFFFF' : '#0F172A/#334155';
    return {
      valid: true,
      normalized: trimmed,
      contrastOnWhite,
      effectiveContrast: surface.effectiveMutedContrast,
      tone: surface.tone,
      meetsWcagAa: true,
      message: `WCAG 2.2 AA Pass (${surface.effectiveMutedContrast}:1 contrast with ${fgLabel} on ${surface.tone} sidebar)`,
    };
  }

  const meetsWcagAa = contrastOnWhite >= 4.5;
  if (!meetsWcagAa) {
    return {
      valid: false,
      normalized: trimmed,
      contrastOnWhite,
      effectiveContrast: contrastOnWhite,
      tone: 'dark',
      meetsWcagAa: false,
      message: `${label} color (${trimmed}) has ${contrastOnWhite}:1 contrast against white (#FFFFFF). WCAG 2.2 AA requires at least 4.5:1 so buttons and navigation remain readable. Choose a darker shade.`,
    };
  }
  return {
    valid: true,
    normalized: trimmed,
    contrastOnWhite,
    effectiveContrast: contrastOnWhite,
    tone: 'dark',
    meetsWcagAa: true,
    message: `WCAG 2.2 AA Pass (${contrastOnWhite}:1 contrast against #FFFFFF)`,
  };
}

export function validateWelcomeMessageText(raw: string | null | undefined): { valid: boolean; normalized: string | null; message: string } {
  if (raw === null || raw === undefined) {
    return { valid: true, normalized: null, message: '' };
  }
  if (CONTROL_CHAR_REGEX.test(raw)) {
    return { valid: false, normalized: null, message: 'Welcome message must not contain line breaks or control characters.' };
  }
  if (UNSAFE_TEXT_REGEX.test(raw)) {
    return { valid: false, normalized: null, message: 'Welcome message must be plain text without HTML tags, links, or scripts.' };
  }
  const trimmed = raw.trim();
  if (trimmed.length > WELCOME_MESSAGE_MAX_LENGTH) {
    return { valid: false, normalized: null, message: `Welcome message must not exceed ${WELCOME_MESSAGE_MAX_LENGTH} characters.` };
  }
  return { valid: true, normalized: trimmed.length ? trimmed : null, message: '' };
}

export function validateLogoFileClient(file: File | null | undefined): { valid: boolean; message: string } {
  if (!file) {
    return { valid: false, message: 'Select an SVG, PNG, or WebP logo file.' };
  }
  const allowedMimes = ['image/svg+xml', 'image/png', 'image/webp'];
  const lowerName = file.name.toLowerCase();
  const hasAllowedExt = lowerName.endsWith('.svg') || lowerName.endsWith('.png') || lowerName.endsWith('.webp');
  if (!allowedMimes.includes(file.type) || !hasAllowedExt) {
    return { valid: false, message: 'Unsupported file format. Upload an SVG (.svg), PNG (.png), or WebP (.webp) file.' };
  }
  if (file.size <= 0) {
    return { valid: false, message: 'The selected logo file is empty.' };
  }
  if (file.type === 'image/svg+xml' && file.size > 256 * 1024) {
    return { valid: false, message: 'SVG logo files must not exceed 256 KB.' };
  }
  if (file.size > 2 * 1024 * 1024) {
    return { valid: false, message: 'Logo files must not exceed 2 MB.' };
  }
  return { valid: true, message: '' };
}

@Injectable({ providedIn: 'root' })
export class SchoolBrandingService {
  private readonly auth = inject(AuthService);
  private readonly api = inject(SchoolApiService);
  private readonly http = inject(HttpClient, { optional: true });
  private readonly platformApp = inject(PlatformAppService, { optional: true });
  private readonly router = inject(Router, { optional: true });
  private readonly destroyRef = inject(DestroyRef, { optional: true });
  private readonly doc = inject(DOCUMENT, { optional: true });

  private readonly cache = new Map<string, SchoolBrandingState>();
  private generation = 0;
  private lastLoadedRevision = 0;

  readonly currentPath = signal<string>(this.resolveInitialPath());
  readonly state = signal<SchoolBrandingState | null>(null);
  readonly loading = signal(false);
  readonly error = signal('');

  private resolveInitialPath(): string {
    const routerUrl = this.router?.url ?? '';
    if (routerUrl && routerUrl !== '/') {
      return routerUrl;
    }
    const winPath = this.doc?.defaultView?.location?.pathname ?? (typeof window !== 'undefined' ? window.location?.pathname : '') ?? '';
    return winPath || routerUrl;
  }

  private resolvedPath(): string {
    const current = this.currentPath().split(/[?#]/)[0];
    if (current && current !== '/') {
      return current;
    }
    const winPath = (this.doc?.defaultView?.location?.pathname ?? (typeof window !== 'undefined' ? window.location?.pathname : '') ?? '').split(/[?#]/)[0];
    return winPath || current;
  }

  private isStaffWorkspacePath(path: string): boolean {
    return (
      path.startsWith('/head') ||
      path.startsWith('/teacher') ||
      path.startsWith('/academic') ||
      path.startsWith('/register') ||
      path.startsWith('/bursar')
    );
  }

  /**
   * Parent mobile app and `/parent` routes must ALWAYS retain original SyncAcademy branding.
   * Switching between children or schools in the Parent app never alters global application theme tokens.
   */
  readonly isParentExperience = computed(() => {
    const path = this.resolvedPath();
    const role = this.auth.identity()?.selectedRole ?? '';
    if (path.startsWith('/parent') || role === 'PARENT') {
      return true;
    }
    if (this.isStaffWorkspacePath(path) || path.startsWith('/super-admin') || path.startsWith('/platform-access')) {
      return false;
    }
    const flavor = this.platformApp?.appFlavor?.() ?? 'web';
    return flavor === 'parent';
  });

  /**
   * Super Admin portal routes (`/super-admin` and `/platform-access`) must ALWAYS retain original SyncAcademy branding.
   */
  readonly isSuperAdminExperience = computed(() => {
    const path = this.resolvedPath();
    if (path.startsWith('/super-admin') || path.startsWith('/platform-access')) {
      return true;
    }
    const role = this.auth.identity()?.selectedRole ?? '';
    if (role === 'SUPER_ADMIN' && !this.isStaffWorkspacePath(path)) {
      return true;
    }
    return false;
  });

  /**
   * School branding tokens apply ONLY to the School Staff Web Workspace and the Teacher Mobile App.
   */
  readonly shouldApplySchoolBranding = computed(() => {
    if (this.platformApp && !this.platformApp.isInitialized()) {
      return false;
    }
    if (this.isParentExperience() || this.isSuperAdminExperience()) {
      return false;
    }
    const id = this.api.schoolId();
    return Boolean(id);
  });

  readonly activePrimaryColor = computed(() => {
    if (!this.shouldApplySchoolBranding()) return DEFAULT_SCHOOL_PRIMARY;
    const s = this.state();
    if (!s || !s.hasPublishedTheme) return DEFAULT_SCHOOL_PRIMARY;
    return s.publishedTheme?.colors?.primary ?? s.publishedTheme?.tokens?.colors?.primary ?? DEFAULT_SCHOOL_PRIMARY;
  });

  readonly activeSecondaryColor = computed(() => {
    if (!this.shouldApplySchoolBranding()) return DEFAULT_SCHOOL_SECONDARY;
    const s = this.state();
    if (!s || !s.hasPublishedTheme) return DEFAULT_SCHOOL_SECONDARY;
    return s.publishedTheme?.colors?.secondary ?? s.publishedTheme?.tokens?.colors?.secondary ?? DEFAULT_SCHOOL_SECONDARY;
  });

  readonly activeLogoUrl = computed(() => {
    if (!this.shouldApplySchoolBranding()) return null;
    const s = this.state();
    return s?.hasLogo && s.logoUrl ? s.logoUrl : null;
  });

  readonly activeWelcomeMessage = computed(() => {
    if (!this.shouldApplySchoolBranding()) return null;
    const s = this.state();
    if (!s || !s.hasPublishedTheme) return null;
    return s.publishedTheme?.welcomeMessage ?? null;
  });

  constructor() {
    const sub = this.router?.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        this.currentPath.set(event.urlAfterRedirects);
      }
    });
    this.destroyRef?.onDestroy(() => sub?.unsubscribe());

    // Clear cache and reset to defaults when user logs out
    effect(() => {
      const userId = this.auth.identity()?.id;
      if (!userId) {
        this.generation++;
        this.cache.clear();
        this.state.set(null);
        this.clearDocumentTokens();
      }
    });

    // React to active schoolId or realtime school revision updates
    effect(() => {
      const schoolId = this.api.schoolId();
      const revision = this.api.schoolRevisionNotice();
      const isParent = this.isParentExperience();
      const isSuperAdmin = this.isSuperAdminExperience();

      untracked(() => {
        if (!schoolId || isParent || isSuperAdmin) {
          this.generation++;
          if (!schoolId) this.state.set(null);
          this.clearDocumentTokens();
          return;
        }
        const forceRefresh = revision !== this.lastLoadedRevision;
        this.lastLoadedRevision = revision;
        void this.loadSchoolBranding(schoolId, forceRefresh);
      });
    });

    // Apply or clear CSS custom properties whenever active state or application context changes
    effect(() => {
      const apply = this.shouldApplySchoolBranding();
      const primary = this.activePrimaryColor();
      const secondary = this.activeSecondaryColor();
      const hasCustom = Boolean(this.state()?.hasPublishedTheme);
      untracked(() => {
        if (!apply || !hasCustom) {
          this.clearDocumentTokens();
        } else {
          this.applyDocumentTokens(primary, secondary);
        }
      });
    });
  }

  async loadSchoolBranding(targetSchoolId?: string, forceRefresh = false): Promise<SchoolBrandingState | null> {
    const schoolId = targetSchoolId ?? this.api.schoolId();
    if (!schoolId || this.isParentExperience()) {
      this.state.set(null);
      this.clearDocumentTokens();
      return null;
    }

    // Reset to default branding while loading a newly switched school unless cached and not forced
    if (!forceRefresh && this.cache.has(schoolId)) {
      const cached = this.cache.get(schoolId)!;
      if (this.api.schoolId() === schoolId) {
        this.state.set(cached);
      }
      return cached;
    }

    if (this.state()?.schoolId !== schoolId) {
      this.state.set(null);
      this.clearDocumentTokens();
    }

    const requestGen = ++this.generation;
    this.loading.set(true);
    this.error.set('');

    try {
      const response = await this.auth.request<SchoolBrandingState>('GET', `schools/${schoolId}/branding`);
      this.cache.set(schoolId, response);
      // Discard stale responses if the user switched schools while the request was in flight
      if (requestGen === this.generation && this.api.schoolId() === schoolId) {
        this.state.set(response);
      }
      return response;
    } catch (err) {
      if (requestGen === this.generation && this.api.schoolId() === schoolId) {
        this.state.set(null);
        this.error.set(this.auth.error(err));
      }
      return null;
    } finally {
      if (requestGen === this.generation) {
        this.loading.set(false);
      }
    }
  }

  async saveDraftBranding(payload: {
    colors: { primary: string; secondary: string };
    welcomeMessage: string | null;
    expectedThemeVersion?: number;
  }): Promise<SchoolBrandingState> {
    const schoolId = this.api.schoolId();
    if (!schoolId) throw new Error('Select a school first.');
    const expectedThemeVersion = payload.expectedThemeVersion ?? this.state()?.themeVersion;
    const updated = await this.auth.request<SchoolBrandingState>('PATCH', `schools/${schoolId}/branding/draft`, {
      schemaVersion: 1,
      colors: {
        primary: payload.colors.primary.trim().toUpperCase(),
        secondary: payload.colors.secondary.trim().toUpperCase(),
      },
      welcomeMessage: payload.welcomeMessage,
      ...(expectedThemeVersion !== undefined ? { expectedThemeVersion } : {}),
    });
    this.cache.set(schoolId, updated);
    if (this.api.schoolId() === schoolId) {
      this.state.set(updated);
    }
    return updated;
  }

  async stageLogoUpload(file: File, expectedThemeVersion?: number): Promise<{ stagedLogoKey: string }> {
    const schoolId = this.api.schoolId();
    if (!schoolId) throw new Error('Select a school first.');
    const check = validateLogoFileClient(file);
    if (!check.valid) throw new Error(check.message);
    if (!this.http) throw new Error('HTTP client unavailable.');

    const version = expectedThemeVersion ?? this.state()?.themeVersion;
    const bytes = await file.arrayBuffer();
    return firstValueFrom(
      this.http.put<{ staged: true; stagedLogoKey: string }>(
        `/api/v1/schools/${schoolId}/branding/logo?stage=true`,
        bytes,
        {
          withCredentials: true,
          headers: {
            'Content-Type': file.type,
            'X-Requested-With': 'SyncAcademy',
            ...(version !== undefined ? { 'X-Expected-Theme-Version': String(version) } : {}),
          },
        },
      ),
    );
  }

  async publishBranding(payload: {
    colors: { primary: string; secondary: string };
    welcomeMessage: string | null;
    expectedThemeVersion?: number;
    stagedLogoKey?: string | null;
  }): Promise<SchoolBrandingState> {
    const schoolId = this.api.schoolId();
    if (!schoolId) throw new Error('Select a school first.');
    const expectedThemeVersion = payload.expectedThemeVersion ?? this.state()?.themeVersion;
    const updated = await this.auth.request<SchoolBrandingState>('PATCH', `schools/${schoolId}/branding`, {
      schemaVersion: 1,
      colors: {
        primary: payload.colors.primary.trim().toUpperCase(),
        secondary: payload.colors.secondary.trim().toUpperCase(),
      },
      welcomeMessage: payload.welcomeMessage,
      ...(expectedThemeVersion !== undefined ? { expectedThemeVersion } : {}),
      ...(payload.stagedLogoKey ? { stagedLogoKey: payload.stagedLogoKey } : {}),
    });
    this.cache.set(schoolId, updated);
    if (this.api.schoolId() === schoolId) {
      this.state.set(updated);
    }
    return updated;
  }

  async resetDefaultBranding(expectedThemeVersion?: number): Promise<SchoolBrandingState> {
    const schoolId = this.api.schoolId();
    if (!schoolId) throw new Error('Select a school first.');
    const version = expectedThemeVersion ?? this.state()?.themeVersion;
    const updated = await this.auth.request<SchoolBrandingState>(
      'POST',
      `schools/${schoolId}/branding/reset`,
      version !== undefined ? { expectedThemeVersion: version } : {},
    );
    this.cache.set(schoolId, updated);
    if (this.api.schoolId() === schoolId) {
      this.state.set(updated);
    }
    return updated;
  }

  async uploadLogo(file: File, expectedThemeVersion?: number): Promise<SchoolBrandingState> {
    const schoolId = this.api.schoolId();
    if (!schoolId) throw new Error('Select a school first.');
    const check = validateLogoFileClient(file);
    if (!check.valid) throw new Error(check.message);
    if (!this.http) throw new Error('HTTP client unavailable.');

    const version = expectedThemeVersion ?? this.state()?.themeVersion;
    const bytes = await file.arrayBuffer();
    const updated = await firstValueFrom(
      this.http.put<SchoolBrandingState>(`/api/v1/schools/${schoolId}/branding/logo`, bytes, {
        withCredentials: true,
        headers: {
          'Content-Type': file.type,
          'X-Requested-With': 'SyncAcademy',
          ...(version !== undefined ? { 'X-Expected-Theme-Version': String(version) } : {}),
        },
      }),
    );
    this.cache.set(schoolId, updated);
    if (this.api.schoolId() === schoolId) {
      this.state.set(updated);
    }
    return updated;
  }

  async removeLogo(): Promise<SchoolBrandingState> {
    const schoolId = this.api.schoolId();
    if (!schoolId) throw new Error('Select a school first.');
    const updated = await this.auth.request<SchoolBrandingState>('DELETE', `schools/${schoolId}/branding/logo`);
    this.cache.set(schoolId, updated);
    if (this.api.schoolId() === schoolId) {
      this.state.set(updated);
    }
    return updated;
  }

  private applyDocumentTokens(primary: string, secondary: string): void {
    const root = this.doc?.documentElement;
    if (!root?.style) return;
    const hover = darkenHex(primary, 0.12);
    const secondarySurface = resolveSecondarySurfaceTokens(secondary, primary);
    root.style.setProperty('--school-primary', primary);
    root.style.setProperty('--school-primary-hover', hover);
    root.style.setProperty('--school-primary-foreground', DEFAULT_SCHOOL_FOREGROUND);
    root.style.setProperty('--school-secondary', secondary);
    root.style.setProperty('--school-secondary-foreground', secondarySurface.foregroundColor);
    root.style.setProperty('--school-secondary-muted', secondarySurface.mutedForegroundColor);
    root.style.setProperty('--school-logo-accent', secondarySurface.logoAccentColor);
    root.style.setProperty('--school-secondary-surface', secondarySurface.surfaceBg);
    root.style.setProperty('--school-secondary-hover', secondarySurface.hoverBg);
    root.style.setProperty('--school-secondary-border', secondarySurface.borderColor);
    root.style.setProperty('--school-active-nav-border', secondarySurface.activeNavBorderColor);
    root.style.setProperty('--school-active-nav-indicator', secondarySurface.activeNavIndicatorColor);
  }

  private clearDocumentTokens(): void {
    const root = this.doc?.documentElement;
    if (!root?.style) return;
    root.style.removeProperty('--school-primary');
    root.style.removeProperty('--school-primary-hover');
    root.style.removeProperty('--school-primary-foreground');
    root.style.removeProperty('--school-secondary');
    root.style.removeProperty('--school-secondary-foreground');
    root.style.removeProperty('--school-secondary-muted');
    root.style.removeProperty('--school-logo-accent');
    root.style.removeProperty('--school-secondary-surface');
    root.style.removeProperty('--school-secondary-hover');
    root.style.removeProperty('--school-secondary-border');
    root.style.removeProperty('--school-active-nav-border');
    root.style.removeProperty('--school-active-nav-indicator');
  }
}

