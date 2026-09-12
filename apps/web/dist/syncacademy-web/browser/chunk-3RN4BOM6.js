import {
  RouterModule
} from "./chunk-GIJX6M6U.js";
import {
  CommonModule,
  Component,
  NgClass,
  NgForOf,
  NgIf,
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
  ɵɵsanitizeUrl,
  ɵɵtemplate,
  ɵɵtext,
  ɵɵtextInterpolate,
  ɵɵtextInterpolate1,
  ɵɵtextInterpolate2
} from "./chunk-3IPAKGA7.js";
import "./chunk-QHQP2P2Z.js";

// src/app/features/dashboard/pages/student-profile/student-profile.page.ts
function StudentProfilePage_div_29_Template(rf, ctx) {
  if (rf & 1) {
    const _r1 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "div", 16);
    \u0275\u0275listener("click", function StudentProfilePage_div_29_Template_div_click_0_listener() {
      const tab_r2 = \u0275\u0275restoreView(_r1).$implicit;
      const ctx_r2 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r2.setTab(tab_r2));
    });
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const tab_r2 = ctx.$implicit;
    const ctx_r2 = \u0275\u0275nextContext();
    \u0275\u0275classProp("active", tab_r2 === ctx_r2.activeTab);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", tab_r2, " ");
  }
}
function StudentProfilePage_div_30_div_59_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 28)(1, "span", 29);
    \u0275\u0275text(2);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "span", 30);
    \u0275\u0275text(4);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(5, "span", 31);
    \u0275\u0275text(6);
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const result_r4 = ctx.$implicit;
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(result_r4.subject);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate2("", result_r4.score, "/", result_r4.max, "");
    \u0275\u0275advance();
    \u0275\u0275property("ngClass", result_r4.gradeClass);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate(result_r4.grade);
  }
}
function StudentProfilePage_div_30_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 17)(1, "div", 18)(2, "div", 19)(3, "h3");
    \u0275\u0275text(4, "Personal Information");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(5, "ul", 20)(6, "li")(7, "strong");
    \u0275\u0275text(8, "Date of Birth:");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(9, "span");
    \u0275\u0275text(10);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(11, "li")(12, "strong");
    \u0275\u0275text(13, "Gender:");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(14, "span");
    \u0275\u0275text(15);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(16, "li")(17, "strong");
    \u0275\u0275text(18, "Blood Group:");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(19, "span");
    \u0275\u0275text(20);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(21, "li")(22, "strong");
    \u0275\u0275text(23, "Enrollment:");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(24, "span");
    \u0275\u0275text(25);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(26, "li")(27, "strong");
    \u0275\u0275text(28, "Address:");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(29, "span");
    \u0275\u0275text(30);
    \u0275\u0275elementEnd()()()();
    \u0275\u0275elementStart(31, "div", 19)(32, "h3");
    \u0275\u0275text(33, "Parent / Guardian Information");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(34, "ul", 20)(35, "li")(36, "strong");
    \u0275\u0275text(37, "Name:");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(38, "span");
    \u0275\u0275text(39);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(40, "li")(41, "strong");
    \u0275\u0275text(42, "Relationship:");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(43, "span");
    \u0275\u0275text(44);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(45, "li")(46, "strong");
    \u0275\u0275text(47, "Phone:");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(48, "span");
    \u0275\u0275text(49);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(50, "li")(51, "strong");
    \u0275\u0275text(52, "Email:");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(53, "span");
    \u0275\u0275text(54);
    \u0275\u0275elementEnd()()()();
    \u0275\u0275elementStart(55, "div", 19)(56, "h3");
    \u0275\u0275text(57, "Recent Academic Results");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(58, "div", 21);
    \u0275\u0275template(59, StudentProfilePage_div_30_div_59_Template, 7, 5, "div", 22);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(60, "div", 19)(61, "h3");
    \u0275\u0275text(62, "Fee Invoice Summary");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(63, "div", 23)(64, "div", 24)(65, "span", 25);
    \u0275\u0275text(66, "Paid Fees");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(67, "span", 26);
    \u0275\u0275text(68);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(69, "div", 27)(70, "span", 25);
    \u0275\u0275text(71, "Outstanding");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(72, "span", 26);
    \u0275\u0275text(73);
    \u0275\u0275elementEnd()()()()()();
  }
  if (rf & 2) {
    const ctx_r2 = \u0275\u0275nextContext();
    \u0275\u0275advance(10);
    \u0275\u0275textInterpolate(ctx_r2.student.personalInfo.dob);
    \u0275\u0275advance(5);
    \u0275\u0275textInterpolate(ctx_r2.student.personalInfo.gender);
    \u0275\u0275advance(5);
    \u0275\u0275textInterpolate(ctx_r2.student.personalInfo.bloodGroup);
    \u0275\u0275advance(5);
    \u0275\u0275textInterpolate(ctx_r2.student.personalInfo.enrollment);
    \u0275\u0275advance(5);
    \u0275\u0275textInterpolate(ctx_r2.student.personalInfo.address);
    \u0275\u0275advance(9);
    \u0275\u0275textInterpolate(ctx_r2.student.parentInfo.name);
    \u0275\u0275advance(5);
    \u0275\u0275textInterpolate(ctx_r2.student.parentInfo.relationship);
    \u0275\u0275advance(5);
    \u0275\u0275textInterpolate(ctx_r2.student.parentInfo.phone);
    \u0275\u0275advance(5);
    \u0275\u0275textInterpolate(ctx_r2.student.parentInfo.email);
    \u0275\u0275advance(5);
    \u0275\u0275property("ngForOf", ctx_r2.student.recentResults);
    \u0275\u0275advance(9);
    \u0275\u0275textInterpolate1("TZS ", ctx_r2.student.fees.paid, "");
    \u0275\u0275advance(5);
    \u0275\u0275textInterpolate1("TZS ", ctx_r2.student.fees.outstanding, "");
  }
}
var StudentProfilePage = class _StudentProfilePage {
  constructor() {
    this.student = {
      name: "Amina Juma",
      status: "Active",
      id: "SA-2024-0142",
      grade: "Grade 6A",
      avatar: "https://i.pravatar.cc/150?u=amina",
      stats: {
        attendance: "96.4%",
        academicAvg: "78.5%",
        feeBalance: "450,000"
      },
      personalInfo: {
        dob: "12 May 2012",
        gender: "Female",
        bloodGroup: "O+",
        enrollment: "Jan 2024",
        address: "Mwenge, Dar es Salaam"
      },
      parentInfo: {
        name: "Juma Hassan",
        relationship: "Father",
        phone: "+255 712 345 678",
        email: "juma.hassan@email.com"
      },
      recentResults: [
        { subject: "Math", score: 88, max: 100, grade: "A", gradeClass: "grade-a" },
        { subject: "English", score: 92, max: 100, grade: "A+", gradeClass: "grade-aplus" },
        { subject: "Science", score: 75, max: 100, grade: "B", gradeClass: "grade-b" },
        { subject: "History", score: 65, max: 100, grade: "C", gradeClass: "grade-c" }
      ],
      fees: {
        paid: "1,200,000",
        outstanding: "450,000"
      }
    };
    this.activeTab = "Overview";
    this.tabs = ["Overview", "Academics", "Attendance", "Fees", "Documents", "Parent Info"];
  }
  setTab(tab) {
    this.activeTab = tab;
  }
  static {
    this.\u0275fac = function StudentProfilePage_Factory(__ngFactoryType__) {
      return new (__ngFactoryType__ || _StudentProfilePage)();
    };
  }
  static {
    this.\u0275cmp = /* @__PURE__ */ \u0275\u0275defineComponent({ type: _StudentProfilePage, selectors: [["app-student-profile"]], decls: 31, vars: 10, consts: [[1, "student-profile-container"], [1, "header-card"], [1, "header-left"], ["alt", "Avatar", 1, "avatar", 3, "src"], [1, "header-info"], [1, "name-row"], [1, "badge", "active"], [1, "subtitle"], [1, "header-right"], [1, "stat-box"], [1, "stat-label"], [1, "stat-value"], [1, "stat-value", "orange"], [1, "tabs"], ["class", "tab", 3, "active", "click", 4, "ngFor", "ngForOf"], ["class", "tab-content", 4, "ngIf"], [1, "tab", 3, "click"], [1, "tab-content"], [1, "grid-layout"], [1, "card"], [1, "info-list"], [1, "results-list"], ["class", "result-item", 4, "ngFor", "ngForOf"], [1, "fee-summary"], [1, "fee-block", "paid"], [1, "fee-label"], [1, "fee-value"], [1, "fee-block", "outstanding"], [1, "result-item"], [1, "subject"], [1, "score"], [1, "badge", 3, "ngClass"]], template: function StudentProfilePage_Template(rf, ctx) {
      if (rf & 1) {
        \u0275\u0275elementStart(0, "div", 0)(1, "div", 1)(2, "div", 2);
        \u0275\u0275element(3, "img", 3);
        \u0275\u0275elementStart(4, "div", 4)(5, "div", 5)(6, "h1");
        \u0275\u0275text(7);
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(8, "span", 6);
        \u0275\u0275text(9);
        \u0275\u0275elementEnd()();
        \u0275\u0275elementStart(10, "p", 7);
        \u0275\u0275text(11);
        \u0275\u0275elementEnd()()();
        \u0275\u0275elementStart(12, "div", 8)(13, "div", 9)(14, "span", 10);
        \u0275\u0275text(15, "Attendance");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(16, "span", 11);
        \u0275\u0275text(17);
        \u0275\u0275elementEnd()();
        \u0275\u0275elementStart(18, "div", 9)(19, "span", 10);
        \u0275\u0275text(20, "Academic Avg");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(21, "span", 11);
        \u0275\u0275text(22);
        \u0275\u0275elementEnd()();
        \u0275\u0275elementStart(23, "div", 9)(24, "span", 10);
        \u0275\u0275text(25, "Fee Balance");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(26, "span", 12);
        \u0275\u0275text(27);
        \u0275\u0275elementEnd()()()();
        \u0275\u0275elementStart(28, "div", 13);
        \u0275\u0275template(29, StudentProfilePage_div_29_Template, 2, 3, "div", 14);
        \u0275\u0275elementEnd();
        \u0275\u0275template(30, StudentProfilePage_div_30_Template, 74, 12, "div", 15);
        \u0275\u0275elementEnd();
      }
      if (rf & 2) {
        \u0275\u0275advance(3);
        \u0275\u0275property("src", ctx.student.avatar, \u0275\u0275sanitizeUrl);
        \u0275\u0275advance(4);
        \u0275\u0275textInterpolate(ctx.student.name);
        \u0275\u0275advance(2);
        \u0275\u0275textInterpolate(ctx.student.status);
        \u0275\u0275advance(2);
        \u0275\u0275textInterpolate2("Student ID: ", ctx.student.id, " \u2022 ", ctx.student.grade, "");
        \u0275\u0275advance(6);
        \u0275\u0275textInterpolate(ctx.student.stats.attendance);
        \u0275\u0275advance(5);
        \u0275\u0275textInterpolate(ctx.student.stats.academicAvg);
        \u0275\u0275advance(5);
        \u0275\u0275textInterpolate1("TZS ", ctx.student.stats.feeBalance, "");
        \u0275\u0275advance(2);
        \u0275\u0275property("ngForOf", ctx.tabs);
        \u0275\u0275advance();
        \u0275\u0275property("ngIf", ctx.activeTab === "Overview");
      }
    }, dependencies: [CommonModule, NgClass, NgForOf, NgIf, RouterModule], styles: ['\n\n.student-profile-container[_ngcontent-%COMP%] {\n  padding: 24px;\n  background-color: #f8fafc;\n  font-family:\n    -apple-system,\n    BlinkMacSystemFont,\n    "Segoe UI",\n    Roboto,\n    Helvetica,\n    Arial,\n    sans-serif;\n}\n.student-profile-container[_ngcontent-%COMP%]   .header-card[_ngcontent-%COMP%] {\n  background: #fff;\n  border-radius: 12px;\n  padding: 24px;\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);\n  margin-bottom: 24px;\n  flex-wrap: wrap;\n  gap: 24px;\n}\n.student-profile-container[_ngcontent-%COMP%]   .header-card[_ngcontent-%COMP%]   .header-left[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  gap: 16px;\n}\n.student-profile-container[_ngcontent-%COMP%]   .header-card[_ngcontent-%COMP%]   .header-left[_ngcontent-%COMP%]   .avatar[_ngcontent-%COMP%] {\n  width: 80px;\n  height: 80px;\n  border-radius: 50%;\n  object-fit: cover;\n}\n.student-profile-container[_ngcontent-%COMP%]   .header-card[_ngcontent-%COMP%]   .header-left[_ngcontent-%COMP%]   .header-info[_ngcontent-%COMP%]   .name-row[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  gap: 12px;\n}\n.student-profile-container[_ngcontent-%COMP%]   .header-card[_ngcontent-%COMP%]   .header-left[_ngcontent-%COMP%]   .header-info[_ngcontent-%COMP%]   .name-row[_ngcontent-%COMP%]   h1[_ngcontent-%COMP%] {\n  margin: 0;\n  font-size: 24px;\n  color: #1e293b;\n}\n.student-profile-container[_ngcontent-%COMP%]   .header-card[_ngcontent-%COMP%]   .header-left[_ngcontent-%COMP%]   .header-info[_ngcontent-%COMP%]   .name-row[_ngcontent-%COMP%]   .badge[_ngcontent-%COMP%] {\n  padding: 4px 8px;\n  border-radius: 12px;\n  font-size: 12px;\n  font-weight: 600;\n}\n.student-profile-container[_ngcontent-%COMP%]   .header-card[_ngcontent-%COMP%]   .header-left[_ngcontent-%COMP%]   .header-info[_ngcontent-%COMP%]   .name-row[_ngcontent-%COMP%]   .badge.active[_ngcontent-%COMP%] {\n  background-color: #dcfce7;\n  color: #166534;\n}\n.student-profile-container[_ngcontent-%COMP%]   .header-card[_ngcontent-%COMP%]   .header-left[_ngcontent-%COMP%]   .header-info[_ngcontent-%COMP%]   .subtitle[_ngcontent-%COMP%] {\n  margin: 8px 0 0;\n  color: #64748b;\n  font-size: 14px;\n}\n.student-profile-container[_ngcontent-%COMP%]   .header-card[_ngcontent-%COMP%]   .header-right[_ngcontent-%COMP%] {\n  display: flex;\n  gap: 32px;\n}\n.student-profile-container[_ngcontent-%COMP%]   .header-card[_ngcontent-%COMP%]   .header-right[_ngcontent-%COMP%]   .stat-box[_ngcontent-%COMP%] {\n  display: flex;\n  flex-direction: column;\n  gap: 8px;\n}\n.student-profile-container[_ngcontent-%COMP%]   .header-card[_ngcontent-%COMP%]   .header-right[_ngcontent-%COMP%]   .stat-box[_ngcontent-%COMP%]   .stat-label[_ngcontent-%COMP%] {\n  color: #64748b;\n  font-size: 13px;\n}\n.student-profile-container[_ngcontent-%COMP%]   .header-card[_ngcontent-%COMP%]   .header-right[_ngcontent-%COMP%]   .stat-box[_ngcontent-%COMP%]   .stat-value[_ngcontent-%COMP%] {\n  font-size: 18px;\n  font-weight: 600;\n  color: #1e293b;\n}\n.student-profile-container[_ngcontent-%COMP%]   .header-card[_ngcontent-%COMP%]   .header-right[_ngcontent-%COMP%]   .stat-box[_ngcontent-%COMP%]   .stat-value.orange[_ngcontent-%COMP%] {\n  color: #ea580c;\n}\n.student-profile-container[_ngcontent-%COMP%]   .tabs[_ngcontent-%COMP%] {\n  display: flex;\n  gap: 24px;\n  border-bottom: 1px solid #e2e8f0;\n  margin-bottom: 24px;\n  overflow-x: auto;\n}\n.student-profile-container[_ngcontent-%COMP%]   .tabs[_ngcontent-%COMP%]   .tab[_ngcontent-%COMP%] {\n  padding: 12px 0;\n  color: #64748b;\n  font-weight: 500;\n  cursor: pointer;\n  border-bottom: 2px solid transparent;\n  white-space: nowrap;\n}\n.student-profile-container[_ngcontent-%COMP%]   .tabs[_ngcontent-%COMP%]   .tab[_ngcontent-%COMP%]:hover {\n  color: #1e293b;\n}\n.student-profile-container[_ngcontent-%COMP%]   .tabs[_ngcontent-%COMP%]   .tab.active[_ngcontent-%COMP%] {\n  color: #2563eb;\n  border-bottom-color: #2563eb;\n}\n.student-profile-container[_ngcontent-%COMP%]   .grid-layout[_ngcontent-%COMP%] {\n  display: grid;\n  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));\n  gap: 24px;\n}\n.student-profile-container[_ngcontent-%COMP%]   .grid-layout[_ngcontent-%COMP%]   .card[_ngcontent-%COMP%] {\n  background: #fff;\n  border-radius: 12px;\n  padding: 24px;\n  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);\n}\n.student-profile-container[_ngcontent-%COMP%]   .grid-layout[_ngcontent-%COMP%]   .card[_ngcontent-%COMP%]   h3[_ngcontent-%COMP%] {\n  margin: 0 0 16px;\n  font-size: 16px;\n  color: #1e293b;\n  border-bottom: 1px solid #e2e8f0;\n  padding-bottom: 12px;\n}\n.student-profile-container[_ngcontent-%COMP%]   .grid-layout[_ngcontent-%COMP%]   .card[_ngcontent-%COMP%]   .info-list[_ngcontent-%COMP%] {\n  list-style: none;\n  padding: 0;\n  margin: 0;\n}\n.student-profile-container[_ngcontent-%COMP%]   .grid-layout[_ngcontent-%COMP%]   .card[_ngcontent-%COMP%]   .info-list[_ngcontent-%COMP%]   li[_ngcontent-%COMP%] {\n  padding: 12px 0;\n  display: flex;\n  justify-content: space-between;\n  border-bottom: 1px solid #f1f5f9;\n  font-size: 14px;\n}\n.student-profile-container[_ngcontent-%COMP%]   .grid-layout[_ngcontent-%COMP%]   .card[_ngcontent-%COMP%]   .info-list[_ngcontent-%COMP%]   li[_ngcontent-%COMP%]:last-child {\n  border-bottom: none;\n  padding-bottom: 0;\n}\n.student-profile-container[_ngcontent-%COMP%]   .grid-layout[_ngcontent-%COMP%]   .card[_ngcontent-%COMP%]   .info-list[_ngcontent-%COMP%]   li[_ngcontent-%COMP%]:first-child {\n  padding-top: 0;\n}\n.student-profile-container[_ngcontent-%COMP%]   .grid-layout[_ngcontent-%COMP%]   .card[_ngcontent-%COMP%]   .info-list[_ngcontent-%COMP%]   li[_ngcontent-%COMP%]   strong[_ngcontent-%COMP%] {\n  color: #64748b;\n  font-weight: 500;\n}\n.student-profile-container[_ngcontent-%COMP%]   .grid-layout[_ngcontent-%COMP%]   .card[_ngcontent-%COMP%]   .info-list[_ngcontent-%COMP%]   li[_ngcontent-%COMP%]   span[_ngcontent-%COMP%] {\n  color: #334155;\n  text-align: right;\n}\n.student-profile-container[_ngcontent-%COMP%]   .grid-layout[_ngcontent-%COMP%]   .card[_ngcontent-%COMP%]   .results-list[_ngcontent-%COMP%] {\n  display: flex;\n  flex-direction: column;\n  gap: 12px;\n}\n.student-profile-container[_ngcontent-%COMP%]   .grid-layout[_ngcontent-%COMP%]   .card[_ngcontent-%COMP%]   .results-list[_ngcontent-%COMP%]   .result-item[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  padding: 12px;\n  background: #f8fafc;\n  border-radius: 8px;\n  font-size: 14px;\n}\n.student-profile-container[_ngcontent-%COMP%]   .grid-layout[_ngcontent-%COMP%]   .card[_ngcontent-%COMP%]   .results-list[_ngcontent-%COMP%]   .result-item[_ngcontent-%COMP%]   .subject[_ngcontent-%COMP%] {\n  font-weight: 500;\n  color: #334155;\n  flex: 1;\n}\n.student-profile-container[_ngcontent-%COMP%]   .grid-layout[_ngcontent-%COMP%]   .card[_ngcontent-%COMP%]   .results-list[_ngcontent-%COMP%]   .result-item[_ngcontent-%COMP%]   .score[_ngcontent-%COMP%] {\n  color: #64748b;\n  margin-right: 16px;\n}\n.student-profile-container[_ngcontent-%COMP%]   .grid-layout[_ngcontent-%COMP%]   .card[_ngcontent-%COMP%]   .results-list[_ngcontent-%COMP%]   .result-item[_ngcontent-%COMP%]   .badge[_ngcontent-%COMP%] {\n  padding: 4px 8px;\n  border-radius: 6px;\n  font-weight: 600;\n  font-size: 12px;\n  width: 32px;\n  text-align: center;\n}\n.student-profile-container[_ngcontent-%COMP%]   .grid-layout[_ngcontent-%COMP%]   .card[_ngcontent-%COMP%]   .results-list[_ngcontent-%COMP%]   .result-item[_ngcontent-%COMP%]   .badge.grade-aplus[_ngcontent-%COMP%], \n.student-profile-container[_ngcontent-%COMP%]   .grid-layout[_ngcontent-%COMP%]   .card[_ngcontent-%COMP%]   .results-list[_ngcontent-%COMP%]   .result-item[_ngcontent-%COMP%]   .badge.grade-a[_ngcontent-%COMP%] {\n  background: #dcfce7;\n  color: #166534;\n}\n.student-profile-container[_ngcontent-%COMP%]   .grid-layout[_ngcontent-%COMP%]   .card[_ngcontent-%COMP%]   .results-list[_ngcontent-%COMP%]   .result-item[_ngcontent-%COMP%]   .badge.grade-b[_ngcontent-%COMP%] {\n  background: #fef08a;\n  color: #854d0e;\n}\n.student-profile-container[_ngcontent-%COMP%]   .grid-layout[_ngcontent-%COMP%]   .card[_ngcontent-%COMP%]   .results-list[_ngcontent-%COMP%]   .result-item[_ngcontent-%COMP%]   .badge.grade-c[_ngcontent-%COMP%] {\n  background: #fed7aa;\n  color: #c2410c;\n}\n.student-profile-container[_ngcontent-%COMP%]   .grid-layout[_ngcontent-%COMP%]   .card[_ngcontent-%COMP%]   .fee-summary[_ngcontent-%COMP%] {\n  display: flex;\n  gap: 16px;\n}\n.student-profile-container[_ngcontent-%COMP%]   .grid-layout[_ngcontent-%COMP%]   .card[_ngcontent-%COMP%]   .fee-summary[_ngcontent-%COMP%]   .fee-block[_ngcontent-%COMP%] {\n  flex: 1;\n  padding: 16px;\n  border-radius: 8px;\n  display: flex;\n  flex-direction: column;\n  gap: 8px;\n}\n.student-profile-container[_ngcontent-%COMP%]   .grid-layout[_ngcontent-%COMP%]   .card[_ngcontent-%COMP%]   .fee-summary[_ngcontent-%COMP%]   .fee-block.paid[_ngcontent-%COMP%] {\n  background: #dcfce7;\n}\n.student-profile-container[_ngcontent-%COMP%]   .grid-layout[_ngcontent-%COMP%]   .card[_ngcontent-%COMP%]   .fee-summary[_ngcontent-%COMP%]   .fee-block.paid[_ngcontent-%COMP%]   .fee-label[_ngcontent-%COMP%] {\n  color: #166534;\n}\n.student-profile-container[_ngcontent-%COMP%]   .grid-layout[_ngcontent-%COMP%]   .card[_ngcontent-%COMP%]   .fee-summary[_ngcontent-%COMP%]   .fee-block.paid[_ngcontent-%COMP%]   .fee-value[_ngcontent-%COMP%] {\n  color: #14532d;\n}\n.student-profile-container[_ngcontent-%COMP%]   .grid-layout[_ngcontent-%COMP%]   .card[_ngcontent-%COMP%]   .fee-summary[_ngcontent-%COMP%]   .fee-block.outstanding[_ngcontent-%COMP%] {\n  background: #ffedd5;\n}\n.student-profile-container[_ngcontent-%COMP%]   .grid-layout[_ngcontent-%COMP%]   .card[_ngcontent-%COMP%]   .fee-summary[_ngcontent-%COMP%]   .fee-block.outstanding[_ngcontent-%COMP%]   .fee-label[_ngcontent-%COMP%] {\n  color: #c2410c;\n}\n.student-profile-container[_ngcontent-%COMP%]   .grid-layout[_ngcontent-%COMP%]   .card[_ngcontent-%COMP%]   .fee-summary[_ngcontent-%COMP%]   .fee-block.outstanding[_ngcontent-%COMP%]   .fee-value[_ngcontent-%COMP%] {\n  color: #9a3412;\n}\n.student-profile-container[_ngcontent-%COMP%]   .grid-layout[_ngcontent-%COMP%]   .card[_ngcontent-%COMP%]   .fee-summary[_ngcontent-%COMP%]   .fee-block[_ngcontent-%COMP%]   .fee-label[_ngcontent-%COMP%] {\n  font-size: 13px;\n  font-weight: 500;\n}\n.student-profile-container[_ngcontent-%COMP%]   .grid-layout[_ngcontent-%COMP%]   .card[_ngcontent-%COMP%]   .fee-summary[_ngcontent-%COMP%]   .fee-block[_ngcontent-%COMP%]   .fee-value[_ngcontent-%COMP%] {\n  font-size: 18px;\n  font-weight: 700;\n}\n/*# sourceMappingURL=student-profile.page.css.map */'] });
  }
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(StudentProfilePage, [{
    type: Component,
    args: [{ selector: "app-student-profile", standalone: true, imports: [CommonModule, RouterModule], template: `<div class="student-profile-container">
  <!-- Header Card -->
  <div class="header-card">
    <div class="header-left">
      <img [src]="student.avatar" alt="Avatar" class="avatar">
      <div class="header-info">
        <div class="name-row">
          <h1>{{ student.name }}</h1>
          <span class="badge active">{{ student.status }}</span>
        </div>
        <p class="subtitle">Student ID: {{ student.id }} &bull; {{ student.grade }}</p>
      </div>
    </div>
    <div class="header-right">
      <div class="stat-box">
        <span class="stat-label">Attendance</span>
        <span class="stat-value">{{ student.stats.attendance }}</span>
      </div>
      <div class="stat-box">
        <span class="stat-label">Academic Avg</span>
        <span class="stat-value">{{ student.stats.academicAvg }}</span>
      </div>
      <div class="stat-box">
        <span class="stat-label">Fee Balance</span>
        <span class="stat-value orange">TZS {{ student.stats.feeBalance }}</span>
      </div>
    </div>
  </div>

  <!-- Tabs -->
  <div class="tabs">
    <div *ngFor="let tab of tabs" 
         class="tab" 
         [class.active]="tab === activeTab"
         (click)="setTab(tab)">
      {{ tab }}
    </div>
  </div>

  <!-- Content -->
  <div class="tab-content" *ngIf="activeTab === 'Overview'">
    <div class="grid-layout">
      <!-- Personal Information -->
      <div class="card">
        <h3>Personal Information</h3>
        <ul class="info-list">
          <li><strong>Date of Birth:</strong> <span>{{ student.personalInfo.dob }}</span></li>
          <li><strong>Gender:</strong> <span>{{ student.personalInfo.gender }}</span></li>
          <li><strong>Blood Group:</strong> <span>{{ student.personalInfo.bloodGroup }}</span></li>
          <li><strong>Enrollment:</strong> <span>{{ student.personalInfo.enrollment }}</span></li>
          <li><strong>Address:</strong> <span>{{ student.personalInfo.address }}</span></li>
        </ul>
      </div>

      <!-- Parent / Guardian Information -->
      <div class="card">
        <h3>Parent / Guardian Information</h3>
        <ul class="info-list">
          <li><strong>Name:</strong> <span>{{ student.parentInfo.name }}</span></li>
          <li><strong>Relationship:</strong> <span>{{ student.parentInfo.relationship }}</span></li>
          <li><strong>Phone:</strong> <span>{{ student.parentInfo.phone }}</span></li>
          <li><strong>Email:</strong> <span>{{ student.parentInfo.email }}</span></li>
        </ul>
      </div>

      <!-- Recent Academic Results -->
      <div class="card">
        <h3>Recent Academic Results</h3>
        <div class="results-list">
          <div class="result-item" *ngFor="let result of student.recentResults">
            <span class="subject">{{ result.subject }}</span>
            <span class="score">{{ result.score }}/{{ result.max }}</span>
            <span class="badge" [ngClass]="result.gradeClass">{{ result.grade }}</span>
          </div>
        </div>
      </div>

      <!-- Fee Invoice Summary -->
      <div class="card">
        <h3>Fee Invoice Summary</h3>
        <div class="fee-summary">
          <div class="fee-block paid">
            <span class="fee-label">Paid Fees</span>
            <span class="fee-value">TZS {{ student.fees.paid }}</span>
          </div>
          <div class="fee-block outstanding">
            <span class="fee-label">Outstanding</span>
            <span class="fee-value">TZS {{ student.fees.outstanding }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
`, styles: ['/* src/app/features/dashboard/pages/student-profile/student-profile.page.scss */\n.student-profile-container {\n  padding: 24px;\n  background-color: #f8fafc;\n  font-family:\n    -apple-system,\n    BlinkMacSystemFont,\n    "Segoe UI",\n    Roboto,\n    Helvetica,\n    Arial,\n    sans-serif;\n}\n.student-profile-container .header-card {\n  background: #fff;\n  border-radius: 12px;\n  padding: 24px;\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);\n  margin-bottom: 24px;\n  flex-wrap: wrap;\n  gap: 24px;\n}\n.student-profile-container .header-card .header-left {\n  display: flex;\n  align-items: center;\n  gap: 16px;\n}\n.student-profile-container .header-card .header-left .avatar {\n  width: 80px;\n  height: 80px;\n  border-radius: 50%;\n  object-fit: cover;\n}\n.student-profile-container .header-card .header-left .header-info .name-row {\n  display: flex;\n  align-items: center;\n  gap: 12px;\n}\n.student-profile-container .header-card .header-left .header-info .name-row h1 {\n  margin: 0;\n  font-size: 24px;\n  color: #1e293b;\n}\n.student-profile-container .header-card .header-left .header-info .name-row .badge {\n  padding: 4px 8px;\n  border-radius: 12px;\n  font-size: 12px;\n  font-weight: 600;\n}\n.student-profile-container .header-card .header-left .header-info .name-row .badge.active {\n  background-color: #dcfce7;\n  color: #166534;\n}\n.student-profile-container .header-card .header-left .header-info .subtitle {\n  margin: 8px 0 0;\n  color: #64748b;\n  font-size: 14px;\n}\n.student-profile-container .header-card .header-right {\n  display: flex;\n  gap: 32px;\n}\n.student-profile-container .header-card .header-right .stat-box {\n  display: flex;\n  flex-direction: column;\n  gap: 8px;\n}\n.student-profile-container .header-card .header-right .stat-box .stat-label {\n  color: #64748b;\n  font-size: 13px;\n}\n.student-profile-container .header-card .header-right .stat-box .stat-value {\n  font-size: 18px;\n  font-weight: 600;\n  color: #1e293b;\n}\n.student-profile-container .header-card .header-right .stat-box .stat-value.orange {\n  color: #ea580c;\n}\n.student-profile-container .tabs {\n  display: flex;\n  gap: 24px;\n  border-bottom: 1px solid #e2e8f0;\n  margin-bottom: 24px;\n  overflow-x: auto;\n}\n.student-profile-container .tabs .tab {\n  padding: 12px 0;\n  color: #64748b;\n  font-weight: 500;\n  cursor: pointer;\n  border-bottom: 2px solid transparent;\n  white-space: nowrap;\n}\n.student-profile-container .tabs .tab:hover {\n  color: #1e293b;\n}\n.student-profile-container .tabs .tab.active {\n  color: #2563eb;\n  border-bottom-color: #2563eb;\n}\n.student-profile-container .grid-layout {\n  display: grid;\n  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));\n  gap: 24px;\n}\n.student-profile-container .grid-layout .card {\n  background: #fff;\n  border-radius: 12px;\n  padding: 24px;\n  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);\n}\n.student-profile-container .grid-layout .card h3 {\n  margin: 0 0 16px;\n  font-size: 16px;\n  color: #1e293b;\n  border-bottom: 1px solid #e2e8f0;\n  padding-bottom: 12px;\n}\n.student-profile-container .grid-layout .card .info-list {\n  list-style: none;\n  padding: 0;\n  margin: 0;\n}\n.student-profile-container .grid-layout .card .info-list li {\n  padding: 12px 0;\n  display: flex;\n  justify-content: space-between;\n  border-bottom: 1px solid #f1f5f9;\n  font-size: 14px;\n}\n.student-profile-container .grid-layout .card .info-list li:last-child {\n  border-bottom: none;\n  padding-bottom: 0;\n}\n.student-profile-container .grid-layout .card .info-list li:first-child {\n  padding-top: 0;\n}\n.student-profile-container .grid-layout .card .info-list li strong {\n  color: #64748b;\n  font-weight: 500;\n}\n.student-profile-container .grid-layout .card .info-list li span {\n  color: #334155;\n  text-align: right;\n}\n.student-profile-container .grid-layout .card .results-list {\n  display: flex;\n  flex-direction: column;\n  gap: 12px;\n}\n.student-profile-container .grid-layout .card .results-list .result-item {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  padding: 12px;\n  background: #f8fafc;\n  border-radius: 8px;\n  font-size: 14px;\n}\n.student-profile-container .grid-layout .card .results-list .result-item .subject {\n  font-weight: 500;\n  color: #334155;\n  flex: 1;\n}\n.student-profile-container .grid-layout .card .results-list .result-item .score {\n  color: #64748b;\n  margin-right: 16px;\n}\n.student-profile-container .grid-layout .card .results-list .result-item .badge {\n  padding: 4px 8px;\n  border-radius: 6px;\n  font-weight: 600;\n  font-size: 12px;\n  width: 32px;\n  text-align: center;\n}\n.student-profile-container .grid-layout .card .results-list .result-item .badge.grade-aplus,\n.student-profile-container .grid-layout .card .results-list .result-item .badge.grade-a {\n  background: #dcfce7;\n  color: #166534;\n}\n.student-profile-container .grid-layout .card .results-list .result-item .badge.grade-b {\n  background: #fef08a;\n  color: #854d0e;\n}\n.student-profile-container .grid-layout .card .results-list .result-item .badge.grade-c {\n  background: #fed7aa;\n  color: #c2410c;\n}\n.student-profile-container .grid-layout .card .fee-summary {\n  display: flex;\n  gap: 16px;\n}\n.student-profile-container .grid-layout .card .fee-summary .fee-block {\n  flex: 1;\n  padding: 16px;\n  border-radius: 8px;\n  display: flex;\n  flex-direction: column;\n  gap: 8px;\n}\n.student-profile-container .grid-layout .card .fee-summary .fee-block.paid {\n  background: #dcfce7;\n}\n.student-profile-container .grid-layout .card .fee-summary .fee-block.paid .fee-label {\n  color: #166534;\n}\n.student-profile-container .grid-layout .card .fee-summary .fee-block.paid .fee-value {\n  color: #14532d;\n}\n.student-profile-container .grid-layout .card .fee-summary .fee-block.outstanding {\n  background: #ffedd5;\n}\n.student-profile-container .grid-layout .card .fee-summary .fee-block.outstanding .fee-label {\n  color: #c2410c;\n}\n.student-profile-container .grid-layout .card .fee-summary .fee-block.outstanding .fee-value {\n  color: #9a3412;\n}\n.student-profile-container .grid-layout .card .fee-summary .fee-block .fee-label {\n  font-size: 13px;\n  font-weight: 500;\n}\n.student-profile-container .grid-layout .card .fee-summary .fee-block .fee-value {\n  font-size: 18px;\n  font-weight: 700;\n}\n/*# sourceMappingURL=student-profile.page.css.map */\n'] }]
  }], null, null);
})();
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && \u0275setClassDebugInfo(StudentProfilePage, { className: "StudentProfilePage", filePath: "src/app/features/dashboard/pages/student-profile/student-profile.page.ts", lineNumber: 12 });
})();
export {
  StudentProfilePage
};
//# sourceMappingURL=chunk-3RN4BOM6.js.map
