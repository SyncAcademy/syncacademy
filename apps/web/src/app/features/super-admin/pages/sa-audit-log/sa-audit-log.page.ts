import { CommonModule } from '@angular/common';
import { Component, ElementRef, HostListener, OnDestroy, OnInit, computed, inject, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { ActivatedRoute, Router } from '@angular/router';
import { PlatformAuditDetails, PlatformAuditEntry, SuperAdminStore } from '../../super-admin.store';

@Component({
  selector: 'app-sa-audit-log',
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule],
  templateUrl: './sa-audit-log.page.html',
  styleUrls: ['./sa-audit-log.page.scss', '../../sa-workflows.scss'],
})
export class SaAuditLogPage implements OnInit, OnDestroy {
  readonly store = inject(SuperAdminStore);
  readonly route = inject(ActivatedRoute);
  readonly router = inject(Router);
  readonly search = this.store.auditSearch;
  readonly actorFilter = this.store.auditActor;
  readonly actionFilter = this.store.auditAction;
  readonly from = this.store.auditFrom;
  readonly to = this.store.auditTo;
  readonly pageCount = computed(() => Math.max(1, Math.ceil(this.store.auditTotal() / this.store.auditPageSize())));
  readonly firstResult = computed(() => this.store.auditTotal() ? (this.store.auditPage() - 1) * this.store.auditPageSize() + 1 : 0);
  readonly lastResult = computed(() => Math.min(this.store.auditPage() * this.store.auditPageSize(), this.store.auditTotal()));
  readonly schoolSearch = signal('');
  readonly error = signal('');
  readonly summaryError = signal('');
  readonly detailError = signal('');
  readonly exporting = signal(false);
  readonly summaryLoading = signal(false);
  readonly drawerLoading = signal(false);
  readonly selectedEvent = signal<PlatformAuditEntry | null>(null);
  readonly details = signal<PlatformAuditDetails | null>(null);
  readonly detailEntries = computed(() => {
    const metadata = this.details()?.details;
    if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return [];
    return Object.entries(metadata);
  });
  readonly categories = [
    ['AUTHENTICATION', 'Authentication'],
    ['USER_MANAGEMENT', 'User Management'],
    ['SCHOOL_MANAGEMENT', 'School Management'],
    ['STUDENT_MANAGEMENT', 'Student Management'],
    ['TEACHER_MANAGEMENT', 'Teacher Management'],
    ['ACADEMIC_RECORDS', 'Academic Records'],
    ['FINANCIAL_RECORDS', 'Financial Records'],
    ['PLATFORM_SETTINGS', 'Platform Settings'],
    ['SECURITY', 'Security'],
    ['SYSTEM_OPERATIONS', 'System Operations'],
  ];
  readonly closeButton = viewChild<ElementRef<HTMLButtonElement>>('drawerClose');
  private searchTimer?: ReturnType<typeof setTimeout>;
  private schoolTimer?: ReturnType<typeof setTimeout>;
  private previousFocus: HTMLElement | null = null;

  ngOnInit(): void {
    this.readQueryState();
    void this.refresh();
  }

  ngOnDestroy(): void {
    clearTimeout(this.searchTimer);
    clearTimeout(this.schoolTimer);
  }

  filter(value: string, kind: 'search' | 'actor' | 'action' | 'outcome' | 'severity' | 'category' | 'from' | 'to'): void {
    const signals = {
      search: this.store.auditSearch,
      actor: this.store.auditActor,
      action: this.store.auditAction,
      outcome: this.store.auditOutcome,
      severity: this.store.auditSeverity,
      category: this.store.auditCategory,
      from: this.from,
      to: this.to,
    };
    signals[kind].set(value);
    this.store.auditPage.set(1);
    this.syncQueryState();
    clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => void this.load(), ['search', 'actor', 'action'].includes(kind) ? 250 : 0);
  }

  searchSchools(value: string): void {
    this.schoolSearch.set(value);
    clearTimeout(this.schoolTimer);
    this.schoolTimer = setTimeout(() => {
      void this.loadSchoolOptions(value).catch(error => this.error.set(this.store.auth.error(error)));
    }, 200);
  }

  selectSchool(value: string): void {
    const selected = this.store.auditFilterOptions().schools.find(school => `${school.name} · ${school.code}` === value);
    this.store.auditSchoolId.set(selected?.id ?? '');
    this.schoolSearch.set(selected ? `${selected.name} · ${selected.code}` : value);
    this.store.auditPage.set(1);
    this.syncQueryState();
    void Promise.all([this.load(), this.loadSummary(), this.loadSchoolOptions('')]).catch(error => {
      this.error.set(this.store.auth.error(error));
    });
  }

  async periodChanged(value: number | string): Promise<void> {
    this.store.auditPeriodDays.set(Number(value));
    this.syncQueryState();
    await this.loadSummary();
  }

  async page(change: number): Promise<void> {
    const next = Math.min(this.pageCount(), Math.max(1, this.store.auditPage() + change));
    if (next === this.store.auditPage()) return;
    this.store.auditPage.set(next);
    this.syncQueryState();
    await this.load();
  }

  async pageSizeChanged(value: number | string): Promise<void> {
    this.store.auditPageSize.set(Number(value));
    this.store.auditPage.set(1);
    this.syncQueryState();
    await this.load();
  }

  async resetFilters(): Promise<void> {
    this.store.auditSearch.set('');
    this.store.auditActor.set('');
    this.store.auditSchoolId.set('');
    this.store.auditCategory.set('');
    this.store.auditAction.set('');
    this.store.auditOutcome.set('');
    this.store.auditSeverity.set('');
    this.store.auditFrom.set('');
    this.store.auditTo.set('');
    this.schoolSearch.set('');
    this.store.auditPage.set(1);
    this.syncQueryState();
    await Promise.all([this.load(), this.loadSummary(), this.loadSchoolOptions('')]);
  }

  async load(): Promise<void> {
    try {
      await this.store.loadAuditIfNeeded();
      this.error.set('');
    } catch (error) {
      this.error.set(this.store.auth.error(error));
    }
  }

  async refresh(): Promise<void> {
    try {
      await Promise.all([this.load(), this.loadSummary(), this.loadSchoolOptions(this.schoolSearch())]);
    } catch (error) {
      this.error.set(this.store.auth.error(error));
    }
  }

  async loadSummary(): Promise<void> {
    this.summaryLoading.set(true);
    try {
      await this.store.loadAuditSummary();
      this.summaryError.set('');
    } catch (error) {
      this.summaryError.set(this.store.auth.error(error));
    } finally {
      this.summaryLoading.set(false);
    }
  }

  selectSchoolFromEvent(event: Event): void {
    if (event.target instanceof HTMLInputElement) this.selectSchool(event.target.value);
  }

  trapDrawerFocus(event: KeyboardEvent): void {
    if (event.key !== 'Tab') return;
    const drawer = event.currentTarget;
    if (!(drawer instanceof HTMLElement)) return;
    const focusable = Array.from(drawer.querySelectorAll<HTMLElement>(
      'button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])',
    ));
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  async loadSchoolOptions(search: string): Promise<void> {
    await this.store.loadAuditFilterOptions(search, this.store.auditSchoolId());
    const selected = this.store.auditFilterOptions().schools.find(school => school.id === this.store.auditSchoolId());
    if (selected && !search) this.schoolSearch.set(`${selected.name} · ${selected.code}`);
  }

  async exportCsv(): Promise<void> {
    if (this.exporting()) return;
    this.exporting.set(true);
    this.error.set('');
    try {
      const params = new URLSearchParams(Object.entries({
        q: this.search(),
        actor: this.actorFilter(),
        schoolId: this.store.auditSchoolId(),
        category: this.store.auditCategory(),
        action: this.actionFilter(),
        outcome: this.store.auditOutcome(),
        severity: this.store.auditSeverity(),
        from: this.from(),
        to: this.to(),
      }).filter(([, value]) => value));
      const file = await this.store.auth.requestBlob(`audit/export?${params.toString()}`);
      const url = URL.createObjectURL(file);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'platform-audit.csv';
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      this.error.set(this.store.auth.error(error));
    } finally {
      this.exporting.set(false);
    }
  }

  async inspect(entry: PlatformAuditEntry, event: Event): Promise<void> {
    this.previousFocus = event.currentTarget instanceof HTMLElement ? event.currentTarget : null;
    this.selectedEvent.set(entry);
    this.details.set(null);
    this.detailError.set('');
    this.drawerLoading.set(true);
    try {
      const data = await this.store.auditDetail(entry.source, entry.id);
      this.details.set(data);
    } catch (error) {
      this.detailError.set(this.store.auth.error(error));
    } finally {
      this.drawerLoading.set(false);
      setTimeout(() => this.closeButton()?.nativeElement.focus());
    }
  }

  closeDetails(): void {
    this.selectedEvent.set(null);
    this.details.set(null);
    this.previousFocus?.focus();
    this.previousFocus = null;
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.selectedEvent()) this.closeDetails();
  }

  actionLabel(action: string): string {
    const known: Record<string, string> = {
      PASSWORD_VERIFIED: 'Signed In',
      SIGNED_IN: 'Signed In',
      LOGIN_FAILED: 'Failed Sign-In',
      PASSWORD_CHANGED: 'Changed Password',
      PASSWORD_RESET: 'Reset Password',
      STUDENT_ENROLLED: 'Registered Student',
      MEMBER_ROLE_REMOVED: 'Changed Permissions',
      AUDIT_LOG_EXPORTED: 'Exported Audit Log',
    };
    return known[action] ?? action
      .replace(/^PLATFORM_/, '')
      .replace(/[_-]+/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, letter => letter.toUpperCase());
  }

  humanize(value: string | null | undefined): string {
    if (!value) return 'Unavailable';
    return value.replace(/[_-]+/g, ' ').toLowerCase().replace(/\b\w/g, letter => letter.toUpperCase());
  }

  displayMetadata(value: unknown): string {
    if (typeof value === 'string') return value;
    try {
      return JSON.stringify(value);
    } catch {
      return 'Unavailable';
    }
  }

  private readQueryState(): void {
    const params = this.route.snapshot.queryParamMap;
    const read = (key: string) => params.get(key) ?? '';
    const page = Number(read('page'));
    const pageSize = Number(read('pageSize'));
    const periodDays = Number(read('periodDays'));
    if (Number.isInteger(page) && page > 0 && page <= 10000) this.store.auditPage.set(page);
    if ([20, 50, 100].includes(pageSize)) this.store.auditPageSize.set(pageSize);
    if ([7, 30, 90, 365].includes(periodDays)) this.store.auditPeriodDays.set(periodDays);
    this.store.auditSearch.set(read('q'));
    this.store.auditActor.set(read('actor'));
    this.store.auditSchoolId.set(read('schoolId'));
    this.store.auditCategory.set(read('category'));
    this.store.auditAction.set(read('action'));
    this.store.auditOutcome.set(read('outcome'));
    this.store.auditSeverity.set(read('severity'));
    this.store.auditFrom.set(read('from'));
    this.store.auditTo.set(read('to'));
  }

  private syncQueryState(): void {
    const values: Record<string, string | number> = {
      page: this.store.auditPage(),
      pageSize: this.store.auditPageSize(),
      periodDays: this.store.auditPeriodDays(),
      q: this.search(),
      actor: this.actorFilter(),
      schoolId: this.store.auditSchoolId(),
      category: this.store.auditCategory(),
      action: this.actionFilter(),
      outcome: this.store.auditOutcome(),
      severity: this.store.auditSeverity(),
      from: this.from(),
      to: this.to(),
    };
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: Object.fromEntries(Object.entries(values).filter(([, value]) => String(value).length)),
      replaceUrl: true,
    });
  }
}
