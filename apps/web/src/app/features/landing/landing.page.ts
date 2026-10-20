import { requestErrorMessage } from '../../core/services/request-error';
import { Component, OnDestroy, OnInit, HostListener, signal, computed, AfterViewInit, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { LogoComponent } from '@shared/components/logo/logo.component';
import { PublicFooterComponent } from '@shared/components/public-footer/public-footer.component';

export interface HeroSlide {
  line1: string;
  line2: string;
  description: string;
}

export type SchoolRole = 'leadership' | 'teachers' | 'bursar';
type MobileNavSection = 'home' | 'features' | 'solutions' | 'services' | 'about' | 'contact';

export interface RoleInfo {
  id: SchoolRole;
  title: string;
  tagline: string;
  headline: string;
  description: string;
  benefits: string[];
  metricNumber: string;
  metricLabel: string;
  badgeLabel: string;
  ctaText: string;
  ctaLink: string;
}

export interface StatCounter {
  id: string;
  label: string;
  sublabel: string;
  target: number;
  current: number;
  suffix: string;
  prefix?: string;
  decimals?: number;
}

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, LogoComponent, PublicFooterComponent],
  templateUrl: './landing.page.html',
  styleUrls: ['./landing.page.scss']
})
export class LandingPage implements OnInit, OnDestroy, AfterViewInit {
  showScrollTop = signal(false);
  mobileNavOpen = signal(false);
  activeMobileNav = signal<MobileNavSection>('home');
  private readonly mobileNavSections: MobileNavSection[] = ['home', 'features', 'solutions', 'services', 'about', 'contact'];
  @ViewChild('mobileNavToggle') private mobileNavToggle?: ElementRef<HTMLButtonElement>;
  @ViewChild('mobileNav') private mobileNav?: ElementRef<HTMLElement>;
  private previousBodyOverflow: string | null = null;
  private previousDocumentOverflow: string | null = null;
  private observer: IntersectionObserver | null = null;
  private statsObserver: IntersectionObserver | null = null;
  private countersAnimated = false;

  readonly statCounters = signal<StatCounter[]>([
    { id: 'schools', label: 'Partner Schools', sublabel: 'Campuses in system', target: 7, current: 0, suffix: '+' },
    { id: 'students', label: 'Active Students', sublabel: 'Managed profiles', target: 3200, current: 0, suffix: '+' },
    { id: 'attendance', label: 'Daily Attendance', sublabel: 'Recorded digitally', target: 99.4, current: 0, suffix: '%', decimals: 1 },
    { id: 'financials', label: 'Fee Reconciled', sublabel: 'Audit-ready tracking', target: 100, current: 0, suffix: '%' }
  ]);

  readonly activeRole = signal<SchoolRole>('leadership');

  readonly roleDataMap: Record<SchoolRole, RoleInfo> = {
    leadership: {
      id: 'leadership',
      title: 'School Leadership',
      tagline: 'DIRECTORS, HEADMASTERS & GOVERNING BOARDS',
      headline: 'Total institutional oversight and financial precision',
      description: 'Gain real-time control over admissions, fee collection, staff allocations, and academic year transitions from a single executive dashboard.',
      benefits: [
        'Live financial tracking and payment reconciliation across classes',
        'Atomic academic year rollover and safe class promotion',
        'Official regulatory reporting and multi-campus analytics'
      ],
      metricNumber: '100%',
      metricLabel: 'Audit-ready financial logs',
      badgeLabel: 'Executive Control',
      ctaText: 'Explore Leadership Portal',
      ctaLink: '/auth/register'
    },
    teachers: {
      id: 'teachers',
      title: 'Teachers & Faculty',
      tagline: 'CLASSROOM EDUCATORS & HEADS OF DEPARTMENT',
      headline: 'Less time on paperwork, more time for student mentorship',
      description: 'Effortlessly record daily attendance in seconds, enter terminal exam marks, track syllabus progress, and identify struggling students.',
      benefits: [
        'Fast digital attendance recording across assigned streams',
        'Automated terminal score calculation and ranking schemes',
        'Subject syllabus milestone tracking and teacher rosters'
      ],
      metricNumber: '75%',
      metricLabel: 'Grading time saved',
      badgeLabel: 'Academic Suite',
      ctaText: 'See Teaching Tools',
      ctaLink: '/auth/register'
    },
    bursar: {
      id: 'bursar',
      title: 'Accountant & Bursar',
      tagline: 'BURSARS, ACCOUNTANTS & FINANCE OFFICERS',
      headline: 'Zero discrepancies in school fees, expenses, and banking',
      description: 'Manage student fee ledgers, record bank and mobile money payments, generate instant verified receipts, and automate term financial reports with total audit compliance.',
      benefits: [
        'Instant payment recording with automated receipt notifications',
        'Live class-by-class fee balances and overdue payment tracking',
        '1-click financial statements and term reconciliation reports'
      ],
      metricNumber: '100%',
      metricLabel: 'Audit-ready fee ledgers',
      badgeLabel: 'Finance & Bursary',
      ctaText: 'Explore Finance Tools',
      ctaLink: '/auth/register'
    }
  };

  readonly currentRoleData = computed(() => this.roleDataMap[this.activeRole()]);

  readonly heroSlides: HeroSlide[] = [
    {
      line1: 'A smarter way to',
      line2: 'manage your school',
      description: 'Sync Academy brings your entire school together in one powerful platform from students and academics to finance, communication, and administration.'
    },
    {
      line1: 'Empower teachers,',
      line2: 'inspire every student',
      description: 'Streamline grading, attendance, and lesson planning so educators can focus on what matters most inspiring learners.'
    },
    {
      line1: 'Real time clarity for',
      line2: 'school leadership',
      description: 'Make confident decisions with unified data across admissions, finances, academic progress, and institutional performance.'
    },
    {
      line1: 'Connect families with',
      line2: 'seamless communication',
      description: 'Keep parents engaged and informed with instant updates on student progress, attendance records, and school announcements.'
    }
  ];

  currentSlide = signal(0);
  previousSlide = signal<number | null>(null);
  private slideIntervalId: ReturnType<typeof setInterval> | null = null;
  private isPaused = signal(false);

  contactData = {
    fullName: '',
    emailAddress: '',
    phoneNumber: '',
    subject: '',
    message: ''
  };

  contactStatus = signal<'idle' | 'submitting' | 'success' | 'error'>('idle');
  contactMessage = signal<string>('');

  constructor(private el: ElementRef, private http: HttpClient) {}

  async submitContactForm() {
    if (this.contactStatus() === 'submitting') return;
    this.contactStatus.set('submitting');
    this.contactMessage.set('');

    try {
      const res = await firstValueFrom(this.http.post<{message: string}>('/api/v1/contact', this.contactData, {
        headers: { 'X-Requested-With': 'SyncAcademy', 'Content-Type': 'application/json' }
      }));
      this.contactStatus.set('success');
      this.contactMessage.set(res?.message || 'Your message has been sent successfully.');
      this.contactData = { fullName: '', emailAddress: '', phoneNumber: '', subject: '', message: '' };
    } catch (err: any) {
      this.contactStatus.set('error');
      this.contactMessage.set(requestErrorMessage(err));
    }
  }

  ngAfterViewInit() {
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      this.el.nativeElement.querySelector('.landing-page')?.classList.add('landing-motion-ready');
    }
    this.observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
        }
      });
    }, { threshold: 0.1 });

    const elements = this.el.nativeElement.querySelectorAll('.scroll-animate, .staggered-card-grid, .about-reveal');
    elements.forEach((el: Element) => this.observer?.observe(el));

    // The landing page is loaded lazily, after the browser's first hash jump.
    requestAnimationFrame(() => {
      const id = window.location.hash.slice(1);
      if (['home', 'features', 'solutions', 'services', 'about', 'roles', 'contact'].includes(id)) {
        document.getElementById(id)?.scrollIntoView();
      }
    });

    const statsEl = this.el.nativeElement.querySelector('.stats-counter-strip');
    if (statsEl) {
      this.statsObserver = new IntersectionObserver((entries) => {
        if (entries[0]?.isIntersecting) {
          this.animateCounters();
          this.statsObserver?.disconnect();
        }
      }, { threshold: 0.15 });
      this.statsObserver.observe(statsEl);
    }
  }

  setRole(role: SchoolRole): void {
    this.activeRole.set(role);
  }

  formatCounter(counter: StatCounter): string {
    const value = counter.decimals
      ? counter.current.toFixed(counter.decimals)
      : Math.floor(counter.current).toLocaleString();
    return `${counter.prefix ?? ''}${value}${counter.suffix}`;
  }

  private animateCounters(): void {
    if (this.countersAnimated) return;
    this.countersAnimated = true;
    const duration = 1600;
    const startTime = performance.now();

    const frame = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 5);

      this.statCounters.update(counters =>
        counters.map(c => ({
          ...c,
          current: c.decimals
            ? Math.round(c.target * ease * 10) / 10
            : Math.floor(c.target * ease)
        }))
      );

      if (progress < 1) {
        requestAnimationFrame(frame);
      } else {
        this.statCounters.update(counters =>
          counters.map(c => ({ ...c, current: c.target }))
        );
      }
    };

    requestAnimationFrame(frame);
  }

  @HostListener('window:scroll', [])
  onWindowScroll() {
    this.showScrollTop.set(window.scrollY > 200);
    const activationLine = 140;
    let activeSection: MobileNavSection = 'home';
    for (const section of this.mobileNavSections) {
      const element = document.getElementById(section);
      if (element && element.getBoundingClientRect().top <= activationLine) activeSection = section;
    }
    this.activeMobileNav.set(activeSection);
  }

  scrollToTop(): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  toggleMobileNav(): void {
    if (this.mobileNavOpen()) {
      this.closeMobileNav();
      return;
    }

    this.previousBodyOverflow = document.body.style.overflow;
    this.previousDocumentOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    this.mobileNavOpen.set(true);
    requestAnimationFrame(() => this.mobileNav?.nativeElement.focus());
  }

  closeMobileNav(restoreFocus = true): void {
    if (!this.mobileNavOpen()) return;
    this.mobileNavOpen.set(false);
    this.restoreBodyScrolling();
    if (restoreFocus) this.mobileNavToggle?.nativeElement.focus();
  }

  selectMobileNav(section: MobileNavSection, event: MouseEvent): void {
    event.preventDefault();
    this.activeMobileNav.set(section);
    this.closeMobileNav(false);
    history.pushState(null, '', `#${section}`);

    const target = document.getElementById(section);
    if (!target) return;

    const top = target.getBoundingClientRect().top + window.scrollY - 112;
    const behavior: ScrollBehavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      ? 'instant'
      : 'smooth';
    window.scrollTo({ top: Math.max(0, top), behavior });
  }

  @HostListener('window:keydown', ['$event'])
  onMobileNavKeydown(event: KeyboardEvent): void {
    if (!this.mobileNavOpen()) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      this.closeMobileNav();
      return;
    }
    if (event.key !== 'Tab') return;

    const links = this.mobileNav?.nativeElement.querySelectorAll<HTMLElement>('a[href]');
    if (!links?.length) return;
    const drawer = this.mobileNav?.nativeElement;
    const first = links[0];
    const last = links[links.length - 1];
    if (event.shiftKey && (document.activeElement === first || document.activeElement === drawer)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && (document.activeElement === last || document.activeElement === drawer)) {
      event.preventDefault();
      first.focus();
    }
  }

  @HostListener('window:resize')
  onResize(): void { if (window.innerWidth > 1024) this.closeMobileNav(false); }

  ngOnInit() {
    const initialSection = this.mobileNavSections.find(section => section === window.location.hash.slice(1));
    if (initialSection) this.activeMobileNav.set(initialSection);
    document.documentElement.classList.add('landing-route');
    document.body.classList.add('landing-route');

    // Dashboard screens use Ionic's fixed-height layout. The public landing
    // page is a normal document, so it must always restore document scrolling.
    document.body.style.removeProperty('position');
    document.body.style.removeProperty('overflow');
    document.body.style.removeProperty('overflow-x');
    document.body.style.removeProperty('overflow-y');
    document.body.style.removeProperty('width');
    document.body.style.removeProperty('height');

    this.startSlideTimer();
  }

  startSlideTimer(): void {
    if (this.slideIntervalId) {
      clearInterval(this.slideIntervalId);
      this.slideIntervalId = null;
    }
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    this.slideIntervalId = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return;
      if (this.isPaused()) return;
      this.nextSlide();
    }, 4000);
  }

  nextSlide(): void {
    const current = this.currentSlide();
    const next = (current + 1) % this.heroSlides.length;
    this.previousSlide.set(current);
    this.currentSlide.set(next);

    setTimeout(() => {
      if (this.previousSlide() === current) {
        this.previousSlide.set(null);
      }
    }, 1150);
  }

  setSlide(index: number): void {
    if (index === this.currentSlide() || index < 0 || index >= this.heroSlides.length) return;
    const current = this.currentSlide();
    this.previousSlide.set(current);
    this.currentSlide.set(index);
    this.startSlideTimer();

    setTimeout(() => {
      if (this.previousSlide() === current) {
        this.previousSlide.set(null);
      }
    }, 1150);
  }

  pauseSlider(): void {
    this.isPaused.set(true);
  }

  resumeSlider(): void {
    this.isPaused.set(false);
  }

  ngOnDestroy() {
    this.restoreBodyScrolling();
    if (this.slideIntervalId) {
      clearInterval(this.slideIntervalId);
      this.slideIntervalId = null;
    }
    this.observer?.disconnect();
    this.statsObserver?.disconnect();
    document.documentElement.classList.remove('landing-route');
    document.body.classList.remove('landing-route');
  }

  private restoreBodyScrolling(): void {
    if (this.previousBodyOverflow !== null) {
      document.body.style.overflow = this.previousBodyOverflow;
      this.previousBodyOverflow = null;
    }
    if (this.previousDocumentOverflow !== null) {
      document.documentElement.style.overflow = this.previousDocumentOverflow;
      this.previousDocumentOverflow = null;
    }
  }
}
