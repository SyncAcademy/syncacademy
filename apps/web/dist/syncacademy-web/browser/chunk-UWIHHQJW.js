import {
  LogoComponent
} from "./chunk-LSFJZJTW.js";
import {
  RouterLink,
  RouterModule
} from "./chunk-GIJX6M6U.js";
import {
  CommonModule,
  Component,
  setClassMetadata,
  ɵsetClassDebugInfo,
  ɵɵdefineComponent,
  ɵɵelement,
  ɵɵelementEnd,
  ɵɵelementStart,
  ɵɵnamespaceHTML,
  ɵɵnamespaceSVG,
  ɵɵtext
} from "./chunk-3IPAKGA7.js";
import "./chunk-QHQP2P2Z.js";

// src/app/features/landing/landing.page.ts
var LandingPage = class _LandingPage {
  ngOnInit() {
    document.body.style.removeProperty("position");
    document.body.style.removeProperty("overflow");
    document.body.style.removeProperty("width");
    document.body.style.removeProperty("height");
  }
  static {
    this.\u0275fac = function LandingPage_Factory(__ngFactoryType__) {
      return new (__ngFactoryType__ || _LandingPage)();
    };
  }
  static {
    this.\u0275cmp = /* @__PURE__ */ \u0275\u0275defineComponent({ type: _LandingPage, selectors: [["app-landing"]], decls: 596, vars: 0, consts: [[1, "landing-page"], [1, "hero-wrapper"], [1, "floating-navbar"], [1, "logo"], ["variant", "dark", "size", "md"], [1, "nav-links", "desktop-only"], ["href", "#home", 1, "active"], ["href", "#features"], ["href", "#solutions"], ["href", "#services"], ["href", "#about"], ["href", "#contact"], [1, "nav-actions"], ["routerLink", "/auth/login", 1, "btn", "btn-ghost", "desktop-only"], ["routerLink", "/auth/register", 1, "btn", "btn-primary"], [1, "hero", "left-aligned"], [1, "hero-content"], [1, "hero-actions"], ["routerLink", "/auth/register", 1, "btn", "btn-primary", "btn-lg"], ["routerLink", "/auth/login", 1, "btn", "btn-white", "btn-lg"], [1, "hero-trust"], ["viewBox", "0 0 24 24", "fill", "none", "stroke", "currentColor", "stroke-width", "2", 1, "check-circle"], ["d", "M22 11.08V12a10 10 0 1 1-5.93-9.14"], ["points", "22 4 12 14.01 9 11.01"], [1, "hero-subtext"], [1, "section", "unified-solution"], [1, "section-label"], [1, "section-subtitle"], [1, "grid-4"], [1, "card"], [1, "icon-wrapper"], ["viewBox", "0 0 24 24", "fill", "none", "stroke", "currentColor", "stroke-width", "1.5", "stroke-linecap", "round", "stroke-linejoin", "round", 1, "icon-svg"], ["d", "M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"], ["cx", "8.5", "cy", "7", "r", "4"], ["points", "17 11 19 13 23 9"], ["d", "M22 10v6M2 10l10-5 10 5-10 5z"], ["d", "M6 12v5c3 3 9 3 12 0v-5"], ["d", "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"], ["cx", "9", "cy", "7", "r", "4"], ["d", "M23 21v-2a4 4 0 0 0-3-3.87"], ["d", "M16 3.13a4 4 0 0 1 0 7.75"], ["d", "M4 19.5A2.5 2.5 0 0 1 6.5 17H20"], ["d", "M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"], [1, "section", "dashboard-preview-section"], [1, "dashboard-mockup"], [1, "mockup-content"], [1, "mock-sidebar"], [1, "mock-logo"], [1, "mock-logo-icon"], [1, "mock-nav"], [1, "mock-nav-item", "active"], ["viewBox", "0 0 24 24", "fill", "none", "stroke", "currentColor", "stroke-width", "2"], ["x", "3", "y", "3", "width", "7", "height", "7"], ["x", "14", "y", "3", "width", "7", "height", "7"], ["x", "14", "y", "14", "width", "7", "height", "7"], ["x", "3", "y", "14", "width", "7", "height", "7"], [1, "mock-nav-item"], ["x", "2", "y", "5", "width", "20", "height", "14", "rx", "2"], ["x1", "2", "y1", "10", "x2", "22", "y2", "10"], ["x", "2", "y", "7", "width", "20", "height", "14", "rx", "2", "ry", "2"], ["d", "M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"], ["x1", "18", "y1", "20", "x2", "18", "y2", "10"], ["x1", "12", "y1", "20", "x2", "12", "y2", "4"], ["x1", "6", "y1", "20", "x2", "6", "y2", "14"], ["cx", "12", "cy", "12", "r", "3"], ["d", "M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"], [1, "mock-main"], [1, "mock-header"], [1, "mock-title"], [1, "mock-user"], [1, "academic-year"], [1, "mock-avatar"], [1, "mock-stats-row"], [1, "mock-stat-card"], [1, "stat-title"], [1, "stat-value"], [1, "stat-subtext"], [1, "mock-grid"], [1, "mock-chart"], [1, "chart-header"], [1, "chart-body"], [1, "bar-group"], [1, "bar", 2, "height", "25%"], [1, "bar", 2, "height", "35%"], [1, "bar", 2, "height", "30%"], [1, "bar", 2, "height", "50%"], [1, "bar", 2, "height", "45%"], [1, "bar", 2, "height", "60%"], [1, "bar", 2, "height", "70%"], [1, "bar", 2, "height", "85%"], [1, "mock-activity"], [1, "activity-header"], [1, "activity-list"], [1, "activity-item"], [1, "dot", "orange"], [1, "details"], [1, "text"], [1, "section", "functional-modules"], [1, "grid-4", "functional-grid"], ["d", "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"], ["d", "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"], [1, "section", "feature-blocks"], [1, "feature-block"], [1, "feature-text"], [1, "feature-list"], ["viewBox", "0 0 24 24", "fill", "none", "stroke", "currentColor", "stroke-width", "2", 1, "check-icon"], [1, "feature-visual"], [1, "mockup-profile-card"], [1, "mockup-profile-header"], [1, "title"], [1, "badge", "active-badge"], [1, "mockup-profile-user"], [1, "avatar"], ["src", "/assets/images/amani-juma.svg", "alt", "Amani Juma profile picture"], [1, "user-info"], [1, "mockup-profile-grid"], [1, "grid-item"], [1, "label"], [1, "value"], [1, "value", "text-green"], [1, "value", "text-orange"], [1, "feature-block", "reverse"], [1, "mockup-table-card"], [1, "mockup-table-header"], [1, "badge", "term-badge"], [1, "mockup-table-body"], [1, "table-row", "table-head"], [1, "col-name"], [1, "col-num"], [1, "col-grade"], [1, "table-row"], [1, "col-num", "font-bold"], [1, "col-grade", "text-green"], [1, "col-grade", "text-red"], [1, "section", "security-roles", "bg-gray"], [1, "container", "text-center"], [1, "section-subtitle", "mx-auto"], [1, "grid-3", "security-grid"], [1, "card", "security-card"], ["d", "M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"], ["d", "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"], ["cx", "12", "cy", "7", "r", "4"], [1, "footer", "dark-footer"], [1, "footer-cta", "text-center"], [1, "cta-actions"], ["routerLink", "/auth/login", 1, "btn", "btn-outline-light", "btn-lg"], [1, "footer-main", "container"], [1, "footer-brand"], [1, "footer-logo"], ["variant", "light", "size", "md"], [1, "brand-desc"], [1, "footer-columns"], [1, "footer-col"], ["href", "#integrations"], ["href", "#support"], ["href", "#stories"], ["href", "#privacy"], ["href", "#terms"], ["href", "#sla"], ["href", "#audit"]], template: function LandingPage_Template(rf, ctx) {
      if (rf & 1) {
        \u0275\u0275elementStart(0, "div", 0)(1, "div", 1)(2, "nav", 2)(3, "div", 3);
        \u0275\u0275element(4, "app-logo", 4);
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(5, "div", 5)(6, "a", 6);
        \u0275\u0275text(7, "Home");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(8, "a", 7);
        \u0275\u0275text(9, "Features");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(10, "a", 8);
        \u0275\u0275text(11, "Solutions");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(12, "a", 9);
        \u0275\u0275text(13, "Services");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(14, "a", 10);
        \u0275\u0275text(15, "About");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(16, "a", 11);
        \u0275\u0275text(17, "Contact");
        \u0275\u0275elementEnd()();
        \u0275\u0275elementStart(18, "div", 12)(19, "button", 13);
        \u0275\u0275text(20, " Sign In ");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(21, "button", 14);
        \u0275\u0275text(22, " Create Account ");
        \u0275\u0275elementEnd()()();
        \u0275\u0275elementStart(23, "header", 15)(24, "div", 16)(25, "h1");
        \u0275\u0275text(26, "A smarter way to");
        \u0275\u0275element(27, "br");
        \u0275\u0275text(28, "manage your school");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(29, "p");
        \u0275\u0275text(30, " Sync Academy brings your entire school together in one powerful platform \u2014 from students and academics to finance, communication, and administration. ");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(31, "div", 17)(32, "button", 18);
        \u0275\u0275text(33, " Create Account ");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(34, "button", 19);
        \u0275\u0275text(35, " Sign In ");
        \u0275\u0275elementEnd()();
        \u0275\u0275elementStart(36, "div", 20);
        \u0275\u0275namespaceSVG();
        \u0275\u0275elementStart(37, "svg", 21);
        \u0275\u0275element(38, "path", 22)(39, "polyline", 23);
        \u0275\u0275elementEnd();
        \u0275\u0275namespaceHTML();
        \u0275\u0275elementStart(40, "span", 24);
        \u0275\u0275text(41, "Everything your school needs. One connected platform.");
        \u0275\u0275elementEnd()()()()();
        \u0275\u0275elementStart(42, "section", 25)(43, "span", 26);
        \u0275\u0275text(44, "THE UNIFIED SOLUTION");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(45, "h2");
        \u0275\u0275text(46, "A single source of truth for your entire community.");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(47, "p", 27);
        \u0275\u0275text(48, " Say goodbye to scattered spreadsheets and disjointed tools. SyncAcademy brings everyone onto the same page. ");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(49, "div", 28)(50, "div", 29)(51, "div", 30);
        \u0275\u0275namespaceSVG();
        \u0275\u0275elementStart(52, "svg", 31);
        \u0275\u0275element(53, "path", 32)(54, "circle", 33)(55, "polyline", 34);
        \u0275\u0275elementEnd()();
        \u0275\u0275namespaceHTML();
        \u0275\u0275elementStart(56, "h3");
        \u0275\u0275text(57, "School Administration");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(58, "p");
        \u0275\u0275text(59, " Oversee admissions, fees, and staff with real-time, comprehensive analytics. ");
        \u0275\u0275elementEnd()();
        \u0275\u0275elementStart(60, "div", 29)(61, "div", 30);
        \u0275\u0275namespaceSVG();
        \u0275\u0275elementStart(62, "svg", 31);
        \u0275\u0275element(63, "path", 35)(64, "path", 36);
        \u0275\u0275elementEnd()();
        \u0275\u0275namespaceHTML();
        \u0275\u0275elementStart(65, "h3");
        \u0275\u0275text(66, "Teachers");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(67, "p");
        \u0275\u0275text(68, " Manage attendance, enter marks, and track student progress effortlessly. ");
        \u0275\u0275elementEnd()();
        \u0275\u0275elementStart(69, "div", 29)(70, "div", 30);
        \u0275\u0275namespaceSVG();
        \u0275\u0275elementStart(71, "svg", 31);
        \u0275\u0275element(72, "path", 37)(73, "circle", 38)(74, "path", 39)(75, "path", 40);
        \u0275\u0275elementEnd()();
        \u0275\u0275namespaceHTML();
        \u0275\u0275elementStart(76, "h3");
        \u0275\u0275text(77, "Parents");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(78, "p");
        \u0275\u0275text(79, " Stay informed with instant updates on fees, academics, and school news. ");
        \u0275\u0275elementEnd()();
        \u0275\u0275elementStart(80, "div", 29)(81, "div", 30);
        \u0275\u0275namespaceSVG();
        \u0275\u0275elementStart(82, "svg", 31);
        \u0275\u0275element(83, "path", 41)(84, "path", 42);
        \u0275\u0275elementEnd()();
        \u0275\u0275namespaceHTML();
        \u0275\u0275elementStart(85, "h3");
        \u0275\u0275text(86, "Students");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(87, "p");
        \u0275\u0275text(88, " Access study materials, schedules, and report cards from any device. ");
        \u0275\u0275elementEnd()()()();
        \u0275\u0275elementStart(89, "section", 43)(90, "span", 26);
        \u0275\u0275text(91, "SYSTEM OVERVIEW");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(92, "h2");
        \u0275\u0275text(93, "See your entire school at a glance");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(94, "p", 27);
        \u0275\u0275text(95, " Our intuitive interface provides directors and administrators with comprehensive insights, clear dashboards, and structural control. ");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(96, "div", 44)(97, "div", 45)(98, "div", 46)(99, "div", 47);
        \u0275\u0275element(100, "div", 48);
        \u0275\u0275elementStart(101, "span");
        \u0275\u0275text(102, "Sync Academy");
        \u0275\u0275elementEnd()();
        \u0275\u0275elementStart(103, "div", 49)(104, "div", 50);
        \u0275\u0275namespaceSVG();
        \u0275\u0275elementStart(105, "svg", 51);
        \u0275\u0275element(106, "rect", 52)(107, "rect", 53)(108, "rect", 54)(109, "rect", 55);
        \u0275\u0275elementEnd();
        \u0275\u0275text(110, " Dashboard ");
        \u0275\u0275elementEnd();
        \u0275\u0275namespaceHTML();
        \u0275\u0275elementStart(111, "div", 56);
        \u0275\u0275namespaceSVG();
        \u0275\u0275elementStart(112, "svg", 51);
        \u0275\u0275element(113, "path", 37)(114, "circle", 38)(115, "path", 39)(116, "path", 40);
        \u0275\u0275elementEnd();
        \u0275\u0275text(117, " Students ");
        \u0275\u0275elementEnd();
        \u0275\u0275namespaceHTML();
        \u0275\u0275elementStart(118, "div", 56);
        \u0275\u0275namespaceSVG();
        \u0275\u0275elementStart(119, "svg", 51);
        \u0275\u0275element(120, "path", 35)(121, "path", 36);
        \u0275\u0275elementEnd();
        \u0275\u0275text(122, " Academics ");
        \u0275\u0275elementEnd();
        \u0275\u0275namespaceHTML();
        \u0275\u0275elementStart(123, "div", 56);
        \u0275\u0275namespaceSVG();
        \u0275\u0275elementStart(124, "svg", 51);
        \u0275\u0275element(125, "path", 32)(126, "circle", 33)(127, "polyline", 34);
        \u0275\u0275elementEnd();
        \u0275\u0275text(128, " Attendance ");
        \u0275\u0275elementEnd();
        \u0275\u0275namespaceHTML();
        \u0275\u0275elementStart(129, "div", 56);
        \u0275\u0275namespaceSVG();
        \u0275\u0275elementStart(130, "svg", 51);
        \u0275\u0275element(131, "rect", 57)(132, "line", 58);
        \u0275\u0275elementEnd();
        \u0275\u0275text(133, " Finance ");
        \u0275\u0275elementEnd();
        \u0275\u0275namespaceHTML();
        \u0275\u0275elementStart(134, "div", 56);
        \u0275\u0275namespaceSVG();
        \u0275\u0275elementStart(135, "svg", 51);
        \u0275\u0275element(136, "rect", 59)(137, "path", 60);
        \u0275\u0275elementEnd();
        \u0275\u0275text(138, " Teachers ");
        \u0275\u0275elementEnd();
        \u0275\u0275namespaceHTML();
        \u0275\u0275elementStart(139, "div", 56);
        \u0275\u0275namespaceSVG();
        \u0275\u0275elementStart(140, "svg", 51);
        \u0275\u0275element(141, "line", 61)(142, "line", 62)(143, "line", 63);
        \u0275\u0275elementEnd();
        \u0275\u0275text(144, " Reports ");
        \u0275\u0275elementEnd();
        \u0275\u0275namespaceHTML();
        \u0275\u0275elementStart(145, "div", 56);
        \u0275\u0275namespaceSVG();
        \u0275\u0275elementStart(146, "svg", 51);
        \u0275\u0275element(147, "circle", 64)(148, "path", 65);
        \u0275\u0275elementEnd();
        \u0275\u0275text(149, " Settings ");
        \u0275\u0275elementEnd()()();
        \u0275\u0275namespaceHTML();
        \u0275\u0275elementStart(150, "div", 66)(151, "div", 67)(152, "div", 68);
        \u0275\u0275text(153, "Director's Dashboard");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(154, "div", 69)(155, "span", 70);
        \u0275\u0275text(156, "Academic Year: 2025/2026");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(157, "div", 71);
        \u0275\u0275text(158, "AD");
        \u0275\u0275elementEnd()()();
        \u0275\u0275elementStart(159, "div", 72)(160, "div", 73)(161, "div", 74);
        \u0275\u0275text(162, "TOTAL STUDENTS");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(163, "div", 75);
        \u0275\u0275text(164, "1,240 Active");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(165, "div", 76);
        \u0275\u0275text(166, "98% Attendance rate");
        \u0275\u0275elementEnd()();
        \u0275\u0275elementStart(167, "div", 73)(168, "div", 74);
        \u0275\u0275text(169, "ANNUAL FINANCE");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(170, "div", 75);
        \u0275\u0275text(171, "TZS 102,860,000");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(172, "div", 76);
        \u0275\u0275text(173, "82% Tuition collected");
        \u0275\u0275elementEnd()();
        \u0275\u0275elementStart(174, "div", 73)(175, "div", 74);
        \u0275\u0275text(176, "ACADEMICS");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(177, "div", 75);
        \u0275\u0275text(178, "18 Subjects");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(179, "div", 76);
        \u0275\u0275text(180, "94% Exam pass rate");
        \u0275\u0275elementEnd()()();
        \u0275\u0275elementStart(181, "div", 77)(182, "div", 78)(183, "div", 79);
        \u0275\u0275text(184, "Enrollment Trend");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(185, "div", 80)(186, "div", 81);
        \u0275\u0275element(187, "div", 82);
        \u0275\u0275elementStart(188, "span");
        \u0275\u0275text(189, "Q1");
        \u0275\u0275elementEnd()();
        \u0275\u0275elementStart(190, "div", 81);
        \u0275\u0275element(191, "div", 83);
        \u0275\u0275elementStart(192, "span");
        \u0275\u0275text(193, "Q2");
        \u0275\u0275elementEnd()();
        \u0275\u0275elementStart(194, "div", 81);
        \u0275\u0275element(195, "div", 84);
        \u0275\u0275elementStart(196, "span");
        \u0275\u0275text(197, "Q3");
        \u0275\u0275elementEnd()();
        \u0275\u0275elementStart(198, "div", 81);
        \u0275\u0275element(199, "div", 85);
        \u0275\u0275elementStart(200, "span");
        \u0275\u0275text(201, "Q4");
        \u0275\u0275elementEnd()();
        \u0275\u0275elementStart(202, "div", 81);
        \u0275\u0275element(203, "div", 86);
        \u0275\u0275elementStart(204, "span");
        \u0275\u0275text(205, "Q5");
        \u0275\u0275elementEnd()();
        \u0275\u0275elementStart(206, "div", 81);
        \u0275\u0275element(207, "div", 87);
        \u0275\u0275elementStart(208, "span");
        \u0275\u0275text(209, "Q6");
        \u0275\u0275elementEnd()();
        \u0275\u0275elementStart(210, "div", 81);
        \u0275\u0275element(211, "div", 88);
        \u0275\u0275elementStart(212, "span");
        \u0275\u0275text(213, "Q7");
        \u0275\u0275elementEnd()();
        \u0275\u0275elementStart(214, "div", 81);
        \u0275\u0275element(215, "div", 89);
        \u0275\u0275elementStart(216, "span");
        \u0275\u0275text(217, "Q8");
        \u0275\u0275elementEnd()()()();
        \u0275\u0275elementStart(218, "div", 90)(219, "div", 91);
        \u0275\u0275text(220, "Recent Activity");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(221, "div", 92)(222, "div", 93);
        \u0275\u0275element(223, "div", 94);
        \u0275\u0275elementStart(224, "div", 95)(225, "span", 96);
        \u0275\u0275text(226, "Tuition payment: TZS 450,000 received");
        \u0275\u0275elementEnd()()();
        \u0275\u0275elementStart(227, "div", 93);
        \u0275\u0275element(228, "div", 94);
        \u0275\u0275elementStart(229, "div", 95)(230, "span", 96);
        \u0275\u0275text(231, "Gradebook published for Form 4 Chemistry");
        \u0275\u0275elementEnd()()();
        \u0275\u0275elementStart(232, "div", 93);
        \u0275\u0275element(233, "div", 94);
        \u0275\u0275elementStart(234, "div", 95)(235, "span", 96);
        \u0275\u0275text(236, "Attendance alert: 12 absences reported today");
        \u0275\u0275elementEnd()()();
        \u0275\u0275elementStart(237, "div", 93);
        \u0275\u0275element(238, "div", 94);
        \u0275\u0275elementStart(239, "div", 95)(240, "span", 96);
        \u0275\u0275text(241, "New teacher account created: David Kim");
        \u0275\u0275elementEnd()()()()()()()()()();
        \u0275\u0275elementStart(242, "section", 97)(243, "span", 26);
        \u0275\u0275text(244, "FUNCTIONAL MODULES");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(245, "h2");
        \u0275\u0275text(246, "Everything works together");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(247, "p", 27);
        \u0275\u0275text(248, " Each segment functions perfectly on its own while staying intimately connected to school-wide metrics in real time. ");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(249, "div", 98)(250, "div", 29)(251, "div", 30);
        \u0275\u0275namespaceSVG();
        \u0275\u0275elementStart(252, "svg", 31);
        \u0275\u0275element(253, "path", 37)(254, "circle", 38)(255, "path", 39)(256, "path", 40);
        \u0275\u0275elementEnd()();
        \u0275\u0275namespaceHTML();
        \u0275\u0275elementStart(257, "h3");
        \u0275\u0275text(258, "Student Management");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(259, "p");
        \u0275\u0275text(260, " Complete bio profiles, family links, academic pathways, and documentation. ");
        \u0275\u0275elementEnd()();
        \u0275\u0275elementStart(261, "div", 29)(262, "div", 30);
        \u0275\u0275namespaceSVG();
        \u0275\u0275elementStart(263, "svg", 31);
        \u0275\u0275element(264, "path", 41)(265, "path", 42);
        \u0275\u0275elementEnd()();
        \u0275\u0275namespaceHTML();
        \u0275\u0275elementStart(266, "h3");
        \u0275\u0275text(267, "Academic Management");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(268, "p");
        \u0275\u0275text(269, " Gradebooks, standardized reporting, examinations planning, and timetables. ");
        \u0275\u0275elementEnd()();
        \u0275\u0275elementStart(270, "div", 29)(271, "div", 30);
        \u0275\u0275namespaceSVG();
        \u0275\u0275elementStart(272, "svg", 31);
        \u0275\u0275element(273, "rect", 59)(274, "path", 60);
        \u0275\u0275elementEnd()();
        \u0275\u0275namespaceHTML();
        \u0275\u0275elementStart(275, "h3");
        \u0275\u0275text(276, "Teacher & Staff Management");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(277, "p");
        \u0275\u0275text(278, " Workload tracking, assignments, performance, and communication hubs. ");
        \u0275\u0275elementEnd()();
        \u0275\u0275elementStart(279, "div", 29)(280, "div", 30);
        \u0275\u0275namespaceSVG();
        \u0275\u0275elementStart(281, "svg", 31);
        \u0275\u0275element(282, "rect", 57)(283, "line", 58);
        \u0275\u0275elementEnd()();
        \u0275\u0275namespaceHTML();
        \u0275\u0275elementStart(284, "h3");
        \u0275\u0275text(285, "Finance Management");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(286, "p");
        \u0275\u0275text(287, " Automated billing templates, outstanding invoice reminders, and custom payments. ");
        \u0275\u0275elementEnd()();
        \u0275\u0275elementStart(288, "div", 29)(289, "div", 30);
        \u0275\u0275namespaceSVG();
        \u0275\u0275elementStart(290, "svg", 31);
        \u0275\u0275element(291, "path", 99);
        \u0275\u0275elementEnd()();
        \u0275\u0275namespaceHTML();
        \u0275\u0275elementStart(292, "h3");
        \u0275\u0275text(293, "Parent Communication");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(294, "p");
        \u0275\u0275text(295, " Direct portal, push updates, automated SMS alerts, and seamless integration. ");
        \u0275\u0275elementEnd()();
        \u0275\u0275elementStart(296, "div", 29)(297, "div", 30);
        \u0275\u0275namespaceSVG();
        \u0275\u0275elementStart(298, "svg", 31);
        \u0275\u0275element(299, "path", 32)(300, "circle", 33)(301, "polyline", 34);
        \u0275\u0275elementEnd()();
        \u0275\u0275namespaceHTML();
        \u0275\u0275elementStart(302, "h3");
        \u0275\u0275text(303, "Attendance Management");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(304, "p");
        \u0275\u0275text(305, " Fast morning roll calls, modern scan logs, and automated absence alerts. ");
        \u0275\u0275elementEnd()();
        \u0275\u0275elementStart(306, "div", 29)(307, "div", 30);
        \u0275\u0275namespaceSVG();
        \u0275\u0275elementStart(308, "svg", 31);
        \u0275\u0275element(309, "line", 61)(310, "line", 62)(311, "line", 63);
        \u0275\u0275elementEnd()();
        \u0275\u0275namespaceHTML();
        \u0275\u0275elementStart(312, "h3");
        \u0275\u0275text(313, "Reports & Analytics");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(314, "p");
        \u0275\u0275text(315, " Intuitive charts mapping metrics from enrollment to cash collection. ");
        \u0275\u0275elementEnd()();
        \u0275\u0275elementStart(316, "div", 29)(317, "div", 30);
        \u0275\u0275namespaceSVG();
        \u0275\u0275elementStart(318, "svg", 31);
        \u0275\u0275element(319, "path", 100);
        \u0275\u0275elementEnd()();
        \u0275\u0275namespaceHTML();
        \u0275\u0275elementStart(320, "h3");
        \u0275\u0275text(321, "Administration Control");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(322, "p");
        \u0275\u0275text(323, " Modular permission matrix controls, campus security, and historical logbooks. ");
        \u0275\u0275elementEnd()()()();
        \u0275\u0275elementStart(324, "section", 101)(325, "div", 102)(326, "div", 103)(327, "span", 26);
        \u0275\u0275text(328, "STUDENT PROFILES");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(329, "h2");
        \u0275\u0275text(330, "Know every student. Manage every detail.");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(331, "p");
        \u0275\u0275text(332, " Our student records system keeps essential profiles up-to-date and instantly accessible by authorized personnel. ");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(333, "ul", 104)(334, "li");
        \u0275\u0275namespaceSVG();
        \u0275\u0275elementStart(335, "svg", 105);
        \u0275\u0275element(336, "path", 22)(337, "polyline", 23);
        \u0275\u0275elementEnd();
        \u0275\u0275text(338, " Complete bio-data, documentation upload, and admissions history. ");
        \u0275\u0275elementEnd();
        \u0275\u0275namespaceHTML();
        \u0275\u0275elementStart(339, "li");
        \u0275\u0275namespaceSVG();
        \u0275\u0275elementStart(340, "svg", 105);
        \u0275\u0275element(341, "path", 22)(342, "polyline", 23);
        \u0275\u0275elementEnd();
        \u0275\u0275text(343, " Visual linkage to parents, guardians, and immediate family members. ");
        \u0275\u0275elementEnd();
        \u0275\u0275namespaceHTML();
        \u0275\u0275elementStart(344, "li");
        \u0275\u0275namespaceSVG();
        \u0275\u0275elementStart(345, "svg", 105);
        \u0275\u0275element(346, "path", 22)(347, "polyline", 23);
        \u0275\u0275elementEnd();
        \u0275\u0275text(348, " Integrated timelines combining academic performance with attendance. ");
        \u0275\u0275elementEnd();
        \u0275\u0275namespaceHTML();
        \u0275\u0275elementStart(349, "li");
        \u0275\u0275namespaceSVG();
        \u0275\u0275elementStart(350, "svg", 105);
        \u0275\u0275element(351, "path", 22)(352, "polyline", 23);
        \u0275\u0275elementEnd();
        \u0275\u0275text(353, " Tuition invoices, fee balances, and receipt history on one card. ");
        \u0275\u0275elementEnd()()();
        \u0275\u0275namespaceHTML();
        \u0275\u0275elementStart(354, "div", 106)(355, "div", 107)(356, "div", 108)(357, "span", 109);
        \u0275\u0275text(358, "Student Profile");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(359, "span", 110);
        \u0275\u0275text(360, "Active (Class 10A)");
        \u0275\u0275elementEnd()();
        \u0275\u0275elementStart(361, "div", 111)(362, "div", 112);
        \u0275\u0275element(363, "img", 113);
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(364, "div", 114)(365, "strong");
        \u0275\u0275text(366, "Amani Juma");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(367, "span");
        \u0275\u0275text(368, "Reg ID: SA-2025-08412");
        \u0275\u0275elementEnd()()();
        \u0275\u0275elementStart(369, "div", 115)(370, "div", 116)(371, "span", 117);
        \u0275\u0275text(372, "Guardian Name");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(373, "span", 118);
        \u0275\u0275text(374, "Rashid Juma (Father)");
        \u0275\u0275elementEnd()();
        \u0275\u0275elementStart(375, "div", 116)(376, "span", 117);
        \u0275\u0275text(377, "Contact Number");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(378, "span", 118);
        \u0275\u0275text(379, "+255 712 345 678");
        \u0275\u0275elementEnd()();
        \u0275\u0275elementStart(380, "div", 116)(381, "span", 117);
        \u0275\u0275text(382, "Academic Performance");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(383, "span", 119);
        \u0275\u0275text(384, "Excellent (A- Average)");
        \u0275\u0275elementEnd()();
        \u0275\u0275elementStart(385, "div", 116)(386, "span", 117);
        \u0275\u0275text(387, "Fee Payment Status");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(388, "span", 120);
        \u0275\u0275text(389, "TZS 450,000 Pending");
        \u0275\u0275elementEnd()()()()()();
        \u0275\u0275elementStart(390, "div", 121)(391, "div", 103)(392, "span", 26);
        \u0275\u0275text(393, "ACADEMIC SUITE");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(394, "h2");
        \u0275\u0275text(395, "Make academic management simpler");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(396, "p");
        \u0275\u0275text(397, " Empower your teachers with clean layouts to input marks, log lesson plans, schedule report card print runs, and coordinate syllabus expectations. ");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(398, "ul", 104)(399, "li");
        \u0275\u0275namespaceSVG();
        \u0275\u0275elementStart(400, "svg", 105);
        \u0275\u0275element(401, "path", 22)(402, "polyline", 23);
        \u0275\u0275elementEnd();
        \u0275\u0275text(403, " Highly customizable grading scales tailored to national guidelines. ");
        \u0275\u0275elementEnd();
        \u0275\u0275namespaceHTML();
        \u0275\u0275elementStart(404, "li");
        \u0275\u0275namespaceSVG();
        \u0275\u0275elementStart(405, "svg", 105);
        \u0275\u0275element(406, "path", 22)(407, "polyline", 23);
        \u0275\u0275elementEnd();
        \u0275\u0275text(408, " Clean digital gradebooks that instantly average periodic assessments. ");
        \u0275\u0275elementEnd();
        \u0275\u0275namespaceHTML();
        \u0275\u0275elementStart(409, "li");
        \u0275\u0275namespaceSVG();
        \u0275\u0275elementStart(410, "svg", 105);
        \u0275\u0275element(411, "path", 22)(412, "polyline", 23);
        \u0275\u0275elementEnd();
        \u0275\u0275text(413, " Report card builders ready to compile results in single-click PDFs. ");
        \u0275\u0275elementEnd();
        \u0275\u0275namespaceHTML();
        \u0275\u0275elementStart(414, "li");
        \u0275\u0275namespaceSVG();
        \u0275\u0275elementStart(415, "svg", 105);
        \u0275\u0275element(416, "path", 22)(417, "polyline", 23);
        \u0275\u0275elementEnd();
        \u0275\u0275text(418, " Schedules and room-allocation calendars to prevent planning clashes. ");
        \u0275\u0275elementEnd()()();
        \u0275\u0275namespaceHTML();
        \u0275\u0275elementStart(419, "div", 106)(420, "div", 122)(421, "div", 123)(422, "span", 109);
        \u0275\u0275text(423, "Gradebook: Form 4 Biology");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(424, "span", 124);
        \u0275\u0275text(425, "Term 2 Exams");
        \u0275\u0275elementEnd()();
        \u0275\u0275elementStart(426, "div", 125)(427, "div", 126)(428, "div", 127);
        \u0275\u0275text(429, "Student Name");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(430, "div", 128);
        \u0275\u0275text(431, "Test (30)");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(432, "div", 128);
        \u0275\u0275text(433, "Exam (70)");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(434, "div", 128);
        \u0275\u0275text(435, "Total (100)");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(436, "div", 129);
        \u0275\u0275text(437, "Grade");
        \u0275\u0275elementEnd()();
        \u0275\u0275elementStart(438, "div", 130)(439, "div", 127);
        \u0275\u0275text(440, "Amani Juma");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(441, "div", 128);
        \u0275\u0275text(442, "26");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(443, "div", 128);
        \u0275\u0275text(444, "62");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(445, "div", 131);
        \u0275\u0275text(446, "88");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(447, "div", 132);
        \u0275\u0275text(448, "A");
        \u0275\u0275elementEnd()();
        \u0275\u0275elementStart(449, "div", 130)(450, "div", 127);
        \u0275\u0275text(451, "Fadhili Omari");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(452, "div", 128);
        \u0275\u0275text(453, "18");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(454, "div", 128);
        \u0275\u0275text(455, "44");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(456, "div", 131);
        \u0275\u0275text(457, "62");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(458, "div", 129);
        \u0275\u0275text(459, "B-");
        \u0275\u0275elementEnd()();
        \u0275\u0275elementStart(460, "div", 130)(461, "div", 127);
        \u0275\u0275text(462, "Sarafina Mushi");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(463, "div", 128);
        \u0275\u0275text(464, "28");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(465, "div", 128);
        \u0275\u0275text(466, "65");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(467, "div", 131);
        \u0275\u0275text(468, "93");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(469, "div", 132);
        \u0275\u0275text(470, "A+");
        \u0275\u0275elementEnd()();
        \u0275\u0275elementStart(471, "div", 130)(472, "div", 127);
        \u0275\u0275text(473, "Neema Masawe");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(474, "div", 128);
        \u0275\u0275text(475, "14");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(476, "div", 128);
        \u0275\u0275text(477, "32");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(478, "div", 131);
        \u0275\u0275text(479, "46");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(480, "div", 133);
        \u0275\u0275text(481, "D");
        \u0275\u0275elementEnd()()()()()()();
        \u0275\u0275elementStart(482, "section", 134)(483, "div", 135)(484, "span", 26);
        \u0275\u0275text(485, "SECURITY & ROLES");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(486, "h2");
        \u0275\u0275text(487, "The right information for the right people");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(488, "p", 136);
        \u0275\u0275text(489, " Protect private information with a comprehensive, role-based security clearance matrix custom-fitted for every actor in your institution. ");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(490, "div", 137)(491, "div", 138)(492, "div", 30);
        \u0275\u0275namespaceSVG();
        \u0275\u0275elementStart(493, "svg", 31);
        \u0275\u0275element(494, "path", 100);
        \u0275\u0275elementEnd()();
        \u0275\u0275namespaceHTML();
        \u0275\u0275elementStart(495, "h3");
        \u0275\u0275text(496, "Administrator");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(497, "p");
        \u0275\u0275text(498, " Complete oversight. Create terms, configure classes, modify security clearances, and track global school audit trails. ");
        \u0275\u0275elementEnd()();
        \u0275\u0275elementStart(499, "div", 138)(500, "div", 30);
        \u0275\u0275namespaceSVG();
        \u0275\u0275elementStart(501, "svg", 31);
        \u0275\u0275element(502, "path", 41)(503, "path", 42);
        \u0275\u0275elementEnd()();
        \u0275\u0275namespaceHTML();
        \u0275\u0275elementStart(504, "h3");
        \u0275\u0275text(505, "Teacher");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(506, "p");
        \u0275\u0275text(507, " Classroom focused. Manage assigned student rosters, input assessment marks, record morning attendance rolls, and issue notes. ");
        \u0275\u0275elementEnd()();
        \u0275\u0275elementStart(508, "div", 138)(509, "div", 30);
        \u0275\u0275namespaceSVG();
        \u0275\u0275elementStart(510, "svg", 31);
        \u0275\u0275element(511, "rect", 57)(512, "line", 58);
        \u0275\u0275elementEnd()();
        \u0275\u0275namespaceHTML();
        \u0275\u0275elementStart(513, "h3");
        \u0275\u0275text(514, "Accountant");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(515, "p");
        \u0275\u0275text(516, " Financial ledger master. Publish tuition invoice cycles, log student payments, adjust fee waivers, and compile summaries. ");
        \u0275\u0275elementEnd()();
        \u0275\u0275elementStart(517, "div", 138)(518, "div", 30);
        \u0275\u0275namespaceSVG();
        \u0275\u0275elementStart(519, "svg", 31);
        \u0275\u0275element(520, "path", 139);
        \u0275\u0275elementEnd()();
        \u0275\u0275namespaceHTML();
        \u0275\u0275elementStart(521, "h3");
        \u0275\u0275text(522, "Receptionist");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(523, "p");
        \u0275\u0275text(524, " Front desk efficiency. Record daily student lateness metrics, monitor visitor logs, and verify basic biological card lookups. ");
        \u0275\u0275elementEnd()();
        \u0275\u0275elementStart(525, "div", 138)(526, "div", 30);
        \u0275\u0275namespaceSVG();
        \u0275\u0275elementStart(527, "svg", 31);
        \u0275\u0275element(528, "path", 37)(529, "circle", 38)(530, "path", 39)(531, "path", 40);
        \u0275\u0275elementEnd()();
        \u0275\u0275namespaceHTML();
        \u0275\u0275elementStart(532, "h3");
        \u0275\u0275text(533, "Parent");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(534, "p");
        \u0275\u0275text(535, " At-home insight portal. View children's attendance reports, monitor grade averages, check invoice balances, and chat with teachers. ");
        \u0275\u0275elementEnd()();
        \u0275\u0275elementStart(536, "div", 138)(537, "div", 30);
        \u0275\u0275namespaceSVG();
        \u0275\u0275elementStart(538, "svg", 31);
        \u0275\u0275element(539, "path", 140)(540, "circle", 141);
        \u0275\u0275elementEnd()();
        \u0275\u0275namespaceHTML();
        \u0275\u0275elementStart(541, "h3");
        \u0275\u0275text(542, "Student");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(543, "p");
        \u0275\u0275text(544, " Personal pathway tracker. Check timetables, review graded exam remarks, submit classroom documents, and log homework plans. ");
        \u0275\u0275elementEnd()()()()();
        \u0275\u0275elementStart(545, "footer", 142)(546, "div", 143)(547, "h2");
        \u0275\u0275text(548, "Ready to bring your school together?");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(549, "p");
        \u0275\u0275text(550, " Start managing your school with a platform designed to keep everything connected. Create your Sync Academy account today and see the difference. ");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(551, "div", 144)(552, "button", 18);
        \u0275\u0275text(553, " Create Account ");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(554, "button", 145);
        \u0275\u0275text(555, " Sign In to Account ");
        \u0275\u0275elementEnd()()();
        \u0275\u0275elementStart(556, "div", 146)(557, "div", 147)(558, "div", 148);
        \u0275\u0275element(559, "app-logo", 149);
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(560, "p", 150);
        \u0275\u0275text(561, " Premium cloud platform coordinating academics, accounting, security, and school-wide communications in one beautiful, streamlined interface. ");
        \u0275\u0275elementEnd()();
        \u0275\u0275elementStart(562, "div", 151)(563, "div", 152)(564, "h4");
        \u0275\u0275text(565, "PRODUCT");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(566, "a", 7);
        \u0275\u0275text(567, "Features");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(568, "a", 8);
        \u0275\u0275text(569, "Solutions");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(570, "a", 9);
        \u0275\u0275text(571, "Services");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(572, "a", 153);
        \u0275\u0275text(573, "Integrations");
        \u0275\u0275elementEnd()();
        \u0275\u0275elementStart(574, "div", 152)(575, "h4");
        \u0275\u0275text(576, "COMPANY");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(577, "a", 10);
        \u0275\u0275text(578, "About Us");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(579, "a", 11);
        \u0275\u0275text(580, "Contact");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(581, "a", 154);
        \u0275\u0275text(582, "Support Hub");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(583, "a", 155);
        \u0275\u0275text(584, "Client Stories");
        \u0275\u0275elementEnd()();
        \u0275\u0275elementStart(585, "div", 152)(586, "h4");
        \u0275\u0275text(587, "LEGAL");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(588, "a", 156);
        \u0275\u0275text(589, "Privacy Policy");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(590, "a", 157);
        \u0275\u0275text(591, "Terms of Service");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(592, "a", 158);
        \u0275\u0275text(593, "SLA");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(594, "a", 159);
        \u0275\u0275text(595, "Audit Logs");
        \u0275\u0275elementEnd()()()()()();
      }
    }, dependencies: [CommonModule, RouterModule, RouterLink, LogoComponent], styles: ['\n\n[_nghost-%COMP%] {\n  display: block;\n  font-family:\n    "Inter",\n    -apple-system,\n    BlinkMacSystemFont,\n    "Segoe UI",\n    Roboto,\n    Helvetica,\n    Arial,\n    sans-serif;\n  color: #334155;\n  --sa-primary: #E87E24;\n  --sa-primary-hover: #d6701c;\n  --sa-dark: #0f172a;\n  --sa-dark-lighter: #1e293b;\n  --sa-gray-light: #f8fafc;\n  --sa-gray: #cbd5e1;\n}\n.landing-page[_ngcontent-%COMP%] {\n  min-height: 100vh;\n  height: auto;\n  overflow-x: hidden;\n  width: 100%;\n  overflow-x: clip;\n  overflow-y: visible;\n}\n@media (max-width: 576px) {\n  .landing-page[_ngcontent-%COMP%]   .section[_ngcontent-%COMP%] {\n    padding: 4rem 1rem;\n  }\n  .landing-page[_ngcontent-%COMP%]   .section[_ngcontent-%COMP%]   h2[_ngcontent-%COMP%] {\n    font-size: 2rem;\n  }\n  .landing-page[_ngcontent-%COMP%]   .section[_ngcontent-%COMP%]   .section-subtitle[_ngcontent-%COMP%] {\n    font-size: 1rem;\n    margin-bottom: 2.5rem;\n  }\n}\n.btn[_ngcontent-%COMP%] {\n  padding: 0.5rem 1rem;\n  border-radius: 0.375rem;\n  font-weight: 600;\n  cursor: pointer;\n  border: none;\n  transition: all 0.2s;\n}\n.btn.btn-primary[_ngcontent-%COMP%] {\n  background-color: var(--sa-primary);\n  color: white;\n}\n.btn.btn-primary[_ngcontent-%COMP%]:hover {\n  background-color: var(--sa-primary-hover);\n}\n.btn.btn-outline[_ngcontent-%COMP%] {\n  background-color: transparent;\n  border: 2px solid var(--sa-gray);\n  color: var(--sa-dark);\n}\n.btn.btn-outline[_ngcontent-%COMP%]:hover {\n  border-color: var(--sa-dark);\n}\n.btn.btn-ghost[_ngcontent-%COMP%] {\n  background-color: transparent;\n  color: var(--sa-dark);\n}\n.btn.btn-ghost[_ngcontent-%COMP%]:hover {\n  background-color: #dcfce7;\n  color: #15803d;\n}\n.btn.btn-lg[_ngcontent-%COMP%] {\n  padding: 0.75rem 1.75rem;\n  font-size: 1rem;\n  border-radius: 0.5rem;\n}\n.section[_ngcontent-%COMP%] {\n  padding: 6rem 2rem;\n  max-width: 1200px;\n  margin: 0 auto;\n  text-align: center;\n}\n.section[_ngcontent-%COMP%]   h2[_ngcontent-%COMP%] {\n  font-size: 2.5rem;\n  font-weight: 800;\n  margin-bottom: 1.5rem;\n  color: var(--sa-dark-lighter);\n}\n.section[_ngcontent-%COMP%]   .section-label[_ngcontent-%COMP%] {\n  display: inline-block;\n  color: var(--sa-primary);\n  font-weight: 700;\n  font-size: 0.875rem;\n  letter-spacing: 0.05em;\n  text-transform: uppercase;\n  margin-bottom: 1rem;\n}\n.section[_ngcontent-%COMP%]   .section-subtitle[_ngcontent-%COMP%] {\n  font-size: 1.25rem;\n  color: #64748b;\n  max-width: 700px;\n  margin: 0 auto 4rem auto;\n  line-height: 1.6;\n}\n.hero-wrapper[_ngcontent-%COMP%] {\n  position: relative;\n  min-height: 100vh;\n  background-image: linear-gradient(rgba(15, 23, 42, 0.7), rgba(15, 23, 42, 0.7)), url(/assets/images/hero-classroom.jpg);\n  background-size: cover;\n  background-position: center;\n  background-attachment: fixed;\n  display: flex;\n  flex-direction: column;\n}\n.floating-navbar[_ngcontent-%COMP%] {\n  position: sticky;\n  top: 1rem;\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n  padding: 1rem 1.5rem;\n  background: white;\n  border-radius: 1rem;\n  margin: 1.5rem 2rem;\n  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);\n  z-index: 100;\n}\n.floating-navbar[_ngcontent-%COMP%]   .logo[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  gap: 0.75rem;\n}\n.floating-navbar[_ngcontent-%COMP%]   .nav-links[_ngcontent-%COMP%] {\n  display: flex;\n  gap: 2rem;\n}\n.floating-navbar[_ngcontent-%COMP%]   .nav-links[_ngcontent-%COMP%]   a[_ngcontent-%COMP%] {\n  color: #64748b;\n  text-decoration: none;\n  font-weight: 600;\n  font-size: 0.95rem;\n  transition: color 0.2s;\n}\n.floating-navbar[_ngcontent-%COMP%]   .nav-links[_ngcontent-%COMP%]   a.active[_ngcontent-%COMP%], \n.floating-navbar[_ngcontent-%COMP%]   .nav-links[_ngcontent-%COMP%]   a[_ngcontent-%COMP%]:hover {\n  color: var(--sa-primary);\n}\n.floating-navbar[_ngcontent-%COMP%]   .nav-actions[_ngcontent-%COMP%] {\n  display: flex;\n  gap: 1rem;\n  align-items: center;\n}\n.floating-navbar[_ngcontent-%COMP%]   .nav-actions[_ngcontent-%COMP%]   .btn-ghost[_ngcontent-%COMP%] {\n  font-weight: 700;\n  color: var(--sa-dark);\n}\n.floating-navbar[_ngcontent-%COMP%]   .nav-actions[_ngcontent-%COMP%]   .btn-ghost[_ngcontent-%COMP%]:hover {\n  background-color: #dcfce7;\n  color: #15803d;\n}\n@media (max-width: 768px) {\n  .floating-navbar[_ngcontent-%COMP%] {\n    margin: 1rem;\n    padding: 0.75rem 1rem;\n  }\n}\n@media (max-width: 1024px) {\n  .floating-navbar[_ngcontent-%COMP%]   .desktop-only[_ngcontent-%COMP%] {\n    display: none;\n  }\n}\n@media (max-width: 420px) {\n  .floating-navbar[_ngcontent-%COMP%] {\n    margin: 0.75rem;\n  }\n  .floating-navbar[_ngcontent-%COMP%]   .nav-actions[_ngcontent-%COMP%]   .btn-primary[_ngcontent-%COMP%] {\n    padding: 0.5rem 0.75rem;\n    font-size: 0.85rem;\n  }\n}\n.hero.left-aligned[_ngcontent-%COMP%] {\n  flex: 1;\n  display: flex;\n  align-items: center;\n  padding: 0 4rem;\n  text-align: left;\n}\n.hero.left-aligned[_ngcontent-%COMP%]   .hero-content[_ngcontent-%COMP%] {\n  max-width: 650px;\n  margin: 0;\n}\n.hero.left-aligned[_ngcontent-%COMP%]   .hero-content[_ngcontent-%COMP%]   h1[_ngcontent-%COMP%] {\n  font-size: 4rem;\n  font-weight: 800;\n  color: white;\n  margin-bottom: 1.5rem;\n  line-height: 1.1;\n  letter-spacing: -0.02em;\n}\n.hero.left-aligned[_ngcontent-%COMP%]   .hero-content[_ngcontent-%COMP%]   p[_ngcontent-%COMP%] {\n  font-size: 1.25rem;\n  color: #e2e8f0;\n  line-height: 1.6;\n  margin-bottom: 2.5rem;\n  margin-left: 0;\n}\n.hero.left-aligned[_ngcontent-%COMP%]   .hero-content[_ngcontent-%COMP%]   .hero-actions[_ngcontent-%COMP%] {\n  display: flex;\n  gap: 1rem;\n  justify-content: flex-start;\n  margin-bottom: 2rem;\n}\n.hero.left-aligned[_ngcontent-%COMP%]   .hero-content[_ngcontent-%COMP%]   .hero-actions[_ngcontent-%COMP%]   .btn-white[_ngcontent-%COMP%] {\n  background-color: white;\n  color: var(--sa-dark);\n  font-weight: 600;\n  border: none;\n}\n.hero.left-aligned[_ngcontent-%COMP%]   .hero-content[_ngcontent-%COMP%]   .hero-actions[_ngcontent-%COMP%]   .btn-white[_ngcontent-%COMP%]:hover {\n  background-color: #f1f5f9;\n}\n.hero.left-aligned[_ngcontent-%COMP%]   .hero-content[_ngcontent-%COMP%]   .hero-trust[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  gap: 0.75rem;\n}\n.hero.left-aligned[_ngcontent-%COMP%]   .hero-content[_ngcontent-%COMP%]   .hero-trust[_ngcontent-%COMP%]   .check-circle[_ngcontent-%COMP%] {\n  width: 24px;\n  height: 24px;\n  stroke: #10b981;\n}\n.hero.left-aligned[_ngcontent-%COMP%]   .hero-content[_ngcontent-%COMP%]   .hero-trust[_ngcontent-%COMP%]   .hero-subtext[_ngcontent-%COMP%] {\n  font-size: 1rem;\n  color: #cbd5e1;\n  margin: 0;\n}\n.hero.left-aligned[_ngcontent-%COMP%]   .hero-visual[_ngcontent-%COMP%] {\n  display: none;\n}\n@media (max-width: 768px) {\n  .hero.left-aligned[_ngcontent-%COMP%] {\n    padding: 2rem 1.5rem 4rem;\n  }\n  .hero.left-aligned[_ngcontent-%COMP%]   .hero-content[_ngcontent-%COMP%]   h1[_ngcontent-%COMP%] {\n    font-size: 2.5rem;\n  }\n  .hero.left-aligned[_ngcontent-%COMP%]   .hero-content[_ngcontent-%COMP%]   p[_ngcontent-%COMP%] {\n    font-size: 1.1rem;\n  }\n  .hero.left-aligned[_ngcontent-%COMP%]   .hero-content[_ngcontent-%COMP%]   .hero-actions[_ngcontent-%COMP%] {\n    flex-direction: column;\n  }\n}\n@media (max-width: 420px) {\n  .hero.left-aligned[_ngcontent-%COMP%] {\n    padding-inline: 1rem;\n  }\n  .hero.left-aligned[_ngcontent-%COMP%]   .hero-content[_ngcontent-%COMP%]   h1[_ngcontent-%COMP%] {\n    font-size: 2.1rem;\n  }\n  .hero.left-aligned[_ngcontent-%COMP%]   .hero-content[_ngcontent-%COMP%]   p[_ngcontent-%COMP%] {\n    font-size: 1rem;\n  }\n  .hero.left-aligned[_ngcontent-%COMP%]   .hero-content[_ngcontent-%COMP%]   .hero-trust[_ngcontent-%COMP%] {\n    align-items: flex-start;\n  }\n  .hero.left-aligned[_ngcontent-%COMP%]   .hero-content[_ngcontent-%COMP%]   .hero-trust[_ngcontent-%COMP%]   .hero-subtext[_ngcontent-%COMP%] {\n    font-size: 0.9rem;\n  }\n}\n.grid-4[_ngcontent-%COMP%] {\n  display: grid;\n  grid-template-columns: repeat(4, 1fr);\n  gap: 2rem;\n}\n@media (max-width: 992px) {\n  .grid-4[_ngcontent-%COMP%] {\n    grid-template-columns: repeat(2, 1fr);\n  }\n}\n@media (max-width: 576px) {\n  .grid-4[_ngcontent-%COMP%] {\n    grid-template-columns: 1fr;\n  }\n}\n.grid-3[_ngcontent-%COMP%] {\n  display: grid;\n  grid-template-columns: repeat(3, 1fr);\n  gap: 2rem;\n}\n@media (max-width: 992px) {\n  .grid-3[_ngcontent-%COMP%] {\n    grid-template-columns: repeat(2, 1fr);\n  }\n}\n@media (max-width: 768px) {\n  .grid-3[_ngcontent-%COMP%] {\n    grid-template-columns: 1fr;\n  }\n}\n.card[_ngcontent-%COMP%] {\n  background: white;\n  padding: 2rem;\n  border-radius: 1rem;\n  border: 1px solid #e2e8f0;\n  text-align: left;\n  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);\n  transition: transform 0.2s, box-shadow 0.2s;\n}\n.card[_ngcontent-%COMP%]:hover {\n  transform: translateY(-5px);\n  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);\n}\n.card[_ngcontent-%COMP%]   .icon-wrapper[_ngcontent-%COMP%] {\n  width: 48px;\n  height: 48px;\n  background: #fff3e0;\n  border-radius: 0.75rem;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  margin-bottom: 1.5rem;\n}\n.card[_ngcontent-%COMP%]   .icon-wrapper[_ngcontent-%COMP%]   .icon-svg[_ngcontent-%COMP%] {\n  width: 24px;\n  height: 24px;\n  stroke: var(--sa-primary);\n}\n.card[_ngcontent-%COMP%]   h3[_ngcontent-%COMP%] {\n  font-size: 1.25rem;\n  font-weight: 700;\n  margin-bottom: 0.75rem;\n  color: var(--sa-dark);\n}\n.card[_ngcontent-%COMP%]   p[_ngcontent-%COMP%] {\n  color: #64748b;\n  line-height: 1.6;\n  font-size: 0.95rem;\n}\n.dashboard-preview-section[_ngcontent-%COMP%] {\n  background: #f8fafc;\n  padding: 6rem 2rem;\n  max-width: 100%;\n}\n.dashboard-mockup[_ngcontent-%COMP%] {\n  width: 100%;\n  max-width: 1400px;\n  margin: 0 auto;\n  background: white;\n  border-radius: 0.5rem;\n  border: 2px solid #334155;\n  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.15);\n  overflow: hidden;\n  text-align: left;\n}\n.dashboard-mockup[_ngcontent-%COMP%]   .mockup-content[_ngcontent-%COMP%] {\n  display: flex;\n  min-height: 500px;\n}\n.dashboard-mockup[_ngcontent-%COMP%]   .mockup-content[_ngcontent-%COMP%]   .mock-sidebar[_ngcontent-%COMP%] {\n  width: 220px;\n  flex-shrink: 0;\n  background: #1e293b;\n  color: white;\n  padding: 1.5rem;\n}\n.dashboard-mockup[_ngcontent-%COMP%]   .mockup-content[_ngcontent-%COMP%]   .mock-sidebar[_ngcontent-%COMP%]   .mock-logo[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  gap: 0.75rem;\n  font-weight: 700;\n  font-size: 1.1rem;\n  margin-bottom: 2rem;\n}\n.dashboard-mockup[_ngcontent-%COMP%]   .mockup-content[_ngcontent-%COMP%]   .mock-sidebar[_ngcontent-%COMP%]   .mock-logo[_ngcontent-%COMP%]   .mock-logo-icon[_ngcontent-%COMP%] {\n  width: 24px;\n  height: 24px;\n  background: var(--sa-primary);\n  border-radius: 6px;\n}\n.dashboard-mockup[_ngcontent-%COMP%]   .mockup-content[_ngcontent-%COMP%]   .mock-sidebar[_ngcontent-%COMP%]   .mock-nav-item[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  gap: 0.75rem;\n  padding: 0.75rem;\n  border-radius: 0.5rem;\n  margin-bottom: 0.5rem;\n  font-size: 0.9rem;\n  color: #94a3b8;\n}\n.dashboard-mockup[_ngcontent-%COMP%]   .mockup-content[_ngcontent-%COMP%]   .mock-sidebar[_ngcontent-%COMP%]   .mock-nav-item[_ngcontent-%COMP%]   svg[_ngcontent-%COMP%] {\n  width: 18px;\n  height: 18px;\n}\n.dashboard-mockup[_ngcontent-%COMP%]   .mockup-content[_ngcontent-%COMP%]   .mock-sidebar[_ngcontent-%COMP%]   .mock-nav-item.active[_ngcontent-%COMP%] {\n  background: var(--sa-primary);\n  color: white;\n}\n.dashboard-mockup[_ngcontent-%COMP%]   .mockup-content[_ngcontent-%COMP%]   .mock-sidebar[_ngcontent-%COMP%]   .mock-nav-item.active[_ngcontent-%COMP%]   svg[_ngcontent-%COMP%] {\n  stroke: white;\n}\n.dashboard-mockup[_ngcontent-%COMP%]   .mockup-content[_ngcontent-%COMP%]   .mock-main[_ngcontent-%COMP%] {\n  flex: 1;\n  background: white;\n  padding: 2rem;\n  min-width: 0;\n  border-left: 1px solid #e2e8f0;\n}\n.dashboard-mockup[_ngcontent-%COMP%]   .mockup-content[_ngcontent-%COMP%]   .mock-main[_ngcontent-%COMP%]   .mock-header[_ngcontent-%COMP%] {\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n  margin-bottom: 2rem;\n}\n.dashboard-mockup[_ngcontent-%COMP%]   .mockup-content[_ngcontent-%COMP%]   .mock-main[_ngcontent-%COMP%]   .mock-header[_ngcontent-%COMP%]   .mock-title[_ngcontent-%COMP%] {\n  font-size: 1.25rem;\n  font-weight: 800;\n  color: #0f172a;\n}\n.dashboard-mockup[_ngcontent-%COMP%]   .mockup-content[_ngcontent-%COMP%]   .mock-main[_ngcontent-%COMP%]   .mock-header[_ngcontent-%COMP%]   .mock-user[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  gap: 1rem;\n}\n.dashboard-mockup[_ngcontent-%COMP%]   .mockup-content[_ngcontent-%COMP%]   .mock-main[_ngcontent-%COMP%]   .mock-header[_ngcontent-%COMP%]   .mock-user[_ngcontent-%COMP%]   .academic-year[_ngcontent-%COMP%] {\n  font-size: 0.85rem;\n  color: #64748b;\n}\n.dashboard-mockup[_ngcontent-%COMP%]   .mockup-content[_ngcontent-%COMP%]   .mock-main[_ngcontent-%COMP%]   .mock-header[_ngcontent-%COMP%]   .mock-user[_ngcontent-%COMP%]   .mock-avatar[_ngcontent-%COMP%] {\n  width: 32px;\n  height: 32px;\n  background: var(--sa-primary);\n  border-radius: 50%;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  font-weight: 700;\n  color: white;\n  font-size: 0.8rem;\n}\n.dashboard-mockup[_ngcontent-%COMP%]   .mockup-content[_ngcontent-%COMP%]   .mock-main[_ngcontent-%COMP%]   .mock-stats-row[_ngcontent-%COMP%] {\n  display: flex;\n  gap: 1.5rem;\n  margin-bottom: 2rem;\n}\n.dashboard-mockup[_ngcontent-%COMP%]   .mockup-content[_ngcontent-%COMP%]   .mock-main[_ngcontent-%COMP%]   .mock-stats-row[_ngcontent-%COMP%]   .mock-stat-card[_ngcontent-%COMP%] {\n  flex: 1;\n  background: white;\n  padding: 1.5rem;\n  border-radius: 0.5rem;\n  border: 1px solid #f1f5f9;\n  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.02);\n}\n.dashboard-mockup[_ngcontent-%COMP%]   .mockup-content[_ngcontent-%COMP%]   .mock-main[_ngcontent-%COMP%]   .mock-stats-row[_ngcontent-%COMP%]   .mock-stat-card[_ngcontent-%COMP%]   .stat-title[_ngcontent-%COMP%] {\n  font-size: 0.75rem;\n  color: #94a3b8;\n  margin-bottom: 0.5rem;\n  text-transform: uppercase;\n  letter-spacing: 0.05em;\n  font-weight: 600;\n}\n.dashboard-mockup[_ngcontent-%COMP%]   .mockup-content[_ngcontent-%COMP%]   .mock-main[_ngcontent-%COMP%]   .mock-stats-row[_ngcontent-%COMP%]   .mock-stat-card[_ngcontent-%COMP%]   .stat-value[_ngcontent-%COMP%] {\n  font-size: 1.5rem;\n  font-weight: 800;\n  color: #0f172a;\n  margin-bottom: 0.25rem;\n}\n.dashboard-mockup[_ngcontent-%COMP%]   .mockup-content[_ngcontent-%COMP%]   .mock-main[_ngcontent-%COMP%]   .mock-stats-row[_ngcontent-%COMP%]   .mock-stat-card[_ngcontent-%COMP%]   .stat-subtext[_ngcontent-%COMP%] {\n  font-size: 0.8rem;\n  color: #64748b;\n}\n.dashboard-mockup[_ngcontent-%COMP%]   .mockup-content[_ngcontent-%COMP%]   .mock-main[_ngcontent-%COMP%]   .mock-grid[_ngcontent-%COMP%] {\n  display: grid;\n  grid-template-columns: 2fr 1fr;\n  gap: 1.5rem;\n}\n.dashboard-mockup[_ngcontent-%COMP%]   .mockup-content[_ngcontent-%COMP%]   .mock-main[_ngcontent-%COMP%]   .mock-grid[_ngcontent-%COMP%]   .mock-chart[_ngcontent-%COMP%], \n.dashboard-mockup[_ngcontent-%COMP%]   .mockup-content[_ngcontent-%COMP%]   .mock-main[_ngcontent-%COMP%]   .mock-grid[_ngcontent-%COMP%]   .mock-activity[_ngcontent-%COMP%] {\n  background: white;\n  padding: 1.5rem;\n  border-radius: 0.5rem;\n  border: 1px solid #f1f5f9;\n  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.02);\n}\n.dashboard-mockup[_ngcontent-%COMP%]   .mockup-content[_ngcontent-%COMP%]   .mock-main[_ngcontent-%COMP%]   .mock-grid[_ngcontent-%COMP%]   .mock-chart[_ngcontent-%COMP%]   .chart-header[_ngcontent-%COMP%], \n.dashboard-mockup[_ngcontent-%COMP%]   .mockup-content[_ngcontent-%COMP%]   .mock-main[_ngcontent-%COMP%]   .mock-grid[_ngcontent-%COMP%]   .mock-chart[_ngcontent-%COMP%]   .activity-header[_ngcontent-%COMP%], \n.dashboard-mockup[_ngcontent-%COMP%]   .mockup-content[_ngcontent-%COMP%]   .mock-main[_ngcontent-%COMP%]   .mock-grid[_ngcontent-%COMP%]   .mock-activity[_ngcontent-%COMP%]   .chart-header[_ngcontent-%COMP%], \n.dashboard-mockup[_ngcontent-%COMP%]   .mockup-content[_ngcontent-%COMP%]   .mock-main[_ngcontent-%COMP%]   .mock-grid[_ngcontent-%COMP%]   .mock-activity[_ngcontent-%COMP%]   .activity-header[_ngcontent-%COMP%] {\n  font-weight: 700;\n  font-size: 0.9rem;\n  margin-bottom: 1.5rem;\n  color: #0f172a;\n}\n.dashboard-mockup[_ngcontent-%COMP%]   .mockup-content[_ngcontent-%COMP%]   .mock-main[_ngcontent-%COMP%]   .mock-grid[_ngcontent-%COMP%]   .chart-body[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: flex-end;\n  justify-content: space-between;\n  height: 180px;\n  padding-top: 1rem;\n  padding-bottom: 1rem;\n}\n.dashboard-mockup[_ngcontent-%COMP%]   .mockup-content[_ngcontent-%COMP%]   .mock-main[_ngcontent-%COMP%]   .mock-grid[_ngcontent-%COMP%]   .chart-body[_ngcontent-%COMP%]   .bar-group[_ngcontent-%COMP%] {\n  display: flex;\n  flex-direction: column;\n  align-items: center;\n  gap: 0.5rem;\n  height: 100%;\n  justify-content: flex-end;\n}\n.dashboard-mockup[_ngcontent-%COMP%]   .mockup-content[_ngcontent-%COMP%]   .mock-main[_ngcontent-%COMP%]   .mock-grid[_ngcontent-%COMP%]   .chart-body[_ngcontent-%COMP%]   .bar-group[_ngcontent-%COMP%]   .bar[_ngcontent-%COMP%] {\n  width: 14px;\n  background: var(--sa-primary);\n  border-radius: 4px 4px 0 0;\n}\n.dashboard-mockup[_ngcontent-%COMP%]   .mockup-content[_ngcontent-%COMP%]   .mock-main[_ngcontent-%COMP%]   .mock-grid[_ngcontent-%COMP%]   .chart-body[_ngcontent-%COMP%]   .bar-group[_ngcontent-%COMP%]   span[_ngcontent-%COMP%] {\n  font-size: 0.7rem;\n  color: #94a3b8;\n  font-weight: 600;\n}\n.dashboard-mockup[_ngcontent-%COMP%]   .mockup-content[_ngcontent-%COMP%]   .mock-main[_ngcontent-%COMP%]   .mock-grid[_ngcontent-%COMP%]   .activity-list[_ngcontent-%COMP%] {\n  display: flex;\n  flex-direction: column;\n  gap: 1rem;\n}\n.dashboard-mockup[_ngcontent-%COMP%]   .mockup-content[_ngcontent-%COMP%]   .mock-main[_ngcontent-%COMP%]   .mock-grid[_ngcontent-%COMP%]   .activity-list[_ngcontent-%COMP%]   .activity-item[_ngcontent-%COMP%] {\n  display: flex;\n  gap: 0.75rem;\n  align-items: flex-start;\n}\n.dashboard-mockup[_ngcontent-%COMP%]   .mockup-content[_ngcontent-%COMP%]   .mock-main[_ngcontent-%COMP%]   .mock-grid[_ngcontent-%COMP%]   .activity-list[_ngcontent-%COMP%]   .activity-item[_ngcontent-%COMP%]   .dot[_ngcontent-%COMP%] {\n  width: 6px;\n  height: 6px;\n  border-radius: 50%;\n  margin-top: 6px;\n  flex-shrink: 0;\n}\n.dashboard-mockup[_ngcontent-%COMP%]   .mockup-content[_ngcontent-%COMP%]   .mock-main[_ngcontent-%COMP%]   .mock-grid[_ngcontent-%COMP%]   .activity-list[_ngcontent-%COMP%]   .activity-item[_ngcontent-%COMP%]   .dot.orange[_ngcontent-%COMP%] {\n  background: var(--sa-primary);\n}\n.dashboard-mockup[_ngcontent-%COMP%]   .mockup-content[_ngcontent-%COMP%]   .mock-main[_ngcontent-%COMP%]   .mock-grid[_ngcontent-%COMP%]   .activity-list[_ngcontent-%COMP%]   .activity-item[_ngcontent-%COMP%]   .details[_ngcontent-%COMP%] {\n  display: flex;\n  flex-direction: column;\n}\n.dashboard-mockup[_ngcontent-%COMP%]   .mockup-content[_ngcontent-%COMP%]   .mock-main[_ngcontent-%COMP%]   .mock-grid[_ngcontent-%COMP%]   .activity-list[_ngcontent-%COMP%]   .activity-item[_ngcontent-%COMP%]   .details[_ngcontent-%COMP%]   .text[_ngcontent-%COMP%] {\n  font-size: 0.85rem;\n  font-weight: 500;\n  color: #475569;\n}\n@media (max-width: 768px) {\n  .dashboard-mockup[_ngcontent-%COMP%] {\n    overflow-x: auto;\n    scrollbar-width: none;\n  }\n  .dashboard-mockup[_ngcontent-%COMP%]::-webkit-scrollbar {\n    display: none;\n  }\n  .dashboard-mockup[_ngcontent-%COMP%]   .mockup-content[_ngcontent-%COMP%] {\n    min-width: 900px;\n  }\n}\n.feature-blocks[_ngcontent-%COMP%] {\n  padding: 6rem 2rem;\n  max-width: 1200px;\n  margin: 0 auto;\n}\n.feature-blocks[_ngcontent-%COMP%]   .feature-block[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  gap: 4rem;\n  margin-bottom: 8rem;\n}\n.feature-blocks[_ngcontent-%COMP%]   .feature-block[_ngcontent-%COMP%]:last-child {\n  margin-bottom: 0;\n}\n.feature-blocks[_ngcontent-%COMP%]   .feature-block.reverse[_ngcontent-%COMP%] {\n  flex-direction: row-reverse;\n}\n.feature-blocks[_ngcontent-%COMP%]   .feature-block[_ngcontent-%COMP%]   .feature-text[_ngcontent-%COMP%] {\n  flex: 1;\n  text-align: left;\n}\n.feature-blocks[_ngcontent-%COMP%]   .feature-block[_ngcontent-%COMP%]   .feature-text[_ngcontent-%COMP%]   .section-label[_ngcontent-%COMP%] {\n  display: inline-block;\n  color: var(--sa-primary);\n  font-weight: 700;\n  font-size: 0.875rem;\n  letter-spacing: 0.05em;\n  text-transform: uppercase;\n  margin-bottom: 1rem;\n}\n.feature-blocks[_ngcontent-%COMP%]   .feature-block[_ngcontent-%COMP%]   .feature-text[_ngcontent-%COMP%]   h2[_ngcontent-%COMP%] {\n  font-size: 2.25rem;\n  font-weight: 800;\n  margin-bottom: 1.5rem;\n  color: #1e293b;\n}\n.feature-blocks[_ngcontent-%COMP%]   .feature-block[_ngcontent-%COMP%]   .feature-text[_ngcontent-%COMP%]   p[_ngcontent-%COMP%] {\n  font-size: 1.125rem;\n  color: #64748b;\n  line-height: 1.6;\n  margin-bottom: 2rem;\n}\n.feature-blocks[_ngcontent-%COMP%]   .feature-block[_ngcontent-%COMP%]   .feature-text[_ngcontent-%COMP%]   .feature-list[_ngcontent-%COMP%] {\n  list-style: none;\n  padding: 0;\n  margin: 0;\n}\n.feature-blocks[_ngcontent-%COMP%]   .feature-block[_ngcontent-%COMP%]   .feature-text[_ngcontent-%COMP%]   .feature-list[_ngcontent-%COMP%]   li[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: flex-start;\n  gap: 1rem;\n  margin-bottom: 1.25rem;\n  font-size: 1.05rem;\n  color: #334155;\n  line-height: 1.5;\n}\n.feature-blocks[_ngcontent-%COMP%]   .feature-block[_ngcontent-%COMP%]   .feature-text[_ngcontent-%COMP%]   .feature-list[_ngcontent-%COMP%]   li[_ngcontent-%COMP%]   .check-icon[_ngcontent-%COMP%] {\n  width: 24px;\n  height: 24px;\n  stroke: #10b981;\n  flex-shrink: 0;\n  margin-top: 2px;\n}\n.feature-blocks[_ngcontent-%COMP%]   .feature-block[_ngcontent-%COMP%]   .feature-visual[_ngcontent-%COMP%] {\n  flex: 1;\n  display: flex;\n  justify-content: center;\n}\n.feature-blocks[_ngcontent-%COMP%]   .feature-block[_ngcontent-%COMP%]   .feature-visual[_ngcontent-%COMP%]   .mockup-profile-card[_ngcontent-%COMP%] {\n  width: 100%;\n  max-width: 480px;\n  background: white;\n  border-radius: 1rem;\n  border: 1px solid #e2e8f0;\n  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.08);\n  padding: 2rem;\n}\n.feature-blocks[_ngcontent-%COMP%]   .feature-block[_ngcontent-%COMP%]   .feature-visual[_ngcontent-%COMP%]   .mockup-profile-card[_ngcontent-%COMP%]   .mockup-profile-header[_ngcontent-%COMP%] {\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n  margin-bottom: 2rem;\n}\n.feature-blocks[_ngcontent-%COMP%]   .feature-block[_ngcontent-%COMP%]   .feature-visual[_ngcontent-%COMP%]   .mockup-profile-card[_ngcontent-%COMP%]   .mockup-profile-header[_ngcontent-%COMP%]   .title[_ngcontent-%COMP%] {\n  font-weight: 800;\n  color: #1e293b;\n  font-size: 1.1rem;\n}\n.feature-blocks[_ngcontent-%COMP%]   .feature-block[_ngcontent-%COMP%]   .feature-visual[_ngcontent-%COMP%]   .mockup-profile-card[_ngcontent-%COMP%]   .mockup-profile-header[_ngcontent-%COMP%]   .active-badge[_ngcontent-%COMP%] {\n  background: #d1fae5;\n  color: #059669;\n  padding: 0.35rem 0.85rem;\n  border-radius: 9999px;\n  font-size: 0.75rem;\n  font-weight: 700;\n}\n.feature-blocks[_ngcontent-%COMP%]   .feature-block[_ngcontent-%COMP%]   .feature-visual[_ngcontent-%COMP%]   .mockup-profile-card[_ngcontent-%COMP%]   .mockup-profile-user[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  gap: 1.5rem;\n  margin-bottom: 2rem;\n  padding-bottom: 2rem;\n  border-bottom: 1px solid #f1f5f9;\n}\n.feature-blocks[_ngcontent-%COMP%]   .feature-block[_ngcontent-%COMP%]   .feature-visual[_ngcontent-%COMP%]   .mockup-profile-card[_ngcontent-%COMP%]   .mockup-profile-user[_ngcontent-%COMP%]   .avatar[_ngcontent-%COMP%] {\n  width: 80px;\n  height: 80px;\n  border-radius: 50%;\n  overflow: hidden;\n  border: 3px solid white;\n  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);\n}\n.feature-blocks[_ngcontent-%COMP%]   .feature-block[_ngcontent-%COMP%]   .feature-visual[_ngcontent-%COMP%]   .mockup-profile-card[_ngcontent-%COMP%]   .mockup-profile-user[_ngcontent-%COMP%]   .avatar[_ngcontent-%COMP%]   img[_ngcontent-%COMP%] {\n  width: 100%;\n  height: 100%;\n  object-fit: cover;\n}\n.feature-blocks[_ngcontent-%COMP%]   .feature-block[_ngcontent-%COMP%]   .feature-visual[_ngcontent-%COMP%]   .mockup-profile-card[_ngcontent-%COMP%]   .mockup-profile-user[_ngcontent-%COMP%]   .user-info[_ngcontent-%COMP%] {\n  display: flex;\n  flex-direction: column;\n  gap: 0.25rem;\n}\n.feature-blocks[_ngcontent-%COMP%]   .feature-block[_ngcontent-%COMP%]   .feature-visual[_ngcontent-%COMP%]   .mockup-profile-card[_ngcontent-%COMP%]   .mockup-profile-user[_ngcontent-%COMP%]   .user-info[_ngcontent-%COMP%]   strong[_ngcontent-%COMP%] {\n  color: #1e293b;\n  font-size: 1.1rem;\n}\n.feature-blocks[_ngcontent-%COMP%]   .feature-block[_ngcontent-%COMP%]   .feature-visual[_ngcontent-%COMP%]   .mockup-profile-card[_ngcontent-%COMP%]   .mockup-profile-user[_ngcontent-%COMP%]   .user-info[_ngcontent-%COMP%]   span[_ngcontent-%COMP%] {\n  color: #94a3b8;\n  font-size: 0.75rem;\n}\n.feature-blocks[_ngcontent-%COMP%]   .feature-block[_ngcontent-%COMP%]   .feature-visual[_ngcontent-%COMP%]   .mockup-profile-card[_ngcontent-%COMP%]   .mockup-profile-grid[_ngcontent-%COMP%] {\n  display: grid;\n  grid-template-columns: 1fr 1fr;\n  gap: 1.5rem;\n}\n.feature-blocks[_ngcontent-%COMP%]   .feature-block[_ngcontent-%COMP%]   .feature-visual[_ngcontent-%COMP%]   .mockup-profile-card[_ngcontent-%COMP%]   .mockup-profile-grid[_ngcontent-%COMP%]   .grid-item[_ngcontent-%COMP%] {\n  display: flex;\n  flex-direction: column;\n  gap: 0.35rem;\n}\n.feature-blocks[_ngcontent-%COMP%]   .feature-block[_ngcontent-%COMP%]   .feature-visual[_ngcontent-%COMP%]   .mockup-profile-card[_ngcontent-%COMP%]   .mockup-profile-grid[_ngcontent-%COMP%]   .grid-item[_ngcontent-%COMP%]   .label[_ngcontent-%COMP%] {\n  font-size: 0.7rem;\n  color: #94a3b8;\n  text-transform: uppercase;\n  letter-spacing: 0.5px;\n}\n.feature-blocks[_ngcontent-%COMP%]   .feature-block[_ngcontent-%COMP%]   .feature-visual[_ngcontent-%COMP%]   .mockup-profile-card[_ngcontent-%COMP%]   .mockup-profile-grid[_ngcontent-%COMP%]   .grid-item[_ngcontent-%COMP%]   .value[_ngcontent-%COMP%] {\n  font-size: 0.85rem;\n  font-weight: 600;\n  color: #1e293b;\n}\n.feature-blocks[_ngcontent-%COMP%]   .feature-block[_ngcontent-%COMP%]   .feature-visual[_ngcontent-%COMP%]   .mockup-profile-card[_ngcontent-%COMP%]   .mockup-profile-grid[_ngcontent-%COMP%]   .grid-item[_ngcontent-%COMP%]   .text-green[_ngcontent-%COMP%] {\n  color: #10b981;\n}\n.feature-blocks[_ngcontent-%COMP%]   .feature-block[_ngcontent-%COMP%]   .feature-visual[_ngcontent-%COMP%]   .mockup-profile-card[_ngcontent-%COMP%]   .mockup-profile-grid[_ngcontent-%COMP%]   .grid-item[_ngcontent-%COMP%]   .text-orange[_ngcontent-%COMP%] {\n  color: var(--sa-primary);\n}\n.feature-blocks[_ngcontent-%COMP%]   .feature-block[_ngcontent-%COMP%]   .feature-visual[_ngcontent-%COMP%]   .mockup-table-card[_ngcontent-%COMP%] {\n  width: 100%;\n  max-width: 580px;\n  background: white;\n  border-radius: 1rem;\n  border: 1px solid #e2e8f0;\n  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.08);\n  padding: 1.5rem;\n}\n.feature-blocks[_ngcontent-%COMP%]   .feature-block[_ngcontent-%COMP%]   .feature-visual[_ngcontent-%COMP%]   .mockup-table-card[_ngcontent-%COMP%]   .mockup-table-header[_ngcontent-%COMP%] {\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n  margin-bottom: 1.5rem;\n}\n.feature-blocks[_ngcontent-%COMP%]   .feature-block[_ngcontent-%COMP%]   .feature-visual[_ngcontent-%COMP%]   .mockup-table-card[_ngcontent-%COMP%]   .mockup-table-header[_ngcontent-%COMP%]   .title[_ngcontent-%COMP%] {\n  font-weight: 800;\n  color: #1e293b;\n  font-size: 1rem;\n}\n.feature-blocks[_ngcontent-%COMP%]   .feature-block[_ngcontent-%COMP%]   .feature-visual[_ngcontent-%COMP%]   .mockup-table-card[_ngcontent-%COMP%]   .mockup-table-header[_ngcontent-%COMP%]   .term-badge[_ngcontent-%COMP%] {\n  background: #ffedd5;\n  color: #ea580c;\n  padding: 0.35rem 0.85rem;\n  border-radius: 9999px;\n  font-size: 0.75rem;\n  font-weight: 700;\n}\n.feature-blocks[_ngcontent-%COMP%]   .feature-block[_ngcontent-%COMP%]   .feature-visual[_ngcontent-%COMP%]   .mockup-table-card[_ngcontent-%COMP%]   .mockup-table-body[_ngcontent-%COMP%]   .table-row[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  padding: 0.8rem 1rem;\n  border-bottom: 1px solid #f1f5f9;\n}\n.feature-blocks[_ngcontent-%COMP%]   .feature-block[_ngcontent-%COMP%]   .feature-visual[_ngcontent-%COMP%]   .mockup-table-card[_ngcontent-%COMP%]   .mockup-table-body[_ngcontent-%COMP%]   .table-row[_ngcontent-%COMP%]:last-child {\n  border-bottom: none;\n}\n.feature-blocks[_ngcontent-%COMP%]   .feature-block[_ngcontent-%COMP%]   .feature-visual[_ngcontent-%COMP%]   .mockup-table-card[_ngcontent-%COMP%]   .mockup-table-body[_ngcontent-%COMP%]   .table-row.table-head[_ngcontent-%COMP%] {\n  background: #f8fafc;\n  color: #64748b;\n  font-size: 0.75rem;\n  font-weight: 600;\n  border-bottom: 1px solid #e2e8f0;\n  border-radius: 0.25rem;\n}\n.feature-blocks[_ngcontent-%COMP%]   .feature-block[_ngcontent-%COMP%]   .feature-visual[_ngcontent-%COMP%]   .mockup-table-card[_ngcontent-%COMP%]   .mockup-table-body[_ngcontent-%COMP%]   .table-row[_ngcontent-%COMP%]   .col-name[_ngcontent-%COMP%] {\n  flex: 2;\n  font-size: 0.85rem;\n  color: #475569;\n}\n.feature-blocks[_ngcontent-%COMP%]   .feature-block[_ngcontent-%COMP%]   .feature-visual[_ngcontent-%COMP%]   .mockup-table-card[_ngcontent-%COMP%]   .mockup-table-body[_ngcontent-%COMP%]   .table-row[_ngcontent-%COMP%]   .col-num[_ngcontent-%COMP%] {\n  flex: 1;\n  text-align: right;\n  font-size: 0.85rem;\n  color: #64748b;\n}\n.feature-blocks[_ngcontent-%COMP%]   .feature-block[_ngcontent-%COMP%]   .feature-visual[_ngcontent-%COMP%]   .mockup-table-card[_ngcontent-%COMP%]   .mockup-table-body[_ngcontent-%COMP%]   .table-row[_ngcontent-%COMP%]   .col-num.font-bold[_ngcontent-%COMP%] {\n  font-weight: 800;\n  color: #1e293b;\n}\n.feature-blocks[_ngcontent-%COMP%]   .feature-block[_ngcontent-%COMP%]   .feature-visual[_ngcontent-%COMP%]   .mockup-table-card[_ngcontent-%COMP%]   .mockup-table-body[_ngcontent-%COMP%]   .table-row[_ngcontent-%COMP%]   .col-grade[_ngcontent-%COMP%] {\n  flex: 0.8;\n  text-align: right;\n  font-size: 0.85rem;\n  font-weight: 800;\n  color: #475569;\n}\n.feature-blocks[_ngcontent-%COMP%]   .feature-block[_ngcontent-%COMP%]   .feature-visual[_ngcontent-%COMP%]   .mockup-table-card[_ngcontent-%COMP%]   .mockup-table-body[_ngcontent-%COMP%]   .table-row[_ngcontent-%COMP%]   .col-grade.text-green[_ngcontent-%COMP%] {\n  color: #10b981;\n}\n.feature-blocks[_ngcontent-%COMP%]   .feature-block[_ngcontent-%COMP%]   .feature-visual[_ngcontent-%COMP%]   .mockup-table-card[_ngcontent-%COMP%]   .mockup-table-body[_ngcontent-%COMP%]   .table-row[_ngcontent-%COMP%]   .col-grade.text-red[_ngcontent-%COMP%] {\n  color: #ef4444;\n}\n@media (max-width: 992px) {\n  .feature-blocks[_ngcontent-%COMP%]   .feature-block[_ngcontent-%COMP%] {\n    flex-direction: column !important;\n    gap: 3rem;\n  }\n  .feature-blocks[_ngcontent-%COMP%]   .feature-block[_ngcontent-%COMP%]   .feature-visual[_ngcontent-%COMP%] {\n    width: 100%;\n  }\n}\n.security-roles[_ngcontent-%COMP%] {\n  background: var(--sa-gray-light);\n  max-width: 100%;\n}\n.security-roles[_ngcontent-%COMP%]   .container[_ngcontent-%COMP%] {\n  max-width: 1200px;\n  margin: 0 auto;\n}\n.security-roles[_ngcontent-%COMP%]   .security-grid[_ngcontent-%COMP%] {\n  margin-top: 4rem;\n}\n.security-roles[_ngcontent-%COMP%]   .security-grid[_ngcontent-%COMP%]   .security-card[_ngcontent-%COMP%] {\n  text-align: left;\n  padding: 2.5rem;\n  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.03);\n  border: 1px solid rgba(0, 0, 0, 0.05);\n}\n.security-roles[_ngcontent-%COMP%]   .security-grid[_ngcontent-%COMP%]   .security-card[_ngcontent-%COMP%]   .icon-wrapper[_ngcontent-%COMP%] {\n  width: 48px;\n  height: 48px;\n  background: #fff3e0;\n  border-radius: 0.75rem;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  margin-bottom: 1.5rem;\n}\n.security-roles[_ngcontent-%COMP%]   .security-grid[_ngcontent-%COMP%]   .security-card[_ngcontent-%COMP%]   .icon-wrapper[_ngcontent-%COMP%]   svg[_ngcontent-%COMP%] {\n  width: 24px;\n  height: 24px;\n  stroke: var(--sa-primary);\n}\n.security-roles[_ngcontent-%COMP%]   .security-grid[_ngcontent-%COMP%]   .security-card[_ngcontent-%COMP%]   h3[_ngcontent-%COMP%] {\n  font-size: 1.25rem;\n  font-weight: 800;\n  margin-bottom: 1rem;\n  color: var(--sa-dark-lighter);\n}\n.security-roles[_ngcontent-%COMP%]   .security-grid[_ngcontent-%COMP%]   .security-card[_ngcontent-%COMP%]   p[_ngcontent-%COMP%] {\n  font-size: 0.95rem;\n  color: #64748b;\n  line-height: 1.7;\n}\n.footer.dark-footer[_ngcontent-%COMP%] {\n  background-color: var(--sa-dark);\n  color: white;\n  padding: 6rem 2rem 4rem 2rem;\n}\n.footer.dark-footer[_ngcontent-%COMP%]   .footer-cta[_ngcontent-%COMP%] {\n  max-width: 800px;\n  margin: 0 auto 6rem auto;\n}\n.footer.dark-footer[_ngcontent-%COMP%]   .footer-cta[_ngcontent-%COMP%]   h2[_ngcontent-%COMP%] {\n  font-size: 2.5rem;\n  font-weight: 800;\n  color: white;\n  margin-bottom: 1.5rem;\n}\n.footer.dark-footer[_ngcontent-%COMP%]   .footer-cta[_ngcontent-%COMP%]   p[_ngcontent-%COMP%] {\n  color: #94a3b8;\n  font-size: 1.125rem;\n  line-height: 1.6;\n  margin-bottom: 2.5rem;\n  max-width: 600px;\n  margin-left: auto;\n  margin-right: auto;\n}\n.footer.dark-footer[_ngcontent-%COMP%]   .footer-cta[_ngcontent-%COMP%]   .cta-actions[_ngcontent-%COMP%] {\n  display: flex;\n  gap: 1rem;\n  justify-content: center;\n}\n.footer.dark-footer[_ngcontent-%COMP%]   .footer-cta[_ngcontent-%COMP%]   .cta-actions[_ngcontent-%COMP%]   .btn-outline-light[_ngcontent-%COMP%] {\n  background-color: transparent;\n  border: 2px solid #334155;\n  color: white;\n}\n.footer.dark-footer[_ngcontent-%COMP%]   .footer-cta[_ngcontent-%COMP%]   .cta-actions[_ngcontent-%COMP%]   .btn-outline-light[_ngcontent-%COMP%]:hover {\n  border-color: #cbd5e1;\n}\n.footer.dark-footer[_ngcontent-%COMP%]   .footer-main[_ngcontent-%COMP%] {\n  max-width: 1200px;\n  margin: 0 auto;\n  display: flex;\n  justify-content: space-between;\n  gap: 4rem;\n  padding-top: 4rem;\n  border-top: 1px solid #1e293b;\n  text-align: left;\n}\n.footer.dark-footer[_ngcontent-%COMP%]   .footer-main[_ngcontent-%COMP%]   .footer-brand[_ngcontent-%COMP%] {\n  flex: 1;\n  max-width: 300px;\n}\n.footer.dark-footer[_ngcontent-%COMP%]   .footer-main[_ngcontent-%COMP%]   .footer-brand[_ngcontent-%COMP%]   .footer-logo[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  gap: 0.75rem;\n  margin-bottom: 1.5rem;\n}\n.footer.dark-footer[_ngcontent-%COMP%]   .footer-main[_ngcontent-%COMP%]   .footer-brand[_ngcontent-%COMP%]   .brand-desc[_ngcontent-%COMP%] {\n  color: #94a3b8;\n  font-size: 0.875rem;\n  line-height: 1.6;\n}\n.footer.dark-footer[_ngcontent-%COMP%]   .footer-main[_ngcontent-%COMP%]   .footer-columns[_ngcontent-%COMP%] {\n  display: flex;\n  gap: 6rem;\n}\n.footer.dark-footer[_ngcontent-%COMP%]   .footer-main[_ngcontent-%COMP%]   .footer-columns[_ngcontent-%COMP%]   .footer-col[_ngcontent-%COMP%] {\n  display: flex;\n  flex-direction: column;\n  gap: 1rem;\n}\n.footer.dark-footer[_ngcontent-%COMP%]   .footer-main[_ngcontent-%COMP%]   .footer-columns[_ngcontent-%COMP%]   .footer-col[_ngcontent-%COMP%]   h4[_ngcontent-%COMP%] {\n  color: white;\n  font-size: 0.875rem;\n  font-weight: 700;\n  margin-bottom: 0.5rem;\n  letter-spacing: 0.05em;\n}\n.footer.dark-footer[_ngcontent-%COMP%]   .footer-main[_ngcontent-%COMP%]   .footer-columns[_ngcontent-%COMP%]   .footer-col[_ngcontent-%COMP%]   a[_ngcontent-%COMP%] {\n  color: #94a3b8;\n  text-decoration: none;\n  font-size: 0.875rem;\n  transition: color 0.2s;\n}\n.footer.dark-footer[_ngcontent-%COMP%]   .footer-main[_ngcontent-%COMP%]   .footer-columns[_ngcontent-%COMP%]   .footer-col[_ngcontent-%COMP%]   a[_ngcontent-%COMP%]:hover {\n  color: var(--sa-primary);\n}\n@media (max-width: 992px) {\n  .footer.dark-footer[_ngcontent-%COMP%]   .footer-main[_ngcontent-%COMP%] {\n    flex-direction: column;\n    gap: 3rem;\n  }\n  .footer.dark-footer[_ngcontent-%COMP%]   .footer-columns[_ngcontent-%COMP%] {\n    gap: 3rem;\n    flex-wrap: wrap;\n  }\n}\n@media (max-width: 576px) {\n  .footer.dark-footer[_ngcontent-%COMP%]   .footer-cta[_ngcontent-%COMP%]   .cta-actions[_ngcontent-%COMP%] {\n    flex-direction: column;\n  }\n  .footer.dark-footer[_ngcontent-%COMP%]   .footer-columns[_ngcontent-%COMP%] {\n    flex-direction: column;\n    gap: 2rem;\n  }\n}\n/*# sourceMappingURL=landing.page.css.map */'] });
  }
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(LandingPage, [{
    type: Component,
    args: [{ selector: "app-landing", standalone: true, imports: [CommonModule, RouterModule, LogoComponent], template: `<div class="landing-page">\r
  <!-- Hero Section Wrapper with Background -->\r
  <div class="hero-wrapper">\r
    <!-- 1. Navigation (Floating) -->\r
    <nav class="floating-navbar">\r
      <div class="logo">\r
        <app-logo variant="dark" size="md"></app-logo>\r
      </div>\r
      <div class="nav-links desktop-only">\r
        <a href="#home" class="active">Home</a>\r
        <a href="#features">Features</a>\r
        <a href="#solutions">Solutions</a>\r
        <a href="#services">Services</a>\r
        <a href="#about">About</a>\r
        <a href="#contact">Contact</a>\r
      </div>\r
      <div class="nav-actions">\r
        <button class="btn btn-ghost desktop-only" routerLink="/auth/login">\r
          Sign In\r
        </button>\r
        <button class="btn btn-primary" routerLink="/auth/register">\r
          Create Account\r
        </button>\r
      </div>\r
    </nav>\r
\r
    <!-- 2. Hero Section (Left Aligned) -->\r
    <header class="hero left-aligned">\r
      <div class="hero-content">\r
        <h1>A smarter way to<br />manage your school</h1>\r
        <p>\r
          Sync Academy brings your entire school together in one powerful\r
          platform \u2014 from students and academics to finance, communication, and\r
          administration.\r
        </p>\r
        <div class="hero-actions">\r
          <button class="btn btn-primary btn-lg" routerLink="/auth/register">\r
            Create Account\r
          </button>\r
          <button class="btn btn-white btn-lg" routerLink="/auth/login">\r
            Sign In\r
          </button>\r
        </div>\r
        <div class="hero-trust">\r
          <svg\r
            class="check-circle"\r
            viewBox="0 0 24 24"\r
            fill="none"\r
            stroke="currentColor"\r
            stroke-width="2"\r
          >\r
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>\r
            <polyline points="22 4 12 14.01 9 11.01"></polyline>\r
          </svg>\r
          <span class="hero-subtext"\r
            >Everything your school needs. One connected platform.</span\r
          >\r
        </div>\r
      </div>\r
    </header>\r
  </div>\r
\r
  <!-- 3. Unified Solution Section -->\r
  <section class="section unified-solution">\r
    <span class="section-label">THE UNIFIED SOLUTION</span>\r
    <h2>A single source of truth for your entire community.</h2>\r
    <p class="section-subtitle">\r
      Say goodbye to scattered spreadsheets and disjointed tools. SyncAcademy\r
      brings everyone onto the same page.\r
    </p>\r
\r
    <div class="grid-4">\r
      <div class="card">\r
        <div class="icon-wrapper">\r
          <svg\r
            class="icon-svg"\r
            viewBox="0 0 24 24"\r
            fill="none"\r
            stroke="currentColor"\r
            stroke-width="1.5"\r
            stroke-linecap="round"\r
            stroke-linejoin="round"\r
          >\r
            <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>\r
            <circle cx="8.5" cy="7" r="4"></circle>\r
            <polyline points="17 11 19 13 23 9"></polyline>\r
          </svg>\r
        </div>\r
        <h3>School Administration</h3>\r
        <p>\r
          Oversee admissions, fees, and staff with real-time, comprehensive\r
          analytics.\r
        </p>\r
      </div>\r
      <div class="card">\r
        <div class="icon-wrapper">\r
          <svg\r
            class="icon-svg"\r
            viewBox="0 0 24 24"\r
            fill="none"\r
            stroke="currentColor"\r
            stroke-width="1.5"\r
            stroke-linecap="round"\r
            stroke-linejoin="round"\r
          >\r
            <path d="M22 10v6M2 10l10-5 10 5-10 5z"></path>\r
            <path d="M6 12v5c3 3 9 3 12 0v-5"></path>\r
          </svg>\r
        </div>\r
        <h3>Teachers</h3>\r
        <p>\r
          Manage attendance, enter marks, and track student progress\r
          effortlessly.\r
        </p>\r
      </div>\r
      <div class="card">\r
        <div class="icon-wrapper">\r
          <svg\r
            class="icon-svg"\r
            viewBox="0 0 24 24"\r
            fill="none"\r
            stroke="currentColor"\r
            stroke-width="1.5"\r
            stroke-linecap="round"\r
            stroke-linejoin="round"\r
          >\r
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>\r
            <circle cx="9" cy="7" r="4"></circle>\r
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>\r
            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>\r
          </svg>\r
        </div>\r
        <h3>Parents</h3>\r
        <p>\r
          Stay informed with instant updates on fees, academics, and school\r
          news.\r
        </p>\r
      </div>\r
      <div class="card">\r
        <div class="icon-wrapper">\r
          <svg\r
            class="icon-svg"\r
            viewBox="0 0 24 24"\r
            fill="none"\r
            stroke="currentColor"\r
            stroke-width="1.5"\r
            stroke-linecap="round"\r
            stroke-linejoin="round"\r
          >\r
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>\r
            <path\r
              d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"\r
            ></path>\r
          </svg>\r
        </div>\r
        <h3>Students</h3>\r
        <p>\r
          Access study materials, schedules, and report cards from any device.\r
        </p>\r
      </div>\r
    </div>\r
  </section>\r
\r
  <!-- 4. System Overview / Dashboard Mockup -->\r
  <section class="section dashboard-preview-section">\r
    <span class="section-label">SYSTEM OVERVIEW</span>\r
    <h2>See your entire school at a glance</h2>\r
    <p class="section-subtitle">\r
      Our intuitive interface provides directors and administrators with\r
      comprehensive insights, clear dashboards, and structural control.\r
    </p>\r
\r
    <div class="dashboard-mockup">\r
      <!-- Mockup Content -->\r
      <div class="mockup-content">\r
        <!-- Sidebar -->\r
        <div class="mock-sidebar">\r
          <div class="mock-logo">\r
            <div class="mock-logo-icon"></div>\r
            <span>Sync Academy</span>\r
          </div>\r
          <div class="mock-nav">\r
            <div class="mock-nav-item active">\r
              <svg\r
                viewBox="0 0 24 24"\r
                fill="none"\r
                stroke="currentColor"\r
                stroke-width="2"\r
              >\r
                <rect x="3" y="3" width="7" height="7"></rect>\r
                <rect x="14" y="3" width="7" height="7"></rect>\r
                <rect x="14" y="14" width="7" height="7"></rect>\r
                <rect x="3" y="14" width="7" height="7"></rect>\r
              </svg>\r
              Dashboard\r
            </div>\r
            <div class="mock-nav-item">\r
              <svg\r
                viewBox="0 0 24 24"\r
                fill="none"\r
                stroke="currentColor"\r
                stroke-width="2"\r
              >\r
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>\r
                <circle cx="9" cy="7" r="4"></circle>\r
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>\r
                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>\r
              </svg>\r
              Students\r
            </div>\r
            <div class="mock-nav-item">\r
              <svg\r
                viewBox="0 0 24 24"\r
                fill="none"\r
                stroke="currentColor"\r
                stroke-width="2"\r
              >\r
                <path d="M22 10v6M2 10l10-5 10 5-10 5z"></path>\r
                <path d="M6 12v5c3 3 9 3 12 0v-5"></path>\r
              </svg>\r
              Academics\r
            </div>\r
            <div class="mock-nav-item">\r
              <svg\r
                viewBox="0 0 24 24"\r
                fill="none"\r
                stroke="currentColor"\r
                stroke-width="2"\r
              >\r
                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>\r
                <circle cx="8.5" cy="7" r="4"></circle>\r
                <polyline points="17 11 19 13 23 9"></polyline>\r
              </svg>\r
              Attendance\r
            </div>\r
            <div class="mock-nav-item">\r
              <svg\r
                viewBox="0 0 24 24"\r
                fill="none"\r
                stroke="currentColor"\r
                stroke-width="2"\r
              >\r
                <rect x="2" y="5" width="20" height="14" rx="2"></rect>\r
                <line x1="2" y1="10" x2="22" y2="10"></line>\r
              </svg>\r
              Finance\r
            </div>\r
            <div class="mock-nav-item">\r
              <svg\r
                viewBox="0 0 24 24"\r
                fill="none"\r
                stroke="currentColor"\r
                stroke-width="2"\r
              >\r
                <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>\r
                <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>\r
              </svg>\r
              Teachers\r
            </div>\r
            <div class="mock-nav-item">\r
              <svg\r
                viewBox="0 0 24 24"\r
                fill="none"\r
                stroke="currentColor"\r
                stroke-width="2"\r
              >\r
                <line x1="18" y1="20" x2="18" y2="10"></line>\r
                <line x1="12" y1="20" x2="12" y2="4"></line>\r
                <line x1="6" y1="20" x2="6" y2="14"></line>\r
              </svg>\r
              Reports\r
            </div>\r
            <div class="mock-nav-item">\r
              <svg\r
                viewBox="0 0 24 24"\r
                fill="none"\r
                stroke="currentColor"\r
                stroke-width="2"\r
              >\r
                <circle cx="12" cy="12" r="3"></circle>\r
                <path\r
                  d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"\r
                ></path>\r
              </svg>\r
              Settings\r
            </div>\r
          </div>\r
        </div>\r
\r
        <!-- Main Area -->\r
        <div class="mock-main">\r
          <div class="mock-header">\r
            <div class="mock-title">Director's Dashboard</div>\r
            <div class="mock-user">\r
              <span class="academic-year">Academic Year: 2025/2026</span>\r
              <div class="mock-avatar">AD</div>\r
            </div>\r
          </div>\r
\r
          <!-- Stats Row -->\r
          <div class="mock-stats-row">\r
            <div class="mock-stat-card">\r
              <div class="stat-title">TOTAL STUDENTS</div>\r
              <div class="stat-value">1,240 Active</div>\r
              <div class="stat-subtext">98% Attendance rate</div>\r
            </div>\r
            <div class="mock-stat-card">\r
              <div class="stat-title">ANNUAL FINANCE</div>\r
              <div class="stat-value">TZS 102,860,000</div>\r
              <div class="stat-subtext">82% Tuition collected</div>\r
            </div>\r
            <div class="mock-stat-card">\r
              <div class="stat-title">ACADEMICS</div>\r
              <div class="stat-value">18 Subjects</div>\r
              <div class="stat-subtext">94% Exam pass rate</div>\r
            </div>\r
          </div>\r
\r
          <!-- Content Grid -->\r
          <div class="mock-grid">\r
            <div class="mock-chart">\r
              <div class="chart-header">Enrollment Trend</div>\r
              <div class="chart-body">\r
                <div class="bar-group">\r
                  <div class="bar" style="height: 25%"></div>\r
                  <span>Q1</span>\r
                </div>\r
                <div class="bar-group">\r
                  <div class="bar" style="height: 35%"></div>\r
                  <span>Q2</span>\r
                </div>\r
                <div class="bar-group">\r
                  <div class="bar" style="height: 30%"></div>\r
                  <span>Q3</span>\r
                </div>\r
                <div class="bar-group">\r
                  <div class="bar" style="height: 50%"></div>\r
                  <span>Q4</span>\r
                </div>\r
                <div class="bar-group">\r
                  <div class="bar" style="height: 45%"></div>\r
                  <span>Q5</span>\r
                </div>\r
                <div class="bar-group">\r
                  <div class="bar" style="height: 60%"></div>\r
                  <span>Q6</span>\r
                </div>\r
                <div class="bar-group">\r
                  <div class="bar" style="height: 70%"></div>\r
                  <span>Q7</span>\r
                </div>\r
                <div class="bar-group">\r
                  <div class="bar" style="height: 85%"></div>\r
                  <span>Q8</span>\r
                </div>\r
              </div>\r
            </div>\r
\r
            <div class="mock-activity">\r
              <div class="activity-header">Recent Activity</div>\r
              <div class="activity-list">\r
                <div class="activity-item">\r
                  <div class="dot orange"></div>\r
                  <div class="details">\r
                    <span class="text"\r
                      >Tuition payment: TZS 450,000 received</span\r
                    >\r
                  </div>\r
                </div>\r
                <div class="activity-item">\r
                  <div class="dot orange"></div>\r
                  <div class="details">\r
                    <span class="text"\r
                      >Gradebook published for Form 4 Chemistry</span\r
                    >\r
                  </div>\r
                </div>\r
                <div class="activity-item">\r
                  <div class="dot orange"></div>\r
                  <div class="details">\r
                    <span class="text"\r
                      >Attendance alert: 12 absences reported today</span\r
                    >\r
                  </div>\r
                </div>\r
                <div class="activity-item">\r
                  <div class="dot orange"></div>\r
                  <div class="details">\r
                    <span class="text"\r
                      >New teacher account created: David Kim</span\r
                    >\r
                  </div>\r
                </div>\r
              </div>\r
            </div>\r
          </div>\r
        </div>\r
      </div>\r
    </div>\r
  </section>\r
\r
  <!-- Functional Modules -->\r
  <section class="section functional-modules">\r
    <span class="section-label">FUNCTIONAL MODULES</span>\r
    <h2>Everything works together</h2>\r
    <p class="section-subtitle">\r
      Each segment functions perfectly on its own while staying intimately\r
      connected to school-wide metrics in real time.\r
    </p>\r
\r
    <div class="grid-4 functional-grid">\r
      <!-- 1. Student Management -->\r
      <div class="card">\r
        <div class="icon-wrapper">\r
          <svg\r
            class="icon-svg"\r
            viewBox="0 0 24 24"\r
            fill="none"\r
            stroke="currentColor"\r
            stroke-width="1.5"\r
            stroke-linecap="round"\r
            stroke-linejoin="round"\r
          >\r
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>\r
            <circle cx="9" cy="7" r="4"></circle>\r
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>\r
            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>\r
          </svg>\r
        </div>\r
        <h3>Student Management</h3>\r
        <p>\r
          Complete bio profiles, family links, academic pathways, and\r
          documentation.\r
        </p>\r
      </div>\r
\r
      <!-- 2. Academic Management -->\r
      <div class="card">\r
        <div class="icon-wrapper">\r
          <svg\r
            class="icon-svg"\r
            viewBox="0 0 24 24"\r
            fill="none"\r
            stroke="currentColor"\r
            stroke-width="1.5"\r
            stroke-linecap="round"\r
            stroke-linejoin="round"\r
          >\r
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>\r
            <path\r
              d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"\r
            ></path>\r
          </svg>\r
        </div>\r
        <h3>Academic Management</h3>\r
        <p>\r
          Gradebooks, standardized reporting, examinations planning, and\r
          timetables.\r
        </p>\r
      </div>\r
\r
      <!-- 3. Teacher & Staff Management -->\r
      <div class="card">\r
        <div class="icon-wrapper">\r
          <svg\r
            class="icon-svg"\r
            viewBox="0 0 24 24"\r
            fill="none"\r
            stroke="currentColor"\r
            stroke-width="1.5"\r
            stroke-linecap="round"\r
            stroke-linejoin="round"\r
          >\r
            <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>\r
            <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>\r
          </svg>\r
        </div>\r
        <h3>Teacher & Staff Management</h3>\r
        <p>\r
          Workload tracking, assignments, performance, and communication hubs.\r
        </p>\r
      </div>\r
\r
      <!-- 4. Finance Management -->\r
      <div class="card">\r
        <div class="icon-wrapper">\r
          <svg\r
            class="icon-svg"\r
            viewBox="0 0 24 24"\r
            fill="none"\r
            stroke="currentColor"\r
            stroke-width="1.5"\r
            stroke-linecap="round"\r
            stroke-linejoin="round"\r
          >\r
            <rect x="2" y="5" width="20" height="14" rx="2"></rect>\r
            <line x1="2" y1="10" x2="22" y2="10"></line>\r
          </svg>\r
        </div>\r
        <h3>Finance Management</h3>\r
        <p>\r
          Automated billing templates, outstanding invoice reminders, and custom\r
          payments.\r
        </p>\r
      </div>\r
\r
      <!-- 5. Parent Communication -->\r
      <div class="card">\r
        <div class="icon-wrapper">\r
          <svg\r
            class="icon-svg"\r
            viewBox="0 0 24 24"\r
            fill="none"\r
            stroke="currentColor"\r
            stroke-width="1.5"\r
            stroke-linecap="round"\r
            stroke-linejoin="round"\r
          >\r
            <path\r
              d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"\r
            ></path>\r
          </svg>\r
        </div>\r
        <h3>Parent Communication</h3>\r
        <p>\r
          Direct portal, push updates, automated SMS alerts, and seamless\r
          integration.\r
        </p>\r
      </div>\r
\r
      <!-- 6. Attendance Management -->\r
      <div class="card">\r
        <div class="icon-wrapper">\r
          <svg\r
            class="icon-svg"\r
            viewBox="0 0 24 24"\r
            fill="none"\r
            stroke="currentColor"\r
            stroke-width="1.5"\r
            stroke-linecap="round"\r
            stroke-linejoin="round"\r
          >\r
            <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>\r
            <circle cx="8.5" cy="7" r="4"></circle>\r
            <polyline points="17 11 19 13 23 9"></polyline>\r
          </svg>\r
        </div>\r
        <h3>Attendance Management</h3>\r
        <p>\r
          Fast morning roll calls, modern scan logs, and automated absence\r
          alerts.\r
        </p>\r
      </div>\r
\r
      <!-- 7. Reports & Analytics -->\r
      <div class="card">\r
        <div class="icon-wrapper">\r
          <svg\r
            class="icon-svg"\r
            viewBox="0 0 24 24"\r
            fill="none"\r
            stroke="currentColor"\r
            stroke-width="1.5"\r
            stroke-linecap="round"\r
            stroke-linejoin="round"\r
          >\r
            <line x1="18" y1="20" x2="18" y2="10"></line>\r
            <line x1="12" y1="20" x2="12" y2="4"></line>\r
            <line x1="6" y1="20" x2="6" y2="14"></line>\r
          </svg>\r
        </div>\r
        <h3>Reports & Analytics</h3>\r
        <p>\r
          Intuitive charts mapping metrics from enrollment to cash collection.\r
        </p>\r
      </div>\r
\r
      <!-- 8. Administration Control -->\r
      <div class="card">\r
        <div class="icon-wrapper">\r
          <svg\r
            class="icon-svg"\r
            viewBox="0 0 24 24"\r
            fill="none"\r
            stroke="currentColor"\r
            stroke-width="1.5"\r
            stroke-linecap="round"\r
            stroke-linejoin="round"\r
          >\r
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>\r
          </svg>\r
        </div>\r
        <h3>Administration Control</h3>\r
        <p>\r
          Modular permission matrix controls, campus security, and historical\r
          logbooks.\r
        </p>\r
      </div>\r
    </div>\r
  </section>\r
\r
  <!-- 6. Alternating Feature Blocks -->\r
  <section class="section feature-blocks">\r
    <!-- Block A: Student Profiles -->\r
    <div class="feature-block">\r
      <div class="feature-text">\r
        <span class="section-label">STUDENT PROFILES</span>\r
        <h2>Know every student. Manage every detail.</h2>\r
        <p>\r
          Our student records system keeps essential profiles up-to-date and\r
          instantly accessible by authorized personnel.\r
        </p>\r
        <ul class="feature-list">\r
          <li>\r
            <svg\r
              class="check-icon"\r
              viewBox="0 0 24 24"\r
              fill="none"\r
              stroke="currentColor"\r
              stroke-width="2"\r
            >\r
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>\r
              <polyline points="22 4 12 14.01 9 11.01"></polyline>\r
            </svg>\r
            Complete bio-data, documentation upload, and admissions history.\r
          </li>\r
          <li>\r
            <svg\r
              class="check-icon"\r
              viewBox="0 0 24 24"\r
              fill="none"\r
              stroke="currentColor"\r
              stroke-width="2"\r
            >\r
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>\r
              <polyline points="22 4 12 14.01 9 11.01"></polyline>\r
            </svg>\r
            Visual linkage to parents, guardians, and immediate family members.\r
          </li>\r
          <li>\r
            <svg\r
              class="check-icon"\r
              viewBox="0 0 24 24"\r
              fill="none"\r
              stroke="currentColor"\r
              stroke-width="2"\r
            >\r
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>\r
              <polyline points="22 4 12 14.01 9 11.01"></polyline>\r
            </svg>\r
            Integrated timelines combining academic performance with attendance.\r
          </li>\r
          <li>\r
            <svg\r
              class="check-icon"\r
              viewBox="0 0 24 24"\r
              fill="none"\r
              stroke="currentColor"\r
              stroke-width="2"\r
            >\r
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>\r
              <polyline points="22 4 12 14.01 9 11.01"></polyline>\r
            </svg>\r
            Tuition invoices, fee balances, and receipt history on one card.\r
          </li>\r
        </ul>\r
      </div>\r
      <div class="feature-visual">\r
        <div class="mockup-profile-card">\r
          <div class="mockup-profile-header">\r
            <span class="title">Student Profile</span>\r
            <span class="badge active-badge">Active (Class 10A)</span>\r
          </div>\r
          <div class="mockup-profile-user">\r
            <div class="avatar">\r
              <img\r
                src="/assets/images/amani-juma.svg"\r
                alt="Amani Juma profile picture"\r
              />\r
            </div>\r
            <div class="user-info">\r
              <strong>Amani Juma</strong>\r
              <span>Reg ID: SA-2025-08412</span>\r
            </div>\r
          </div>\r
          <div class="mockup-profile-grid">\r
            <div class="grid-item">\r
              <span class="label">Guardian Name</span>\r
              <span class="value">Rashid Juma (Father)</span>\r
            </div>\r
            <div class="grid-item">\r
              <span class="label">Contact Number</span>\r
              <span class="value">+255 712 345 678</span>\r
            </div>\r
            <div class="grid-item">\r
              <span class="label">Academic Performance</span>\r
              <span class="value text-green">Excellent (A- Average)</span>\r
            </div>\r
            <div class="grid-item">\r
              <span class="label">Fee Payment Status</span>\r
              <span class="value text-orange">TZS 450,000 Pending</span>\r
            </div>\r
          </div>\r
        </div>\r
      </div>\r
    </div>\r
\r
    <!-- Block B: Academic Suite -->\r
    <div class="feature-block reverse">\r
      <div class="feature-text">\r
        <span class="section-label">ACADEMIC SUITE</span>\r
        <h2>Make academic management simpler</h2>\r
        <p>\r
          Empower your teachers with clean layouts to input marks, log lesson\r
          plans, schedule report card print runs, and coordinate syllabus\r
          expectations.\r
        </p>\r
        <ul class="feature-list">\r
          <li>\r
            <svg\r
              class="check-icon"\r
              viewBox="0 0 24 24"\r
              fill="none"\r
              stroke="currentColor"\r
              stroke-width="2"\r
            >\r
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>\r
              <polyline points="22 4 12 14.01 9 11.01"></polyline>\r
            </svg>\r
            Highly customizable grading scales tailored to national guidelines.\r
          </li>\r
          <li>\r
            <svg\r
              class="check-icon"\r
              viewBox="0 0 24 24"\r
              fill="none"\r
              stroke="currentColor"\r
              stroke-width="2"\r
            >\r
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>\r
              <polyline points="22 4 12 14.01 9 11.01"></polyline>\r
            </svg>\r
            Clean digital gradebooks that instantly average periodic\r
            assessments.\r
          </li>\r
          <li>\r
            <svg\r
              class="check-icon"\r
              viewBox="0 0 24 24"\r
              fill="none"\r
              stroke="currentColor"\r
              stroke-width="2"\r
            >\r
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>\r
              <polyline points="22 4 12 14.01 9 11.01"></polyline>\r
            </svg>\r
            Report card builders ready to compile results in single-click PDFs.\r
          </li>\r
          <li>\r
            <svg\r
              class="check-icon"\r
              viewBox="0 0 24 24"\r
              fill="none"\r
              stroke="currentColor"\r
              stroke-width="2"\r
            >\r
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>\r
              <polyline points="22 4 12 14.01 9 11.01"></polyline>\r
            </svg>\r
            Schedules and room-allocation calendars to prevent planning clashes.\r
          </li>\r
        </ul>\r
      </div>\r
      <div class="feature-visual">\r
        <div class="mockup-table-card">\r
          <div class="mockup-table-header">\r
            <span class="title">Gradebook: Form 4 Biology</span>\r
            <span class="badge term-badge">Term 2 Exams</span>\r
          </div>\r
          <div class="mockup-table-body">\r
            <div class="table-row table-head">\r
              <div class="col-name">Student Name</div>\r
              <div class="col-num">Test (30)</div>\r
              <div class="col-num">Exam (70)</div>\r
              <div class="col-num">Total (100)</div>\r
              <div class="col-grade">Grade</div>\r
            </div>\r
            <div class="table-row">\r
              <div class="col-name">Amani Juma</div>\r
              <div class="col-num">26</div>\r
              <div class="col-num">62</div>\r
              <div class="col-num font-bold">88</div>\r
              <div class="col-grade text-green">A</div>\r
            </div>\r
            <div class="table-row">\r
              <div class="col-name">Fadhili Omari</div>\r
              <div class="col-num">18</div>\r
              <div class="col-num">44</div>\r
              <div class="col-num font-bold">62</div>\r
              <div class="col-grade">B-</div>\r
            </div>\r
            <div class="table-row">\r
              <div class="col-name">Sarafina Mushi</div>\r
              <div class="col-num">28</div>\r
              <div class="col-num">65</div>\r
              <div class="col-num font-bold">93</div>\r
              <div class="col-grade text-green">A+</div>\r
            </div>\r
            <div class="table-row">\r
              <div class="col-name">Neema Masawe</div>\r
              <div class="col-num">14</div>\r
              <div class="col-num">32</div>\r
              <div class="col-num font-bold">46</div>\r
              <div class="col-grade text-red">D</div>\r
            </div>\r
          </div>\r
        </div>\r
      </div>\r
    </div>\r
  </section>\r
\r
  <!-- 7. Security & Roles Grid (NEW) -->\r
  <section class="section security-roles bg-gray">\r
    <div class="container text-center">\r
      <span class="section-label">SECURITY & ROLES</span>\r
      <h2>The right information for the right people</h2>\r
      <p class="section-subtitle mx-auto">\r
        Protect private information with a comprehensive, role-based security\r
        clearance matrix custom-fitted for every actor in your institution.\r
      </p>\r
\r
      <div class="grid-3 security-grid">\r
        <div class="card security-card">\r
          <div class="icon-wrapper">\r
            <svg\r
              class="icon-svg"\r
              viewBox="0 0 24 24"\r
              fill="none"\r
              stroke="currentColor"\r
              stroke-width="1.5"\r
              stroke-linecap="round"\r
              stroke-linejoin="round"\r
            >\r
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>\r
            </svg>\r
          </div>\r
          <h3>Administrator</h3>\r
          <p>\r
            Complete oversight. Create terms, configure classes, modify security\r
            clearances, and track global school audit trails.\r
          </p>\r
        </div>\r
\r
        <div class="card security-card">\r
          <div class="icon-wrapper">\r
            <svg\r
              class="icon-svg"\r
              viewBox="0 0 24 24"\r
              fill="none"\r
              stroke="currentColor"\r
              stroke-width="1.5"\r
              stroke-linecap="round"\r
              stroke-linejoin="round"\r
            >\r
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>\r
              <path\r
                d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"\r
              ></path>\r
            </svg>\r
          </div>\r
          <h3>Teacher</h3>\r
          <p>\r
            Classroom focused. Manage assigned student rosters, input assessment\r
            marks, record morning attendance rolls, and issue notes.\r
          </p>\r
        </div>\r
\r
        <div class="card security-card">\r
          <div class="icon-wrapper">\r
            <svg\r
              class="icon-svg"\r
              viewBox="0 0 24 24"\r
              fill="none"\r
              stroke="currentColor"\r
              stroke-width="1.5"\r
              stroke-linecap="round"\r
              stroke-linejoin="round"\r
            >\r
              <rect x="2" y="5" width="20" height="14" rx="2"></rect>\r
              <line x1="2" y1="10" x2="22" y2="10"></line>\r
            </svg>\r
          </div>\r
          <h3>Accountant</h3>\r
          <p>\r
            Financial ledger master. Publish tuition invoice cycles, log student\r
            payments, adjust fee waivers, and compile summaries.\r
          </p>\r
        </div>\r
\r
        <div class="card security-card">\r
          <div class="icon-wrapper">\r
            <svg\r
              class="icon-svg"\r
              viewBox="0 0 24 24"\r
              fill="none"\r
              stroke="currentColor"\r
              stroke-width="1.5"\r
              stroke-linecap="round"\r
              stroke-linejoin="round"\r
            >\r
              <path\r
                d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"\r
              ></path>\r
            </svg>\r
          </div>\r
          <h3>Receptionist</h3>\r
          <p>\r
            Front desk efficiency. Record daily student lateness metrics,\r
            monitor visitor logs, and verify basic biological card lookups.\r
          </p>\r
        </div>\r
\r
        <div class="card security-card">\r
          <div class="icon-wrapper">\r
            <svg\r
              class="icon-svg"\r
              viewBox="0 0 24 24"\r
              fill="none"\r
              stroke="currentColor"\r
              stroke-width="1.5"\r
              stroke-linecap="round"\r
              stroke-linejoin="round"\r
            >\r
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>\r
              <circle cx="9" cy="7" r="4"></circle>\r
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>\r
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>\r
            </svg>\r
          </div>\r
          <h3>Parent</h3>\r
          <p>\r
            At-home insight portal. View children's attendance reports, monitor\r
            grade averages, check invoice balances, and chat with teachers.\r
          </p>\r
        </div>\r
\r
        <div class="card security-card">\r
          <div class="icon-wrapper">\r
            <svg\r
              class="icon-svg"\r
              viewBox="0 0 24 24"\r
              fill="none"\r
              stroke="currentColor"\r
              stroke-width="1.5"\r
              stroke-linecap="round"\r
              stroke-linejoin="round"\r
            >\r
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>\r
              <circle cx="12" cy="7" r="4"></circle>\r
            </svg>\r
          </div>\r
          <h3>Student</h3>\r
          <p>\r
            Personal pathway tracker. Check timetables, review graded exam\r
            remarks, submit classroom documents, and log homework plans.\r
          </p>\r
        </div>\r
      </div>\r
    </div>\r
  </section>\r
\r
  <!-- 8. Footer -->\r
  <footer class="footer dark-footer">\r
    <div class="footer-cta text-center">\r
      <h2>Ready to bring your school together?</h2>\r
      <p>\r
        Start managing your school with a platform designed to keep everything\r
        connected. Create your Sync Academy account today and see the\r
        difference.\r
      </p>\r
      <div class="cta-actions">\r
        <button class="btn btn-primary btn-lg" routerLink="/auth/register">\r
          Create Account\r
        </button>\r
        <button class="btn btn-outline-light btn-lg" routerLink="/auth/login">\r
          Sign In to Account\r
        </button>\r
      </div>\r
    </div>\r
\r
    <div class="footer-main container">\r
      <div class="footer-brand">\r
        <div class="footer-logo">\r
          <app-logo variant="light" size="md"></app-logo>\r
        </div>\r
        <p class="brand-desc">\r
          Premium cloud platform coordinating academics, accounting, security,\r
          and school-wide communications in one beautiful, streamlined\r
          interface.\r
        </p>\r
      </div>\r
\r
      <div class="footer-columns">\r
        <div class="footer-col">\r
          <h4>PRODUCT</h4>\r
          <a href="#features">Features</a>\r
          <a href="#solutions">Solutions</a>\r
          <a href="#services">Services</a>\r
          <a href="#integrations">Integrations</a>\r
        </div>\r
        <div class="footer-col">\r
          <h4>COMPANY</h4>\r
          <a href="#about">About Us</a>\r
          <a href="#contact">Contact</a>\r
          <a href="#support">Support Hub</a>\r
          <a href="#stories">Client Stories</a>\r
        </div>\r
        <div class="footer-col">\r
          <h4>LEGAL</h4>\r
          <a href="#privacy">Privacy Policy</a>\r
          <a href="#terms">Terms of Service</a>\r
          <a href="#sla">SLA</a>\r
          <a href="#audit">Audit Logs</a>\r
        </div>\r
      </div>\r
    </div>\r
  </footer>\r
</div>\r
`, styles: ['/* src/app/features/landing/landing.page.scss */\n:host {\n  display: block;\n  font-family:\n    "Inter",\n    -apple-system,\n    BlinkMacSystemFont,\n    "Segoe UI",\n    Roboto,\n    Helvetica,\n    Arial,\n    sans-serif;\n  color: #334155;\n  --sa-primary: #E87E24;\n  --sa-primary-hover: #d6701c;\n  --sa-dark: #0f172a;\n  --sa-dark-lighter: #1e293b;\n  --sa-gray-light: #f8fafc;\n  --sa-gray: #cbd5e1;\n}\n.landing-page {\n  min-height: 100vh;\n  height: auto;\n  overflow-x: hidden;\n  width: 100%;\n  overflow-x: clip;\n  overflow-y: visible;\n}\n@media (max-width: 576px) {\n  .landing-page .section {\n    padding: 4rem 1rem;\n  }\n  .landing-page .section h2 {\n    font-size: 2rem;\n  }\n  .landing-page .section .section-subtitle {\n    font-size: 1rem;\n    margin-bottom: 2.5rem;\n  }\n}\n.btn {\n  padding: 0.5rem 1rem;\n  border-radius: 0.375rem;\n  font-weight: 600;\n  cursor: pointer;\n  border: none;\n  transition: all 0.2s;\n}\n.btn.btn-primary {\n  background-color: var(--sa-primary);\n  color: white;\n}\n.btn.btn-primary:hover {\n  background-color: var(--sa-primary-hover);\n}\n.btn.btn-outline {\n  background-color: transparent;\n  border: 2px solid var(--sa-gray);\n  color: var(--sa-dark);\n}\n.btn.btn-outline:hover {\n  border-color: var(--sa-dark);\n}\n.btn.btn-ghost {\n  background-color: transparent;\n  color: var(--sa-dark);\n}\n.btn.btn-ghost:hover {\n  background-color: #dcfce7;\n  color: #15803d;\n}\n.btn.btn-lg {\n  padding: 0.75rem 1.75rem;\n  font-size: 1rem;\n  border-radius: 0.5rem;\n}\n.section {\n  padding: 6rem 2rem;\n  max-width: 1200px;\n  margin: 0 auto;\n  text-align: center;\n}\n.section h2 {\n  font-size: 2.5rem;\n  font-weight: 800;\n  margin-bottom: 1.5rem;\n  color: var(--sa-dark-lighter);\n}\n.section .section-label {\n  display: inline-block;\n  color: var(--sa-primary);\n  font-weight: 700;\n  font-size: 0.875rem;\n  letter-spacing: 0.05em;\n  text-transform: uppercase;\n  margin-bottom: 1rem;\n}\n.section .section-subtitle {\n  font-size: 1.25rem;\n  color: #64748b;\n  max-width: 700px;\n  margin: 0 auto 4rem auto;\n  line-height: 1.6;\n}\n.hero-wrapper {\n  position: relative;\n  min-height: 100vh;\n  background-image: linear-gradient(rgba(15, 23, 42, 0.7), rgba(15, 23, 42, 0.7)), url(/assets/images/hero-classroom.jpg);\n  background-size: cover;\n  background-position: center;\n  background-attachment: fixed;\n  display: flex;\n  flex-direction: column;\n}\n.floating-navbar {\n  position: sticky;\n  top: 1rem;\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n  padding: 1rem 1.5rem;\n  background: white;\n  border-radius: 1rem;\n  margin: 1.5rem 2rem;\n  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);\n  z-index: 100;\n}\n.floating-navbar .logo {\n  display: flex;\n  align-items: center;\n  gap: 0.75rem;\n}\n.floating-navbar .nav-links {\n  display: flex;\n  gap: 2rem;\n}\n.floating-navbar .nav-links a {\n  color: #64748b;\n  text-decoration: none;\n  font-weight: 600;\n  font-size: 0.95rem;\n  transition: color 0.2s;\n}\n.floating-navbar .nav-links a.active,\n.floating-navbar .nav-links a:hover {\n  color: var(--sa-primary);\n}\n.floating-navbar .nav-actions {\n  display: flex;\n  gap: 1rem;\n  align-items: center;\n}\n.floating-navbar .nav-actions .btn-ghost {\n  font-weight: 700;\n  color: var(--sa-dark);\n}\n.floating-navbar .nav-actions .btn-ghost:hover {\n  background-color: #dcfce7;\n  color: #15803d;\n}\n@media (max-width: 768px) {\n  .floating-navbar {\n    margin: 1rem;\n    padding: 0.75rem 1rem;\n  }\n}\n@media (max-width: 1024px) {\n  .floating-navbar .desktop-only {\n    display: none;\n  }\n}\n@media (max-width: 420px) {\n  .floating-navbar {\n    margin: 0.75rem;\n  }\n  .floating-navbar .nav-actions .btn-primary {\n    padding: 0.5rem 0.75rem;\n    font-size: 0.85rem;\n  }\n}\n.hero.left-aligned {\n  flex: 1;\n  display: flex;\n  align-items: center;\n  padding: 0 4rem;\n  text-align: left;\n}\n.hero.left-aligned .hero-content {\n  max-width: 650px;\n  margin: 0;\n}\n.hero.left-aligned .hero-content h1 {\n  font-size: 4rem;\n  font-weight: 800;\n  color: white;\n  margin-bottom: 1.5rem;\n  line-height: 1.1;\n  letter-spacing: -0.02em;\n}\n.hero.left-aligned .hero-content p {\n  font-size: 1.25rem;\n  color: #e2e8f0;\n  line-height: 1.6;\n  margin-bottom: 2.5rem;\n  margin-left: 0;\n}\n.hero.left-aligned .hero-content .hero-actions {\n  display: flex;\n  gap: 1rem;\n  justify-content: flex-start;\n  margin-bottom: 2rem;\n}\n.hero.left-aligned .hero-content .hero-actions .btn-white {\n  background-color: white;\n  color: var(--sa-dark);\n  font-weight: 600;\n  border: none;\n}\n.hero.left-aligned .hero-content .hero-actions .btn-white:hover {\n  background-color: #f1f5f9;\n}\n.hero.left-aligned .hero-content .hero-trust {\n  display: flex;\n  align-items: center;\n  gap: 0.75rem;\n}\n.hero.left-aligned .hero-content .hero-trust .check-circle {\n  width: 24px;\n  height: 24px;\n  stroke: #10b981;\n}\n.hero.left-aligned .hero-content .hero-trust .hero-subtext {\n  font-size: 1rem;\n  color: #cbd5e1;\n  margin: 0;\n}\n.hero.left-aligned .hero-visual {\n  display: none;\n}\n@media (max-width: 768px) {\n  .hero.left-aligned {\n    padding: 2rem 1.5rem 4rem;\n  }\n  .hero.left-aligned .hero-content h1 {\n    font-size: 2.5rem;\n  }\n  .hero.left-aligned .hero-content p {\n    font-size: 1.1rem;\n  }\n  .hero.left-aligned .hero-content .hero-actions {\n    flex-direction: column;\n  }\n}\n@media (max-width: 420px) {\n  .hero.left-aligned {\n    padding-inline: 1rem;\n  }\n  .hero.left-aligned .hero-content h1 {\n    font-size: 2.1rem;\n  }\n  .hero.left-aligned .hero-content p {\n    font-size: 1rem;\n  }\n  .hero.left-aligned .hero-content .hero-trust {\n    align-items: flex-start;\n  }\n  .hero.left-aligned .hero-content .hero-trust .hero-subtext {\n    font-size: 0.9rem;\n  }\n}\n.grid-4 {\n  display: grid;\n  grid-template-columns: repeat(4, 1fr);\n  gap: 2rem;\n}\n@media (max-width: 992px) {\n  .grid-4 {\n    grid-template-columns: repeat(2, 1fr);\n  }\n}\n@media (max-width: 576px) {\n  .grid-4 {\n    grid-template-columns: 1fr;\n  }\n}\n.grid-3 {\n  display: grid;\n  grid-template-columns: repeat(3, 1fr);\n  gap: 2rem;\n}\n@media (max-width: 992px) {\n  .grid-3 {\n    grid-template-columns: repeat(2, 1fr);\n  }\n}\n@media (max-width: 768px) {\n  .grid-3 {\n    grid-template-columns: 1fr;\n  }\n}\n.card {\n  background: white;\n  padding: 2rem;\n  border-radius: 1rem;\n  border: 1px solid #e2e8f0;\n  text-align: left;\n  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);\n  transition: transform 0.2s, box-shadow 0.2s;\n}\n.card:hover {\n  transform: translateY(-5px);\n  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);\n}\n.card .icon-wrapper {\n  width: 48px;\n  height: 48px;\n  background: #fff3e0;\n  border-radius: 0.75rem;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  margin-bottom: 1.5rem;\n}\n.card .icon-wrapper .icon-svg {\n  width: 24px;\n  height: 24px;\n  stroke: var(--sa-primary);\n}\n.card h3 {\n  font-size: 1.25rem;\n  font-weight: 700;\n  margin-bottom: 0.75rem;\n  color: var(--sa-dark);\n}\n.card p {\n  color: #64748b;\n  line-height: 1.6;\n  font-size: 0.95rem;\n}\n.dashboard-preview-section {\n  background: #f8fafc;\n  padding: 6rem 2rem;\n  max-width: 100%;\n}\n.dashboard-mockup {\n  width: 100%;\n  max-width: 1400px;\n  margin: 0 auto;\n  background: white;\n  border-radius: 0.5rem;\n  border: 2px solid #334155;\n  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.15);\n  overflow: hidden;\n  text-align: left;\n}\n.dashboard-mockup .mockup-content {\n  display: flex;\n  min-height: 500px;\n}\n.dashboard-mockup .mockup-content .mock-sidebar {\n  width: 220px;\n  flex-shrink: 0;\n  background: #1e293b;\n  color: white;\n  padding: 1.5rem;\n}\n.dashboard-mockup .mockup-content .mock-sidebar .mock-logo {\n  display: flex;\n  align-items: center;\n  gap: 0.75rem;\n  font-weight: 700;\n  font-size: 1.1rem;\n  margin-bottom: 2rem;\n}\n.dashboard-mockup .mockup-content .mock-sidebar .mock-logo .mock-logo-icon {\n  width: 24px;\n  height: 24px;\n  background: var(--sa-primary);\n  border-radius: 6px;\n}\n.dashboard-mockup .mockup-content .mock-sidebar .mock-nav-item {\n  display: flex;\n  align-items: center;\n  gap: 0.75rem;\n  padding: 0.75rem;\n  border-radius: 0.5rem;\n  margin-bottom: 0.5rem;\n  font-size: 0.9rem;\n  color: #94a3b8;\n}\n.dashboard-mockup .mockup-content .mock-sidebar .mock-nav-item svg {\n  width: 18px;\n  height: 18px;\n}\n.dashboard-mockup .mockup-content .mock-sidebar .mock-nav-item.active {\n  background: var(--sa-primary);\n  color: white;\n}\n.dashboard-mockup .mockup-content .mock-sidebar .mock-nav-item.active svg {\n  stroke: white;\n}\n.dashboard-mockup .mockup-content .mock-main {\n  flex: 1;\n  background: white;\n  padding: 2rem;\n  min-width: 0;\n  border-left: 1px solid #e2e8f0;\n}\n.dashboard-mockup .mockup-content .mock-main .mock-header {\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n  margin-bottom: 2rem;\n}\n.dashboard-mockup .mockup-content .mock-main .mock-header .mock-title {\n  font-size: 1.25rem;\n  font-weight: 800;\n  color: #0f172a;\n}\n.dashboard-mockup .mockup-content .mock-main .mock-header .mock-user {\n  display: flex;\n  align-items: center;\n  gap: 1rem;\n}\n.dashboard-mockup .mockup-content .mock-main .mock-header .mock-user .academic-year {\n  font-size: 0.85rem;\n  color: #64748b;\n}\n.dashboard-mockup .mockup-content .mock-main .mock-header .mock-user .mock-avatar {\n  width: 32px;\n  height: 32px;\n  background: var(--sa-primary);\n  border-radius: 50%;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  font-weight: 700;\n  color: white;\n  font-size: 0.8rem;\n}\n.dashboard-mockup .mockup-content .mock-main .mock-stats-row {\n  display: flex;\n  gap: 1.5rem;\n  margin-bottom: 2rem;\n}\n.dashboard-mockup .mockup-content .mock-main .mock-stats-row .mock-stat-card {\n  flex: 1;\n  background: white;\n  padding: 1.5rem;\n  border-radius: 0.5rem;\n  border: 1px solid #f1f5f9;\n  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.02);\n}\n.dashboard-mockup .mockup-content .mock-main .mock-stats-row .mock-stat-card .stat-title {\n  font-size: 0.75rem;\n  color: #94a3b8;\n  margin-bottom: 0.5rem;\n  text-transform: uppercase;\n  letter-spacing: 0.05em;\n  font-weight: 600;\n}\n.dashboard-mockup .mockup-content .mock-main .mock-stats-row .mock-stat-card .stat-value {\n  font-size: 1.5rem;\n  font-weight: 800;\n  color: #0f172a;\n  margin-bottom: 0.25rem;\n}\n.dashboard-mockup .mockup-content .mock-main .mock-stats-row .mock-stat-card .stat-subtext {\n  font-size: 0.8rem;\n  color: #64748b;\n}\n.dashboard-mockup .mockup-content .mock-main .mock-grid {\n  display: grid;\n  grid-template-columns: 2fr 1fr;\n  gap: 1.5rem;\n}\n.dashboard-mockup .mockup-content .mock-main .mock-grid .mock-chart,\n.dashboard-mockup .mockup-content .mock-main .mock-grid .mock-activity {\n  background: white;\n  padding: 1.5rem;\n  border-radius: 0.5rem;\n  border: 1px solid #f1f5f9;\n  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.02);\n}\n.dashboard-mockup .mockup-content .mock-main .mock-grid .mock-chart .chart-header,\n.dashboard-mockup .mockup-content .mock-main .mock-grid .mock-chart .activity-header,\n.dashboard-mockup .mockup-content .mock-main .mock-grid .mock-activity .chart-header,\n.dashboard-mockup .mockup-content .mock-main .mock-grid .mock-activity .activity-header {\n  font-weight: 700;\n  font-size: 0.9rem;\n  margin-bottom: 1.5rem;\n  color: #0f172a;\n}\n.dashboard-mockup .mockup-content .mock-main .mock-grid .chart-body {\n  display: flex;\n  align-items: flex-end;\n  justify-content: space-between;\n  height: 180px;\n  padding-top: 1rem;\n  padding-bottom: 1rem;\n}\n.dashboard-mockup .mockup-content .mock-main .mock-grid .chart-body .bar-group {\n  display: flex;\n  flex-direction: column;\n  align-items: center;\n  gap: 0.5rem;\n  height: 100%;\n  justify-content: flex-end;\n}\n.dashboard-mockup .mockup-content .mock-main .mock-grid .chart-body .bar-group .bar {\n  width: 14px;\n  background: var(--sa-primary);\n  border-radius: 4px 4px 0 0;\n}\n.dashboard-mockup .mockup-content .mock-main .mock-grid .chart-body .bar-group span {\n  font-size: 0.7rem;\n  color: #94a3b8;\n  font-weight: 600;\n}\n.dashboard-mockup .mockup-content .mock-main .mock-grid .activity-list {\n  display: flex;\n  flex-direction: column;\n  gap: 1rem;\n}\n.dashboard-mockup .mockup-content .mock-main .mock-grid .activity-list .activity-item {\n  display: flex;\n  gap: 0.75rem;\n  align-items: flex-start;\n}\n.dashboard-mockup .mockup-content .mock-main .mock-grid .activity-list .activity-item .dot {\n  width: 6px;\n  height: 6px;\n  border-radius: 50%;\n  margin-top: 6px;\n  flex-shrink: 0;\n}\n.dashboard-mockup .mockup-content .mock-main .mock-grid .activity-list .activity-item .dot.orange {\n  background: var(--sa-primary);\n}\n.dashboard-mockup .mockup-content .mock-main .mock-grid .activity-list .activity-item .details {\n  display: flex;\n  flex-direction: column;\n}\n.dashboard-mockup .mockup-content .mock-main .mock-grid .activity-list .activity-item .details .text {\n  font-size: 0.85rem;\n  font-weight: 500;\n  color: #475569;\n}\n@media (max-width: 768px) {\n  .dashboard-mockup {\n    overflow-x: auto;\n    scrollbar-width: none;\n  }\n  .dashboard-mockup::-webkit-scrollbar {\n    display: none;\n  }\n  .dashboard-mockup .mockup-content {\n    min-width: 900px;\n  }\n}\n.feature-blocks {\n  padding: 6rem 2rem;\n  max-width: 1200px;\n  margin: 0 auto;\n}\n.feature-blocks .feature-block {\n  display: flex;\n  align-items: center;\n  gap: 4rem;\n  margin-bottom: 8rem;\n}\n.feature-blocks .feature-block:last-child {\n  margin-bottom: 0;\n}\n.feature-blocks .feature-block.reverse {\n  flex-direction: row-reverse;\n}\n.feature-blocks .feature-block .feature-text {\n  flex: 1;\n  text-align: left;\n}\n.feature-blocks .feature-block .feature-text .section-label {\n  display: inline-block;\n  color: var(--sa-primary);\n  font-weight: 700;\n  font-size: 0.875rem;\n  letter-spacing: 0.05em;\n  text-transform: uppercase;\n  margin-bottom: 1rem;\n}\n.feature-blocks .feature-block .feature-text h2 {\n  font-size: 2.25rem;\n  font-weight: 800;\n  margin-bottom: 1.5rem;\n  color: #1e293b;\n}\n.feature-blocks .feature-block .feature-text p {\n  font-size: 1.125rem;\n  color: #64748b;\n  line-height: 1.6;\n  margin-bottom: 2rem;\n}\n.feature-blocks .feature-block .feature-text .feature-list {\n  list-style: none;\n  padding: 0;\n  margin: 0;\n}\n.feature-blocks .feature-block .feature-text .feature-list li {\n  display: flex;\n  align-items: flex-start;\n  gap: 1rem;\n  margin-bottom: 1.25rem;\n  font-size: 1.05rem;\n  color: #334155;\n  line-height: 1.5;\n}\n.feature-blocks .feature-block .feature-text .feature-list li .check-icon {\n  width: 24px;\n  height: 24px;\n  stroke: #10b981;\n  flex-shrink: 0;\n  margin-top: 2px;\n}\n.feature-blocks .feature-block .feature-visual {\n  flex: 1;\n  display: flex;\n  justify-content: center;\n}\n.feature-blocks .feature-block .feature-visual .mockup-profile-card {\n  width: 100%;\n  max-width: 480px;\n  background: white;\n  border-radius: 1rem;\n  border: 1px solid #e2e8f0;\n  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.08);\n  padding: 2rem;\n}\n.feature-blocks .feature-block .feature-visual .mockup-profile-card .mockup-profile-header {\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n  margin-bottom: 2rem;\n}\n.feature-blocks .feature-block .feature-visual .mockup-profile-card .mockup-profile-header .title {\n  font-weight: 800;\n  color: #1e293b;\n  font-size: 1.1rem;\n}\n.feature-blocks .feature-block .feature-visual .mockup-profile-card .mockup-profile-header .active-badge {\n  background: #d1fae5;\n  color: #059669;\n  padding: 0.35rem 0.85rem;\n  border-radius: 9999px;\n  font-size: 0.75rem;\n  font-weight: 700;\n}\n.feature-blocks .feature-block .feature-visual .mockup-profile-card .mockup-profile-user {\n  display: flex;\n  align-items: center;\n  gap: 1.5rem;\n  margin-bottom: 2rem;\n  padding-bottom: 2rem;\n  border-bottom: 1px solid #f1f5f9;\n}\n.feature-blocks .feature-block .feature-visual .mockup-profile-card .mockup-profile-user .avatar {\n  width: 80px;\n  height: 80px;\n  border-radius: 50%;\n  overflow: hidden;\n  border: 3px solid white;\n  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);\n}\n.feature-blocks .feature-block .feature-visual .mockup-profile-card .mockup-profile-user .avatar img {\n  width: 100%;\n  height: 100%;\n  object-fit: cover;\n}\n.feature-blocks .feature-block .feature-visual .mockup-profile-card .mockup-profile-user .user-info {\n  display: flex;\n  flex-direction: column;\n  gap: 0.25rem;\n}\n.feature-blocks .feature-block .feature-visual .mockup-profile-card .mockup-profile-user .user-info strong {\n  color: #1e293b;\n  font-size: 1.1rem;\n}\n.feature-blocks .feature-block .feature-visual .mockup-profile-card .mockup-profile-user .user-info span {\n  color: #94a3b8;\n  font-size: 0.75rem;\n}\n.feature-blocks .feature-block .feature-visual .mockup-profile-card .mockup-profile-grid {\n  display: grid;\n  grid-template-columns: 1fr 1fr;\n  gap: 1.5rem;\n}\n.feature-blocks .feature-block .feature-visual .mockup-profile-card .mockup-profile-grid .grid-item {\n  display: flex;\n  flex-direction: column;\n  gap: 0.35rem;\n}\n.feature-blocks .feature-block .feature-visual .mockup-profile-card .mockup-profile-grid .grid-item .label {\n  font-size: 0.7rem;\n  color: #94a3b8;\n  text-transform: uppercase;\n  letter-spacing: 0.5px;\n}\n.feature-blocks .feature-block .feature-visual .mockup-profile-card .mockup-profile-grid .grid-item .value {\n  font-size: 0.85rem;\n  font-weight: 600;\n  color: #1e293b;\n}\n.feature-blocks .feature-block .feature-visual .mockup-profile-card .mockup-profile-grid .grid-item .text-green {\n  color: #10b981;\n}\n.feature-blocks .feature-block .feature-visual .mockup-profile-card .mockup-profile-grid .grid-item .text-orange {\n  color: var(--sa-primary);\n}\n.feature-blocks .feature-block .feature-visual .mockup-table-card {\n  width: 100%;\n  max-width: 580px;\n  background: white;\n  border-radius: 1rem;\n  border: 1px solid #e2e8f0;\n  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.08);\n  padding: 1.5rem;\n}\n.feature-blocks .feature-block .feature-visual .mockup-table-card .mockup-table-header {\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n  margin-bottom: 1.5rem;\n}\n.feature-blocks .feature-block .feature-visual .mockup-table-card .mockup-table-header .title {\n  font-weight: 800;\n  color: #1e293b;\n  font-size: 1rem;\n}\n.feature-blocks .feature-block .feature-visual .mockup-table-card .mockup-table-header .term-badge {\n  background: #ffedd5;\n  color: #ea580c;\n  padding: 0.35rem 0.85rem;\n  border-radius: 9999px;\n  font-size: 0.75rem;\n  font-weight: 700;\n}\n.feature-blocks .feature-block .feature-visual .mockup-table-card .mockup-table-body .table-row {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  padding: 0.8rem 1rem;\n  border-bottom: 1px solid #f1f5f9;\n}\n.feature-blocks .feature-block .feature-visual .mockup-table-card .mockup-table-body .table-row:last-child {\n  border-bottom: none;\n}\n.feature-blocks .feature-block .feature-visual .mockup-table-card .mockup-table-body .table-row.table-head {\n  background: #f8fafc;\n  color: #64748b;\n  font-size: 0.75rem;\n  font-weight: 600;\n  border-bottom: 1px solid #e2e8f0;\n  border-radius: 0.25rem;\n}\n.feature-blocks .feature-block .feature-visual .mockup-table-card .mockup-table-body .table-row .col-name {\n  flex: 2;\n  font-size: 0.85rem;\n  color: #475569;\n}\n.feature-blocks .feature-block .feature-visual .mockup-table-card .mockup-table-body .table-row .col-num {\n  flex: 1;\n  text-align: right;\n  font-size: 0.85rem;\n  color: #64748b;\n}\n.feature-blocks .feature-block .feature-visual .mockup-table-card .mockup-table-body .table-row .col-num.font-bold {\n  font-weight: 800;\n  color: #1e293b;\n}\n.feature-blocks .feature-block .feature-visual .mockup-table-card .mockup-table-body .table-row .col-grade {\n  flex: 0.8;\n  text-align: right;\n  font-size: 0.85rem;\n  font-weight: 800;\n  color: #475569;\n}\n.feature-blocks .feature-block .feature-visual .mockup-table-card .mockup-table-body .table-row .col-grade.text-green {\n  color: #10b981;\n}\n.feature-blocks .feature-block .feature-visual .mockup-table-card .mockup-table-body .table-row .col-grade.text-red {\n  color: #ef4444;\n}\n@media (max-width: 992px) {\n  .feature-blocks .feature-block {\n    flex-direction: column !important;\n    gap: 3rem;\n  }\n  .feature-blocks .feature-block .feature-visual {\n    width: 100%;\n  }\n}\n.security-roles {\n  background: var(--sa-gray-light);\n  max-width: 100%;\n}\n.security-roles .container {\n  max-width: 1200px;\n  margin: 0 auto;\n}\n.security-roles .security-grid {\n  margin-top: 4rem;\n}\n.security-roles .security-grid .security-card {\n  text-align: left;\n  padding: 2.5rem;\n  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.03);\n  border: 1px solid rgba(0, 0, 0, 0.05);\n}\n.security-roles .security-grid .security-card .icon-wrapper {\n  width: 48px;\n  height: 48px;\n  background: #fff3e0;\n  border-radius: 0.75rem;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  margin-bottom: 1.5rem;\n}\n.security-roles .security-grid .security-card .icon-wrapper svg {\n  width: 24px;\n  height: 24px;\n  stroke: var(--sa-primary);\n}\n.security-roles .security-grid .security-card h3 {\n  font-size: 1.25rem;\n  font-weight: 800;\n  margin-bottom: 1rem;\n  color: var(--sa-dark-lighter);\n}\n.security-roles .security-grid .security-card p {\n  font-size: 0.95rem;\n  color: #64748b;\n  line-height: 1.7;\n}\n.footer.dark-footer {\n  background-color: var(--sa-dark);\n  color: white;\n  padding: 6rem 2rem 4rem 2rem;\n}\n.footer.dark-footer .footer-cta {\n  max-width: 800px;\n  margin: 0 auto 6rem auto;\n}\n.footer.dark-footer .footer-cta h2 {\n  font-size: 2.5rem;\n  font-weight: 800;\n  color: white;\n  margin-bottom: 1.5rem;\n}\n.footer.dark-footer .footer-cta p {\n  color: #94a3b8;\n  font-size: 1.125rem;\n  line-height: 1.6;\n  margin-bottom: 2.5rem;\n  max-width: 600px;\n  margin-left: auto;\n  margin-right: auto;\n}\n.footer.dark-footer .footer-cta .cta-actions {\n  display: flex;\n  gap: 1rem;\n  justify-content: center;\n}\n.footer.dark-footer .footer-cta .cta-actions .btn-outline-light {\n  background-color: transparent;\n  border: 2px solid #334155;\n  color: white;\n}\n.footer.dark-footer .footer-cta .cta-actions .btn-outline-light:hover {\n  border-color: #cbd5e1;\n}\n.footer.dark-footer .footer-main {\n  max-width: 1200px;\n  margin: 0 auto;\n  display: flex;\n  justify-content: space-between;\n  gap: 4rem;\n  padding-top: 4rem;\n  border-top: 1px solid #1e293b;\n  text-align: left;\n}\n.footer.dark-footer .footer-main .footer-brand {\n  flex: 1;\n  max-width: 300px;\n}\n.footer.dark-footer .footer-main .footer-brand .footer-logo {\n  display: flex;\n  align-items: center;\n  gap: 0.75rem;\n  margin-bottom: 1.5rem;\n}\n.footer.dark-footer .footer-main .footer-brand .brand-desc {\n  color: #94a3b8;\n  font-size: 0.875rem;\n  line-height: 1.6;\n}\n.footer.dark-footer .footer-main .footer-columns {\n  display: flex;\n  gap: 6rem;\n}\n.footer.dark-footer .footer-main .footer-columns .footer-col {\n  display: flex;\n  flex-direction: column;\n  gap: 1rem;\n}\n.footer.dark-footer .footer-main .footer-columns .footer-col h4 {\n  color: white;\n  font-size: 0.875rem;\n  font-weight: 700;\n  margin-bottom: 0.5rem;\n  letter-spacing: 0.05em;\n}\n.footer.dark-footer .footer-main .footer-columns .footer-col a {\n  color: #94a3b8;\n  text-decoration: none;\n  font-size: 0.875rem;\n  transition: color 0.2s;\n}\n.footer.dark-footer .footer-main .footer-columns .footer-col a:hover {\n  color: var(--sa-primary);\n}\n@media (max-width: 992px) {\n  .footer.dark-footer .footer-main {\n    flex-direction: column;\n    gap: 3rem;\n  }\n  .footer.dark-footer .footer-columns {\n    gap: 3rem;\n    flex-wrap: wrap;\n  }\n}\n@media (max-width: 576px) {\n  .footer.dark-footer .footer-cta .cta-actions {\n    flex-direction: column;\n  }\n  .footer.dark-footer .footer-columns {\n    flex-direction: column;\n    gap: 2rem;\n  }\n}\n/*# sourceMappingURL=landing.page.css.map */\n'] }]
  }], null, null);
})();
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && \u0275setClassDebugInfo(LandingPage, { className: "LandingPage", filePath: "src/app/features/landing/landing.page.ts", lineNumber: 13 });
})();
export {
  LandingPage
};
//# sourceMappingURL=chunk-UWIHHQJW.js.map
