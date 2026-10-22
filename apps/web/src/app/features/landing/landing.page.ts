import { requestErrorMessage } from '../../core/services/request-error';
import { Component, OnDestroy, OnInit, HostListener, signal, computed, AfterViewInit, ElementRef, ViewChild, NgZone } from '@angular/core';
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
type LandingCarouselId = 'stats' | 'solutions' | 'features' | 'roles' | 'about';

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
  isMobileCarousel = signal(false);
  private readonly mobileNavSections: MobileNavSection[] = ['home', 'features', 'solutions', 'services', 'about', 'contact'];
  @ViewChild('mobileNavToggle') private mobileNavToggle?: ElementRef<HTMLButtonElement>;
  @ViewChild('mobileNav') private mobileNav?: ElementRef<HTMLElement>;
  private previousBodyOverflow: string | null = null;
  private previousDocumentOverflow: string | null = null;
  private observer: IntersectionObserver | null = null;
  private statsObserver: IntersectionObserver | null = null;
  private readonly carouselObservers: IntersectionObserver[] = [];
  private scrollFrame: number | null = null;
  private statsCarouselTrack: HTMLElement | null = null;
  private countersAnimated = false;
  private navbarCap: SVGSVGElement | null = null;
  private reducedMotionQuery: MediaQueryList | null = null;

  isScrolled = signal(false);
  readonly statCounters = signal<StatCounter[]>([
    { id: 'schools', label: 'Partner Schools', sublabel: 'Campuses in system', target: 7, current: 0, suffix: '+' },
    { id: 'students', label: 'Active Students', sublabel: 'Managed profiles', target: 3200, current: 0, suffix: '+' },
    { id: 'attendance', label: 'Daily Attendance', sublabel: 'Recorded digitally', target: 99.4, current: 0, suffix: '%', decimals: 1 },
    { id: 'financials', label: 'Fee Reconciled', sublabel: 'Audit-ready tracking', target: 100, current: 0, suffix: '%' }
  ]);

  readonly activeRole = signal<SchoolRole>('leadership');
  readonly carouselItems = {
    stats: Array.from({ length: 4 }, (_, index) => index),
    solutions: Array.from({ length: 4 }, (_, index) => index),
    features: Array.from({ length: 8 }, (_, index) => index),
    roles: Array.from({ length: 6 }, (_, index) => index),
    about: Array.from({ length: 3 }, (_, index) => index)
  };
  readonly activeCarouselIndexes = signal<Record<LandingCarouselId, number>>({
    stats: 0,
    solutions: 0,
    features: 0,
    roles: 0,
    about: 0
  });

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
      ctaLink: '/request-demo'
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
      ctaLink: '/request-demo'
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
      ctaLink: '/request-demo'
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
    message: '',
    websiteField: ''
  };

  contactStatus = signal<'idle' | 'submitting' | 'success' | 'error'>('idle');
  contactMessage = signal<string>('');

  constructor(private el: ElementRef, private http: HttpClient, private zone: NgZone) {}

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
      this.contactData = { fullName: '', emailAddress: '', phoneNumber: '', subject: '', message: '', websiteField: '' };
    } catch (err: any) {
      this.contactStatus.set('error');
      this.contactMessage.set(requestErrorMessage(err));
    }
  }

  ngAfterViewInit() {
    this.statsCarouselTrack = this.el.nativeElement.querySelector('[data-carousel="stats"]');
    if (this.statsCarouselTrack) {
      this.zone.runOutsideAngular(() => {
        this.statsCarouselTrack?.addEventListener('scroll', this.handleStatsCarouselScroll, { passive: true });
      });
    }

    this.navbarCap = this.el.nativeElement.querySelector('.floating-navbar > .logo app-logo .logo-icon svg');
    this.reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    this.reducedMotionQuery.addEventListener('change', this.handleMotionPreferenceChange);
    if (this.navbarCap && !this.reducedMotionQuery.matches) {
      this.navbarCap.style.transformOrigin = 'center';
      this.navbarCap.style.willChange = 'transform';
    }

    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      this.el.nativeElement.querySelector('.landing-page')?.classList.add('landing-motion-ready');
    }
    if ('IntersectionObserver' in window) {
      this.observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
          }
        });
      }, { threshold: 0.1 });

      const elements = this.el.nativeElement.querySelectorAll('.scroll-animate, .staggered-card-grid, .about-reveal');
      elements.forEach((el: Element) => this.observer?.observe(el));
      this.observeCarouselCards();
    } else {
      this.el.nativeElement
        .querySelectorAll('.scroll-animate, .staggered-card-grid, .about-reveal')
        .forEach((element: Element) => element.classList.add('is-visible'));
    }

    this.zone.runOutsideAngular(() => {
      window.addEventListener('scroll', this.handleWindowScroll, { passive: true });
      this.handleWindowScroll();
    });

    // The landing page is loaded lazily, after the browser's first hash jump.
    requestAnimationFrame(() => {
      const id = window.location.hash.slice(1);
      if (['home', 'features', 'solutions', 'services', 'about', 'roles', 'contact'].includes(id)) {
        document.getElementById(id)?.scrollIntoView();
      }
    });

    const statsEl = this.el.nativeElement.querySelector('.stats-counter-strip');
    if (statsEl && 'IntersectionObserver' in window) {
      this.statsObserver = new IntersectionObserver((entries) => {
        if (entries[0]?.isIntersecting) {
          this.animateCounters();
          this.statsObserver?.disconnect();
        }
      }, { threshold: 0.15 });
      this.statsObserver.observe(statsEl);
    } else if (statsEl) {
      this.animateCounters();
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

  private readonly handleWindowScroll = (): void => {
    if (this.scrollFrame !== null) return;
    this.scrollFrame = window.requestAnimationFrame(() => {
      this.scrollFrame = null;
      const scrollY = window.scrollY;
      const showScrollTop = scrollY > 200;
      const isScrolled = scrollY > 64;
      if (this.navbarCap && !this.reducedMotionQuery?.matches) {
        this.navbarCap.style.transform = `rotate(${scrollY * 1.2}deg)`;
      }
      let activeSection: MobileNavSection = 'home';
      for (const section of this.mobileNavSections) {
        const element = document.getElementById(section);
        if (element && element.getBoundingClientRect().top <= 140) activeSection = section;
      }

      if (
        this.showScrollTop() !== showScrollTop ||
        this.isScrolled() !== isScrolled ||
        this.activeMobileNav() !== activeSection
      ) {
        this.zone.run(() => {
          if (this.showScrollTop() !== showScrollTop) this.showScrollTop.set(showScrollTop);
          if (this.isScrolled() !== isScrolled) this.isScrolled.set(isScrolled);
          if (this.activeMobileNav() !== activeSection) this.activeMobileNav.set(activeSection);
        });
      }
    });
  };

  selectCarouselCard(carouselId: LandingCarouselId, index: number): void {
    const track = this.el.nativeElement.querySelector(`[data-carousel="${carouselId}"]`) as HTMLElement | null;
    const firstCard = track?.firstElementChild as HTMLElement | null;
    const card = track?.children.item(index) as HTMLElement | null;
    if (!track || !firstCard || !card) return;

    this.activeCarouselIndexes.update(active => ({ ...active, [carouselId]: index }));
    const behavior: ScrollBehavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      ? 'instant'
      : 'smooth';
    track.scrollTo({ left: card.offsetLeft - firstCard.offsetLeft, behavior });
  }

  onCarouselKeydown(event: KeyboardEvent, carouselId: LandingCarouselId): void {
    if (!this.isMobileCarousel()) return;
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    const direction = event.key === 'ArrowRight' ? 1 : -1;
    const activeIndex = this.activeCarouselIndexes()[carouselId];
    const nextIndex = Math.max(0, Math.min(this.carouselItems[carouselId].length - 1, activeIndex + direction));
    if (nextIndex === activeIndex) return;

    event.preventDefault();
    this.selectCarouselCard(carouselId, nextIndex);
  }

  private readonly handleStatsCarouselScroll = (): void => {
    const track = this.statsCarouselTrack;
    const firstCard = track?.firstElementChild as HTMLElement | null;
    if (!track || !firstCard) return;

    const firstCardOffset = firstCard.offsetLeft;
    const activeIndex = Array.from(track.children).reduce((closestIndex, child, index, cards) => {
      const closestCard = cards[closestIndex] as HTMLElement;
      const card = child as HTMLElement;
      const closestDistance = Math.abs(closestCard.offsetLeft - firstCardOffset - track.scrollLeft);
      const distance = Math.abs(card.offsetLeft - firstCardOffset - track.scrollLeft);
      return distance < closestDistance ? index : closestIndex;
    }, 0);

    if (this.activeCarouselIndexes().stats !== activeIndex) {
      this.zone.run(() => {
        this.activeCarouselIndexes.update(active => ({ ...active, stats: activeIndex }));
      });
    }
  };

  scrollToTop(): void {
    const behavior: ScrollBehavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      ? 'instant'
      : 'smooth';
    window.scrollTo({ top: 0, behavior });
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
  onResize(): void {
    this.isMobileCarousel.set(window.matchMedia('(max-width: 767.98px)').matches);
    if (window.innerWidth > 1024) this.closeMobileNav(false);
  }

  ngOnInit() {
    this.isMobileCarousel.set(window.matchMedia('(max-width: 767.98px)').matches);
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
    window.removeEventListener('scroll', this.handleWindowScroll);
    this.reducedMotionQuery?.removeEventListener('change', this.handleMotionPreferenceChange);
    this.navbarCap = null;
    this.reducedMotionQuery = null;
    if (this.scrollFrame !== null) {
      window.cancelAnimationFrame(this.scrollFrame);
      this.scrollFrame = null;
    }
    this.statsCarouselTrack?.removeEventListener('scroll', this.handleStatsCarouselScroll);
    this.statsCarouselTrack = null;
    if (this.slideIntervalId) {
      clearInterval(this.slideIntervalId);
      this.slideIntervalId = null;
    }
    this.observer?.disconnect();
    this.statsObserver?.disconnect();
    this.carouselObservers.forEach(observer => observer.disconnect());
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

  private readonly handleMotionPreferenceChange = (event: MediaQueryListEvent): void => {
    if (!this.navbarCap) return;
    if (event.matches) {
      this.navbarCap.style.removeProperty('transform');
      this.navbarCap.style.removeProperty('will-change');
      return;
    }
    this.navbarCap.style.willChange = 'transform';
    this.handleWindowScroll();
  };

  private observeCarouselCards(): void {
    this.zone.runOutsideAngular(() => {
      const tracks = this.el.nativeElement.querySelectorAll('[data-carousel]') as NodeListOf<HTMLElement>;
      tracks.forEach(track => {
        const carouselId = track.dataset['carousel'] as LandingCarouselId;
        if (carouselId === 'stats') return;
        const observer = new IntersectionObserver(entries => {
          const mostVisible = entries
            .filter(entry => entry.isIntersecting && entry.intersectionRatio >= 0.65)
            .sort((first, second) => second.intersectionRatio - first.intersectionRatio)[0];
          if (!mostVisible) return;

          const index = Array.prototype.indexOf.call(track.children, mostVisible.target);
          if (index < 0 || this.activeCarouselIndexes()[carouselId] === index) return;
          this.zone.run(() => {
            this.activeCarouselIndexes.update(active => ({ ...active, [carouselId]: index }));
          });
        }, { root: track, threshold: [0, 0.65, 0.8, 1] });

        Array.from(track.children).forEach((card: Element) => observer.observe(card));
        this.carouselObservers.push(observer);
      });
    });
  }
}
