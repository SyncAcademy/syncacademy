import { Component, DestroyRef, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { SchoolApiService } from '../../../../core/services/school-api.service';
import { AcademicDataService } from '../../../../core/services/academic-data.service';
import { AcademicYearService } from '../../../../core/services/academic-year.service';
import { DEFAULT_GRADING, GradeBand } from '../../../../core/services/grading-policy.service';
import {
  DEFAULT_SCHOOL_PRIMARY,
  DEFAULT_SCHOOL_SECONDARY,
  SchoolBrandingService,
  WELCOME_MESSAGE_MAX_LENGTH,
  darkenHex,
  resolveSecondarySurfaceTokens,
  validateBrandHexColor,
  validateLogoFileClient,
  validateWelcomeMessageText,
} from '../../../../core/services/school-branding.service';
import { HeadPageHeaderComponent } from '../../shared/head-page-header.component';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, HeadPageHeaderComponent],
  templateUrl: './settings.page.html',
  styleUrls: ['../../../academic/academic.page.scss', './settings.page.scss'],
})
export class SettingsPage {
  readonly api = inject(SchoolApiService);
  readonly remote = inject(AcademicDataService);
  readonly years = inject(AcademicYearService);
  readonly branding = inject(SchoolBrandingService);
  private readonly destroyRef = inject(DestroyRef);

  readonly year = this.years.headYear;
  readonly policy = computed(() => this.remote.data().policy ?? DEFAULT_GRADING);
  bands: GradeBand[] = [];
  passMark = 35;
  readonly error = signal('');
  readonly notice = signal('');
  readonly saving = signal(false);
  private loadedPolicyKey = '';

  // School Branding form state
  readonly primaryHex = signal(DEFAULT_SCHOOL_PRIMARY);
  readonly secondaryHex = signal(DEFAULT_SCHOOL_SECONDARY);
  readonly welcomeMessage = signal('');
  readonly brandingError = signal('');
  readonly brandingNotice = signal('');
  readonly brandingBusy = signal(false);
  readonly logoBusy = signal(false);
  readonly logoLoadError = signal(false);
  readonly stagedLogoFile = signal<File | null>(null);
  readonly stagedLogoPreviewUrl = signal<string | null>(null);
  private loadedBrandingKey = '';
  private lastSchoolId: string | null = null;

  readonly maxWelcomeLength = WELCOME_MESSAGE_MAX_LENGTH;

  readonly schoolDisplayName = computed(
    () => this.api.data()?.school?.name || this.branding.state()?.name || 'School',
  );

  readonly primaryValidation = computed(() =>
    validateBrandHexColor(this.primaryHex(), 'Primary'),
  );

  readonly secondaryValidation = computed(() =>
    validateBrandHexColor(this.secondaryHex(), 'Secondary'),
  );

  readonly welcomeValidation = computed(() =>
    validateWelcomeMessageText(this.welcomeMessage()),
  );

  readonly canSubmitBranding = computed(
    () =>
      !this.brandingBusy() &&
      !this.logoBusy() &&
      Boolean(this.api.schoolId()) &&
      this.primaryValidation().valid &&
      this.secondaryValidation().valid &&
      this.welcomeValidation().valid,
  );

  readonly previewLogoUrl = computed(() => {
    const staged = this.stagedLogoPreviewUrl();
    if (staged) return staged;
    if (this.logoLoadError()) return null;
    const state = this.branding.state();
    return state?.hasLogo && state.logoUrl ? state.logoUrl : null;
  });

  readonly previewPrimary = computed(() =>
    this.primaryValidation().valid ? this.primaryValidation().normalized : DEFAULT_SCHOOL_PRIMARY,
  );

  readonly previewPrimaryHover = computed(() =>
    darkenHex(this.previewPrimary(), 0.12),
  );

  readonly previewSecondary = computed(() =>
    this.secondaryValidation().valid ? this.secondaryValidation().normalized : DEFAULT_SCHOOL_SECONDARY,
  );

  readonly previewSecondarySurface = computed(() =>
    resolveSecondarySurfaceTokens(this.previewSecondary(), this.previewPrimary()),
  );

  readonly previewWelcome = computed(() => {
    const check = this.welcomeValidation();
    return check.valid ? check.normalized : null;
  });

  constructor() {
    effect(() => {
      const p = this.policy();
      const key = `${this.year()?.id ?? ''}:${p.revision}`;
      if (key === this.loadedPolicyKey) return;
      this.loadedPolicyKey = key;
      this.bands = p.bands.map((b: GradeBand) => ({ ...b }));
      this.passMark = p.passMark;
    });

    effect(() => {
      const state = this.branding.state();
      const schoolId = this.api.schoolId();
      if (schoolId !== this.lastSchoolId) {
        const hadPreviousSchool = this.lastSchoolId !== null;
        this.lastSchoolId = schoolId;
        this.loadedBrandingKey = '';
        if (hadPreviousSchool) {
          this.clearStagedLogo();
          this.brandingError.set('');
          this.brandingNotice.set('');
          this.logoLoadError.set(false);
          this.primaryHex.set(DEFAULT_SCHOOL_PRIMARY);
          this.secondaryHex.set(DEFAULT_SCHOOL_SECONDARY);
          this.welcomeMessage.set('');
        }
      }
      if (!schoolId) return;
      if (!state || state.schoolId !== schoolId) return;
      const source = state.draftTheme ?? (state.hasPublishedTheme ? state.publishedTheme : null);
      const revKey = `${state.schoolId}:${state.themeVersion}:${state.hasDraftTheme ? 'draft' : 'pub'}:${state.logoUrl ?? 'no-logo'}`;
      if (revKey === this.loadedBrandingKey) return;
      this.loadedBrandingKey = revKey;
      const nextPrimary =
        source?.colors?.primary ??
        source?.tokens?.colors?.primary ??
        DEFAULT_SCHOOL_PRIMARY;
      const nextSecondary =
        source?.colors?.secondary ??
        source?.tokens?.colors?.secondary ??
        DEFAULT_SCHOOL_SECONDARY;
      this.primaryHex.set(nextPrimary);
      this.secondaryHex.set(nextSecondary);
      this.welcomeMessage.set(source?.welcomeMessage ?? '');
      this.logoLoadError.set(false);
    });

    this.destroyRef.onDestroy(() => {
      this.clearStagedLogo();
    });
  }

  onPrimarySwatchChange(value: string): void {
    this.primaryHex.set((value ?? '').trim().toUpperCase());
    this.brandingError.set('');
    this.brandingNotice.set('');
  }

  onSecondarySwatchChange(value: string): void {
    this.secondaryHex.set((value ?? '').trim().toUpperCase());
    this.brandingError.set('');
    this.brandingNotice.set('');
  }

  onPrimaryHexInput(value: string): void {
    this.primaryHex.set(value);
    this.brandingError.set('');
    this.brandingNotice.set('');
  }

  onSecondaryHexInput(value: string): void {
    this.secondaryHex.set(value);
    this.brandingError.set('');
    this.brandingNotice.set('');
  }

  onWelcomeInput(value: string): void {
    this.welcomeMessage.set(value);
    this.brandingError.set('');
    this.brandingNotice.set('');
  }

  onLogoFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    const file = input?.files?.[0] ?? null;
    this.brandingError.set('');
    this.brandingNotice.set('');
    if (!file) return;

    const validation = validateLogoFileClient(file);
    if (!validation.valid) {
      this.brandingError.set(validation.message);
      if (input) input.value = '';
      return;
    }

    this.clearStagedLogo();
    this.stagedLogoFile.set(file);
    if (typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function') {
      this.stagedLogoPreviewUrl.set(URL.createObjectURL(file));
    }
    this.logoLoadError.set(false);
    if (input) input.value = '';
  }

  clearStagedLogo(): void {
    const prevUrl = this.stagedLogoPreviewUrl();
    if (prevUrl && typeof URL !== 'undefined' && typeof URL.revokeObjectURL === 'function') {
      URL.revokeObjectURL(prevUrl);
    }
    this.stagedLogoFile.set(null);
    this.stagedLogoPreviewUrl.set(null);
  }

  private async handleBrandingMutationError(err: unknown): Promise<void> {
    const status = (err as { status?: number } | null)?.status;
    if (status === 409) {
      const schoolId = this.api.schoolId();
      if (schoolId) {
        const latest = await this.branding.loadSchoolBranding(schoolId, true);
        if (latest) {
          this.loadedBrandingKey = `${latest.schoolId}:${latest.themeVersion}:${latest.hasDraftTheme ? 'draft' : 'pub'}:${latest.logoUrl ?? 'no-logo'}`;
        }
      }
    }
    this.brandingError.set(this.api.auth.error(err));
  }

  async uploadStagedLogo(): Promise<void> {
    const file = this.stagedLogoFile();
    if (!file || this.logoBusy()) return;
    this.brandingError.set('');
    this.brandingNotice.set('');
    this.logoBusy.set(true);
    try {
      const expectedVersion = this.branding.state()?.themeVersion;
      const updated = await this.branding.uploadLogo(file, expectedVersion);
      this.loadedBrandingKey = `${updated.schoolId}:${updated.themeVersion}:${updated.hasDraftTheme ? 'draft' : 'pub'}:${updated.logoUrl ?? 'no-logo'}`;
      this.clearStagedLogo();
      this.logoLoadError.set(false);
      this.brandingNotice.set('School logo processed, normalized, and updated.');
    } catch (err) {
      await this.handleBrandingMutationError(err);
    } finally {
      this.logoBusy.set(false);
    }
  }

  async removeSchoolLogo(): Promise<void> {
    if (this.logoBusy()) return;
    this.brandingError.set('');
    this.brandingNotice.set('');
    this.clearStagedLogo();
    if (!this.branding.state()?.hasLogo) {
      this.brandingNotice.set('Default SyncAcademy logo restored.');
      return;
    }
    this.logoBusy.set(true);
    try {
      const updated = await this.branding.removeLogo();
      this.loadedBrandingKey = `${updated.schoolId}:${updated.themeVersion}:${updated.hasDraftTheme ? 'draft' : 'pub'}:${updated.logoUrl ?? 'no-logo'}`;
      this.logoLoadError.set(false);
      this.brandingNotice.set('School logo removed. Default SyncAcademy logo restored.');
    } catch (err) {
      await this.handleBrandingMutationError(err);
    } finally {
      this.logoBusy.set(false);
    }
  }

  private assertValidBrandingInputs(): {
    primary: string;
    secondary: string;
    welcomeMessage: string | null;
  } | null {
    const primaryCheck = this.primaryValidation();
    if (!primaryCheck.valid) {
      this.brandingError.set(primaryCheck.message);
      return null;
    }
    const secondaryCheck = this.secondaryValidation();
    if (!secondaryCheck.valid) {
      this.brandingError.set(secondaryCheck.message);
      return null;
    }
    const welcomeCheck = this.welcomeValidation();
    if (!welcomeCheck.valid) {
      this.brandingError.set(welcomeCheck.message);
      return null;
    }
    return {
      primary: primaryCheck.normalized,
      secondary: secondaryCheck.normalized,
      welcomeMessage: welcomeCheck.normalized,
    };
  }

  async saveBrandingDraft(): Promise<void> {
    if (this.brandingBusy() || this.logoBusy()) return;
    this.brandingError.set('');
    this.brandingNotice.set('');
    const valid = this.assertValidBrandingInputs();
    if (!valid) return;

    this.brandingBusy.set(true);
    try {
      const expectedVersion = this.branding.state()?.themeVersion;
      const updated = await this.branding.saveDraftBranding({
        colors: { primary: valid.primary, secondary: valid.secondary },
        welcomeMessage: valid.welcomeMessage,
        expectedThemeVersion: expectedVersion,
      });
      this.loadedBrandingKey = `${updated.schoolId}:${updated.themeVersion}:${updated.hasDraftTheme ? 'draft' : 'pub'}:${updated.logoUrl ?? 'no-logo'}`;
      this.brandingNotice.set('Branding draft saved. Review the live preview and publish when ready.');
    } catch (err) {
      await this.handleBrandingMutationError(err);
    } finally {
      this.brandingBusy.set(false);
    }
  }

  async publishBranding(): Promise<void> {
    if (this.brandingBusy() || this.logoBusy()) return;
    this.brandingError.set('');
    this.brandingNotice.set('');
    const valid = this.assertValidBrandingInputs();
    if (!valid) return;

    this.brandingBusy.set(true);
    try {
      const expectedVersion = this.branding.state()?.themeVersion;
      const pendingLogo = this.stagedLogoFile();
      let stagedLogoKey: string | undefined;
      if (pendingLogo) {
        const staged = await this.branding.stageLogoUpload(pendingLogo, expectedVersion);
        stagedLogoKey = staged.stagedLogoKey;
      }
      const updated = await this.branding.publishBranding({
        colors: { primary: valid.primary, secondary: valid.secondary },
        welcomeMessage: valid.welcomeMessage,
        expectedThemeVersion: expectedVersion,
        stagedLogoKey,
      });
      if (pendingLogo) {
        this.clearStagedLogo();
      }
      this.logoLoadError.set(false);
      this.loadedBrandingKey = `${updated.schoolId}:${updated.themeVersion}:${updated.hasDraftTheme ? 'draft' : 'pub'}:${updated.logoUrl ?? 'no-logo'}`;
      this.brandingNotice.set('School branding published to the staff workspace and teacher application.');
    } catch (err) {
      await this.handleBrandingMutationError(err);
    } finally {
      this.brandingBusy.set(false);
    }
  }

  async restoreDefaultBranding(): Promise<void> {
    if (this.brandingBusy() || this.logoBusy()) return;
    this.brandingError.set('');
    this.brandingNotice.set('');
    this.brandingBusy.set(true);
    try {
      this.clearStagedLogo();
      const expectedVersion = this.branding.state()?.themeVersion;
      const updated = await this.branding.resetDefaultBranding(expectedVersion);
      this.primaryHex.set(DEFAULT_SCHOOL_PRIMARY);
      this.secondaryHex.set(DEFAULT_SCHOOL_SECONDARY);
      this.welcomeMessage.set('');
      this.logoLoadError.set(false);
      this.loadedBrandingKey = `${updated.schoolId}:${updated.themeVersion}:${updated.hasDraftTheme ? 'draft' : 'pub'}:${updated.logoUrl ?? 'no-logo'}`;
      this.brandingNotice.set('Default SyncAcademy logo, colors, and welcome message restored.');
    } catch (err) {
      await this.handleBrandingMutationError(err);
    } finally {
      this.brandingBusy.set(false);
    }
  }

  addBand(): void {
    const index = Math.max(0, this.bands.length - 1);
    const previous = this.bands[index - 1]?.minimum ?? 100;
    this.bands.splice(index, 0, { label: '', minimum: Math.max(1, Math.floor(previous / 2)) });
  }

  removeBand(index: number): void {
    if (this.bands.length > 2) this.bands.splice(index, 1);
  }

  async save(): Promise<void> {
    if (this.saving() || this.year()?.status === 'closed') return;
    this.error.set('');
    this.notice.set('');
    const bands = this.bands.map(b => ({ label: b.label.trim(), minimum: Number(b.minimum) }));
    if (
      !this.year() ||
      !Number.isFinite(Number(this.passMark)) ||
      Number(this.passMark) < 0 ||
      Number(this.passMark) > 100 ||
      bands.length < 2 ||
      bands.some(
        (b, i) =>
          !b.label ||
          !Number.isFinite(b.minimum) ||
          b.minimum < 0 ||
          b.minimum > 100 ||
          (i > 0 && b.minimum >= bands[i - 1].minimum),
      ) ||
      bands.at(-1)?.minimum !== 0 ||
      new Set(bands.map(b => b.label.toLowerCase())).size !== bands.length
    ) {
      this.error.set(
        'Use unique grade names and descending minimum scores ending at 0. The pass mark must be between 0 and 100.',
      );
      return;
    }
    this.saving.set(true);
    const error = await this.remote.command('grading', { bands, passMark: Number(this.passMark) });
    this.saving.set(false);
    if (error) this.error.set(error);
    else this.notice.set('Grading scheme saved for this academic year.');
  }
}
