import {
  CommonModule,
  Component,
  DecimalPipe,
  NgClass,
  NgForOf,
  setClassMetadata,
  ɵsetClassDebugInfo,
  ɵɵadvance,
  ɵɵdefineComponent,
  ɵɵelement,
  ɵɵelementEnd,
  ɵɵelementStart,
  ɵɵpipe,
  ɵɵpipeBind1,
  ɵɵproperty,
  ɵɵtemplate,
  ɵɵtext,
  ɵɵtextInterpolate,
  ɵɵtextInterpolate1
} from "./chunk-3IPAKGA7.js";
import "./chunk-QHQP2P2Z.js";

// src/app/features/dashboard/pages/finance/finance.page.ts
function FinancePage_tr_92_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "tr")(1, "td");
    \u0275\u0275text(2);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "td");
    \u0275\u0275text(4);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(5, "td");
    \u0275\u0275text(6);
    \u0275\u0275pipe(7, "number");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(8, "td");
    \u0275\u0275text(9);
    \u0275\u0275pipe(10, "number");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(11, "td");
    \u0275\u0275text(12);
    \u0275\u0275pipe(13, "number");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(14, "td")(15, "span", 30);
    \u0275\u0275text(16);
    \u0275\u0275elementEnd()()();
  }
  if (rf & 2) {
    const student_r1 = ctx.$implicit;
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(student_r1.name);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(student_r1.class);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(7, 7, student_r1.amountDue));
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(10, 9, student_r1.amountPaid));
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate(\u0275\u0275pipeBind1(13, 11, student_r1.balance));
    \u0275\u0275advance(3);
    \u0275\u0275property("ngClass", student_r1.status.toLowerCase());
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", student_r1.status, " ");
  }
}
var FinancePage = class _FinancePage {
  constructor() {
    this.students = [
      { name: "John Doe", class: "Form 1", amountDue: 15e5, amountPaid: 15e5, balance: 0, status: "Paid" },
      { name: "Jane Smith", class: "Form 2", amountDue: 18e5, amountPaid: 9e5, balance: 9e5, status: "Partial" },
      { name: "Alice Johnson", class: "Form 3", amountDue: 2e6, amountPaid: 0, balance: 2e6, status: "Unpaid" },
      { name: "Bob Williams", class: "Form 1", amountDue: 15e5, amountPaid: 1e6, balance: 5e5, status: "Partial" },
      { name: "Charlie Brown", class: "Form 4", amountDue: 25e5, amountPaid: 25e5, balance: 0, status: "Paid" }
    ];
  }
  static {
    this.\u0275fac = function FinancePage_Factory(__ngFactoryType__) {
      return new (__ngFactoryType__ || _FinancePage)();
    };
  }
  static {
    this.\u0275cmp = /* @__PURE__ */ \u0275\u0275defineComponent({ type: _FinancePage, selectors: [["app-finance-page"]], decls: 121, vars: 1, consts: [[1, "finance-page-container"], [1, "page-header"], [1, "stat-cards"], [1, "card"], [1, "card-title"], [1, "card-value"], [1, "card", "critical"], [1, "filters-toolbar"], [1, "filter-group"], ["for", "academic-year"], ["id", "academic-year"], ["for", "term"], ["id", "term"], ["for", "class"], ["id", "class"], ["for", "status"], ["id", "status"], [1, "main-content-grid"], [1, "left-column"], [1, "table-card"], [1, "table-scroll-wrapper"], [4, "ngFor", "ngForOf"], [1, "right-column"], [1, "progress-card"], [1, "progress-item"], [1, "progress-header"], [1, "progress-track"], [1, "progress-fill", 2, "width", "95%"], [1, "progress-fill", 2, "width", "80%"], [1, "progress-fill", 2, "width", "45%"], [1, "badge", 3, "ngClass"]], template: function FinancePage_Template(rf, ctx) {
      if (rf & 1) {
        \u0275\u0275elementStart(0, "div", 0)(1, "header", 1)(2, "h1");
        \u0275\u0275text(3, "Finance & Tuition Office");
        \u0275\u0275elementEnd()();
        \u0275\u0275elementStart(4, "section", 2)(5, "div", 3)(6, "div", 4);
        \u0275\u0275text(7, "Total Projected Fees");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(8, "div", 5);
        \u0275\u0275text(9, "TZS 102,860,000");
        \u0275\u0275elementEnd()();
        \u0275\u0275elementStart(10, "div", 3)(11, "div", 4);
        \u0275\u0275text(12, "Collected Tuition");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(13, "div", 5);
        \u0275\u0275text(14, "TZS 84,520,000");
        \u0275\u0275elementEnd()();
        \u0275\u0275elementStart(15, "div", 3)(16, "div", 4);
        \u0275\u0275text(17, "Outstanding Balance");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(18, "div", 5);
        \u0275\u0275text(19, "TZS 18,340,000");
        \u0275\u0275elementEnd()();
        \u0275\u0275elementStart(20, "div", 6)(21, "div", 4);
        \u0275\u0275text(22, "Overdue & Critical");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(23, "div", 5);
        \u0275\u0275text(24, "TZS 5,200,000");
        \u0275\u0275elementEnd()()();
        \u0275\u0275elementStart(25, "section", 7)(26, "div", 8)(27, "label", 9);
        \u0275\u0275text(28, "Academic Year");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(29, "select", 10)(30, "option");
        \u0275\u0275text(31, "2023/2024");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(32, "option");
        \u0275\u0275text(33, "2024/2025");
        \u0275\u0275elementEnd()()();
        \u0275\u0275elementStart(34, "div", 8)(35, "label", 11);
        \u0275\u0275text(36, "Term");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(37, "select", 12)(38, "option");
        \u0275\u0275text(39, "Term 1");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(40, "option");
        \u0275\u0275text(41, "Term 2");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(42, "option");
        \u0275\u0275text(43, "Term 3");
        \u0275\u0275elementEnd()()();
        \u0275\u0275elementStart(44, "div", 8)(45, "label", 13);
        \u0275\u0275text(46, "Class");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(47, "select", 14)(48, "option");
        \u0275\u0275text(49, "All Classes");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(50, "option");
        \u0275\u0275text(51, "Form 1");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(52, "option");
        \u0275\u0275text(53, "Form 2");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(54, "option");
        \u0275\u0275text(55, "Form 3");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(56, "option");
        \u0275\u0275text(57, "Form 4");
        \u0275\u0275elementEnd()()();
        \u0275\u0275elementStart(58, "div", 8)(59, "label", 15);
        \u0275\u0275text(60, "Status");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(61, "select", 16)(62, "option");
        \u0275\u0275text(63, "All Statuses");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(64, "option");
        \u0275\u0275text(65, "Paid");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(66, "option");
        \u0275\u0275text(67, "Partial");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(68, "option");
        \u0275\u0275text(69, "Unpaid");
        \u0275\u0275elementEnd()()()();
        \u0275\u0275elementStart(70, "div", 17)(71, "div", 18)(72, "div", 19)(73, "h2");
        \u0275\u0275text(74, "Student Balances");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(75, "div", 20)(76, "table")(77, "thead")(78, "tr")(79, "th");
        \u0275\u0275text(80, "Student Name");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(81, "th");
        \u0275\u0275text(82, "Class");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(83, "th");
        \u0275\u0275text(84, "Amount Due (TZS)");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(85, "th");
        \u0275\u0275text(86, "Amount Paid (TZS)");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(87, "th");
        \u0275\u0275text(88, "Balance (TZS)");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(89, "th");
        \u0275\u0275text(90, "Status");
        \u0275\u0275elementEnd()()();
        \u0275\u0275elementStart(91, "tbody");
        \u0275\u0275template(92, FinancePage_tr_92_Template, 17, 13, "tr", 21);
        \u0275\u0275elementEnd()()()()();
        \u0275\u0275elementStart(93, "div", 22)(94, "div", 23)(95, "h2");
        \u0275\u0275text(96, "Fee Collection vs Target");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(97, "div", 24)(98, "div", 25)(99, "span");
        \u0275\u0275text(100, "Term 1");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(101, "span");
        \u0275\u0275text(102, "95%");
        \u0275\u0275elementEnd()();
        \u0275\u0275elementStart(103, "div", 26);
        \u0275\u0275element(104, "div", 27);
        \u0275\u0275elementEnd()();
        \u0275\u0275elementStart(105, "div", 24)(106, "div", 25)(107, "span");
        \u0275\u0275text(108, "Term 2");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(109, "span");
        \u0275\u0275text(110, "80%");
        \u0275\u0275elementEnd()();
        \u0275\u0275elementStart(111, "div", 26);
        \u0275\u0275element(112, "div", 28);
        \u0275\u0275elementEnd()();
        \u0275\u0275elementStart(113, "div", 24)(114, "div", 25)(115, "span");
        \u0275\u0275text(116, "Term 3");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(117, "span");
        \u0275\u0275text(118, "45%");
        \u0275\u0275elementEnd()();
        \u0275\u0275elementStart(119, "div", 26);
        \u0275\u0275element(120, "div", 29);
        \u0275\u0275elementEnd()()()()()();
      }
      if (rf & 2) {
        \u0275\u0275advance(92);
        \u0275\u0275property("ngForOf", ctx.students);
      }
    }, dependencies: [CommonModule, NgClass, NgForOf, DecimalPipe], styles: ['\n\n.finance-page-container[_ngcontent-%COMP%] {\n  padding: 24px;\n  background: #f4f6f8;\n  font-family:\n    -apple-system,\n    BlinkMacSystemFont,\n    "Segoe UI",\n    Roboto,\n    Helvetica,\n    Arial,\n    sans-serif;\n  box-sizing: border-box;\n}\n.finance-page-container[_ngcontent-%COMP%]   *[_ngcontent-%COMP%] {\n  box-sizing: border-box;\n}\n.page-header[_ngcontent-%COMP%] {\n  margin-bottom: 24px;\n}\n.page-header[_ngcontent-%COMP%]   h1[_ngcontent-%COMP%] {\n  margin: 0;\n  font-size: 24px;\n  color: #333;\n  font-weight: 600;\n}\n.stat-cards[_ngcontent-%COMP%] {\n  display: grid;\n  grid-template-columns: repeat(1, 1fr);\n  gap: 16px;\n  margin-bottom: 24px;\n}\n@media (min-width: 600px) {\n  .stat-cards[_ngcontent-%COMP%] {\n    grid-template-columns: repeat(2, 1fr);\n  }\n}\n@media (min-width: 1024px) {\n  .stat-cards[_ngcontent-%COMP%] {\n    grid-template-columns: repeat(4, 1fr);\n  }\n}\n.stat-cards[_ngcontent-%COMP%]   .card[_ngcontent-%COMP%] {\n  background: #fff;\n  padding: 20px;\n  border-radius: 8px;\n  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);\n  border-left: 4px solid var(--sa-primary);\n}\n.stat-cards[_ngcontent-%COMP%]   .card.critical[_ngcontent-%COMP%] {\n  border-left-color: #dc3545;\n}\n.stat-cards[_ngcontent-%COMP%]   .card[_ngcontent-%COMP%]   .card-title[_ngcontent-%COMP%] {\n  font-size: 14px;\n  color: #666;\n  margin-bottom: 8px;\n  text-transform: uppercase;\n  letter-spacing: 0.5px;\n}\n.stat-cards[_ngcontent-%COMP%]   .card[_ngcontent-%COMP%]   .card-value[_ngcontent-%COMP%] {\n  font-size: 24px;\n  font-weight: 700;\n  color: #333;\n}\n.filters-toolbar[_ngcontent-%COMP%] {\n  display: flex;\n  flex-wrap: wrap;\n  gap: 16px;\n  margin-bottom: 24px;\n  background: #fff;\n  padding: 16px;\n  border-radius: 8px;\n  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);\n}\n.filters-toolbar[_ngcontent-%COMP%]   .filter-group[_ngcontent-%COMP%] {\n  display: flex;\n  flex-direction: column;\n  min-width: 150px;\n  flex: 1;\n}\n.filters-toolbar[_ngcontent-%COMP%]   .filter-group[_ngcontent-%COMP%]   label[_ngcontent-%COMP%] {\n  font-size: 12px;\n  color: #666;\n  margin-bottom: 4px;\n  font-weight: 500;\n}\n.filters-toolbar[_ngcontent-%COMP%]   .filter-group[_ngcontent-%COMP%]   select[_ngcontent-%COMP%] {\n  padding: 8px 12px;\n  border: 1px solid #ddd;\n  border-radius: 4px;\n  font-size: 14px;\n  color: #333;\n  background: #fafafa;\n  outline: none;\n}\n.filters-toolbar[_ngcontent-%COMP%]   .filter-group[_ngcontent-%COMP%]   select[_ngcontent-%COMP%]:focus {\n  border-color: var(--sa-primary);\n}\n.main-content-grid[_ngcontent-%COMP%] {\n  display: grid;\n  grid-template-columns: 1fr;\n  gap: 24px;\n}\n@media (min-width: 1024px) {\n  .main-content-grid[_ngcontent-%COMP%] {\n    grid-template-columns: 7fr 3fr;\n  }\n}\n.table-card[_ngcontent-%COMP%], \n.progress-card[_ngcontent-%COMP%] {\n  background: #fff;\n  border-radius: 8px;\n  padding: 20px;\n  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);\n}\n.table-card[_ngcontent-%COMP%]   h2[_ngcontent-%COMP%], \n.progress-card[_ngcontent-%COMP%]   h2[_ngcontent-%COMP%] {\n  margin: 0 0 16px 0;\n  font-size: 18px;\n  color: #333;\n  font-weight: 600;\n}\n.table-scroll-wrapper[_ngcontent-%COMP%] {\n  overflow-x: auto;\n}\n.table-scroll-wrapper[_ngcontent-%COMP%]   table[_ngcontent-%COMP%] {\n  width: 100%;\n  border-collapse: collapse;\n  min-width: 700px;\n}\n.table-scroll-wrapper[_ngcontent-%COMP%]   table[_ngcontent-%COMP%]   th[_ngcontent-%COMP%], \n.table-scroll-wrapper[_ngcontent-%COMP%]   table[_ngcontent-%COMP%]   td[_ngcontent-%COMP%] {\n  padding: 12px 16px;\n  text-align: left;\n  border-bottom: 1px solid #eee;\n}\n.table-scroll-wrapper[_ngcontent-%COMP%]   table[_ngcontent-%COMP%]   th[_ngcontent-%COMP%] {\n  font-weight: 600;\n  color: #555;\n  background: #fafafa;\n  font-size: 14px;\n}\n.table-scroll-wrapper[_ngcontent-%COMP%]   table[_ngcontent-%COMP%]   td[_ngcontent-%COMP%] {\n  font-size: 14px;\n  color: #333;\n}\n.table-scroll-wrapper[_ngcontent-%COMP%]   table[_ngcontent-%COMP%]   .badge[_ngcontent-%COMP%] {\n  display: inline-block;\n  padding: 4px 8px;\n  border-radius: 12px;\n  font-size: 12px;\n  font-weight: 600;\n  text-transform: uppercase;\n}\n.table-scroll-wrapper[_ngcontent-%COMP%]   table[_ngcontent-%COMP%]   .badge.paid[_ngcontent-%COMP%] {\n  background: #e8f5e9;\n  color: #2e7d32;\n}\n.table-scroll-wrapper[_ngcontent-%COMP%]   table[_ngcontent-%COMP%]   .badge.partial[_ngcontent-%COMP%] {\n  background: #fff8e1;\n  color: #f57f17;\n}\n.table-scroll-wrapper[_ngcontent-%COMP%]   table[_ngcontent-%COMP%]   .badge.unpaid[_ngcontent-%COMP%] {\n  background: #ffebee;\n  color: #c62828;\n}\n.progress-item[_ngcontent-%COMP%] {\n  margin-bottom: 20px;\n}\n.progress-item[_ngcontent-%COMP%]:last-child {\n  margin-bottom: 0;\n}\n.progress-item[_ngcontent-%COMP%]   .progress-header[_ngcontent-%COMP%] {\n  display: flex;\n  justify-content: space-between;\n  margin-bottom: 8px;\n  font-size: 14px;\n  font-weight: 500;\n  color: #444;\n}\n.progress-item[_ngcontent-%COMP%]   .progress-track[_ngcontent-%COMP%] {\n  width: 100%;\n  height: 8px;\n  background: #eee;\n  border-radius: 4px;\n  overflow: hidden;\n}\n.progress-item[_ngcontent-%COMP%]   .progress-track[_ngcontent-%COMP%]   .progress-fill[_ngcontent-%COMP%] {\n  background: var(--sa-primary);\n  border-radius: 4px;\n  transition: width 0.3s ease;\n}\n/*# sourceMappingURL=finance.page.css.map */'] });
  }
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(FinancePage, [{
    type: Component,
    args: [{ selector: "app-finance-page", standalone: true, imports: [CommonModule], template: '<div class="finance-page-container">\n  <header class="page-header">\n    <h1>Finance & Tuition Office</h1>\n  </header>\n\n  <section class="stat-cards">\n    <div class="card">\n      <div class="card-title">Total Projected Fees</div>\n      <div class="card-value">TZS 102,860,000</div>\n    </div>\n    <div class="card">\n      <div class="card-title">Collected Tuition</div>\n      <div class="card-value">TZS 84,520,000</div>\n    </div>\n    <div class="card">\n      <div class="card-title">Outstanding Balance</div>\n      <div class="card-value">TZS 18,340,000</div>\n    </div>\n    <div class="card critical">\n      <div class="card-title">Overdue & Critical</div>\n      <div class="card-value">TZS 5,200,000</div>\n    </div>\n  </section>\n\n  <section class="filters-toolbar">\n    <div class="filter-group">\n      <label for="academic-year">Academic Year</label>\n      <select id="academic-year">\n        <option>2023/2024</option>\n        <option>2024/2025</option>\n      </select>\n    </div>\n    <div class="filter-group">\n      <label for="term">Term</label>\n      <select id="term">\n        <option>Term 1</option>\n        <option>Term 2</option>\n        <option>Term 3</option>\n      </select>\n    </div>\n    <div class="filter-group">\n      <label for="class">Class</label>\n      <select id="class">\n        <option>All Classes</option>\n        <option>Form 1</option>\n        <option>Form 2</option>\n        <option>Form 3</option>\n        <option>Form 4</option>\n      </select>\n    </div>\n    <div class="filter-group">\n      <label for="status">Status</label>\n      <select id="status">\n        <option>All Statuses</option>\n        <option>Paid</option>\n        <option>Partial</option>\n        <option>Unpaid</option>\n      </select>\n    </div>\n  </section>\n\n  <div class="main-content-grid">\n    <div class="left-column">\n      <div class="table-card">\n        <h2>Student Balances</h2>\n        <div class="table-scroll-wrapper">\n          <table>\n            <thead>\n              <tr>\n                <th>Student Name</th>\n                <th>Class</th>\n                <th>Amount Due (TZS)</th>\n                <th>Amount Paid (TZS)</th>\n                <th>Balance (TZS)</th>\n                <th>Status</th>\n              </tr>\n            </thead>\n            <tbody>\n              <tr *ngFor="let student of students">\n                <td>{{ student.name }}</td>\n                <td>{{ student.class }}</td>\n                <td>{{ student.amountDue | number }}</td>\n                <td>{{ student.amountPaid | number }}</td>\n                <td>{{ student.balance | number }}</td>\n                <td>\n                  <span class="badge" [ngClass]="student.status.toLowerCase()">\n                    {{ student.status }}\n                  </span>\n                </td>\n              </tr>\n            </tbody>\n          </table>\n        </div>\n      </div>\n    </div>\n\n    <div class="right-column">\n      <div class="progress-card">\n        <h2>Fee Collection vs Target</h2>\n        \n        <div class="progress-item">\n          <div class="progress-header">\n            <span>Term 1</span>\n            <span>95%</span>\n          </div>\n          <div class="progress-track">\n            <div class="progress-fill" style="width: 95%;"></div>\n          </div>\n        </div>\n\n        <div class="progress-item">\n          <div class="progress-header">\n            <span>Term 2</span>\n            <span>80%</span>\n          </div>\n          <div class="progress-track">\n            <div class="progress-fill" style="width: 80%;"></div>\n          </div>\n        </div>\n\n        <div class="progress-item">\n          <div class="progress-header">\n            <span>Term 3</span>\n            <span>45%</span>\n          </div>\n          <div class="progress-track">\n            <div class="progress-fill" style="width: 45%;"></div>\n          </div>\n        </div>\n      </div>\n    </div>\n  </div>\n</div>\n', styles: ['/* src/app/features/dashboard/pages/finance/finance.page.scss */\n.finance-page-container {\n  padding: 24px;\n  background: #f4f6f8;\n  font-family:\n    -apple-system,\n    BlinkMacSystemFont,\n    "Segoe UI",\n    Roboto,\n    Helvetica,\n    Arial,\n    sans-serif;\n  box-sizing: border-box;\n}\n.finance-page-container * {\n  box-sizing: border-box;\n}\n.page-header {\n  margin-bottom: 24px;\n}\n.page-header h1 {\n  margin: 0;\n  font-size: 24px;\n  color: #333;\n  font-weight: 600;\n}\n.stat-cards {\n  display: grid;\n  grid-template-columns: repeat(1, 1fr);\n  gap: 16px;\n  margin-bottom: 24px;\n}\n@media (min-width: 600px) {\n  .stat-cards {\n    grid-template-columns: repeat(2, 1fr);\n  }\n}\n@media (min-width: 1024px) {\n  .stat-cards {\n    grid-template-columns: repeat(4, 1fr);\n  }\n}\n.stat-cards .card {\n  background: #fff;\n  padding: 20px;\n  border-radius: 8px;\n  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);\n  border-left: 4px solid var(--sa-primary);\n}\n.stat-cards .card.critical {\n  border-left-color: #dc3545;\n}\n.stat-cards .card .card-title {\n  font-size: 14px;\n  color: #666;\n  margin-bottom: 8px;\n  text-transform: uppercase;\n  letter-spacing: 0.5px;\n}\n.stat-cards .card .card-value {\n  font-size: 24px;\n  font-weight: 700;\n  color: #333;\n}\n.filters-toolbar {\n  display: flex;\n  flex-wrap: wrap;\n  gap: 16px;\n  margin-bottom: 24px;\n  background: #fff;\n  padding: 16px;\n  border-radius: 8px;\n  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);\n}\n.filters-toolbar .filter-group {\n  display: flex;\n  flex-direction: column;\n  min-width: 150px;\n  flex: 1;\n}\n.filters-toolbar .filter-group label {\n  font-size: 12px;\n  color: #666;\n  margin-bottom: 4px;\n  font-weight: 500;\n}\n.filters-toolbar .filter-group select {\n  padding: 8px 12px;\n  border: 1px solid #ddd;\n  border-radius: 4px;\n  font-size: 14px;\n  color: #333;\n  background: #fafafa;\n  outline: none;\n}\n.filters-toolbar .filter-group select:focus {\n  border-color: var(--sa-primary);\n}\n.main-content-grid {\n  display: grid;\n  grid-template-columns: 1fr;\n  gap: 24px;\n}\n@media (min-width: 1024px) {\n  .main-content-grid {\n    grid-template-columns: 7fr 3fr;\n  }\n}\n.table-card,\n.progress-card {\n  background: #fff;\n  border-radius: 8px;\n  padding: 20px;\n  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);\n}\n.table-card h2,\n.progress-card h2 {\n  margin: 0 0 16px 0;\n  font-size: 18px;\n  color: #333;\n  font-weight: 600;\n}\n.table-scroll-wrapper {\n  overflow-x: auto;\n}\n.table-scroll-wrapper table {\n  width: 100%;\n  border-collapse: collapse;\n  min-width: 700px;\n}\n.table-scroll-wrapper table th,\n.table-scroll-wrapper table td {\n  padding: 12px 16px;\n  text-align: left;\n  border-bottom: 1px solid #eee;\n}\n.table-scroll-wrapper table th {\n  font-weight: 600;\n  color: #555;\n  background: #fafafa;\n  font-size: 14px;\n}\n.table-scroll-wrapper table td {\n  font-size: 14px;\n  color: #333;\n}\n.table-scroll-wrapper table .badge {\n  display: inline-block;\n  padding: 4px 8px;\n  border-radius: 12px;\n  font-size: 12px;\n  font-weight: 600;\n  text-transform: uppercase;\n}\n.table-scroll-wrapper table .badge.paid {\n  background: #e8f5e9;\n  color: #2e7d32;\n}\n.table-scroll-wrapper table .badge.partial {\n  background: #fff8e1;\n  color: #f57f17;\n}\n.table-scroll-wrapper table .badge.unpaid {\n  background: #ffebee;\n  color: #c62828;\n}\n.progress-item {\n  margin-bottom: 20px;\n}\n.progress-item:last-child {\n  margin-bottom: 0;\n}\n.progress-item .progress-header {\n  display: flex;\n  justify-content: space-between;\n  margin-bottom: 8px;\n  font-size: 14px;\n  font-weight: 500;\n  color: #444;\n}\n.progress-item .progress-track {\n  width: 100%;\n  height: 8px;\n  background: #eee;\n  border-radius: 4px;\n  overflow: hidden;\n}\n.progress-item .progress-track .progress-fill {\n  background: var(--sa-primary);\n  border-radius: 4px;\n  transition: width 0.3s ease;\n}\n/*# sourceMappingURL=finance.page.css.map */\n'] }]
  }], null, null);
})();
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && \u0275setClassDebugInfo(FinancePage, { className: "FinancePage", filePath: "src/app/features/dashboard/pages/finance/finance.page.ts", lineNumber: 11 });
})();
export {
  FinancePage
};
//# sourceMappingURL=chunk-HTAQ3KY2.js.map
