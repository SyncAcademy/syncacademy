import {
  ChangeDetectionStrategy,
  CommonModule,
  Component,
  NgClass,
  NgForOf,
  setClassMetadata,
  ɵsetClassDebugInfo,
  ɵɵadvance,
  ɵɵclassProp,
  ɵɵdefineComponent,
  ɵɵelement,
  ɵɵelementEnd,
  ɵɵelementStart,
  ɵɵgetCurrentView,
  ɵɵlistener,
  ɵɵnextContext,
  ɵɵproperty,
  ɵɵresetView,
  ɵɵrestoreView,
  ɵɵtemplate,
  ɵɵtext,
  ɵɵtextInterpolate
} from "./chunk-3IPAKGA7.js";
import "./chunk-QHQP2P2Z.js";

// src/app/features/dashboard/pages/attendance/attendance.page.ts
function AttendancePage_div_21_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 44)(1, "div", 45);
    \u0275\u0275text(2);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "div", 46);
    \u0275\u0275text(4);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const stat_r1 = ctx.$implicit;
    \u0275\u0275property("ngClass", stat_r1.type);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(stat_r1.value);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(stat_r1.label);
  }
}
function AttendancePage_tr_40_Template(rf, ctx) {
  if (rf & 1) {
    const _r2 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "tr")(1, "td");
    \u0275\u0275text(2);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "td");
    \u0275\u0275text(4);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(5, "td")(6, "div", 47)(7, "button", 48);
    \u0275\u0275listener("click", function AttendancePage_tr_40_Template_button_click_7_listener() {
      const student_r3 = \u0275\u0275restoreView(_r2).$implicit;
      const ctx_r3 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r3.setStatus(student_r3, "present"));
    });
    \u0275\u0275text(8, " Present ");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(9, "button", 49);
    \u0275\u0275listener("click", function AttendancePage_tr_40_Template_button_click_9_listener() {
      const student_r3 = \u0275\u0275restoreView(_r2).$implicit;
      const ctx_r3 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r3.setStatus(student_r3, "absent"));
    });
    \u0275\u0275text(10, " Absent ");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(11, "button", 50);
    \u0275\u0275listener("click", function AttendancePage_tr_40_Template_button_click_11_listener() {
      const student_r3 = \u0275\u0275restoreView(_r2).$implicit;
      const ctx_r3 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r3.setStatus(student_r3, "late"));
    });
    \u0275\u0275text(12, " Late ");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(13, "button", 51);
    \u0275\u0275listener("click", function AttendancePage_tr_40_Template_button_click_13_listener() {
      const student_r3 = \u0275\u0275restoreView(_r2).$implicit;
      const ctx_r3 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r3.setStatus(student_r3, "excused"));
    });
    \u0275\u0275text(14, " Excused ");
    \u0275\u0275elementEnd()()();
    \u0275\u0275elementStart(15, "td");
    \u0275\u0275text(16);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(17, "td");
    \u0275\u0275element(18, "input", 52);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const student_r3 = ctx.$implicit;
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(student_r3.id);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(student_r3.name);
    \u0275\u0275advance(3);
    \u0275\u0275classProp("active", student_r3.status === "present");
    \u0275\u0275advance(2);
    \u0275\u0275classProp("active", student_r3.status === "absent");
    \u0275\u0275advance(2);
    \u0275\u0275classProp("active", student_r3.status === "late");
    \u0275\u0275advance(2);
    \u0275\u0275classProp("active", student_r3.status === "excused");
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate(student_r3.timeIn);
    \u0275\u0275advance(2);
    \u0275\u0275property("value", student_r3.notes);
  }
}
var AttendancePage = class _AttendancePage {
  constructor() {
    this.students = [
      {
        id: 1,
        name: "Alice Smith",
        status: "present",
        timeIn: "08:00 AM",
        notes: ""
      },
      {
        id: 2,
        name: "Bob Johnson",
        status: "absent",
        timeIn: "--",
        notes: "Sick leave"
      },
      {
        id: 3,
        name: "Charlie Brown",
        status: "late",
        timeIn: "08:15 AM",
        notes: "Traffic delay"
      },
      {
        id: 4,
        name: "Diana Prince",
        status: "present",
        timeIn: "07:55 AM",
        notes: ""
      },
      {
        id: 5,
        name: "Evan Davis",
        status: "excused",
        timeIn: "--",
        notes: "Doctor appointment"
      }
    ];
    this.stats = [
      { label: "Total Students", value: 120, type: "default" },
      { label: "Present Today", value: 110, type: "success" },
      { label: "Absent", value: 4, type: "danger" },
      { label: "Late", value: 4, type: "warning" },
      { label: "Excused", value: 2, type: "info" }
    ];
  }
  setStatus(student, status) {
    student.status = status;
  }
  static {
    this.\u0275fac = function AttendancePage_Factory(__ngFactoryType__) {
      return new (__ngFactoryType__ || _AttendancePage)();
    };
  }
  static {
    this.\u0275cmp = /* @__PURE__ */ \u0275\u0275defineComponent({ type: _AttendancePage, selectors: [["app-attendance"]], decls: 92, vars: 3, consts: [[1, "attendance-page"], [1, "page-header"], [1, "breadcrumb"], [1, "page-title"], [1, "top-section"], [1, "controls-left"], [1, "control-group"], ["for", "date-picker"], ["type", "date", "id", "date-picker", 3, "value"], ["for", "class-picker"], ["id", "class-picker"], [1, "stats-right"], ["class", "stat-card", 3, "ngClass", 4, "ngFor", "ngForOf"], [1, "content-layout"], [1, "main-col"], [1, "table-card"], [1, "table-responsive"], [1, "attendance-table"], [4, "ngFor", "ngForOf"], [1, "form-actions"], [1, "btn-save"], [1, "right-col"], [1, "card", "chart-card"], [1, "bar-chart-placeholder"], [1, "bar", 2, "height", "60%"], [1, "bar", 2, "height", "80%"], [1, "bar", 2, "height", "90%"], [1, "bar", 2, "height", "75%"], [1, "bar", 2, "height", "95%"], [1, "bar", 2, "height", "100%"], [1, "bar", 2, "height", "85%"], [1, "chart-labels"], [1, "card", "distribution-card"], [1, "progress-bar-multi"], ["title", "Present: 85%", 1, "segment", "present", 2, "width", "85%"], ["title", "Late: 8%", 1, "segment", "late", 2, "width", "8%"], ["title", "Excused: 4%", 1, "segment", "excused", 2, "width", "4%"], ["title", "Absent: 3%", 1, "segment", "absent", 2, "width", "3%"], [1, "distribution-legend"], [1, "legend-item"], [1, "dot", "present"], [1, "dot", "late"], [1, "dot", "excused"], [1, "dot", "absent"], [1, "stat-card", 3, "ngClass"], [1, "stat-value"], [1, "stat-label"], [1, "status-pills"], [1, "pill", "present", 3, "click"], [1, "pill", "absent", 3, "click"], [1, "pill", "late", 3, "click"], [1, "pill", "excused", 3, "click"], ["type", "text", "placeholder", "Notes...", 1, "notes-input", 3, "value"]], template: function AttendancePage_Template(rf, ctx) {
      if (rf & 1) {
        \u0275\u0275elementStart(0, "div", 0)(1, "header", 1)(2, "div", 2);
        \u0275\u0275text(3, "Students > Attendance");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(4, "h1", 3);
        \u0275\u0275text(5, "Student Attendance");
        \u0275\u0275elementEnd()();
        \u0275\u0275elementStart(6, "div", 4)(7, "div", 5)(8, "div", 6)(9, "label", 7);
        \u0275\u0275text(10, "Date");
        \u0275\u0275elementEnd();
        \u0275\u0275element(11, "input", 8);
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(12, "div", 6)(13, "label", 9);
        \u0275\u0275text(14, "Class");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(15, "select", 10)(16, "option");
        \u0275\u0275text(17, "Grade 10 - Mathematics");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(18, "option");
        \u0275\u0275text(19, "Grade 10 - Science");
        \u0275\u0275elementEnd()()()();
        \u0275\u0275elementStart(20, "div", 11);
        \u0275\u0275template(21, AttendancePage_div_21_Template, 5, 3, "div", 12);
        \u0275\u0275elementEnd()();
        \u0275\u0275elementStart(22, "div", 13)(23, "main", 14)(24, "div", 15)(25, "div", 16)(26, "table", 17)(27, "thead")(28, "tr")(29, "th");
        \u0275\u0275text(30, "#");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(31, "th");
        \u0275\u0275text(32, "Student Name");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(33, "th");
        \u0275\u0275text(34, "Status Selection");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(35, "th");
        \u0275\u0275text(36, "Time In");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(37, "th");
        \u0275\u0275text(38, "Notes");
        \u0275\u0275elementEnd()()();
        \u0275\u0275elementStart(39, "tbody");
        \u0275\u0275template(40, AttendancePage_tr_40_Template, 19, 12, "tr", 18);
        \u0275\u0275elementEnd()()();
        \u0275\u0275elementStart(41, "div", 19)(42, "button", 20);
        \u0275\u0275text(43, "Save Attendance");
        \u0275\u0275elementEnd()()()();
        \u0275\u0275elementStart(44, "aside", 21)(45, "div", 22)(46, "h3");
        \u0275\u0275text(47, "Attendance Trend");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(48, "div", 23);
        \u0275\u0275element(49, "div", 24)(50, "div", 25)(51, "div", 26)(52, "div", 27)(53, "div", 28)(54, "div", 29)(55, "div", 30);
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(56, "div", 31)(57, "span");
        \u0275\u0275text(58, "M");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(59, "span");
        \u0275\u0275text(60, "T");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(61, "span");
        \u0275\u0275text(62, "W");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(63, "span");
        \u0275\u0275text(64, "T");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(65, "span");
        \u0275\u0275text(66, "F");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(67, "span");
        \u0275\u0275text(68, "S");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(69, "span");
        \u0275\u0275text(70, "S");
        \u0275\u0275elementEnd()()();
        \u0275\u0275elementStart(71, "div", 32)(72, "h3");
        \u0275\u0275text(73, "Monthly Distribution");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(74, "div", 33);
        \u0275\u0275element(75, "div", 34)(76, "div", 35)(77, "div", 36)(78, "div", 37);
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(79, "div", 38)(80, "div", 39);
        \u0275\u0275element(81, "span", 40);
        \u0275\u0275text(82, " Present (85%) ");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(83, "div", 39);
        \u0275\u0275element(84, "span", 41);
        \u0275\u0275text(85, " Late (8%) ");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(86, "div", 39);
        \u0275\u0275element(87, "span", 42);
        \u0275\u0275text(88, " Excused (4%) ");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(89, "div", 39);
        \u0275\u0275element(90, "span", 43);
        \u0275\u0275text(91, " Absent (3%) ");
        \u0275\u0275elementEnd()()()()()();
      }
      if (rf & 2) {
        \u0275\u0275advance(11);
        \u0275\u0275property("value", "2026-09-12");
        \u0275\u0275advance(10);
        \u0275\u0275property("ngForOf", ctx.stats);
        \u0275\u0275advance(19);
        \u0275\u0275property("ngForOf", ctx.students);
      }
    }, dependencies: [CommonModule, NgClass, NgForOf], styles: ['\n\n[_nghost-%COMP%] {\n  display: block;\n  font-family:\n    system-ui,\n    -apple-system,\n    BlinkMacSystemFont,\n    "Segoe UI",\n    Roboto,\n    Oxygen,\n    Ubuntu,\n    Cantarell,\n    "Open Sans",\n    "Helvetica Neue",\n    sans-serif;\n  color: #333;\n  padding: 1.5rem;\n  background: #f4f6f8;\n  box-sizing: border-box;\n}\n*[_ngcontent-%COMP%] {\n  box-sizing: border-box;\n}\n.attendance-page[_ngcontent-%COMP%] {\n  max-width: 1400px;\n  margin: 0 auto;\n}\n.page-header[_ngcontent-%COMP%] {\n  margin-bottom: 2rem;\n}\n.page-header[_ngcontent-%COMP%]   .breadcrumb[_ngcontent-%COMP%] {\n  font-size: 0.875rem;\n  color: #6c757d;\n  margin-bottom: 0.5rem;\n}\n.page-header[_ngcontent-%COMP%]   .page-title[_ngcontent-%COMP%] {\n  font-size: 1.75rem;\n  font-weight: 600;\n  margin: 0;\n  color: #212529;\n}\n.top-section[_ngcontent-%COMP%] {\n  display: flex;\n  flex-wrap: wrap;\n  justify-content: space-between;\n  align-items: center;\n  gap: 1.5rem;\n  margin-bottom: 2rem;\n}\n.top-section[_ngcontent-%COMP%]   .controls-left[_ngcontent-%COMP%] {\n  display: flex;\n  gap: 1rem;\n  flex-wrap: wrap;\n}\n.top-section[_ngcontent-%COMP%]   .controls-left[_ngcontent-%COMP%]   .control-group[_ngcontent-%COMP%] {\n  display: flex;\n  flex-direction: column;\n  gap: 0.375rem;\n}\n.top-section[_ngcontent-%COMP%]   .controls-left[_ngcontent-%COMP%]   .control-group[_ngcontent-%COMP%]   label[_ngcontent-%COMP%] {\n  font-size: 0.875rem;\n  font-weight: 500;\n  color: #495057;\n}\n.top-section[_ngcontent-%COMP%]   .controls-left[_ngcontent-%COMP%]   .control-group[_ngcontent-%COMP%]   input[_ngcontent-%COMP%], \n.top-section[_ngcontent-%COMP%]   .controls-left[_ngcontent-%COMP%]   .control-group[_ngcontent-%COMP%]   select[_ngcontent-%COMP%] {\n  padding: 0.5rem 0.75rem;\n  border: 1px solid #ced4da;\n  border-radius: 0.375rem;\n  font-size: 0.95rem;\n  outline: none;\n  background: #fff;\n  transition: border-color 0.2s;\n}\n.top-section[_ngcontent-%COMP%]   .controls-left[_ngcontent-%COMP%]   .control-group[_ngcontent-%COMP%]   input[_ngcontent-%COMP%]:focus, \n.top-section[_ngcontent-%COMP%]   .controls-left[_ngcontent-%COMP%]   .control-group[_ngcontent-%COMP%]   select[_ngcontent-%COMP%]:focus {\n  border-color: #80bdff;\n}\n.top-section[_ngcontent-%COMP%]   .stats-right[_ngcontent-%COMP%] {\n  display: flex;\n  gap: 1rem;\n  flex-wrap: wrap;\n}\n.top-section[_ngcontent-%COMP%]   .stats-right[_ngcontent-%COMP%]   .stat-card[_ngcontent-%COMP%] {\n  background: #fff;\n  border: 1px solid #e9ecef;\n  border-radius: 0.5rem;\n  padding: 1rem 1.5rem;\n  min-width: 120px;\n  text-align: center;\n  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);\n}\n.top-section[_ngcontent-%COMP%]   .stats-right[_ngcontent-%COMP%]   .stat-card.success[_ngcontent-%COMP%] {\n  border: 2px solid #28a745;\n}\n.top-section[_ngcontent-%COMP%]   .stats-right[_ngcontent-%COMP%]   .stat-card.success[_ngcontent-%COMP%]   .stat-value[_ngcontent-%COMP%] {\n  color: #28a745;\n}\n.top-section[_ngcontent-%COMP%]   .stats-right[_ngcontent-%COMP%]   .stat-card.danger[_ngcontent-%COMP%]   .stat-value[_ngcontent-%COMP%] {\n  color: #dc3545;\n}\n.top-section[_ngcontent-%COMP%]   .stats-right[_ngcontent-%COMP%]   .stat-card.warning[_ngcontent-%COMP%]   .stat-value[_ngcontent-%COMP%] {\n  color: #ffc107;\n}\n.top-section[_ngcontent-%COMP%]   .stats-right[_ngcontent-%COMP%]   .stat-card.info[_ngcontent-%COMP%]   .stat-value[_ngcontent-%COMP%] {\n  color: #17a2b8;\n}\n.top-section[_ngcontent-%COMP%]   .stats-right[_ngcontent-%COMP%]   .stat-card[_ngcontent-%COMP%]   .stat-value[_ngcontent-%COMP%] {\n  font-size: 1.5rem;\n  font-weight: 700;\n  margin-bottom: 0.25rem;\n  color: #212529;\n}\n.top-section[_ngcontent-%COMP%]   .stats-right[_ngcontent-%COMP%]   .stat-card[_ngcontent-%COMP%]   .stat-label[_ngcontent-%COMP%] {\n  font-size: 0.75rem;\n  color: #6c757d;\n  text-transform: uppercase;\n  letter-spacing: 0.05em;\n}\n.content-layout[_ngcontent-%COMP%] {\n  display: flex;\n  flex-direction: column;\n  gap: 1.5rem;\n}\n@media (min-width: 992px) {\n  .content-layout[_ngcontent-%COMP%] {\n    flex-direction: row;\n    align-items: flex-start;\n  }\n}\n.main-col[_ngcontent-%COMP%] {\n  flex: 1 1 70%;\n  min-width: 0;\n}\n.main-col[_ngcontent-%COMP%]   .table-card[_ngcontent-%COMP%] {\n  background: #fff;\n  border-radius: 0.5rem;\n  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);\n  overflow: hidden;\n}\n.main-col[_ngcontent-%COMP%]   .table-responsive[_ngcontent-%COMP%] {\n  overflow-x: auto;\n}\n.main-col[_ngcontent-%COMP%]   .attendance-table[_ngcontent-%COMP%] {\n  width: 100%;\n  border-collapse: collapse;\n  min-width: 700px;\n}\n.main-col[_ngcontent-%COMP%]   .attendance-table[_ngcontent-%COMP%]   th[_ngcontent-%COMP%], \n.main-col[_ngcontent-%COMP%]   .attendance-table[_ngcontent-%COMP%]   td[_ngcontent-%COMP%] {\n  padding: 1rem 1.25rem;\n  text-align: left;\n  border-bottom: 1px solid #e9ecef;\n  vertical-align: middle;\n}\n.main-col[_ngcontent-%COMP%]   .attendance-table[_ngcontent-%COMP%]   th[_ngcontent-%COMP%] {\n  background: #f8f9fa;\n  font-weight: 600;\n  color: #495057;\n  font-size: 0.875rem;\n}\n.main-col[_ngcontent-%COMP%]   .attendance-table[_ngcontent-%COMP%]   td[_ngcontent-%COMP%] {\n  font-size: 0.95rem;\n}\n.main-col[_ngcontent-%COMP%]   .attendance-table[_ngcontent-%COMP%]   .status-pills[_ngcontent-%COMP%] {\n  display: flex;\n  gap: 0.375rem;\n}\n.main-col[_ngcontent-%COMP%]   .attendance-table[_ngcontent-%COMP%]   .status-pills[_ngcontent-%COMP%]   .pill[_ngcontent-%COMP%] {\n  padding: 0.375rem 0.75rem;\n  border: 1px solid #ced4da;\n  background: #fff;\n  border-radius: 1rem;\n  font-size: 0.75rem;\n  font-weight: 500;\n  cursor: pointer;\n  color: #495057;\n  transition: all 0.2s;\n}\n.main-col[_ngcontent-%COMP%]   .attendance-table[_ngcontent-%COMP%]   .status-pills[_ngcontent-%COMP%]   .pill[_ngcontent-%COMP%]:hover {\n  background: #f8f9fa;\n}\n.main-col[_ngcontent-%COMP%]   .attendance-table[_ngcontent-%COMP%]   .status-pills[_ngcontent-%COMP%]   .pill.active[_ngcontent-%COMP%] {\n  border-color: transparent;\n  color: #fff;\n}\n.main-col[_ngcontent-%COMP%]   .attendance-table[_ngcontent-%COMP%]   .status-pills[_ngcontent-%COMP%]   .pill.active.present[_ngcontent-%COMP%] {\n  background: #28a745;\n}\n.main-col[_ngcontent-%COMP%]   .attendance-table[_ngcontent-%COMP%]   .status-pills[_ngcontent-%COMP%]   .pill.active.absent[_ngcontent-%COMP%] {\n  background: #dc3545;\n}\n.main-col[_ngcontent-%COMP%]   .attendance-table[_ngcontent-%COMP%]   .status-pills[_ngcontent-%COMP%]   .pill.active.late[_ngcontent-%COMP%] {\n  background: #ffc107;\n  color: #212529;\n}\n.main-col[_ngcontent-%COMP%]   .attendance-table[_ngcontent-%COMP%]   .status-pills[_ngcontent-%COMP%]   .pill.active.excused[_ngcontent-%COMP%] {\n  background: #17a2b8;\n}\n.main-col[_ngcontent-%COMP%]   .attendance-table[_ngcontent-%COMP%]   .notes-input[_ngcontent-%COMP%] {\n  width: 100%;\n  padding: 0.375rem 0.5rem;\n  border: 1px solid #ced4da;\n  border-radius: 0.25rem;\n  font-size: 0.875rem;\n  outline: none;\n}\n.main-col[_ngcontent-%COMP%]   .attendance-table[_ngcontent-%COMP%]   .notes-input[_ngcontent-%COMP%]:focus {\n  border-color: #80bdff;\n}\n.main-col[_ngcontent-%COMP%]   .form-actions[_ngcontent-%COMP%] {\n  padding: 1.5rem;\n  display: flex;\n  justify-content: flex-end;\n  background: #fff;\n}\n.main-col[_ngcontent-%COMP%]   .form-actions[_ngcontent-%COMP%]   .btn-save[_ngcontent-%COMP%] {\n  background: #fd7e14;\n  color: #fff;\n  border: none;\n  padding: 0.625rem 1.5rem;\n  border-radius: 0.375rem;\n  font-size: 1rem;\n  font-weight: 600;\n  cursor: pointer;\n  transition: background 0.2s;\n  box-shadow: 0 2px 4px rgba(253, 126, 20, 0.2);\n}\n.main-col[_ngcontent-%COMP%]   .form-actions[_ngcontent-%COMP%]   .btn-save[_ngcontent-%COMP%]:hover {\n  background: #e86e10;\n}\n.right-col[_ngcontent-%COMP%] {\n  flex: 1 1 30%;\n  display: flex;\n  flex-direction: column;\n  gap: 1.5rem;\n}\n.right-col[_ngcontent-%COMP%]   .card[_ngcontent-%COMP%] {\n  background: #fff;\n  border-radius: 0.5rem;\n  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);\n  padding: 1.5rem;\n}\n.right-col[_ngcontent-%COMP%]   .card[_ngcontent-%COMP%]   h3[_ngcontent-%COMP%] {\n  margin-top: 0;\n  margin-bottom: 1.25rem;\n  font-size: 1.125rem;\n  font-weight: 600;\n  color: #212529;\n}\n.right-col[_ngcontent-%COMP%]   .chart-card[_ngcontent-%COMP%]   .bar-chart-placeholder[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: flex-end;\n  justify-content: space-around;\n  height: 150px;\n  padding-bottom: 0.5rem;\n  border-bottom: 1px solid #e9ecef;\n  margin-bottom: 0.5rem;\n}\n.right-col[_ngcontent-%COMP%]   .chart-card[_ngcontent-%COMP%]   .bar-chart-placeholder[_ngcontent-%COMP%]   .bar[_ngcontent-%COMP%] {\n  width: 12%;\n  background: var(--sa-primary);\n  border-radius: 4px 4px 0 0;\n  transition: height 0.3s ease;\n  opacity: 0.85;\n}\n.right-col[_ngcontent-%COMP%]   .chart-card[_ngcontent-%COMP%]   .bar-chart-placeholder[_ngcontent-%COMP%]   .bar[_ngcontent-%COMP%]:hover {\n  opacity: 1;\n}\n.right-col[_ngcontent-%COMP%]   .chart-card[_ngcontent-%COMP%]   .chart-labels[_ngcontent-%COMP%] {\n  display: flex;\n  justify-content: space-around;\n  font-size: 0.75rem;\n  color: #6c757d;\n  font-weight: 500;\n}\n.right-col[_ngcontent-%COMP%]   .distribution-card[_ngcontent-%COMP%]   .progress-bar-multi[_ngcontent-%COMP%] {\n  display: flex;\n  height: 1rem;\n  border-radius: 1rem;\n  overflow: hidden;\n  margin-bottom: 1.5rem;\n  background: #e9ecef;\n}\n.right-col[_ngcontent-%COMP%]   .distribution-card[_ngcontent-%COMP%]   .progress-bar-multi[_ngcontent-%COMP%]   .segment[_ngcontent-%COMP%] {\n  height: 100%;\n}\n.right-col[_ngcontent-%COMP%]   .distribution-card[_ngcontent-%COMP%]   .progress-bar-multi[_ngcontent-%COMP%]   .segment.present[_ngcontent-%COMP%] {\n  background: #28a745;\n}\n.right-col[_ngcontent-%COMP%]   .distribution-card[_ngcontent-%COMP%]   .progress-bar-multi[_ngcontent-%COMP%]   .segment.late[_ngcontent-%COMP%] {\n  background: #ffc107;\n}\n.right-col[_ngcontent-%COMP%]   .distribution-card[_ngcontent-%COMP%]   .progress-bar-multi[_ngcontent-%COMP%]   .segment.excused[_ngcontent-%COMP%] {\n  background: #17a2b8;\n}\n.right-col[_ngcontent-%COMP%]   .distribution-card[_ngcontent-%COMP%]   .progress-bar-multi[_ngcontent-%COMP%]   .segment.absent[_ngcontent-%COMP%] {\n  background: #dc3545;\n}\n.right-col[_ngcontent-%COMP%]   .distribution-card[_ngcontent-%COMP%]   .distribution-legend[_ngcontent-%COMP%] {\n  display: flex;\n  flex-direction: column;\n  gap: 0.75rem;\n}\n.right-col[_ngcontent-%COMP%]   .distribution-card[_ngcontent-%COMP%]   .distribution-legend[_ngcontent-%COMP%]   .legend-item[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  font-size: 0.875rem;\n  color: #495057;\n}\n.right-col[_ngcontent-%COMP%]   .distribution-card[_ngcontent-%COMP%]   .distribution-legend[_ngcontent-%COMP%]   .legend-item[_ngcontent-%COMP%]   .dot[_ngcontent-%COMP%] {\n  width: 0.75rem;\n  height: 0.75rem;\n  border-radius: 50%;\n  margin-right: 0.75rem;\n  display: inline-block;\n}\n.right-col[_ngcontent-%COMP%]   .distribution-card[_ngcontent-%COMP%]   .distribution-legend[_ngcontent-%COMP%]   .legend-item[_ngcontent-%COMP%]   .dot.present[_ngcontent-%COMP%] {\n  background: #28a745;\n}\n.right-col[_ngcontent-%COMP%]   .distribution-card[_ngcontent-%COMP%]   .distribution-legend[_ngcontent-%COMP%]   .legend-item[_ngcontent-%COMP%]   .dot.late[_ngcontent-%COMP%] {\n  background: #ffc107;\n}\n.right-col[_ngcontent-%COMP%]   .distribution-card[_ngcontent-%COMP%]   .distribution-legend[_ngcontent-%COMP%]   .legend-item[_ngcontent-%COMP%]   .dot.excused[_ngcontent-%COMP%] {\n  background: #17a2b8;\n}\n.right-col[_ngcontent-%COMP%]   .distribution-card[_ngcontent-%COMP%]   .distribution-legend[_ngcontent-%COMP%]   .legend-item[_ngcontent-%COMP%]   .dot.absent[_ngcontent-%COMP%] {\n  background: #dc3545;\n}\n/*# sourceMappingURL=attendance.page.css.map */'], changeDetection: 0 });
  }
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(AttendancePage, [{
    type: Component,
    args: [{ selector: "app-attendance", standalone: true, imports: [CommonModule], changeDetection: ChangeDetectionStrategy.OnPush, template: `<div class="attendance-page">
  <header class="page-header">
    <div class="breadcrumb">Students &gt; Attendance</div>
    <h1 class="page-title">Student Attendance</h1>
  </header>

  <div class="top-section">
    <div class="controls-left">
      <div class="control-group">
        <label for="date-picker">Date</label>
        <input type="date" id="date-picker" [value]="'2026-09-12'" />
      </div>
      <div class="control-group">
        <label for="class-picker">Class</label>
        <select id="class-picker">
          <option>Grade 10 - Mathematics</option>
          <option>Grade 10 - Science</option>
        </select>
      </div>
    </div>
    <div class="stats-right">
      <div class="stat-card" *ngFor="let stat of stats" [ngClass]="stat.type">
        <div class="stat-value">{{ stat.value }}</div>
        <div class="stat-label">{{ stat.label }}</div>
      </div>
    </div>
  </div>

  <div class="content-layout">
    <main class="main-col">
      <div class="table-card">
        <div class="table-responsive">
          <table class="attendance-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Student Name</th>
                <th>Status Selection</th>
                <th>Time In</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let student of students">
                <td>{{ student.id }}</td>
                <td>{{ student.name }}</td>
                <td>
                  <div class="status-pills">
                    <button
                      class="pill present"
                      [class.active]="student.status === 'present'"
                      (click)="setStatus(student, 'present')"
                    >
                      Present
                    </button>
                    <button
                      class="pill absent"
                      [class.active]="student.status === 'absent'"
                      (click)="setStatus(student, 'absent')"
                    >
                      Absent
                    </button>
                    <button
                      class="pill late"
                      [class.active]="student.status === 'late'"
                      (click)="setStatus(student, 'late')"
                    >
                      Late
                    </button>
                    <button
                      class="pill excused"
                      [class.active]="student.status === 'excused'"
                      (click)="setStatus(student, 'excused')"
                    >
                      Excused
                    </button>
                  </div>
                </td>
                <td>{{ student.timeIn }}</td>
                <td>
                  <input
                    type="text"
                    placeholder="Notes..."
                    [value]="student.notes"
                    class="notes-input"
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="form-actions">
          <button class="btn-save">Save Attendance</button>
        </div>
      </div>
    </main>

    <aside class="right-col">
      <div class="card chart-card">
        <h3>Attendance Trend</h3>
        <div class="bar-chart-placeholder">
          <div class="bar" style="height: 60%"></div>
          <div class="bar" style="height: 80%"></div>
          <div class="bar" style="height: 90%"></div>
          <div class="bar" style="height: 75%"></div>
          <div class="bar" style="height: 95%"></div>
          <div class="bar" style="height: 100%"></div>
          <div class="bar" style="height: 85%"></div>
        </div>
        <div class="chart-labels">
          <span>M</span><span>T</span><span>W</span><span>T</span><span>F</span
          ><span>S</span><span>S</span>
        </div>
      </div>

      <div class="card distribution-card">
        <h3>Monthly Distribution</h3>
        <div class="progress-bar-multi">
          <div
            class="segment present"
            style="width: 85%"
            title="Present: 85%"
          ></div>
          <div class="segment late" style="width: 8%" title="Late: 8%"></div>
          <div
            class="segment excused"
            style="width: 4%"
            title="Excused: 4%"
          ></div>
          <div
            class="segment absent"
            style="width: 3%"
            title="Absent: 3%"
          ></div>
        </div>
        <div class="distribution-legend">
          <div class="legend-item">
            <span class="dot present"></span> Present (85%)
          </div>
          <div class="legend-item">
            <span class="dot late"></span> Late (8%)
          </div>
          <div class="legend-item">
            <span class="dot excused"></span> Excused (4%)
          </div>
          <div class="legend-item">
            <span class="dot absent"></span> Absent (3%)
          </div>
        </div>
      </div>
    </aside>
  </div>
</div>
`, styles: ['/* src/app/features/dashboard/pages/attendance/attendance.page.scss */\n:host {\n  display: block;\n  font-family:\n    system-ui,\n    -apple-system,\n    BlinkMacSystemFont,\n    "Segoe UI",\n    Roboto,\n    Oxygen,\n    Ubuntu,\n    Cantarell,\n    "Open Sans",\n    "Helvetica Neue",\n    sans-serif;\n  color: #333;\n  padding: 1.5rem;\n  background: #f4f6f8;\n  box-sizing: border-box;\n}\n* {\n  box-sizing: border-box;\n}\n.attendance-page {\n  max-width: 1400px;\n  margin: 0 auto;\n}\n.page-header {\n  margin-bottom: 2rem;\n}\n.page-header .breadcrumb {\n  font-size: 0.875rem;\n  color: #6c757d;\n  margin-bottom: 0.5rem;\n}\n.page-header .page-title {\n  font-size: 1.75rem;\n  font-weight: 600;\n  margin: 0;\n  color: #212529;\n}\n.top-section {\n  display: flex;\n  flex-wrap: wrap;\n  justify-content: space-between;\n  align-items: center;\n  gap: 1.5rem;\n  margin-bottom: 2rem;\n}\n.top-section .controls-left {\n  display: flex;\n  gap: 1rem;\n  flex-wrap: wrap;\n}\n.top-section .controls-left .control-group {\n  display: flex;\n  flex-direction: column;\n  gap: 0.375rem;\n}\n.top-section .controls-left .control-group label {\n  font-size: 0.875rem;\n  font-weight: 500;\n  color: #495057;\n}\n.top-section .controls-left .control-group input,\n.top-section .controls-left .control-group select {\n  padding: 0.5rem 0.75rem;\n  border: 1px solid #ced4da;\n  border-radius: 0.375rem;\n  font-size: 0.95rem;\n  outline: none;\n  background: #fff;\n  transition: border-color 0.2s;\n}\n.top-section .controls-left .control-group input:focus,\n.top-section .controls-left .control-group select:focus {\n  border-color: #80bdff;\n}\n.top-section .stats-right {\n  display: flex;\n  gap: 1rem;\n  flex-wrap: wrap;\n}\n.top-section .stats-right .stat-card {\n  background: #fff;\n  border: 1px solid #e9ecef;\n  border-radius: 0.5rem;\n  padding: 1rem 1.5rem;\n  min-width: 120px;\n  text-align: center;\n  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);\n}\n.top-section .stats-right .stat-card.success {\n  border: 2px solid #28a745;\n}\n.top-section .stats-right .stat-card.success .stat-value {\n  color: #28a745;\n}\n.top-section .stats-right .stat-card.danger .stat-value {\n  color: #dc3545;\n}\n.top-section .stats-right .stat-card.warning .stat-value {\n  color: #ffc107;\n}\n.top-section .stats-right .stat-card.info .stat-value {\n  color: #17a2b8;\n}\n.top-section .stats-right .stat-card .stat-value {\n  font-size: 1.5rem;\n  font-weight: 700;\n  margin-bottom: 0.25rem;\n  color: #212529;\n}\n.top-section .stats-right .stat-card .stat-label {\n  font-size: 0.75rem;\n  color: #6c757d;\n  text-transform: uppercase;\n  letter-spacing: 0.05em;\n}\n.content-layout {\n  display: flex;\n  flex-direction: column;\n  gap: 1.5rem;\n}\n@media (min-width: 992px) {\n  .content-layout {\n    flex-direction: row;\n    align-items: flex-start;\n  }\n}\n.main-col {\n  flex: 1 1 70%;\n  min-width: 0;\n}\n.main-col .table-card {\n  background: #fff;\n  border-radius: 0.5rem;\n  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);\n  overflow: hidden;\n}\n.main-col .table-responsive {\n  overflow-x: auto;\n}\n.main-col .attendance-table {\n  width: 100%;\n  border-collapse: collapse;\n  min-width: 700px;\n}\n.main-col .attendance-table th,\n.main-col .attendance-table td {\n  padding: 1rem 1.25rem;\n  text-align: left;\n  border-bottom: 1px solid #e9ecef;\n  vertical-align: middle;\n}\n.main-col .attendance-table th {\n  background: #f8f9fa;\n  font-weight: 600;\n  color: #495057;\n  font-size: 0.875rem;\n}\n.main-col .attendance-table td {\n  font-size: 0.95rem;\n}\n.main-col .attendance-table .status-pills {\n  display: flex;\n  gap: 0.375rem;\n}\n.main-col .attendance-table .status-pills .pill {\n  padding: 0.375rem 0.75rem;\n  border: 1px solid #ced4da;\n  background: #fff;\n  border-radius: 1rem;\n  font-size: 0.75rem;\n  font-weight: 500;\n  cursor: pointer;\n  color: #495057;\n  transition: all 0.2s;\n}\n.main-col .attendance-table .status-pills .pill:hover {\n  background: #f8f9fa;\n}\n.main-col .attendance-table .status-pills .pill.active {\n  border-color: transparent;\n  color: #fff;\n}\n.main-col .attendance-table .status-pills .pill.active.present {\n  background: #28a745;\n}\n.main-col .attendance-table .status-pills .pill.active.absent {\n  background: #dc3545;\n}\n.main-col .attendance-table .status-pills .pill.active.late {\n  background: #ffc107;\n  color: #212529;\n}\n.main-col .attendance-table .status-pills .pill.active.excused {\n  background: #17a2b8;\n}\n.main-col .attendance-table .notes-input {\n  width: 100%;\n  padding: 0.375rem 0.5rem;\n  border: 1px solid #ced4da;\n  border-radius: 0.25rem;\n  font-size: 0.875rem;\n  outline: none;\n}\n.main-col .attendance-table .notes-input:focus {\n  border-color: #80bdff;\n}\n.main-col .form-actions {\n  padding: 1.5rem;\n  display: flex;\n  justify-content: flex-end;\n  background: #fff;\n}\n.main-col .form-actions .btn-save {\n  background: #fd7e14;\n  color: #fff;\n  border: none;\n  padding: 0.625rem 1.5rem;\n  border-radius: 0.375rem;\n  font-size: 1rem;\n  font-weight: 600;\n  cursor: pointer;\n  transition: background 0.2s;\n  box-shadow: 0 2px 4px rgba(253, 126, 20, 0.2);\n}\n.main-col .form-actions .btn-save:hover {\n  background: #e86e10;\n}\n.right-col {\n  flex: 1 1 30%;\n  display: flex;\n  flex-direction: column;\n  gap: 1.5rem;\n}\n.right-col .card {\n  background: #fff;\n  border-radius: 0.5rem;\n  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);\n  padding: 1.5rem;\n}\n.right-col .card h3 {\n  margin-top: 0;\n  margin-bottom: 1.25rem;\n  font-size: 1.125rem;\n  font-weight: 600;\n  color: #212529;\n}\n.right-col .chart-card .bar-chart-placeholder {\n  display: flex;\n  align-items: flex-end;\n  justify-content: space-around;\n  height: 150px;\n  padding-bottom: 0.5rem;\n  border-bottom: 1px solid #e9ecef;\n  margin-bottom: 0.5rem;\n}\n.right-col .chart-card .bar-chart-placeholder .bar {\n  width: 12%;\n  background: var(--sa-primary);\n  border-radius: 4px 4px 0 0;\n  transition: height 0.3s ease;\n  opacity: 0.85;\n}\n.right-col .chart-card .bar-chart-placeholder .bar:hover {\n  opacity: 1;\n}\n.right-col .chart-card .chart-labels {\n  display: flex;\n  justify-content: space-around;\n  font-size: 0.75rem;\n  color: #6c757d;\n  font-weight: 500;\n}\n.right-col .distribution-card .progress-bar-multi {\n  display: flex;\n  height: 1rem;\n  border-radius: 1rem;\n  overflow: hidden;\n  margin-bottom: 1.5rem;\n  background: #e9ecef;\n}\n.right-col .distribution-card .progress-bar-multi .segment {\n  height: 100%;\n}\n.right-col .distribution-card .progress-bar-multi .segment.present {\n  background: #28a745;\n}\n.right-col .distribution-card .progress-bar-multi .segment.late {\n  background: #ffc107;\n}\n.right-col .distribution-card .progress-bar-multi .segment.excused {\n  background: #17a2b8;\n}\n.right-col .distribution-card .progress-bar-multi .segment.absent {\n  background: #dc3545;\n}\n.right-col .distribution-card .distribution-legend {\n  display: flex;\n  flex-direction: column;\n  gap: 0.75rem;\n}\n.right-col .distribution-card .distribution-legend .legend-item {\n  display: flex;\n  align-items: center;\n  font-size: 0.875rem;\n  color: #495057;\n}\n.right-col .distribution-card .distribution-legend .legend-item .dot {\n  width: 0.75rem;\n  height: 0.75rem;\n  border-radius: 50%;\n  margin-right: 0.75rem;\n  display: inline-block;\n}\n.right-col .distribution-card .distribution-legend .legend-item .dot.present {\n  background: #28a745;\n}\n.right-col .distribution-card .distribution-legend .legend-item .dot.late {\n  background: #ffc107;\n}\n.right-col .distribution-card .distribution-legend .legend-item .dot.excused {\n  background: #17a2b8;\n}\n.right-col .distribution-card .distribution-legend .legend-item .dot.absent {\n  background: #dc3545;\n}\n/*# sourceMappingURL=attendance.page.css.map */\n'] }]
  }], null, null);
})();
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && \u0275setClassDebugInfo(AttendancePage, { className: "AttendancePage", filePath: "src/app/features/dashboard/pages/attendance/attendance.page.ts", lineNumber: 12 });
})();
export {
  AttendancePage
};
//# sourceMappingURL=chunk-SEWRECNK.js.map
