import {
  CommonModule,
  Component,
  NgForOf,
  setClassMetadata,
  ɵsetClassDebugInfo,
  ɵɵadvance,
  ɵɵclassMapInterpolate1,
  ɵɵdefineComponent,
  ɵɵelement,
  ɵɵelementEnd,
  ɵɵelementStart,
  ɵɵproperty,
  ɵɵstyleProp,
  ɵɵtemplate,
  ɵɵtext,
  ɵɵtextInterpolate,
  ɵɵtextInterpolate1
} from "./chunk-3IPAKGA7.js";
import "./chunk-QHQP2P2Z.js";

// src/app/features/dashboard/pages/overview/overview.page.ts
function OverviewPage_div_8_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 26)(1, "div", 27)(2, "span", 28);
    \u0275\u0275text(3);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(4, "span", 29);
    \u0275\u0275text(5);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(6, "div", 30)(7, "h3");
    \u0275\u0275text(8);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(9, "p");
    \u0275\u0275text(10);
    \u0275\u0275elementEnd()()();
  }
  if (rf & 2) {
    const stat_r1 = ctx.$implicit;
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate(stat_r1.icon);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(stat_r1.trend);
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate(stat_r1.value);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(stat_r1.title);
  }
}
function OverviewPage_div_10_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 31)(1, "div", 32)(2, "p");
    \u0275\u0275text(3);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(4, "h2");
    \u0275\u0275text(5);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(6, "span", 33);
    \u0275\u0275text(7);
    \u0275\u0275elementEnd()()();
  }
  if (rf & 2) {
    const fin_r2 = ctx.$implicit;
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate(fin_r2.title);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(fin_r2.value);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(fin_r2.trend);
  }
}
function OverviewPage_div_26_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 34)(1, "div", 35)(2, "span");
    \u0275\u0275text(3);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(4, "span");
    \u0275\u0275text(5);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(6, "div", 36);
    \u0275\u0275element(7, "div");
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const item_r3 = ctx.$implicit;
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate(item_r3.label);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate1("", item_r3.percentage, "%");
    \u0275\u0275advance(2);
    \u0275\u0275classMapInterpolate1("progress-bar bg-", item_r3.color, "");
    \u0275\u0275styleProp("width", item_r3.percentage, "%");
  }
}
function OverviewPage_li_32_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "li", 37);
    \u0275\u0275element(1, "div");
    \u0275\u0275elementStart(2, "div", 38)(3, "p", 39);
    \u0275\u0275text(4);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(5, "span", 40);
    \u0275\u0275text(6);
    \u0275\u0275elementEnd()()();
  }
  if (rf & 2) {
    const act_r4 = ctx.$implicit;
    \u0275\u0275advance();
    \u0275\u0275classMapInterpolate1("timeline-dot dot-", act_r4.type, "");
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate(act_r4.text);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(act_r4.time);
  }
}
function OverviewPage_div_37_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 41)(1, "div", 42)(2, "span", 43);
    \u0275\u0275text(3);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(4, "span", 44);
    \u0275\u0275text(5);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(6, "div", 45)(7, "h4");
    \u0275\u0275text(8);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(9, "p");
    \u0275\u0275text(10);
    \u0275\u0275elementEnd()()();
  }
  if (rf & 2) {
    const event_r5 = ctx.$implicit;
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate(event_r5.month);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(event_r5.day);
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate(event_r5.title);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(event_r5.desc);
  }
}
var OverviewPage = class _OverviewPage {
  constructor() {
    this.statCards = [
      { title: "Total Students", value: "1,247", trend: "+4.2%", icon: "\u{1F393}" },
      { title: "Teachers & Staff", value: "86", trend: "+1.5%", icon: "\u{1F465}" },
      { title: "Attendance Today", value: "94.2%", trend: "+0.8%", icon: "\u{1F4C5}" },
      { title: "New Admissions", value: "23", trend: "+12%", icon: "\u{1F4DD}" }
    ];
    this.financeCards = [
      { title: "Fees Collected", value: "TZS 84,520,000", trend: "On Track" },
      { title: "Outstanding Fees", value: "TZS 18,340,000", trend: "Action Needed" }
    ];
    this.attendanceOverview = [
      { label: "Present", percentage: 94.2, color: "success" },
      { label: "Late", percentage: 2.1, color: "warning" },
      { label: "Absent", percentage: 3.2, color: "danger" },
      { label: "Excused", percentage: 0.5, color: "info" }
    ];
    this.recentActivity = [
      { text: "Mid-term results published for Form 4", time: "2 hours ago", type: "success" },
      { text: "New syllabus uploaded for Physics", time: "4 hours ago", type: "info" },
      { text: "Parent meeting scheduled", time: "1 day ago", type: "warning" }
    ];
    this.upcomingEvents = [
      { month: "OCT", day: "30", title: "Science Fair", desc: "Annual science fair for all forms" },
      { month: "NOV", day: "05", title: "Teacher Training", desc: "Pedagogy workshop" }
    ];
  }
  static {
    this.\u0275fac = function OverviewPage_Factory(__ngFactoryType__) {
      return new (__ngFactoryType__ || _OverviewPage)();
    };
  }
  static {
    this.\u0275cmp = /* @__PURE__ */ \u0275\u0275defineComponent({ type: _OverviewPage, selectors: [["app-overview"]], decls: 38, vars: 5, consts: [[1, "overview-container"], [1, "page-header"], [1, "dashboard-grid"], [1, "grid-row", "stats-row"], ["class", "card stat-card", 4, "ngFor", "ngForOf"], [1, "grid-row", "finance-row"], ["class", "card finance-card", 4, "ngFor", "ngForOf"], [1, "grid-row", "middle-row"], [1, "card", "chart-card"], [1, "mock-chart"], [1, "bar", 2, "height", "40%"], [1, "bar", 2, "height", "60%"], [1, "bar", 2, "height", "80%"], [1, "bar", 2, "height", "50%"], [1, "bar", 2, "height", "70%"], [1, "bar", 2, "height", "90%"], [1, "card", "attendance-card"], [1, "attendance-list"], ["class", "attendance-item", 4, "ngFor", "ngForOf"], [1, "grid-row", "bottom-row"], [1, "card", "activity-card"], [1, "timeline"], ["class", "timeline-item", 4, "ngFor", "ngForOf"], [1, "card", "events-card"], [1, "event-list"], ["class", "event-item", 4, "ngFor", "ngForOf"], [1, "card", "stat-card"], [1, "stat-header"], [1, "stat-icon"], [1, "stat-trend", "trend-positive"], [1, "stat-body"], [1, "card", "finance-card"], [1, "finance-body"], [1, "finance-trend"], [1, "attendance-item"], [1, "attendance-label"], [1, "progress-bar-container"], [1, "timeline-item"], [1, "timeline-content"], [1, "activity-text"], [1, "activity-time"], [1, "event-item"], [1, "event-date"], [1, "event-month"], [1, "event-day"], [1, "event-details"]], template: function OverviewPage_Template(rf, ctx) {
      if (rf & 1) {
        \u0275\u0275elementStart(0, "div", 0)(1, "header", 1)(2, "h1");
        \u0275\u0275text(3, "Good morning, Administrator");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(4, "p");
        \u0275\u0275text(5, "Here's what is happening at Sync Academy today.");
        \u0275\u0275elementEnd()();
        \u0275\u0275elementStart(6, "div", 2)(7, "div", 3);
        \u0275\u0275template(8, OverviewPage_div_8_Template, 11, 4, "div", 4);
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(9, "div", 5);
        \u0275\u0275template(10, OverviewPage_div_10_Template, 8, 3, "div", 6);
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(11, "div", 7)(12, "div", 8)(13, "h3");
        \u0275\u0275text(14, "Student Enrollment Trend");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(15, "div", 9);
        \u0275\u0275element(16, "div", 10)(17, "div", 11)(18, "div", 12)(19, "div", 13)(20, "div", 14)(21, "div", 15);
        \u0275\u0275elementEnd()();
        \u0275\u0275elementStart(22, "div", 16)(23, "h3");
        \u0275\u0275text(24, "Attendance Overview");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(25, "div", 17);
        \u0275\u0275template(26, OverviewPage_div_26_Template, 8, 7, "div", 18);
        \u0275\u0275elementEnd()()();
        \u0275\u0275elementStart(27, "div", 19)(28, "div", 20)(29, "h3");
        \u0275\u0275text(30, "Recent Academic Activity");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(31, "ul", 21);
        \u0275\u0275template(32, OverviewPage_li_32_Template, 7, 5, "li", 22);
        \u0275\u0275elementEnd()();
        \u0275\u0275elementStart(33, "div", 23)(34, "h3");
        \u0275\u0275text(35, "Upcoming Events");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(36, "div", 24);
        \u0275\u0275template(37, OverviewPage_div_37_Template, 11, 4, "div", 25);
        \u0275\u0275elementEnd()()()()();
      }
      if (rf & 2) {
        \u0275\u0275advance(8);
        \u0275\u0275property("ngForOf", ctx.statCards);
        \u0275\u0275advance(2);
        \u0275\u0275property("ngForOf", ctx.financeCards);
        \u0275\u0275advance(16);
        \u0275\u0275property("ngForOf", ctx.attendanceOverview);
        \u0275\u0275advance(6);
        \u0275\u0275property("ngForOf", ctx.recentActivity);
        \u0275\u0275advance(5);
        \u0275\u0275property("ngForOf", ctx.upcomingEvents);
      }
    }, dependencies: [CommonModule, NgForOf], styles: ['\n\n.overview-container[_ngcontent-%COMP%] {\n  padding: 24px;\n  background-color: #f8fafc;\n  font-family:\n    -apple-system,\n    BlinkMacSystemFont,\n    "Segoe UI",\n    Roboto,\n    Helvetica,\n    Arial,\n    sans-serif;\n}\n.page-header[_ngcontent-%COMP%] {\n  margin-bottom: 24px;\n}\n.page-header[_ngcontent-%COMP%]   h1[_ngcontent-%COMP%] {\n  margin: 0 0 8px 0;\n  font-size: 24px;\n  font-weight: 600;\n  color: #1e293b;\n}\n.page-header[_ngcontent-%COMP%]   p[_ngcontent-%COMP%] {\n  margin: 0;\n  color: #64748b;\n  font-size: 14px;\n}\n.dashboard-grid[_ngcontent-%COMP%] {\n  display: flex;\n  flex-direction: column;\n  gap: 24px;\n}\n.grid-row[_ngcontent-%COMP%] {\n  display: grid;\n  gap: 24px;\n}\n.stats-row[_ngcontent-%COMP%] {\n  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));\n}\n.finance-row[_ngcontent-%COMP%] {\n  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));\n}\n.middle-row[_ngcontent-%COMP%], \n.bottom-row[_ngcontent-%COMP%] {\n  grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));\n}\n.card[_ngcontent-%COMP%] {\n  background: white;\n  border-radius: 12px;\n  padding: 20px;\n  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);\n}\n.card[_ngcontent-%COMP%]   h3[_ngcontent-%COMP%] {\n  margin: 0 0 16px 0;\n  font-size: 16px;\n  color: #334155;\n}\n.stat-card[_ngcontent-%COMP%] {\n  display: flex;\n  flex-direction: column;\n  gap: 12px;\n}\n.stat-header[_ngcontent-%COMP%] {\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n}\n.stat-icon[_ngcontent-%COMP%] {\n  font-size: 24px;\n}\n.stat-trend[_ngcontent-%COMP%] {\n  font-size: 12px;\n  font-weight: 600;\n  padding: 4px 8px;\n  border-radius: 12px;\n  background: #dcfce7;\n  color: #166534;\n}\n.stat-body[_ngcontent-%COMP%]   h3[_ngcontent-%COMP%] {\n  margin: 0 0 4px 0;\n  font-size: 28px;\n  color: #0f172a;\n}\n.stat-body[_ngcontent-%COMP%]   p[_ngcontent-%COMP%] {\n  margin: 0;\n  font-size: 14px;\n  color: #64748b;\n}\n.finance-body[_ngcontent-%COMP%]   p[_ngcontent-%COMP%] {\n  margin: 0 0 8px 0;\n  color: #64748b;\n  font-size: 14px;\n}\n.finance-body[_ngcontent-%COMP%]   h2[_ngcontent-%COMP%] {\n  margin: 0 0 8px 0;\n  font-size: 24px;\n  color: #0f172a;\n}\n.finance-body[_ngcontent-%COMP%]   .finance-trend[_ngcontent-%COMP%] {\n  font-size: 12px;\n  color: #3b82f6;\n  font-weight: 500;\n}\n.mock-chart[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: flex-end;\n  justify-content: space-between;\n  height: 150px;\n  gap: 10px;\n  padding-top: 20px;\n  border-bottom: 1px solid #e2e8f0;\n}\n.mock-chart[_ngcontent-%COMP%]   .bar[_ngcontent-%COMP%] {\n  flex: 1;\n  background: #3b82f6;\n  border-radius: 4px 4px 0 0;\n  transition: height 0.3s;\n}\n.attendance-list[_ngcontent-%COMP%] {\n  display: flex;\n  flex-direction: column;\n  gap: 16px;\n}\n.attendance-item[_ngcontent-%COMP%] {\n  display: flex;\n  flex-direction: column;\n  gap: 8px;\n}\n.attendance-label[_ngcontent-%COMP%] {\n  display: flex;\n  justify-content: space-between;\n  font-size: 14px;\n  color: #475569;\n}\n.progress-bar-container[_ngcontent-%COMP%] {\n  height: 8px;\n  background: #f1f5f9;\n  border-radius: 4px;\n  overflow: hidden;\n}\n.progress-bar[_ngcontent-%COMP%] {\n  height: 100%;\n  border-radius: 4px;\n}\n.bg-success[_ngcontent-%COMP%] {\n  background: #22c55e;\n}\n.bg-warning[_ngcontent-%COMP%] {\n  background: #f59e0b;\n}\n.bg-danger[_ngcontent-%COMP%] {\n  background: #ef4444;\n}\n.bg-info[_ngcontent-%COMP%] {\n  background: #3b82f6;\n}\n.timeline[_ngcontent-%COMP%] {\n  list-style: none;\n  padding: 0;\n  margin: 0;\n}\n.timeline-item[_ngcontent-%COMP%] {\n  display: flex;\n  gap: 12px;\n  padding-bottom: 16px;\n  position: relative;\n}\n.timeline-item[_ngcontent-%COMP%]:not(:last-child)::before {\n  content: "";\n  position: absolute;\n  left: 5px;\n  top: 12px;\n  bottom: 0;\n  width: 2px;\n  background: #e2e8f0;\n}\n.timeline-dot[_ngcontent-%COMP%] {\n  width: 12px;\n  height: 12px;\n  border-radius: 50%;\n  margin-top: 4px;\n  z-index: 1;\n}\n.dot-success[_ngcontent-%COMP%] {\n  background: #22c55e;\n}\n.dot-info[_ngcontent-%COMP%] {\n  background: #3b82f6;\n}\n.dot-warning[_ngcontent-%COMP%] {\n  background: #f59e0b;\n}\n.timeline-content[_ngcontent-%COMP%]   .activity-text[_ngcontent-%COMP%] {\n  margin: 0 0 4px 0;\n  font-size: 14px;\n  color: #334155;\n}\n.timeline-content[_ngcontent-%COMP%]   .activity-time[_ngcontent-%COMP%] {\n  font-size: 12px;\n  color: #94a3b8;\n}\n.event-list[_ngcontent-%COMP%] {\n  display: flex;\n  flex-direction: column;\n  gap: 16px;\n}\n.event-item[_ngcontent-%COMP%] {\n  display: flex;\n  gap: 16px;\n  align-items: center;\n  padding: 12px;\n  background: #f8fafc;\n  border-radius: 8px;\n}\n.event-date[_ngcontent-%COMP%] {\n  display: flex;\n  flex-direction: column;\n  align-items: center;\n  justify-content: center;\n  min-width: 60px;\n  height: 60px;\n  background: white;\n  border-radius: 8px;\n  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);\n}\n.event-date[_ngcontent-%COMP%]   .event-month[_ngcontent-%COMP%] {\n  font-size: 12px;\n  font-weight: 600;\n  color: #ef4444;\n}\n.event-date[_ngcontent-%COMP%]   .event-day[_ngcontent-%COMP%] {\n  font-size: 20px;\n  font-weight: 700;\n  color: #0f172a;\n}\n.event-details[_ngcontent-%COMP%]   h4[_ngcontent-%COMP%] {\n  margin: 0 0 4px 0;\n  font-size: 14px;\n  color: #1e293b;\n}\n.event-details[_ngcontent-%COMP%]   p[_ngcontent-%COMP%] {\n  margin: 0;\n  font-size: 13px;\n  color: #64748b;\n}\n/*# sourceMappingURL=overview.page.css.map */'] });
  }
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(OverviewPage, [{
    type: Component,
    args: [{ selector: "app-overview", standalone: true, imports: [CommonModule], template: `<div class="overview-container">
  <header class="page-header">
    <h1>Good morning, Administrator</h1>
    <p>Here's what is happening at Sync Academy today.</p>
  </header>

  <div class="dashboard-grid">
    <!-- Stat Cards Top Row -->
    <div class="grid-row stats-row">
      <div class="card stat-card" *ngFor="let stat of statCards">
        <div class="stat-header">
          <span class="stat-icon">{{ stat.icon }}</span>
          <span class="stat-trend trend-positive">{{ stat.trend }}</span>
        </div>
        <div class="stat-body">
          <h3>{{ stat.value }}</h3>
          <p>{{ stat.title }}</p>
        </div>
      </div>
    </div>

    <!-- Finance Cards Second Row -->
    <div class="grid-row finance-row">
      <div class="card finance-card" *ngFor="let fin of financeCards">
        <div class="finance-body">
          <p>{{ fin.title }}</p>
          <h2>{{ fin.value }}</h2>
          <span class="finance-trend">{{ fin.trend }}</span>
        </div>
      </div>
    </div>

    <!-- Middle Row -->
    <div class="grid-row middle-row">
      <div class="card chart-card">
        <h3>Student Enrollment Trend</h3>
        <div class="mock-chart">
          <!-- Mock bar chart -->
          <div class="bar" style="height: 40%"></div>
          <div class="bar" style="height: 60%"></div>
          <div class="bar" style="height: 80%"></div>
          <div class="bar" style="height: 50%"></div>
          <div class="bar" style="height: 70%"></div>
          <div class="bar" style="height: 90%"></div>
        </div>
      </div>
      
      <div class="card attendance-card">
        <h3>Attendance Overview</h3>
        <div class="attendance-list">
          <div class="attendance-item" *ngFor="let item of attendanceOverview">
            <div class="attendance-label">
              <span>{{ item.label }}</span>
              <span>{{ item.percentage }}%</span>
            </div>
            <div class="progress-bar-container">
              <div class="progress-bar bg-{{ item.color }}" [style.width.%]="item.percentage"></div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Bottom Row -->
    <div class="grid-row bottom-row">
      <div class="card activity-card">
        <h3>Recent Academic Activity</h3>
        <ul class="timeline">
          <li class="timeline-item" *ngFor="let act of recentActivity">
            <div class="timeline-dot dot-{{ act.type }}"></div>
            <div class="timeline-content">
              <p class="activity-text">{{ act.text }}</p>
              <span class="activity-time">{{ act.time }}</span>
            </div>
          </li>
        </ul>
      </div>

      <div class="card events-card">
        <h3>Upcoming Events</h3>
        <div class="event-list">
          <div class="event-item" *ngFor="let event of upcomingEvents">
            <div class="event-date">
              <span class="event-month">{{ event.month }}</span>
              <span class="event-day">{{ event.day }}</span>
            </div>
            <div class="event-details">
              <h4>{{ event.title }}</h4>
              <p>{{ event.desc }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
`, styles: ['/* src/app/features/dashboard/pages/overview/overview.page.scss */\n.overview-container {\n  padding: 24px;\n  background-color: #f8fafc;\n  font-family:\n    -apple-system,\n    BlinkMacSystemFont,\n    "Segoe UI",\n    Roboto,\n    Helvetica,\n    Arial,\n    sans-serif;\n}\n.page-header {\n  margin-bottom: 24px;\n}\n.page-header h1 {\n  margin: 0 0 8px 0;\n  font-size: 24px;\n  font-weight: 600;\n  color: #1e293b;\n}\n.page-header p {\n  margin: 0;\n  color: #64748b;\n  font-size: 14px;\n}\n.dashboard-grid {\n  display: flex;\n  flex-direction: column;\n  gap: 24px;\n}\n.grid-row {\n  display: grid;\n  gap: 24px;\n}\n.stats-row {\n  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));\n}\n.finance-row {\n  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));\n}\n.middle-row,\n.bottom-row {\n  grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));\n}\n.card {\n  background: white;\n  border-radius: 12px;\n  padding: 20px;\n  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);\n}\n.card h3 {\n  margin: 0 0 16px 0;\n  font-size: 16px;\n  color: #334155;\n}\n.stat-card {\n  display: flex;\n  flex-direction: column;\n  gap: 12px;\n}\n.stat-header {\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n}\n.stat-icon {\n  font-size: 24px;\n}\n.stat-trend {\n  font-size: 12px;\n  font-weight: 600;\n  padding: 4px 8px;\n  border-radius: 12px;\n  background: #dcfce7;\n  color: #166534;\n}\n.stat-body h3 {\n  margin: 0 0 4px 0;\n  font-size: 28px;\n  color: #0f172a;\n}\n.stat-body p {\n  margin: 0;\n  font-size: 14px;\n  color: #64748b;\n}\n.finance-body p {\n  margin: 0 0 8px 0;\n  color: #64748b;\n  font-size: 14px;\n}\n.finance-body h2 {\n  margin: 0 0 8px 0;\n  font-size: 24px;\n  color: #0f172a;\n}\n.finance-body .finance-trend {\n  font-size: 12px;\n  color: #3b82f6;\n  font-weight: 500;\n}\n.mock-chart {\n  display: flex;\n  align-items: flex-end;\n  justify-content: space-between;\n  height: 150px;\n  gap: 10px;\n  padding-top: 20px;\n  border-bottom: 1px solid #e2e8f0;\n}\n.mock-chart .bar {\n  flex: 1;\n  background: #3b82f6;\n  border-radius: 4px 4px 0 0;\n  transition: height 0.3s;\n}\n.attendance-list {\n  display: flex;\n  flex-direction: column;\n  gap: 16px;\n}\n.attendance-item {\n  display: flex;\n  flex-direction: column;\n  gap: 8px;\n}\n.attendance-label {\n  display: flex;\n  justify-content: space-between;\n  font-size: 14px;\n  color: #475569;\n}\n.progress-bar-container {\n  height: 8px;\n  background: #f1f5f9;\n  border-radius: 4px;\n  overflow: hidden;\n}\n.progress-bar {\n  height: 100%;\n  border-radius: 4px;\n}\n.bg-success {\n  background: #22c55e;\n}\n.bg-warning {\n  background: #f59e0b;\n}\n.bg-danger {\n  background: #ef4444;\n}\n.bg-info {\n  background: #3b82f6;\n}\n.timeline {\n  list-style: none;\n  padding: 0;\n  margin: 0;\n}\n.timeline-item {\n  display: flex;\n  gap: 12px;\n  padding-bottom: 16px;\n  position: relative;\n}\n.timeline-item:not(:last-child)::before {\n  content: "";\n  position: absolute;\n  left: 5px;\n  top: 12px;\n  bottom: 0;\n  width: 2px;\n  background: #e2e8f0;\n}\n.timeline-dot {\n  width: 12px;\n  height: 12px;\n  border-radius: 50%;\n  margin-top: 4px;\n  z-index: 1;\n}\n.dot-success {\n  background: #22c55e;\n}\n.dot-info {\n  background: #3b82f6;\n}\n.dot-warning {\n  background: #f59e0b;\n}\n.timeline-content .activity-text {\n  margin: 0 0 4px 0;\n  font-size: 14px;\n  color: #334155;\n}\n.timeline-content .activity-time {\n  font-size: 12px;\n  color: #94a3b8;\n}\n.event-list {\n  display: flex;\n  flex-direction: column;\n  gap: 16px;\n}\n.event-item {\n  display: flex;\n  gap: 16px;\n  align-items: center;\n  padding: 12px;\n  background: #f8fafc;\n  border-radius: 8px;\n}\n.event-date {\n  display: flex;\n  flex-direction: column;\n  align-items: center;\n  justify-content: center;\n  min-width: 60px;\n  height: 60px;\n  background: white;\n  border-radius: 8px;\n  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);\n}\n.event-date .event-month {\n  font-size: 12px;\n  font-weight: 600;\n  color: #ef4444;\n}\n.event-date .event-day {\n  font-size: 20px;\n  font-weight: 700;\n  color: #0f172a;\n}\n.event-details h4 {\n  margin: 0 0 4px 0;\n  font-size: 14px;\n  color: #1e293b;\n}\n.event-details p {\n  margin: 0;\n  font-size: 13px;\n  color: #64748b;\n}\n/*# sourceMappingURL=overview.page.css.map */\n'] }]
  }], null, null);
})();
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && \u0275setClassDebugInfo(OverviewPage, { className: "OverviewPage", filePath: "src/app/features/dashboard/pages/overview/overview.page.ts", lineNumber: 11 });
})();
export {
  OverviewPage
};
//# sourceMappingURL=chunk-MMYTOY3V.js.map
