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
  ɵɵpureFunction2,
  ɵɵtemplate,
  ɵɵtext,
  ɵɵtextInterpolate,
  ɵɵtextInterpolate1
} from "./chunk-3IPAKGA7.js";
import "./chunk-QHQP2P2Z.js";

// src/app/features/dashboard/pages/teachers/teachers.page.ts
var _c0 = (a0, a1) => ({ "status-active": a0, "status-leave": a1 });
function TeachersPage_div_34_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 23)(1, "div", 24)(2, "div", 25);
    \u0275\u0275text(3);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(4, "div", 26)(5, "div", 27);
    \u0275\u0275text(6);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(7, "div", 28);
    \u0275\u0275text(8);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(9, "div", 29);
    \u0275\u0275text(10);
    \u0275\u0275elementEnd()();
    \u0275\u0275element(11, "div", 30);
    \u0275\u0275elementStart(12, "div", 31)(13, "div", 32)(14, "span", 33);
    \u0275\u0275text(15, "Subjects:");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(16, "span", 34);
    \u0275\u0275text(17);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(18, "div", 32)(19, "span", 33);
    \u0275\u0275text(20, "Phone:");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(21, "span", 34);
    \u0275\u0275text(22);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(23, "div", 32)(24, "span", 33);
    \u0275\u0275text(25, "Email:");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(26, "span", 34);
    \u0275\u0275text(27);
    \u0275\u0275elementEnd()()()();
  }
  if (rf & 2) {
    const teacher_r1 = ctx.$implicit;
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate(teacher_r1.name.charAt(0));
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate(teacher_r1.name);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(teacher_r1.department);
    \u0275\u0275advance();
    \u0275\u0275property("ngClass", \u0275\u0275pureFunction2(8, _c0, teacher_r1.status === "Active", teacher_r1.status === "On Leave"));
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", teacher_r1.status, " ");
    \u0275\u0275advance(7);
    \u0275\u0275textInterpolate(teacher_r1.subjects.join(", "));
    \u0275\u0275advance(5);
    \u0275\u0275textInterpolate(teacher_r1.phone);
    \u0275\u0275advance(5);
    \u0275\u0275textInterpolate(teacher_r1.email);
  }
}
var TeachersPage = class _TeachersPage {
  constructor() {
    this.teachers = [
      {
        id: "1",
        name: "Sarah Jenkins",
        department: "Science",
        status: "Active",
        subjects: ["Biology", "Chemistry"],
        phone: "(555) 123-4567",
        email: "s.jenkins@school.edu"
      },
      {
        id: "2",
        name: "Michael Chang",
        department: "Mathematics",
        status: "Active",
        subjects: ["Algebra", "Calculus"],
        phone: "(555) 234-5678",
        email: "m.chang@school.edu"
      },
      {
        id: "3",
        name: "Elena Rodriguez",
        department: "Languages",
        status: "On Leave",
        subjects: ["Spanish I", "Spanish II"],
        phone: "(555) 345-6789",
        email: "e.rodriguez@school.edu"
      },
      {
        id: "4",
        name: "David Smith",
        department: "Humanities",
        status: "Active",
        subjects: ["World History", "Geography"],
        phone: "(555) 456-7890",
        email: "d.smith@school.edu"
      },
      {
        id: "5",
        name: "Jessica Taylor",
        department: "Arts",
        status: "Active",
        subjects: ["Studio Art", "Art History"],
        phone: "(555) 567-8901",
        email: "j.taylor@school.edu"
      },
      {
        id: "6",
        name: "Robert Wilson",
        department: "Physical Education",
        status: "Active",
        subjects: ["Physical Ed", "Health"],
        phone: "(555) 678-9012",
        email: "r.wilson@school.edu"
      }
    ];
  }
  ngOnInit() {
  }
  static {
    this.\u0275fac = function TeachersPage_Factory(__ngFactoryType__) {
      return new (__ngFactoryType__ || _TeachersPage)();
    };
  }
  static {
    this.\u0275cmp = /* @__PURE__ */ \u0275\u0275defineComponent({ type: _TeachersPage, selectors: [["app-teachers"]], decls: 49, vars: 1, consts: [[1, "teachers-page"], [1, "header"], [1, "breadcrumb"], [1, "title"], [1, "toolbar"], [1, "filters"], [1, "filter-dropdown"], ["value", ""], ["value", "science"], ["value", "math"], ["value", "english"], ["value", "biology"], ["value", "algebra"], ["value", "active"], ["value", "leave"], [1, "add-btn"], [1, "teachers-grid"], ["class", "teacher-card", 4, "ngFor", "ngForOf"], [1, "footer"], [1, "showing-text"], [1, "pagination"], [1, "page-btn"], [1, "page-btn", "active"], [1, "teacher-card"], [1, "card-header"], [1, "avatar"], [1, "teacher-info"], [1, "name"], [1, "department"], [1, "status-badge", 3, "ngClass"], [1, "card-separator"], [1, "card-body"], [1, "info-row"], [1, "label"], [1, "value"]], template: function TeachersPage_Template(rf, ctx) {
      if (rf & 1) {
        \u0275\u0275elementStart(0, "div", 0)(1, "div", 1)(2, "div", 2);
        \u0275\u0275text(3, "Teachers & Staff > Teachers");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(4, "h1", 3);
        \u0275\u0275text(5, "Teachers Directory");
        \u0275\u0275elementEnd()();
        \u0275\u0275elementStart(6, "div", 4)(7, "div", 5)(8, "select", 6)(9, "option", 7);
        \u0275\u0275text(10, "Department");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(11, "option", 8);
        \u0275\u0275text(12, "Science");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(13, "option", 9);
        \u0275\u0275text(14, "Mathematics");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(15, "option", 10);
        \u0275\u0275text(16, "English");
        \u0275\u0275elementEnd()();
        \u0275\u0275elementStart(17, "select", 6)(18, "option", 7);
        \u0275\u0275text(19, "Subject");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(20, "option", 11);
        \u0275\u0275text(21, "Biology");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(22, "option", 12);
        \u0275\u0275text(23, "Algebra");
        \u0275\u0275elementEnd()();
        \u0275\u0275elementStart(24, "select", 6)(25, "option", 7);
        \u0275\u0275text(26, "Status");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(27, "option", 13);
        \u0275\u0275text(28, "Active");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(29, "option", 14);
        \u0275\u0275text(30, "On Leave");
        \u0275\u0275elementEnd()()();
        \u0275\u0275elementStart(31, "button", 15);
        \u0275\u0275text(32, "+ Add Teacher");
        \u0275\u0275elementEnd()();
        \u0275\u0275elementStart(33, "div", 16);
        \u0275\u0275template(34, TeachersPage_div_34_Template, 28, 11, "div", 17);
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(35, "div", 18)(36, "div", 19);
        \u0275\u0275text(37, "Showing 1-6 of 24 educators");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(38, "div", 20)(39, "button", 21);
        \u0275\u0275text(40, "Previous");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(41, "button", 22);
        \u0275\u0275text(42, "1");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(43, "button", 21);
        \u0275\u0275text(44, "2");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(45, "button", 21);
        \u0275\u0275text(46, "3");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(47, "button", 21);
        \u0275\u0275text(48, "Next");
        \u0275\u0275elementEnd()()()();
      }
      if (rf & 2) {
        \u0275\u0275advance(34);
        \u0275\u0275property("ngForOf", ctx.teachers);
      }
    }, dependencies: [CommonModule, NgClass, NgForOf], styles: ["\n\n.teachers-page[_ngcontent-%COMP%] {\n  display: flex;\n  flex-direction: column;\n  gap: 24px;\n  padding: 24px;\n  background-color: #f9fafb;\n  min-height: 100%;\n  box-sizing: border-box;\n}\n.header[_ngcontent-%COMP%]   .breadcrumb[_ngcontent-%COMP%] {\n  font-size: 14px;\n  color: #6b7280;\n  margin-bottom: 8px;\n}\n.header[_ngcontent-%COMP%]   .title[_ngcontent-%COMP%] {\n  font-size: 24px;\n  font-weight: 600;\n  color: #111827;\n  margin: 0;\n}\n.toolbar[_ngcontent-%COMP%] {\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n  flex-wrap: wrap;\n  gap: 16px;\n}\n.toolbar[_ngcontent-%COMP%]   .filters[_ngcontent-%COMP%] {\n  display: flex;\n  gap: 12px;\n  flex-wrap: wrap;\n}\n.toolbar[_ngcontent-%COMP%]   .filters[_ngcontent-%COMP%]   .filter-dropdown[_ngcontent-%COMP%] {\n  padding: 8px 12px;\n  border: 1px solid #d1d5db;\n  border-radius: 6px;\n  background-color: #ffffff;\n  color: #374151;\n  font-size: 14px;\n  outline: none;\n  min-width: 120px;\n}\n.toolbar[_ngcontent-%COMP%]   .filters[_ngcontent-%COMP%]   .filter-dropdown[_ngcontent-%COMP%]:focus {\n  border-color: #f97316;\n  box-shadow: 0 0 0 2px rgba(249, 115, 22, 0.2);\n}\n.toolbar[_ngcontent-%COMP%]   .add-btn[_ngcontent-%COMP%] {\n  background-color: #f97316;\n  color: #ffffff;\n  border: none;\n  border-radius: 6px;\n  padding: 10px 16px;\n  font-size: 14px;\n  font-weight: 500;\n  cursor: pointer;\n  transition: background-color 0.2s;\n}\n.toolbar[_ngcontent-%COMP%]   .add-btn[_ngcontent-%COMP%]:hover {\n  background-color: #ea580c;\n}\n.teachers-grid[_ngcontent-%COMP%] {\n  display: grid;\n  grid-template-columns: repeat(3, 1fr);\n  gap: 24px;\n}\n@media (max-width: 1024px) {\n  .teachers-grid[_ngcontent-%COMP%] {\n    grid-template-columns: repeat(2, 1fr);\n  }\n}\n@media (max-width: 640px) {\n  .teachers-grid[_ngcontent-%COMP%] {\n    grid-template-columns: 1fr;\n  }\n}\n.teacher-card[_ngcontent-%COMP%] {\n  background-color: #ffffff;\n  border: 1px solid #e5e7eb;\n  border-radius: 12px;\n  padding: 20px;\n  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);\n  display: flex;\n  flex-direction: column;\n}\n.teacher-card[_ngcontent-%COMP%]   .card-header[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  gap: 16px;\n  margin-bottom: 16px;\n}\n.teacher-card[_ngcontent-%COMP%]   .card-header[_ngcontent-%COMP%]   .avatar[_ngcontent-%COMP%] {\n  width: 48px;\n  height: 48px;\n  border-radius: 50%;\n  background-color: #fce7f3;\n  color: #db2777;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  font-size: 20px;\n  font-weight: 600;\n  flex-shrink: 0;\n}\n.teacher-card[_ngcontent-%COMP%]   .card-header[_ngcontent-%COMP%]   .teacher-info[_ngcontent-%COMP%] {\n  flex: 1;\n  min-width: 0;\n}\n.teacher-card[_ngcontent-%COMP%]   .card-header[_ngcontent-%COMP%]   .teacher-info[_ngcontent-%COMP%]   .name[_ngcontent-%COMP%] {\n  font-size: 16px;\n  font-weight: 600;\n  color: #111827;\n  white-space: nowrap;\n  overflow: hidden;\n  text-overflow: ellipsis;\n}\n.teacher-card[_ngcontent-%COMP%]   .card-header[_ngcontent-%COMP%]   .teacher-info[_ngcontent-%COMP%]   .department[_ngcontent-%COMP%] {\n  font-size: 13px;\n  color: #6b7280;\n  margin-top: 2px;\n}\n.teacher-card[_ngcontent-%COMP%]   .card-header[_ngcontent-%COMP%]   .status-badge[_ngcontent-%COMP%] {\n  font-size: 12px;\n  font-weight: 500;\n  padding: 4px 8px;\n  border-radius: 12px;\n  white-space: nowrap;\n}\n.teacher-card[_ngcontent-%COMP%]   .card-header[_ngcontent-%COMP%]   .status-badge.status-active[_ngcontent-%COMP%] {\n  background-color: #dcfce7;\n  color: #166534;\n}\n.teacher-card[_ngcontent-%COMP%]   .card-header[_ngcontent-%COMP%]   .status-badge.status-leave[_ngcontent-%COMP%] {\n  background-color: #fef9c3;\n  color: #854d0e;\n}\n.teacher-card[_ngcontent-%COMP%]   .card-separator[_ngcontent-%COMP%] {\n  height: 1px;\n  background-color: #f3f4f6;\n  margin: 0 -20px 16px -20px;\n}\n.teacher-card[_ngcontent-%COMP%]   .card-body[_ngcontent-%COMP%] {\n  display: flex;\n  flex-direction: column;\n  gap: 12px;\n  font-size: 14px;\n}\n.teacher-card[_ngcontent-%COMP%]   .card-body[_ngcontent-%COMP%]   .info-row[_ngcontent-%COMP%] {\n  display: flex;\n  gap: 8px;\n}\n.teacher-card[_ngcontent-%COMP%]   .card-body[_ngcontent-%COMP%]   .info-row[_ngcontent-%COMP%]   .label[_ngcontent-%COMP%] {\n  color: #6b7280;\n  width: 65px;\n  flex-shrink: 0;\n}\n.teacher-card[_ngcontent-%COMP%]   .card-body[_ngcontent-%COMP%]   .info-row[_ngcontent-%COMP%]   .value[_ngcontent-%COMP%] {\n  color: #374151;\n  font-weight: 500;\n}\n.footer[_ngcontent-%COMP%] {\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n  flex-wrap: wrap;\n  gap: 16px;\n  padding-top: 16px;\n  border-top: 1px solid #e5e7eb;\n}\n.footer[_ngcontent-%COMP%]   .showing-text[_ngcontent-%COMP%] {\n  font-size: 14px;\n  color: #6b7280;\n}\n.footer[_ngcontent-%COMP%]   .pagination[_ngcontent-%COMP%] {\n  display: flex;\n  gap: 8px;\n}\n.footer[_ngcontent-%COMP%]   .pagination[_ngcontent-%COMP%]   .page-btn[_ngcontent-%COMP%] {\n  padding: 6px 12px;\n  border: 1px solid #d1d5db;\n  background-color: #ffffff;\n  color: #374151;\n  font-size: 14px;\n  border-radius: 6px;\n  cursor: pointer;\n  transition: all 0.2s;\n}\n.footer[_ngcontent-%COMP%]   .pagination[_ngcontent-%COMP%]   .page-btn[_ngcontent-%COMP%]:hover {\n  background-color: #f3f4f6;\n}\n.footer[_ngcontent-%COMP%]   .pagination[_ngcontent-%COMP%]   .page-btn.active[_ngcontent-%COMP%] {\n  background-color: #f97316;\n  color: #ffffff;\n  border-color: #f97316;\n}\n/*# sourceMappingURL=teachers.page.css.map */"] });
  }
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(TeachersPage, [{
    type: Component,
    args: [{ selector: "app-teachers", standalone: true, imports: [CommonModule], template: `<div class="teachers-page">
  <div class="header">
    <div class="breadcrumb">Teachers &amp; Staff &gt; Teachers</div>
    <h1 class="title">Teachers Directory</h1>
  </div>

  <div class="toolbar">
    <div class="filters">
      <select class="filter-dropdown">
        <option value="">Department</option>
        <option value="science">Science</option>
        <option value="math">Mathematics</option>
        <option value="english">English</option>
      </select>
      <select class="filter-dropdown">
        <option value="">Subject</option>
        <option value="biology">Biology</option>
        <option value="algebra">Algebra</option>
      </select>
      <select class="filter-dropdown">
        <option value="">Status</option>
        <option value="active">Active</option>
        <option value="leave">On Leave</option>
      </select>
    </div>
    <button class="add-btn">+ Add Teacher</button>
  </div>

  <div class="teachers-grid">
    <div class="teacher-card" *ngFor="let teacher of teachers">
      <div class="card-header">
        <div class="avatar">{{ teacher.name.charAt(0) }}</div>
        <div class="teacher-info">
          <div class="name">{{ teacher.name }}</div>
          <div class="department">{{ teacher.department }}</div>
        </div>
        <div class="status-badge" [ngClass]="{'status-active': teacher.status === 'Active', 'status-leave': teacher.status === 'On Leave'}">
          {{ teacher.status }}
        </div>
      </div>
      <div class="card-separator"></div>
      <div class="card-body">
        <div class="info-row">
          <span class="label">Subjects:</span>
          <span class="value">{{ teacher.subjects.join(', ') }}</span>
        </div>
        <div class="info-row">
          <span class="label">Phone:</span>
          <span class="value">{{ teacher.phone }}</span>
        </div>
        <div class="info-row">
          <span class="label">Email:</span>
          <span class="value">{{ teacher.email }}</span>
        </div>
      </div>
    </div>
  </div>

  <div class="footer">
    <div class="showing-text">Showing 1-6 of 24 educators</div>
    <div class="pagination">
      <button class="page-btn">Previous</button>
      <button class="page-btn active">1</button>
      <button class="page-btn">2</button>
      <button class="page-btn">3</button>
      <button class="page-btn">Next</button>
    </div>
  </div>
</div>
`, styles: ["/* src/app/features/dashboard/pages/teachers/teachers.page.scss */\n.teachers-page {\n  display: flex;\n  flex-direction: column;\n  gap: 24px;\n  padding: 24px;\n  background-color: #f9fafb;\n  min-height: 100%;\n  box-sizing: border-box;\n}\n.header .breadcrumb {\n  font-size: 14px;\n  color: #6b7280;\n  margin-bottom: 8px;\n}\n.header .title {\n  font-size: 24px;\n  font-weight: 600;\n  color: #111827;\n  margin: 0;\n}\n.toolbar {\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n  flex-wrap: wrap;\n  gap: 16px;\n}\n.toolbar .filters {\n  display: flex;\n  gap: 12px;\n  flex-wrap: wrap;\n}\n.toolbar .filters .filter-dropdown {\n  padding: 8px 12px;\n  border: 1px solid #d1d5db;\n  border-radius: 6px;\n  background-color: #ffffff;\n  color: #374151;\n  font-size: 14px;\n  outline: none;\n  min-width: 120px;\n}\n.toolbar .filters .filter-dropdown:focus {\n  border-color: #f97316;\n  box-shadow: 0 0 0 2px rgba(249, 115, 22, 0.2);\n}\n.toolbar .add-btn {\n  background-color: #f97316;\n  color: #ffffff;\n  border: none;\n  border-radius: 6px;\n  padding: 10px 16px;\n  font-size: 14px;\n  font-weight: 500;\n  cursor: pointer;\n  transition: background-color 0.2s;\n}\n.toolbar .add-btn:hover {\n  background-color: #ea580c;\n}\n.teachers-grid {\n  display: grid;\n  grid-template-columns: repeat(3, 1fr);\n  gap: 24px;\n}\n@media (max-width: 1024px) {\n  .teachers-grid {\n    grid-template-columns: repeat(2, 1fr);\n  }\n}\n@media (max-width: 640px) {\n  .teachers-grid {\n    grid-template-columns: 1fr;\n  }\n}\n.teacher-card {\n  background-color: #ffffff;\n  border: 1px solid #e5e7eb;\n  border-radius: 12px;\n  padding: 20px;\n  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);\n  display: flex;\n  flex-direction: column;\n}\n.teacher-card .card-header {\n  display: flex;\n  align-items: center;\n  gap: 16px;\n  margin-bottom: 16px;\n}\n.teacher-card .card-header .avatar {\n  width: 48px;\n  height: 48px;\n  border-radius: 50%;\n  background-color: #fce7f3;\n  color: #db2777;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  font-size: 20px;\n  font-weight: 600;\n  flex-shrink: 0;\n}\n.teacher-card .card-header .teacher-info {\n  flex: 1;\n  min-width: 0;\n}\n.teacher-card .card-header .teacher-info .name {\n  font-size: 16px;\n  font-weight: 600;\n  color: #111827;\n  white-space: nowrap;\n  overflow: hidden;\n  text-overflow: ellipsis;\n}\n.teacher-card .card-header .teacher-info .department {\n  font-size: 13px;\n  color: #6b7280;\n  margin-top: 2px;\n}\n.teacher-card .card-header .status-badge {\n  font-size: 12px;\n  font-weight: 500;\n  padding: 4px 8px;\n  border-radius: 12px;\n  white-space: nowrap;\n}\n.teacher-card .card-header .status-badge.status-active {\n  background-color: #dcfce7;\n  color: #166534;\n}\n.teacher-card .card-header .status-badge.status-leave {\n  background-color: #fef9c3;\n  color: #854d0e;\n}\n.teacher-card .card-separator {\n  height: 1px;\n  background-color: #f3f4f6;\n  margin: 0 -20px 16px -20px;\n}\n.teacher-card .card-body {\n  display: flex;\n  flex-direction: column;\n  gap: 12px;\n  font-size: 14px;\n}\n.teacher-card .card-body .info-row {\n  display: flex;\n  gap: 8px;\n}\n.teacher-card .card-body .info-row .label {\n  color: #6b7280;\n  width: 65px;\n  flex-shrink: 0;\n}\n.teacher-card .card-body .info-row .value {\n  color: #374151;\n  font-weight: 500;\n}\n.footer {\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n  flex-wrap: wrap;\n  gap: 16px;\n  padding-top: 16px;\n  border-top: 1px solid #e5e7eb;\n}\n.footer .showing-text {\n  font-size: 14px;\n  color: #6b7280;\n}\n.footer .pagination {\n  display: flex;\n  gap: 8px;\n}\n.footer .pagination .page-btn {\n  padding: 6px 12px;\n  border: 1px solid #d1d5db;\n  background-color: #ffffff;\n  color: #374151;\n  font-size: 14px;\n  border-radius: 6px;\n  cursor: pointer;\n  transition: all 0.2s;\n}\n.footer .pagination .page-btn:hover {\n  background-color: #f3f4f6;\n}\n.footer .pagination .page-btn.active {\n  background-color: #f97316;\n  color: #ffffff;\n  border-color: #f97316;\n}\n/*# sourceMappingURL=teachers.page.css.map */\n"] }]
  }], () => [], null);
})();
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && \u0275setClassDebugInfo(TeachersPage, { className: "TeachersPage", filePath: "src/app/features/dashboard/pages/teachers/teachers.page.ts", lineNumber: 22 });
})();
export {
  TeachersPage
};
//# sourceMappingURL=chunk-GQC3TUCS.js.map
