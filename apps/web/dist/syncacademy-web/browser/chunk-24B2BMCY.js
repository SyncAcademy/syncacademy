import {
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
  ɵɵtemplate,
  ɵɵtext,
  ɵɵtextInterpolate
} from "./chunk-3IPAKGA7.js";
import "./chunk-QHQP2P2Z.js";

// src/app/features/dashboard/pages/gradebook/gradebook.page.ts
function GradebookPage_tr_61_Template(rf, ctx) {
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
    \u0275\u0275elementStart(7, "td");
    \u0275\u0275text(8);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(9, "td");
    \u0275\u0275text(10);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(11, "td");
    \u0275\u0275text(12);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(13, "td")(14, "span", 19);
    \u0275\u0275text(15);
    \u0275\u0275elementEnd()()();
  }
  if (rf & 2) {
    const student_r1 = ctx.$implicit;
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(student_r1.name);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(student_r1.assignment1);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(student_r1.assignment2);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(student_r1.midterm);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(student_r1.final);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(student_r1.total);
    \u0275\u0275advance(2);
    \u0275\u0275property("ngClass", student_r1.gradeColor);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate(student_r1.grade);
  }
}
var GradebookPage = class _GradebookPage {
  constructor() {
    this.students = [
      {
        name: "Alice Johnson",
        assignment1: 18,
        assignment2: 18,
        midterm: 35,
        final: 65,
        total: 85,
        grade: "A",
        gradeColor: "success"
      },
      {
        name: "Bob Smith",
        assignment1: 15,
        assignment2: 14,
        midterm: 30,
        final: 55,
        total: 72,
        grade: "B",
        gradeColor: "primary"
      },
      {
        name: "Charlie Brown",
        assignment1: 12,
        assignment2: 15,
        midterm: 25,
        final: 45,
        total: 60,
        grade: "C",
        gradeColor: "warning"
      },
      {
        name: "Diana Prince",
        assignment1: 19,
        assignment2: 19,
        midterm: 38,
        final: 68,
        total: 95,
        grade: "A",
        gradeColor: "success"
      },
      {
        name: "Evan Wright",
        assignment1: 10,
        assignment2: 12,
        midterm: 20,
        final: 40,
        total: 48,
        grade: "F",
        gradeColor: "danger"
      }
    ];
    this.averages = {
      assignment1: 14.8,
      assignment2: 15.6,
      midterm: 29.6,
      final: 54.6,
      total: 72
    };
  }
  static {
    this.\u0275fac = function GradebookPage_Factory(__ngFactoryType__) {
      return new (__ngFactoryType__ || _GradebookPage)();
    };
  }
  static {
    this.\u0275cmp = /* @__PURE__ */ \u0275\u0275defineComponent({ type: _GradebookPage, selectors: [["app-gradebook"]], decls: 77, vars: 6, consts: [[1, "page-container"], [1, "page-header"], [1, "breadcrumb"], [1, "page-title"], [1, "tabs-nav"], [1, "tab-btn"], [1, "tab-btn", "active"], [1, "toolbar"], [1, "filters"], ["aria-label", "Academic Year", 1, "filter-select"], ["aria-label", "Term", 1, "filter-select"], ["aria-label", "Class", 1, "filter-select"], ["aria-label", "Subject", 1, "filter-select"], [1, "actions"], [1, "action-btn"], [1, "table-scroll-wrapper"], [1, "gradebook-table"], [4, "ngFor", "ngForOf"], [1, "footer-label"], [1, "badge", 3, "ngClass"]], template: function GradebookPage_Template(rf, ctx) {
      if (rf & 1) {
        \u0275\u0275elementStart(0, "div", 0)(1, "header", 1)(2, "div", 2);
        \u0275\u0275text(3, "Academics > Gradebook");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(4, "h1", 3);
        \u0275\u0275text(5, "Gradebook");
        \u0275\u0275elementEnd()();
        \u0275\u0275elementStart(6, "nav", 4)(7, "button", 5);
        \u0275\u0275text(8, "Classes");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(9, "button", 5);
        \u0275\u0275text(10, "Subjects");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(11, "button", 5);
        \u0275\u0275text(12, "Timetable");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(13, "button", 5);
        \u0275\u0275text(14, "Examinations");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(15, "button", 5);
        \u0275\u0275text(16, "Marks Entry");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(17, "button", 6);
        \u0275\u0275text(18, "Gradebook");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(19, "button", 5);
        \u0275\u0275text(20, "Report Cards");
        \u0275\u0275elementEnd()();
        \u0275\u0275elementStart(21, "div", 7)(22, "div", 8)(23, "select", 9)(24, "option");
        \u0275\u0275text(25, "2026/2027");
        \u0275\u0275elementEnd()();
        \u0275\u0275elementStart(26, "select", 10)(27, "option");
        \u0275\u0275text(28, "Term 1");
        \u0275\u0275elementEnd()();
        \u0275\u0275elementStart(29, "select", 11)(30, "option");
        \u0275\u0275text(31, "Class 8A");
        \u0275\u0275elementEnd()();
        \u0275\u0275elementStart(32, "select", 12)(33, "option");
        \u0275\u0275text(34, "Mathematics");
        \u0275\u0275elementEnd()()();
        \u0275\u0275elementStart(35, "div", 13)(36, "button", 14);
        \u0275\u0275text(37, "Export PDF");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(38, "button", 14);
        \u0275\u0275text(39, "Export Excel");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(40, "button", 14);
        \u0275\u0275text(41, "Print");
        \u0275\u0275elementEnd()()();
        \u0275\u0275elementStart(42, "div", 15)(43, "table", 16)(44, "thead")(45, "tr")(46, "th");
        \u0275\u0275text(47, "Student Name");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(48, "th");
        \u0275\u0275text(49, "Assignment 1 (20)");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(50, "th");
        \u0275\u0275text(51, "Assignment 2 (20)");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(52, "th");
        \u0275\u0275text(53, "Mid-Term (40)");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(54, "th");
        \u0275\u0275text(55, "Final Exam (70)");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(56, "th");
        \u0275\u0275text(57, "Total (100)");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(58, "th");
        \u0275\u0275text(59, "Grade");
        \u0275\u0275elementEnd()()();
        \u0275\u0275elementStart(60, "tbody");
        \u0275\u0275template(61, GradebookPage_tr_61_Template, 16, 8, "tr", 17);
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(62, "tfoot")(63, "tr")(64, "td", 18);
        \u0275\u0275text(65, "Class Average: 73.8%");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(66, "td");
        \u0275\u0275text(67);
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(68, "td");
        \u0275\u0275text(69);
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(70, "td");
        \u0275\u0275text(71);
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(72, "td");
        \u0275\u0275text(73);
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(74, "td");
        \u0275\u0275text(75);
        \u0275\u0275elementEnd();
        \u0275\u0275element(76, "td");
        \u0275\u0275elementEnd()()()()();
      }
      if (rf & 2) {
        \u0275\u0275advance(61);
        \u0275\u0275property("ngForOf", ctx.students);
        \u0275\u0275advance(6);
        \u0275\u0275textInterpolate(ctx.averages.assignment1);
        \u0275\u0275advance(2);
        \u0275\u0275textInterpolate(ctx.averages.assignment2);
        \u0275\u0275advance(2);
        \u0275\u0275textInterpolate(ctx.averages.midterm);
        \u0275\u0275advance(2);
        \u0275\u0275textInterpolate(ctx.averages.final);
        \u0275\u0275advance(2);
        \u0275\u0275textInterpolate(ctx.averages.total);
      }
    }, dependencies: [CommonModule, NgClass, NgForOf], styles: ['\n\n.page-container[_ngcontent-%COMP%] {\n  display: flex;\n  flex-direction: column;\n  height: 100%;\n  padding: 24px;\n  background-color: #f8fafc;\n  font-family:\n    -apple-system,\n    BlinkMacSystemFont,\n    "Segoe UI",\n    Roboto,\n    Helvetica,\n    Arial,\n    sans-serif;\n}\n.page-header[_ngcontent-%COMP%] {\n  margin-bottom: 24px;\n}\n.page-header[_ngcontent-%COMP%]   .breadcrumb[_ngcontent-%COMP%] {\n  font-size: 14px;\n  color: #64748b;\n  margin-bottom: 8px;\n}\n.page-header[_ngcontent-%COMP%]   .page-title[_ngcontent-%COMP%] {\n  font-size: 24px;\n  font-weight: 600;\n  color: #0f172a;\n  margin: 0;\n}\n.tabs-nav[_ngcontent-%COMP%] {\n  display: flex;\n  overflow-x: auto;\n  border-bottom: 1px solid #e2e8f0;\n  margin-bottom: 24px;\n  scrollbar-width: none;\n}\n.tabs-nav[_ngcontent-%COMP%]::-webkit-scrollbar {\n  display: none;\n}\n.tabs-nav[_ngcontent-%COMP%]   .tab-btn[_ngcontent-%COMP%] {\n  background: none;\n  border: none;\n  padding: 12px 16px;\n  font-size: 14px;\n  font-weight: 500;\n  color: #64748b;\n  cursor: pointer;\n  white-space: nowrap;\n  border-bottom: 2px solid transparent;\n  transition: all 0.2s;\n}\n.tabs-nav[_ngcontent-%COMP%]   .tab-btn[_ngcontent-%COMP%]:hover {\n  color: #334155;\n}\n.tabs-nav[_ngcontent-%COMP%]   .tab-btn.active[_ngcontent-%COMP%] {\n  color: #f97316;\n  border-bottom-color: #f97316;\n}\n.toolbar[_ngcontent-%COMP%] {\n  display: flex;\n  flex-wrap: wrap;\n  justify-content: space-between;\n  align-items: center;\n  gap: 16px;\n  margin-bottom: 24px;\n}\n.toolbar[_ngcontent-%COMP%]   .filters[_ngcontent-%COMP%] {\n  display: flex;\n  flex-wrap: wrap;\n  gap: 12px;\n}\n.toolbar[_ngcontent-%COMP%]   .filters[_ngcontent-%COMP%]   .filter-select[_ngcontent-%COMP%] {\n  padding: 8px 32px 8px 12px;\n  font-size: 14px;\n  color: #334155;\n  background-color: #ffffff;\n  border: 1px solid #cbd5e1;\n  border-radius: 6px;\n  appearance: none;\n  background-image: url(data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%2364748b%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E);\n  background-repeat: no-repeat;\n  background-position: right 12px top 50%;\n  background-size: 10px auto;\n  outline: none;\n}\n.toolbar[_ngcontent-%COMP%]   .filters[_ngcontent-%COMP%]   .filter-select[_ngcontent-%COMP%]:focus {\n  border-color: #f97316;\n  box-shadow: 0 0 0 2px rgba(249, 115, 22, 0.1);\n}\n.toolbar[_ngcontent-%COMP%]   .actions[_ngcontent-%COMP%] {\n  display: flex;\n  gap: 12px;\n}\n.toolbar[_ngcontent-%COMP%]   .actions[_ngcontent-%COMP%]   .action-btn[_ngcontent-%COMP%] {\n  padding: 8px 16px;\n  font-size: 14px;\n  font-weight: 500;\n  color: #475569;\n  background-color: #ffffff;\n  border: 1px solid #cbd5e1;\n  border-radius: 6px;\n  cursor: pointer;\n  transition: all 0.2s;\n}\n.toolbar[_ngcontent-%COMP%]   .actions[_ngcontent-%COMP%]   .action-btn[_ngcontent-%COMP%]:hover {\n  background-color: #f1f5f9;\n  color: #0f172a;\n}\n.table-scroll-wrapper[_ngcontent-%COMP%] {\n  overflow-x: auto;\n  background-color: #ffffff;\n  border-radius: 8px;\n  border: 1px solid #e2e8f0;\n  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);\n}\n.table-scroll-wrapper[_ngcontent-%COMP%]   .gradebook-table[_ngcontent-%COMP%] {\n  width: 100%;\n  min-width: 800px;\n  border-collapse: collapse;\n  text-align: left;\n}\n.table-scroll-wrapper[_ngcontent-%COMP%]   .gradebook-table[_ngcontent-%COMP%]   th[_ngcontent-%COMP%], \n.table-scroll-wrapper[_ngcontent-%COMP%]   .gradebook-table[_ngcontent-%COMP%]   td[_ngcontent-%COMP%] {\n  padding: 16px;\n  border-bottom: 1px solid #e2e8f0;\n  white-space: nowrap;\n}\n.table-scroll-wrapper[_ngcontent-%COMP%]   .gradebook-table[_ngcontent-%COMP%]   th[_ngcontent-%COMP%] {\n  font-size: 13px;\n  font-weight: 600;\n  color: #64748b;\n  text-transform: uppercase;\n  letter-spacing: 0.05em;\n  background-color: #f8fafc;\n}\n.table-scroll-wrapper[_ngcontent-%COMP%]   .gradebook-table[_ngcontent-%COMP%]   td[_ngcontent-%COMP%] {\n  font-size: 14px;\n  color: #334155;\n}\n.table-scroll-wrapper[_ngcontent-%COMP%]   .gradebook-table[_ngcontent-%COMP%]   tbody[_ngcontent-%COMP%]   tr[_ngcontent-%COMP%]:last-child   td[_ngcontent-%COMP%] {\n  border-bottom: none;\n}\n.table-scroll-wrapper[_ngcontent-%COMP%]   .gradebook-table[_ngcontent-%COMP%]   tbody[_ngcontent-%COMP%]   tr[_ngcontent-%COMP%]:hover {\n  background-color: #f8fafc;\n}\n.table-scroll-wrapper[_ngcontent-%COMP%]   .gradebook-table[_ngcontent-%COMP%]   tfoot[_ngcontent-%COMP%] {\n  background-color: #f1f5f9;\n}\n.table-scroll-wrapper[_ngcontent-%COMP%]   .gradebook-table[_ngcontent-%COMP%]   tfoot[_ngcontent-%COMP%]   td[_ngcontent-%COMP%] {\n  font-weight: 600;\n  color: #0f172a;\n  border-bottom: none;\n  border-top: 2px solid #cbd5e1;\n}\n.table-scroll-wrapper[_ngcontent-%COMP%]   .gradebook-table[_ngcontent-%COMP%]   tfoot[_ngcontent-%COMP%]   .footer-label[_ngcontent-%COMP%] {\n  color: #475569;\n}\n.table-scroll-wrapper[_ngcontent-%COMP%]   .gradebook-table[_ngcontent-%COMP%]   .badge[_ngcontent-%COMP%] {\n  display: inline-flex;\n  align-items: center;\n  justify-content: center;\n  padding: 4px 10px;\n  font-size: 12px;\n  font-weight: 600;\n  border-radius: 9999px;\n}\n.table-scroll-wrapper[_ngcontent-%COMP%]   .gradebook-table[_ngcontent-%COMP%]   .badge.success[_ngcontent-%COMP%] {\n  background-color: #dcfce7;\n  color: #166534;\n}\n.table-scroll-wrapper[_ngcontent-%COMP%]   .gradebook-table[_ngcontent-%COMP%]   .badge.primary[_ngcontent-%COMP%] {\n  background-color: #dbeafe;\n  color: #1e40af;\n}\n.table-scroll-wrapper[_ngcontent-%COMP%]   .gradebook-table[_ngcontent-%COMP%]   .badge.warning[_ngcontent-%COMP%] {\n  background-color: #fef9c3;\n  color: #854d0e;\n}\n.table-scroll-wrapper[_ngcontent-%COMP%]   .gradebook-table[_ngcontent-%COMP%]   .badge.danger[_ngcontent-%COMP%] {\n  background-color: #fee2e2;\n  color: #991b1b;\n}\n@media (max-width: 768px) {\n  .page-container[_ngcontent-%COMP%] {\n    padding: 16px;\n  }\n  .toolbar[_ngcontent-%COMP%] {\n    flex-direction: column;\n    align-items: stretch;\n  }\n  .toolbar[_ngcontent-%COMP%]   .filters[_ngcontent-%COMP%], \n   .toolbar[_ngcontent-%COMP%]   .actions[_ngcontent-%COMP%] {\n    justify-content: stretch;\n  }\n  .toolbar[_ngcontent-%COMP%]   .filters[_ngcontent-%COMP%]   .filter-select[_ngcontent-%COMP%], \n   .toolbar[_ngcontent-%COMP%]   .filters[_ngcontent-%COMP%]   .action-btn[_ngcontent-%COMP%], \n   .toolbar[_ngcontent-%COMP%]   .actions[_ngcontent-%COMP%]   .filter-select[_ngcontent-%COMP%], \n   .toolbar[_ngcontent-%COMP%]   .actions[_ngcontent-%COMP%]   .action-btn[_ngcontent-%COMP%] {\n    flex: 1;\n    min-width: calc(50% - 6px);\n  }\n}\n/*# sourceMappingURL=gradebook.page.css.map */'] });
  }
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(GradebookPage, [{
    type: Component,
    args: [{ selector: "app-gradebook", standalone: true, imports: [CommonModule], template: '<div class="page-container">\n  <!-- Header -->\n  <header class="page-header">\n    <div class="breadcrumb">Academics &gt; Gradebook</div>\n    <h1 class="page-title">Gradebook</h1>\n  </header>\n\n  <!-- Horizontal Tabs -->\n  <nav class="tabs-nav">\n    <button class="tab-btn">Classes</button>\n    <button class="tab-btn">Subjects</button>\n    <button class="tab-btn">Timetable</button>\n    <button class="tab-btn">Examinations</button>\n    <button class="tab-btn">Marks Entry</button>\n    <button class="tab-btn active">Gradebook</button>\n    <button class="tab-btn">Report Cards</button>\n  </nav>\n\n  <!-- Toolbar -->\n  <div class="toolbar">\n    <div class="filters">\n      <select class="filter-select" aria-label="Academic Year">\n        <option>2026/2027</option>\n      </select>\n      <select class="filter-select" aria-label="Term">\n        <option>Term 1</option>\n      </select>\n      <select class="filter-select" aria-label="Class">\n        <option>Class 8A</option>\n      </select>\n      <select class="filter-select" aria-label="Subject">\n        <option>Mathematics</option>\n      </select>\n    </div>\n    <div class="actions">\n      <button class="action-btn">Export PDF</button>\n      <button class="action-btn">Export Excel</button>\n      <button class="action-btn">Print</button>\n    </div>\n  </div>\n\n  <!-- Table -->\n  <div class="table-scroll-wrapper">\n    <table class="gradebook-table">\n      <thead>\n        <tr>\n          <th>Student Name</th>\n          <th>Assignment 1 (20)</th>\n          <th>Assignment 2 (20)</th>\n          <th>Mid-Term (40)</th>\n          <th>Final Exam (70)</th>\n          <th>Total (100)</th>\n          <th>Grade</th>\n        </tr>\n      </thead>\n      <tbody>\n        <tr *ngFor="let student of students">\n          <td>{{ student.name }}</td>\n          <td>{{ student.assignment1 }}</td>\n          <td>{{ student.assignment2 }}</td>\n          <td>{{ student.midterm }}</td>\n          <td>{{ student.final }}</td>\n          <td>{{ student.total }}</td>\n          <td>\n            <span class="badge" [ngClass]="student.gradeColor"\n              >{{ student.grade }}</span\n            >\n          </td>\n        </tr>\n      </tbody>\n      <tfoot>\n        <tr>\n          <td class="footer-label">Class Average: 73.8%</td>\n          <td>{{ averages.assignment1 }}</td>\n          <td>{{ averages.assignment2 }}</td>\n          <td>{{ averages.midterm }}</td>\n          <td>{{ averages.final }}</td>\n          <td>{{ averages.total }}</td>\n          <td></td>\n        </tr>\n      </tfoot>\n    </table>\n  </div>\n</div>\n', styles: ['/* src/app/features/dashboard/pages/gradebook/gradebook.page.scss */\n.page-container {\n  display: flex;\n  flex-direction: column;\n  height: 100%;\n  padding: 24px;\n  background-color: #f8fafc;\n  font-family:\n    -apple-system,\n    BlinkMacSystemFont,\n    "Segoe UI",\n    Roboto,\n    Helvetica,\n    Arial,\n    sans-serif;\n}\n.page-header {\n  margin-bottom: 24px;\n}\n.page-header .breadcrumb {\n  font-size: 14px;\n  color: #64748b;\n  margin-bottom: 8px;\n}\n.page-header .page-title {\n  font-size: 24px;\n  font-weight: 600;\n  color: #0f172a;\n  margin: 0;\n}\n.tabs-nav {\n  display: flex;\n  overflow-x: auto;\n  border-bottom: 1px solid #e2e8f0;\n  margin-bottom: 24px;\n  scrollbar-width: none;\n}\n.tabs-nav::-webkit-scrollbar {\n  display: none;\n}\n.tabs-nav .tab-btn {\n  background: none;\n  border: none;\n  padding: 12px 16px;\n  font-size: 14px;\n  font-weight: 500;\n  color: #64748b;\n  cursor: pointer;\n  white-space: nowrap;\n  border-bottom: 2px solid transparent;\n  transition: all 0.2s;\n}\n.tabs-nav .tab-btn:hover {\n  color: #334155;\n}\n.tabs-nav .tab-btn.active {\n  color: #f97316;\n  border-bottom-color: #f97316;\n}\n.toolbar {\n  display: flex;\n  flex-wrap: wrap;\n  justify-content: space-between;\n  align-items: center;\n  gap: 16px;\n  margin-bottom: 24px;\n}\n.toolbar .filters {\n  display: flex;\n  flex-wrap: wrap;\n  gap: 12px;\n}\n.toolbar .filters .filter-select {\n  padding: 8px 32px 8px 12px;\n  font-size: 14px;\n  color: #334155;\n  background-color: #ffffff;\n  border: 1px solid #cbd5e1;\n  border-radius: 6px;\n  appearance: none;\n  background-image: url(data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%2364748b%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E);\n  background-repeat: no-repeat;\n  background-position: right 12px top 50%;\n  background-size: 10px auto;\n  outline: none;\n}\n.toolbar .filters .filter-select:focus {\n  border-color: #f97316;\n  box-shadow: 0 0 0 2px rgba(249, 115, 22, 0.1);\n}\n.toolbar .actions {\n  display: flex;\n  gap: 12px;\n}\n.toolbar .actions .action-btn {\n  padding: 8px 16px;\n  font-size: 14px;\n  font-weight: 500;\n  color: #475569;\n  background-color: #ffffff;\n  border: 1px solid #cbd5e1;\n  border-radius: 6px;\n  cursor: pointer;\n  transition: all 0.2s;\n}\n.toolbar .actions .action-btn:hover {\n  background-color: #f1f5f9;\n  color: #0f172a;\n}\n.table-scroll-wrapper {\n  overflow-x: auto;\n  background-color: #ffffff;\n  border-radius: 8px;\n  border: 1px solid #e2e8f0;\n  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);\n}\n.table-scroll-wrapper .gradebook-table {\n  width: 100%;\n  min-width: 800px;\n  border-collapse: collapse;\n  text-align: left;\n}\n.table-scroll-wrapper .gradebook-table th,\n.table-scroll-wrapper .gradebook-table td {\n  padding: 16px;\n  border-bottom: 1px solid #e2e8f0;\n  white-space: nowrap;\n}\n.table-scroll-wrapper .gradebook-table th {\n  font-size: 13px;\n  font-weight: 600;\n  color: #64748b;\n  text-transform: uppercase;\n  letter-spacing: 0.05em;\n  background-color: #f8fafc;\n}\n.table-scroll-wrapper .gradebook-table td {\n  font-size: 14px;\n  color: #334155;\n}\n.table-scroll-wrapper .gradebook-table tbody tr:last-child td {\n  border-bottom: none;\n}\n.table-scroll-wrapper .gradebook-table tbody tr:hover {\n  background-color: #f8fafc;\n}\n.table-scroll-wrapper .gradebook-table tfoot {\n  background-color: #f1f5f9;\n}\n.table-scroll-wrapper .gradebook-table tfoot td {\n  font-weight: 600;\n  color: #0f172a;\n  border-bottom: none;\n  border-top: 2px solid #cbd5e1;\n}\n.table-scroll-wrapper .gradebook-table tfoot .footer-label {\n  color: #475569;\n}\n.table-scroll-wrapper .gradebook-table .badge {\n  display: inline-flex;\n  align-items: center;\n  justify-content: center;\n  padding: 4px 10px;\n  font-size: 12px;\n  font-weight: 600;\n  border-radius: 9999px;\n}\n.table-scroll-wrapper .gradebook-table .badge.success {\n  background-color: #dcfce7;\n  color: #166534;\n}\n.table-scroll-wrapper .gradebook-table .badge.primary {\n  background-color: #dbeafe;\n  color: #1e40af;\n}\n.table-scroll-wrapper .gradebook-table .badge.warning {\n  background-color: #fef9c3;\n  color: #854d0e;\n}\n.table-scroll-wrapper .gradebook-table .badge.danger {\n  background-color: #fee2e2;\n  color: #991b1b;\n}\n@media (max-width: 768px) {\n  .page-container {\n    padding: 16px;\n  }\n  .toolbar {\n    flex-direction: column;\n    align-items: stretch;\n  }\n  .toolbar .filters,\n  .toolbar .actions {\n    justify-content: stretch;\n  }\n  .toolbar .filters .filter-select,\n  .toolbar .filters .action-btn,\n  .toolbar .actions .filter-select,\n  .toolbar .actions .action-btn {\n    flex: 1;\n    min-width: calc(50% - 6px);\n  }\n}\n/*# sourceMappingURL=gradebook.page.css.map */\n'] }]
  }], null, null);
})();
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && \u0275setClassDebugInfo(GradebookPage, { className: "GradebookPage", filePath: "src/app/features/dashboard/pages/gradebook/gradebook.page.ts", lineNumber: 11 });
})();
export {
  GradebookPage
};
//# sourceMappingURL=chunk-24B2BMCY.js.map
