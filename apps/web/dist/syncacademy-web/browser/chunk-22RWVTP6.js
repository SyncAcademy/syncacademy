import {
  FormsModule,
  NgControlStatus,
  NgModel,
  NgSelectOption,
  SelectControlValueAccessor,
  ɵNgSelectMultipleOption
} from "./chunk-JZPTM7M7.js";
import {
  ChangeDetectionStrategy,
  CommonModule,
  Component,
  NgClass,
  NgForOf,
  setClassMetadata,
  ɵsetClassDebugInfo,
  ɵɵadvance,
  ɵɵdefineComponent,
  ɵɵelement,
  ɵɵelementEnd,
  ɵɵelementStart,
  ɵɵproperty,
  ɵɵstyleProp,
  ɵɵtemplate,
  ɵɵtext,
  ɵɵtextInterpolate,
  ɵɵtwoWayBindingSet,
  ɵɵtwoWayListener,
  ɵɵtwoWayProperty
} from "./chunk-3IPAKGA7.js";
import "./chunk-QHQP2P2Z.js";

// src/app/features/dashboard/pages/reports/reports.page.ts
function ReportsPage_div_37_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 37);
    \u0275\u0275element(1, "div", 38);
    \u0275\u0275elementStart(2, "span", 39);
    \u0275\u0275text(3);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const item_r1 = ctx.$implicit;
    \u0275\u0275advance();
    \u0275\u0275styleProp("height", item_r1.height);
    \u0275\u0275property("title", item_r1.value);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(item_r1.year);
  }
}
function ReportsPage_div_43_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 37);
    \u0275\u0275element(1, "div", 40);
    \u0275\u0275elementStart(2, "span", 39);
    \u0275\u0275text(3);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const item_r2 = ctx.$implicit;
    \u0275\u0275advance();
    \u0275\u0275styleProp("height", item_r2.height);
    \u0275\u0275property("title", item_r2.value + "%");
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(item_r2.grade);
  }
}
function ReportsPage_div_67_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 37)(1, "div", 41);
    \u0275\u0275element(2, "div", 42)(3, "div", 43);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(4, "span", 39);
    \u0275\u0275text(5);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const item_r3 = ctx.$implicit;
    \u0275\u0275advance(2);
    \u0275\u0275styleProp("height", item_r3.collection);
    \u0275\u0275property("title", "Collection: " + item_r3.collection);
    \u0275\u0275advance();
    \u0275\u0275styleProp("height", item_r3.target);
    \u0275\u0275property("title", "Target: " + item_r3.target);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(item_r3.label);
  }
}
function ReportsPage_tr_91_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "tr")(1, "td");
    \u0275\u0275text(2);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "td");
    \u0275\u0275text(4);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(5, "td");
    \u0275\u0275text(6);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(7, "td", 44);
    \u0275\u0275text(8);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const row_r4 = ctx.$implicit;
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(row_r4.metric);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(row_r4.status);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(row_r4.target);
    \u0275\u0275advance();
    \u0275\u0275property("ngClass", row_r4.performanceClass);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate(row_r4.performance);
  }
}
var ReportsPage = class _ReportsPage {
  constructor() {
    this.selectedYear = "2025/2026";
    this.selectedTerm = "All Terms";
    this.selectedClass = "Secondary Campus";
    this.summaryIndicators = [
      { metric: "Total Student Enrollment", status: "1,245 Students", target: "1,200", performance: "Exceeded", performanceClass: "perf-exceeded" },
      { metric: "Average Daily Attendance", status: "94.2%", target: "> 92%", performance: "Exceeded", performanceClass: "perf-exceeded" },
      { metric: "Fee Collection Rate", status: "78.5%", target: "85%", performance: "Under Target", performanceClass: "perf-under" },
      { metric: "Active Teacher-Student Ratio", status: "1:32", target: "1:30", performance: "Acceptable", performanceClass: "perf-acceptable" },
      { metric: "Termly Pass Rate", status: "68%", target: "70%", performance: "Under Target", performanceClass: "perf-under" }
    ];
    this.enrollmentData = [
      { year: "2020", value: 800, height: "40%" },
      { year: "2021", value: 850, height: "45%" },
      { year: "2022", value: 920, height: "55%" },
      { year: "2023", value: 1e3, height: "65%" },
      { year: "2024", value: 1100, height: "75%" },
      { year: "2025", value: 1200, height: "85%" },
      { year: "2026", value: 1245, height: "90%" }
    ];
    this.attendanceData = [
      { grade: "Form 1", value: 96, height: "96%" },
      { grade: "Form 2", value: 93, height: "93%" },
      { grade: "Form 3", value: 95, height: "95%" },
      { grade: "Form 4", value: 91, height: "91%" }
    ];
    this.feeData = [
      { label: "Term 1", collection: "80%", target: "100%" },
      { label: "Term 2", collection: "75%", target: "100%" },
      { label: "Term 3", collection: "60%", target: "100%" }
    ];
  }
  static {
    this.\u0275fac = function ReportsPage_Factory(__ngFactoryType__) {
      return new (__ngFactoryType__ || _ReportsPage)();
    };
  }
  static {
    this.\u0275cmp = /* @__PURE__ */ \u0275\u0275defineComponent({ type: _ReportsPage, selectors: [["sa-reports"]], decls: 92, vars: 7, consts: [[1, "reports-container"], [1, "page-header"], [1, "header-content"], [1, "header-actions"], [1, "filters"], [3, "ngModelChange", "ngModel"], ["value", "2025/2026"], ["value", "2024/2025"], ["value", "All Terms"], ["value", "Term 1"], ["value", "Term 2"], ["value", "Secondary Campus"], ["value", "Primary Campus"], [1, "buttons"], [1, "btn", "btn-outline"], [1, "btn", "btn-primary"], [1, "charts-grid"], [1, "chart-card"], [1, "bar-chart"], [1, "chart-bars"], ["class", "bar-group", 4, "ngFor", "ngForOf"], [1, "doughnut-chart-container"], [1, "doughnut-chart"], [1, "chart-legend"], [1, "legend-item"], [1, "dot", "dot-a"], [1, "dot", "dot-b"], [1, "dot", "dot-c"], [1, "dot", "dot-d"], [1, "bar-chart", "side-by-side"], [1, "chart-legend", "inline"], [1, "dot", "dot-purple"], [1, "dot", "dot-gray"], [1, "table-card"], [1, "table-scroll-wrapper"], [1, "data-table"], [4, "ngFor", "ngForOf"], [1, "bar-group"], [1, "bar", "bar-blue", 3, "title"], [1, "x-label"], [1, "bar", "bar-green", 3, "title"], [1, "side-bars"], [1, "bar", "bar-purple", 3, "title"], [1, "bar", "bar-gray", 3, "title"], [3, "ngClass"]], template: function ReportsPage_Template(rf, ctx) {
      if (rf & 1) {
        \u0275\u0275elementStart(0, "div", 0)(1, "header", 1)(2, "div", 2)(3, "h1");
        \u0275\u0275text(4, "Reports & Institutional Analytics");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(5, "div", 3)(6, "div", 4)(7, "select", 5);
        \u0275\u0275twoWayListener("ngModelChange", function ReportsPage_Template_select_ngModelChange_7_listener($event) {
          \u0275\u0275twoWayBindingSet(ctx.selectedYear, $event) || (ctx.selectedYear = $event);
          return $event;
        });
        \u0275\u0275elementStart(8, "option", 6);
        \u0275\u0275text(9, "Academic Year: 2025/2026");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(10, "option", 7);
        \u0275\u0275text(11, "Academic Year: 2024/2025");
        \u0275\u0275elementEnd()();
        \u0275\u0275elementStart(12, "select", 5);
        \u0275\u0275twoWayListener("ngModelChange", function ReportsPage_Template_select_ngModelChange_12_listener($event) {
          \u0275\u0275twoWayBindingSet(ctx.selectedTerm, $event) || (ctx.selectedTerm = $event);
          return $event;
        });
        \u0275\u0275elementStart(13, "option", 8);
        \u0275\u0275text(14, "Term: All Terms");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(15, "option", 9);
        \u0275\u0275text(16, "Term: Term 1");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(17, "option", 10);
        \u0275\u0275text(18, "Term: Term 2");
        \u0275\u0275elementEnd()();
        \u0275\u0275elementStart(19, "select", 5);
        \u0275\u0275twoWayListener("ngModelChange", function ReportsPage_Template_select_ngModelChange_19_listener($event) {
          \u0275\u0275twoWayBindingSet(ctx.selectedClass, $event) || (ctx.selectedClass = $event);
          return $event;
        });
        \u0275\u0275elementStart(20, "option", 11);
        \u0275\u0275text(21, "Class: Secondary Campus");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(22, "option", 12);
        \u0275\u0275text(23, "Class: Primary Campus");
        \u0275\u0275elementEnd()()();
        \u0275\u0275elementStart(24, "div", 13)(25, "button", 14);
        \u0275\u0275text(26, "Export PDF");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(27, "button", 14);
        \u0275\u0275text(28, "Export Excel");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(29, "button", 15);
        \u0275\u0275text(30, "Print Report");
        \u0275\u0275elementEnd()()()()();
        \u0275\u0275elementStart(31, "div", 16)(32, "div", 17)(33, "h3");
        \u0275\u0275text(34, "Enrollment Trends (2020 - 2026)");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(35, "div", 18)(36, "div", 19);
        \u0275\u0275template(37, ReportsPage_div_37_Template, 4, 4, "div", 20);
        \u0275\u0275elementEnd()()();
        \u0275\u0275elementStart(38, "div", 17)(39, "h3");
        \u0275\u0275text(40, "Attendance Rate by Grade");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(41, "div", 18)(42, "div", 19);
        \u0275\u0275template(43, ReportsPage_div_43_Template, 4, 4, "div", 20);
        \u0275\u0275elementEnd()()();
        \u0275\u0275elementStart(44, "div", 17)(45, "h3");
        \u0275\u0275text(46, "Performance Distribution (A+ to D)");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(47, "div", 21);
        \u0275\u0275element(48, "div", 22);
        \u0275\u0275elementStart(49, "div", 23)(50, "div", 24);
        \u0275\u0275element(51, "span", 25);
        \u0275\u0275text(52, " A (Excellent)");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(53, "div", 24);
        \u0275\u0275element(54, "span", 26);
        \u0275\u0275text(55, " B (Good)");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(56, "div", 24);
        \u0275\u0275element(57, "span", 27);
        \u0275\u0275text(58, " C (Average)");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(59, "div", 24);
        \u0275\u0275element(60, "span", 28);
        \u0275\u0275text(61, " D (Poor)");
        \u0275\u0275elementEnd()()()();
        \u0275\u0275elementStart(62, "div", 17)(63, "h3");
        \u0275\u0275text(64, "Fee Collection vs Target");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(65, "div", 29)(66, "div", 19);
        \u0275\u0275template(67, ReportsPage_div_67_Template, 6, 7, "div", 20);
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(68, "div", 30)(69, "div", 24);
        \u0275\u0275element(70, "span", 31);
        \u0275\u0275text(71, " Collection");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(72, "div", 24);
        \u0275\u0275element(73, "span", 32);
        \u0275\u0275text(74, " Target");
        \u0275\u0275elementEnd()()()()();
        \u0275\u0275elementStart(75, "div", 33)(76, "h3");
        \u0275\u0275text(77, "Institutional Summary Indicators");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(78, "div", 34)(79, "table", 35)(80, "thead")(81, "tr")(82, "th");
        \u0275\u0275text(83, "Key Metric");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(84, "th");
        \u0275\u0275text(85, "Current Status");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(86, "th");
        \u0275\u0275text(87, "Target / Threshold");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(88, "th");
        \u0275\u0275text(89, "Performance");
        \u0275\u0275elementEnd()()();
        \u0275\u0275elementStart(90, "tbody");
        \u0275\u0275template(91, ReportsPage_tr_91_Template, 9, 5, "tr", 36);
        \u0275\u0275elementEnd()()()()();
      }
      if (rf & 2) {
        \u0275\u0275advance(7);
        \u0275\u0275twoWayProperty("ngModel", ctx.selectedYear);
        \u0275\u0275advance(5);
        \u0275\u0275twoWayProperty("ngModel", ctx.selectedTerm);
        \u0275\u0275advance(7);
        \u0275\u0275twoWayProperty("ngModel", ctx.selectedClass);
        \u0275\u0275advance(18);
        \u0275\u0275property("ngForOf", ctx.enrollmentData);
        \u0275\u0275advance(6);
        \u0275\u0275property("ngForOf", ctx.attendanceData);
        \u0275\u0275advance(24);
        \u0275\u0275property("ngForOf", ctx.feeData);
        \u0275\u0275advance(24);
        \u0275\u0275property("ngForOf", ctx.summaryIndicators);
      }
    }, dependencies: [CommonModule, NgClass, NgForOf, FormsModule, NgSelectOption, \u0275NgSelectMultipleOption, SelectControlValueAccessor, NgControlStatus, NgModel], styles: ['\n\n.reports-container[_ngcontent-%COMP%] {\n  padding: 1.5rem;\n  background-color: var(--sa-bg-light, #f8f9fa);\n}\n.page-header[_ngcontent-%COMP%] {\n  margin-bottom: 2rem;\n}\n.page-header[_ngcontent-%COMP%]   .header-content[_ngcontent-%COMP%] {\n  display: flex;\n  flex-direction: column;\n  gap: 1rem;\n}\n@media (min-width: 992px) {\n  .page-header[_ngcontent-%COMP%]   .header-content[_ngcontent-%COMP%] {\n    flex-direction: row;\n    justify-content: space-between;\n    align-items: center;\n  }\n}\n.page-header[_ngcontent-%COMP%]   h1[_ngcontent-%COMP%] {\n  margin: 0;\n  font-size: 1.5rem;\n  font-weight: 600;\n  color: var(--sa-text-main, #333);\n}\n.page-header[_ngcontent-%COMP%]   .header-actions[_ngcontent-%COMP%] {\n  display: flex;\n  flex-wrap: wrap;\n  gap: 1rem;\n  align-items: center;\n}\n.page-header[_ngcontent-%COMP%]   .header-actions[_ngcontent-%COMP%]   .filters[_ngcontent-%COMP%] {\n  display: flex;\n  gap: 0.5rem;\n  flex-wrap: wrap;\n}\n.page-header[_ngcontent-%COMP%]   .header-actions[_ngcontent-%COMP%]   .filters[_ngcontent-%COMP%]   select[_ngcontent-%COMP%] {\n  padding: 0.5rem;\n  border: 1px solid var(--sa-border-color, #dee2e6);\n  border-radius: 4px;\n  background-color: #fff;\n  font-size: 0.9rem;\n}\n.page-header[_ngcontent-%COMP%]   .header-actions[_ngcontent-%COMP%]   .buttons[_ngcontent-%COMP%] {\n  display: flex;\n  gap: 0.5rem;\n}\n.page-header[_ngcontent-%COMP%]   .header-actions[_ngcontent-%COMP%]   .buttons[_ngcontent-%COMP%]   .btn[_ngcontent-%COMP%] {\n  padding: 0.5rem 1rem;\n  border-radius: 4px;\n  font-weight: 500;\n  cursor: pointer;\n  font-size: 0.9rem;\n  border: 1px solid transparent;\n}\n.page-header[_ngcontent-%COMP%]   .header-actions[_ngcontent-%COMP%]   .buttons[_ngcontent-%COMP%]   .btn-outline[_ngcontent-%COMP%] {\n  background-color: transparent;\n  border-color: var(--sa-border-color, #dee2e6);\n  color: var(--sa-text-main, #333);\n}\n.page-header[_ngcontent-%COMP%]   .header-actions[_ngcontent-%COMP%]   .buttons[_ngcontent-%COMP%]   .btn-outline[_ngcontent-%COMP%]:hover {\n  background-color: #f1f3f5;\n}\n.page-header[_ngcontent-%COMP%]   .header-actions[_ngcontent-%COMP%]   .buttons[_ngcontent-%COMP%]   .btn-primary[_ngcontent-%COMP%] {\n  background-color: var(--sa-primary, #f97316);\n  color: #fff;\n}\n.page-header[_ngcontent-%COMP%]   .header-actions[_ngcontent-%COMP%]   .buttons[_ngcontent-%COMP%]   .btn-primary[_ngcontent-%COMP%]:hover {\n  background-color: rgb(239.3368200837, 101.6924686192, 6.1631799163);\n}\n.charts-grid[_ngcontent-%COMP%] {\n  display: grid;\n  grid-template-columns: 1fr;\n  gap: 1.5rem;\n  margin-bottom: 2rem;\n}\n@media (min-width: 768px) {\n  .charts-grid[_ngcontent-%COMP%] {\n    grid-template-columns: repeat(2, 1fr);\n  }\n}\n.chart-card[_ngcontent-%COMP%] {\n  background: #fff;\n  border-radius: 8px;\n  padding: 1.5rem;\n  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);\n}\n.chart-card[_ngcontent-%COMP%]   h3[_ngcontent-%COMP%] {\n  margin-top: 0;\n  margin-bottom: 1.5rem;\n  font-size: 1.1rem;\n  font-weight: 600;\n  color: var(--sa-text-main, #333);\n}\n.bar-chart[_ngcontent-%COMP%] {\n  height: 250px;\n  display: flex;\n  flex-direction: column;\n  justify-content: flex-end;\n  position: relative;\n  border-bottom: 1px solid #dee2e6;\n  border-left: 1px solid #dee2e6;\n  padding-left: 10px;\n}\n.bar-chart[_ngcontent-%COMP%]   .chart-bars[_ngcontent-%COMP%] {\n  display: flex;\n  justify-content: space-around;\n  align-items: flex-end;\n  height: 100%;\n  padding-bottom: 30px;\n}\n.bar-chart[_ngcontent-%COMP%]   .bar-group[_ngcontent-%COMP%] {\n  display: flex;\n  flex-direction: column;\n  align-items: center;\n  justify-content: flex-end;\n  height: 100%;\n  position: relative;\n  width: 100%;\n}\n.bar-chart[_ngcontent-%COMP%]   .bar-group[_ngcontent-%COMP%]   .bar[_ngcontent-%COMP%] {\n  width: 40px;\n  border-radius: 4px 4px 0 0;\n  transition: height 0.3s ease;\n}\n.bar-chart[_ngcontent-%COMP%]   .bar-group[_ngcontent-%COMP%]   .bar.bar-blue[_ngcontent-%COMP%] {\n  background-color: #3b82f6;\n}\n.bar-chart[_ngcontent-%COMP%]   .bar-group[_ngcontent-%COMP%]   .bar.bar-green[_ngcontent-%COMP%] {\n  background-color: #10b981;\n}\n.bar-chart[_ngcontent-%COMP%]   .bar-group[_ngcontent-%COMP%]   .bar.bar-purple[_ngcontent-%COMP%] {\n  background-color: #8b5cf6;\n}\n.bar-chart[_ngcontent-%COMP%]   .bar-group[_ngcontent-%COMP%]   .bar.bar-gray[_ngcontent-%COMP%] {\n  background-color: #9ca3af;\n}\n.bar-chart[_ngcontent-%COMP%]   .bar-group[_ngcontent-%COMP%]   .side-bars[_ngcontent-%COMP%] {\n  display: flex;\n  gap: 4px;\n  height: 100%;\n  align-items: flex-end;\n}\n.bar-chart[_ngcontent-%COMP%]   .bar-group[_ngcontent-%COMP%]   .side-bars[_ngcontent-%COMP%]   .bar[_ngcontent-%COMP%] {\n  width: 25px;\n}\n.bar-chart[_ngcontent-%COMP%]   .bar-group[_ngcontent-%COMP%]   .x-label[_ngcontent-%COMP%] {\n  position: absolute;\n  bottom: -25px;\n  font-size: 0.8rem;\n  color: #6c757d;\n  white-space: nowrap;\n}\n.bar-chart.side-by-side[_ngcontent-%COMP%] {\n  height: 280px;\n}\n.doughnut-chart-container[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  gap: 2rem;\n  height: 250px;\n}\n.doughnut-chart-container[_ngcontent-%COMP%]   .doughnut-chart[_ngcontent-%COMP%] {\n  width: 150px;\n  height: 150px;\n  border-radius: 50%;\n  background:\n    conic-gradient(\n      #10b981 0% 40%,\n      #3b82f6 40% 70%,\n      #f59e0b 70% 90%,\n      #ef4444 90% 100%);\n  position: relative;\n}\n.doughnut-chart-container[_ngcontent-%COMP%]   .doughnut-chart[_ngcontent-%COMP%]::after {\n  content: "";\n  position: absolute;\n  inset: 20px;\n  background: #fff;\n  border-radius: 50%;\n}\n.chart-legend[_ngcontent-%COMP%] {\n  display: flex;\n  flex-direction: column;\n  gap: 0.5rem;\n  font-size: 0.9rem;\n}\n.chart-legend.inline[_ngcontent-%COMP%] {\n  flex-direction: row;\n  justify-content: center;\n  margin-top: 10px;\n  gap: 1.5rem;\n}\n.chart-legend[_ngcontent-%COMP%]   .legend-item[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  gap: 0.5rem;\n  color: #4b5563;\n}\n.chart-legend[_ngcontent-%COMP%]   .dot[_ngcontent-%COMP%] {\n  width: 12px;\n  height: 12px;\n  border-radius: 50%;\n}\n.chart-legend[_ngcontent-%COMP%]   .dot.dot-a[_ngcontent-%COMP%] {\n  background-color: #10b981;\n}\n.chart-legend[_ngcontent-%COMP%]   .dot.dot-b[_ngcontent-%COMP%] {\n  background-color: #3b82f6;\n}\n.chart-legend[_ngcontent-%COMP%]   .dot.dot-c[_ngcontent-%COMP%] {\n  background-color: #f59e0b;\n}\n.chart-legend[_ngcontent-%COMP%]   .dot.dot-d[_ngcontent-%COMP%] {\n  background-color: #ef4444;\n}\n.chart-legend[_ngcontent-%COMP%]   .dot.dot-purple[_ngcontent-%COMP%] {\n  background-color: #8b5cf6;\n}\n.chart-legend[_ngcontent-%COMP%]   .dot.dot-gray[_ngcontent-%COMP%] {\n  background-color: #9ca3af;\n}\n.table-card[_ngcontent-%COMP%] {\n  background: #fff;\n  border-radius: 8px;\n  padding: 1.5rem;\n  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);\n}\n.table-card[_ngcontent-%COMP%]   h3[_ngcontent-%COMP%] {\n  margin-top: 0;\n  margin-bottom: 1.5rem;\n  font-size: 1.1rem;\n  font-weight: 600;\n  color: var(--sa-text-main, #333);\n}\n.table-scroll-wrapper[_ngcontent-%COMP%] {\n  overflow-x: auto;\n}\n.data-table[_ngcontent-%COMP%] {\n  width: 100%;\n  border-collapse: collapse;\n  text-align: left;\n  min-width: 600px;\n}\n.data-table[_ngcontent-%COMP%]   th[_ngcontent-%COMP%], \n.data-table[_ngcontent-%COMP%]   td[_ngcontent-%COMP%] {\n  padding: 1rem;\n  border-bottom: 1px solid #f3f4f6;\n}\n.data-table[_ngcontent-%COMP%]   th[_ngcontent-%COMP%] {\n  font-weight: 600;\n  color: #4b5563;\n  background-color: #f9fafb;\n}\n.data-table[_ngcontent-%COMP%]   td[_ngcontent-%COMP%] {\n  color: #1f2937;\n}\n.data-table[_ngcontent-%COMP%]   .perf-exceeded[_ngcontent-%COMP%] {\n  color: #10b981;\n  font-weight: 500;\n}\n.data-table[_ngcontent-%COMP%]   .perf-under[_ngcontent-%COMP%] {\n  color: #f97316;\n  font-weight: 500;\n}\n.data-table[_ngcontent-%COMP%]   .perf-acceptable[_ngcontent-%COMP%] {\n  color: #3b82f6;\n  font-weight: 500;\n}\n/*# sourceMappingURL=reports.page.css.map */'], changeDetection: 0 });
  }
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(ReportsPage, [{
    type: Component,
    args: [{ selector: "sa-reports", standalone: true, imports: [CommonModule, FormsModule], changeDetection: ChangeDetectionStrategy.OnPush, template: `<div class="reports-container">
  <header class="page-header">
    <div class="header-content">
      <h1>Reports & Institutional Analytics</h1>
      
      <div class="header-actions">
        <div class="filters">
          <select [(ngModel)]="selectedYear">
            <option value="2025/2026">Academic Year: 2025/2026</option>
            <option value="2024/2025">Academic Year: 2024/2025</option>
          </select>
          <select [(ngModel)]="selectedTerm">
            <option value="All Terms">Term: All Terms</option>
            <option value="Term 1">Term: Term 1</option>
            <option value="Term 2">Term: Term 2</option>
          </select>
          <select [(ngModel)]="selectedClass">
            <option value="Secondary Campus">Class: Secondary Campus</option>
            <option value="Primary Campus">Class: Primary Campus</option>
          </select>
        </div>
        
        <div class="buttons">
          <button class="btn btn-outline">Export PDF</button>
          <button class="btn btn-outline">Export Excel</button>
          <button class="btn btn-primary">Print Report</button>
        </div>
      </div>
    </div>
  </header>

  <div class="charts-grid">
    <div class="chart-card">
      <h3>Enrollment Trends (2020 - 2026)</h3>
      <div class="bar-chart">
        <div class="chart-bars">
          <div class="bar-group" *ngFor="let item of enrollmentData">
            <div class="bar bar-blue" [style.height]="item.height" [title]="item.value"></div>
            <span class="x-label">{{item.year}}</span>
          </div>
        </div>
      </div>
    </div>

    <div class="chart-card">
      <h3>Attendance Rate by Grade</h3>
      <div class="bar-chart">
        <div class="chart-bars">
          <div class="bar-group" *ngFor="let item of attendanceData">
            <div class="bar bar-green" [style.height]="item.height" [title]="item.value + '%'"></div>
            <span class="x-label">{{item.grade}}</span>
          </div>
        </div>
      </div>
    </div>

    <div class="chart-card">
      <h3>Performance Distribution (A+ to D)</h3>
      <div class="doughnut-chart-container">
        <div class="doughnut-chart">
          <!-- Mock doughnut chart via CSS conic-gradient -->
        </div>
        <div class="chart-legend">
          <div class="legend-item"><span class="dot dot-a"></span> A (Excellent)</div>
          <div class="legend-item"><span class="dot dot-b"></span> B (Good)</div>
          <div class="legend-item"><span class="dot dot-c"></span> C (Average)</div>
          <div class="legend-item"><span class="dot dot-d"></span> D (Poor)</div>
        </div>
      </div>
    </div>

    <div class="chart-card">
      <h3>Fee Collection vs Target</h3>
      <div class="bar-chart side-by-side">
        <div class="chart-bars">
          <div class="bar-group" *ngFor="let item of feeData">
            <div class="side-bars">
              <div class="bar bar-purple" [style.height]="item.collection" [title]="'Collection: ' + item.collection"></div>
              <div class="bar bar-gray" [style.height]="item.target" [title]="'Target: ' + item.target"></div>
            </div>
            <span class="x-label">{{item.label}}</span>
          </div>
        </div>
        <div class="chart-legend inline">
          <div class="legend-item"><span class="dot dot-purple"></span> Collection</div>
          <div class="legend-item"><span class="dot dot-gray"></span> Target</div>
        </div>
      </div>
    </div>
  </div>

  <div class="table-card">
    <h3>Institutional Summary Indicators</h3>
    <div class="table-scroll-wrapper">
      <table class="data-table">
        <thead>
          <tr>
            <th>Key Metric</th>
            <th>Current Status</th>
            <th>Target / Threshold</th>
            <th>Performance</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let row of summaryIndicators">
            <td>{{row.metric}}</td>
            <td>{{row.status}}</td>
            <td>{{row.target}}</td>
            <td [ngClass]="row.performanceClass">{{row.performance}}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</div>
`, styles: ['/* src/app/features/dashboard/pages/reports/reports.page.scss */\n.reports-container {\n  padding: 1.5rem;\n  background-color: var(--sa-bg-light, #f8f9fa);\n}\n.page-header {\n  margin-bottom: 2rem;\n}\n.page-header .header-content {\n  display: flex;\n  flex-direction: column;\n  gap: 1rem;\n}\n@media (min-width: 992px) {\n  .page-header .header-content {\n    flex-direction: row;\n    justify-content: space-between;\n    align-items: center;\n  }\n}\n.page-header h1 {\n  margin: 0;\n  font-size: 1.5rem;\n  font-weight: 600;\n  color: var(--sa-text-main, #333);\n}\n.page-header .header-actions {\n  display: flex;\n  flex-wrap: wrap;\n  gap: 1rem;\n  align-items: center;\n}\n.page-header .header-actions .filters {\n  display: flex;\n  gap: 0.5rem;\n  flex-wrap: wrap;\n}\n.page-header .header-actions .filters select {\n  padding: 0.5rem;\n  border: 1px solid var(--sa-border-color, #dee2e6);\n  border-radius: 4px;\n  background-color: #fff;\n  font-size: 0.9rem;\n}\n.page-header .header-actions .buttons {\n  display: flex;\n  gap: 0.5rem;\n}\n.page-header .header-actions .buttons .btn {\n  padding: 0.5rem 1rem;\n  border-radius: 4px;\n  font-weight: 500;\n  cursor: pointer;\n  font-size: 0.9rem;\n  border: 1px solid transparent;\n}\n.page-header .header-actions .buttons .btn-outline {\n  background-color: transparent;\n  border-color: var(--sa-border-color, #dee2e6);\n  color: var(--sa-text-main, #333);\n}\n.page-header .header-actions .buttons .btn-outline:hover {\n  background-color: #f1f3f5;\n}\n.page-header .header-actions .buttons .btn-primary {\n  background-color: var(--sa-primary, #f97316);\n  color: #fff;\n}\n.page-header .header-actions .buttons .btn-primary:hover {\n  background-color: rgb(239.3368200837, 101.6924686192, 6.1631799163);\n}\n.charts-grid {\n  display: grid;\n  grid-template-columns: 1fr;\n  gap: 1.5rem;\n  margin-bottom: 2rem;\n}\n@media (min-width: 768px) {\n  .charts-grid {\n    grid-template-columns: repeat(2, 1fr);\n  }\n}\n.chart-card {\n  background: #fff;\n  border-radius: 8px;\n  padding: 1.5rem;\n  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);\n}\n.chart-card h3 {\n  margin-top: 0;\n  margin-bottom: 1.5rem;\n  font-size: 1.1rem;\n  font-weight: 600;\n  color: var(--sa-text-main, #333);\n}\n.bar-chart {\n  height: 250px;\n  display: flex;\n  flex-direction: column;\n  justify-content: flex-end;\n  position: relative;\n  border-bottom: 1px solid #dee2e6;\n  border-left: 1px solid #dee2e6;\n  padding-left: 10px;\n}\n.bar-chart .chart-bars {\n  display: flex;\n  justify-content: space-around;\n  align-items: flex-end;\n  height: 100%;\n  padding-bottom: 30px;\n}\n.bar-chart .bar-group {\n  display: flex;\n  flex-direction: column;\n  align-items: center;\n  justify-content: flex-end;\n  height: 100%;\n  position: relative;\n  width: 100%;\n}\n.bar-chart .bar-group .bar {\n  width: 40px;\n  border-radius: 4px 4px 0 0;\n  transition: height 0.3s ease;\n}\n.bar-chart .bar-group .bar.bar-blue {\n  background-color: #3b82f6;\n}\n.bar-chart .bar-group .bar.bar-green {\n  background-color: #10b981;\n}\n.bar-chart .bar-group .bar.bar-purple {\n  background-color: #8b5cf6;\n}\n.bar-chart .bar-group .bar.bar-gray {\n  background-color: #9ca3af;\n}\n.bar-chart .bar-group .side-bars {\n  display: flex;\n  gap: 4px;\n  height: 100%;\n  align-items: flex-end;\n}\n.bar-chart .bar-group .side-bars .bar {\n  width: 25px;\n}\n.bar-chart .bar-group .x-label {\n  position: absolute;\n  bottom: -25px;\n  font-size: 0.8rem;\n  color: #6c757d;\n  white-space: nowrap;\n}\n.bar-chart.side-by-side {\n  height: 280px;\n}\n.doughnut-chart-container {\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  gap: 2rem;\n  height: 250px;\n}\n.doughnut-chart-container .doughnut-chart {\n  width: 150px;\n  height: 150px;\n  border-radius: 50%;\n  background:\n    conic-gradient(\n      #10b981 0% 40%,\n      #3b82f6 40% 70%,\n      #f59e0b 70% 90%,\n      #ef4444 90% 100%);\n  position: relative;\n}\n.doughnut-chart-container .doughnut-chart::after {\n  content: "";\n  position: absolute;\n  inset: 20px;\n  background: #fff;\n  border-radius: 50%;\n}\n.chart-legend {\n  display: flex;\n  flex-direction: column;\n  gap: 0.5rem;\n  font-size: 0.9rem;\n}\n.chart-legend.inline {\n  flex-direction: row;\n  justify-content: center;\n  margin-top: 10px;\n  gap: 1.5rem;\n}\n.chart-legend .legend-item {\n  display: flex;\n  align-items: center;\n  gap: 0.5rem;\n  color: #4b5563;\n}\n.chart-legend .dot {\n  width: 12px;\n  height: 12px;\n  border-radius: 50%;\n}\n.chart-legend .dot.dot-a {\n  background-color: #10b981;\n}\n.chart-legend .dot.dot-b {\n  background-color: #3b82f6;\n}\n.chart-legend .dot.dot-c {\n  background-color: #f59e0b;\n}\n.chart-legend .dot.dot-d {\n  background-color: #ef4444;\n}\n.chart-legend .dot.dot-purple {\n  background-color: #8b5cf6;\n}\n.chart-legend .dot.dot-gray {\n  background-color: #9ca3af;\n}\n.table-card {\n  background: #fff;\n  border-radius: 8px;\n  padding: 1.5rem;\n  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);\n}\n.table-card h3 {\n  margin-top: 0;\n  margin-bottom: 1.5rem;\n  font-size: 1.1rem;\n  font-weight: 600;\n  color: var(--sa-text-main, #333);\n}\n.table-scroll-wrapper {\n  overflow-x: auto;\n}\n.data-table {\n  width: 100%;\n  border-collapse: collapse;\n  text-align: left;\n  min-width: 600px;\n}\n.data-table th,\n.data-table td {\n  padding: 1rem;\n  border-bottom: 1px solid #f3f4f6;\n}\n.data-table th {\n  font-weight: 600;\n  color: #4b5563;\n  background-color: #f9fafb;\n}\n.data-table td {\n  color: #1f2937;\n}\n.data-table .perf-exceeded {\n  color: #10b981;\n  font-weight: 500;\n}\n.data-table .perf-under {\n  color: #f97316;\n  font-weight: 500;\n}\n.data-table .perf-acceptable {\n  color: #3b82f6;\n  font-weight: 500;\n}\n/*# sourceMappingURL=reports.page.css.map */\n'] }]
  }], null, null);
})();
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && \u0275setClassDebugInfo(ReportsPage, { className: "ReportsPage", filePath: "src/app/features/dashboard/pages/reports/reports.page.ts", lineNumber: 13 });
})();
export {
  ReportsPage
};
//# sourceMappingURL=chunk-22RWVTP6.js.map
