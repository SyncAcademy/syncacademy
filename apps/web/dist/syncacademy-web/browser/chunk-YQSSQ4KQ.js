import {
  FormsModule,
  NgSelectOption,
  ɵNgSelectMultipleOption
} from "./chunk-JZPTM7M7.js";
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
  ɵɵpropertyInterpolate,
  ɵɵsanitizeUrl,
  ɵɵtemplate,
  ɵɵtext,
  ɵɵtextInterpolate,
  ɵɵtextInterpolate1
} from "./chunk-3IPAKGA7.js";
import "./chunk-QHQP2P2Z.js";

// src/app/features/dashboard/pages/students/students.page.ts
function StudentsPage_tr_49_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "tr")(1, "td", 13);
    \u0275\u0275element(2, "input", 14);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(3, "td")(4, "div", 22);
    \u0275\u0275element(5, "img", 23);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(6, "td", 24);
    \u0275\u0275text(7);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(8, "td", 24);
    \u0275\u0275text(9);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(10, "td");
    \u0275\u0275text(11);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(12, "td");
    \u0275\u0275text(13);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(14, "td");
    \u0275\u0275text(15);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(16, "td")(17, "div", 25);
    \u0275\u0275element(18, "span", 26);
    \u0275\u0275text(19);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(20, "td")(21, "span", 27);
    \u0275\u0275text(22);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(23, "td", 15)(24, "button", 28);
    \u0275\u0275text(25, "\u270E");
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(26, "button", 29);
    \u0275\u0275text(27, "\u{1F5D1}");
    \u0275\u0275elementEnd()()();
  }
  if (rf & 2) {
    const student_r1 = ctx.$implicit;
    \u0275\u0275advance(5);
    \u0275\u0275propertyInterpolate("alt", student_r1.fullName);
    \u0275\u0275property("src", student_r1.photo, \u0275\u0275sanitizeUrl);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(student_r1.studentId);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(student_r1.fullName);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(student_r1.studentClass);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(student_r1.gender);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(student_r1.parent);
    \u0275\u0275advance(3);
    \u0275\u0275property("ngClass", student_r1.feeStatus.toLowerCase());
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", student_r1.feeStatus, " ");
    \u0275\u0275advance(2);
    \u0275\u0275property("ngClass", student_r1.status.toLowerCase());
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", student_r1.status, " ");
  }
}
var StudentsPage = class _StudentsPage {
  constructor() {
    this.students = [
      { id: "1", photo: "/assets/images/amani-juma.svg", studentId: "STD-23-001", fullName: "Amani Juma", studentClass: "Grade 6", gender: "Male", parent: "Rashid Juma", feeStatus: "Paid", status: "Active" },
      { id: "2", photo: "assets/avatars/2.jpg", studentId: "STD-23-002", fullName: "John Mwangi", studentClass: "Grade 6", gender: "Male", parent: "Peter Mwangi", feeStatus: "Pending", status: "Active" },
      { id: "3", photo: "assets/avatars/3.jpg", studentId: "STD-23-003", fullName: "Sarah Ochieng", studentClass: "Grade 6", gender: "Female", parent: "Mary Ochieng", feeStatus: "Overdue", status: "Inactive" },
      { id: "4", photo: "assets/avatars/4.jpg", studentId: "STD-23-004", fullName: "David Kamau", studentClass: "Grade 6", gender: "Male", parent: "Alice Kamau", feeStatus: "Paid", status: "Active" },
      { id: "5", photo: "assets/avatars/5.jpg", studentId: "STD-23-005", fullName: "Faith Mutua", studentClass: "Grade 6", gender: "Female", parent: "Joseph Mutua", feeStatus: "Pending", status: "Active" },
      { id: "6", photo: "assets/avatars/6.jpg", studentId: "STD-23-006", fullName: "Kevin Kiprono", studentClass: "Grade 6", gender: "Male", parent: "Sarah Kiprono", feeStatus: "Paid", status: "Active" },
      { id: "7", photo: "assets/avatars/7.jpg", studentId: "STD-23-007", fullName: "Joy Wanjiku", studentClass: "Grade 6", gender: "Female", parent: "James Wanjiku", feeStatus: "Overdue", status: "Inactive" }
    ];
  }
  static {
    this.\u0275fac = function StudentsPage_Factory(__ngFactoryType__) {
      return new (__ngFactoryType__ || _StudentsPage)();
    };
  }
  static {
    this.\u0275cmp = /* @__PURE__ */ \u0275\u0275defineComponent({ type: _StudentsPage, selectors: [["app-students-page"]], decls: 62, vars: 1, consts: [[1, "page-container"], [1, "page-header"], [1, "toolbar"], [1, "filters"], [1, "filter-dropdown"], [1, "actions"], [1, "search-box"], [1, "search-icon"], ["type", "text", "placeholder", "Search students..."], [1, "btn-add"], [1, "plus-icon"], [1, "table-scroll-wrapper"], [1, "data-table"], [1, "col-checkbox"], ["type", "checkbox"], [1, "col-actions"], [4, "ngFor", "ngForOf"], [1, "pagination"], [1, "pagination-info"], [1, "pagination-controls"], [1, "page-btn"], [1, "page-btn", "active"], [1, "avatar-container"], ["onerror", "this.src='https://ui-avatars.com/api/?name=' + student.fullName + '&background=random'", 1, "avatar", 3, "src", "alt"], [1, "font-medium"], [1, "fee-status"], [1, "status-dot", 3, "ngClass"], [1, "badge", 3, "ngClass"], ["title", "Edit", 1, "action-btn", "edit-btn"], ["title", "Delete", 1, "action-btn", "delete-btn"]], template: function StudentsPage_Template(rf, ctx) {
      if (rf & 1) {
        \u0275\u0275elementStart(0, "div", 0)(1, "header", 1)(2, "h1");
        \u0275\u0275text(3, "All Students");
        \u0275\u0275elementEnd()();
        \u0275\u0275elementStart(4, "div", 2)(5, "div", 3)(6, "select", 4)(7, "option");
        \u0275\u0275text(8, "Class: Grade 6");
        \u0275\u0275elementEnd()();
        \u0275\u0275elementStart(9, "select", 4)(10, "option");
        \u0275\u0275text(11, "Gender: All");
        \u0275\u0275elementEnd()();
        \u0275\u0275elementStart(12, "select", 4)(13, "option");
        \u0275\u0275text(14, "Status: Active");
        \u0275\u0275elementEnd()()();
        \u0275\u0275elementStart(15, "div", 5)(16, "div", 6)(17, "span", 7);
        \u0275\u0275text(18, "\u{1F50D}");
        \u0275\u0275elementEnd();
        \u0275\u0275element(19, "input", 8);
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(20, "button", 9)(21, "span", 10);
        \u0275\u0275text(22, "+");
        \u0275\u0275elementEnd();
        \u0275\u0275text(23, " Add Student ");
        \u0275\u0275elementEnd()()();
        \u0275\u0275elementStart(24, "div", 11)(25, "table", 12)(26, "thead")(27, "tr")(28, "th", 13);
        \u0275\u0275element(29, "input", 14);
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(30, "th");
        \u0275\u0275text(31, "Photo");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(32, "th");
        \u0275\u0275text(33, "Student ID");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(34, "th");
        \u0275\u0275text(35, "Full Name");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(36, "th");
        \u0275\u0275text(37, "Class");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(38, "th");
        \u0275\u0275text(39, "Gender");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(40, "th");
        \u0275\u0275text(41, "Parent/Guardian");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(42, "th");
        \u0275\u0275text(43, "Fee Status");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(44, "th");
        \u0275\u0275text(45, "Status");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(46, "th", 15);
        \u0275\u0275text(47, "Actions");
        \u0275\u0275elementEnd()()();
        \u0275\u0275elementStart(48, "tbody");
        \u0275\u0275template(49, StudentsPage_tr_49_Template, 28, 11, "tr", 16);
        \u0275\u0275elementEnd()()();
        \u0275\u0275elementStart(50, "div", 17)(51, "div", 18);
        \u0275\u0275text(52, " Showing 1-7 of 1,247 students ");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(53, "div", 19)(54, "button", 20);
        \u0275\u0275text(55, "Previous");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(56, "button", 21);
        \u0275\u0275text(57, "1");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(58, "button", 20);
        \u0275\u0275text(59, "2");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(60, "button", 20);
        \u0275\u0275text(61, "Next");
        \u0275\u0275elementEnd()()()();
      }
      if (rf & 2) {
        \u0275\u0275advance(49);
        \u0275\u0275property("ngForOf", ctx.students);
      }
    }, dependencies: [CommonModule, NgClass, NgForOf, FormsModule, NgSelectOption, \u0275NgSelectMultipleOption], styles: [`

.page-container[_ngcontent-%COMP%] {
  padding: 24px;
  background-color: #f9fafb;
  font-family:
    "Inter",
    -apple-system,
    BlinkMacSystemFont,
    "Segoe UI",
    Roboto,
    Helvetica,
    Arial,
    sans-serif;
  color: #1f2937;
}
.page-header[_ngcontent-%COMP%] {
  margin-bottom: 24px;
}
.page-header[_ngcontent-%COMP%]   h1[_ngcontent-%COMP%] {
  font-size: 24px;
  font-weight: 600;
  margin: 0;
}
.toolbar[_ngcontent-%COMP%] {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  flex-wrap: wrap;
  gap: 16px;
}
.toolbar[_ngcontent-%COMP%]   .filters[_ngcontent-%COMP%] {
  display: flex;
  gap: 12px;
}
.toolbar[_ngcontent-%COMP%]   .filters[_ngcontent-%COMP%]   .filter-dropdown[_ngcontent-%COMP%] {
  padding: 8px 32px 8px 12px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  background-color: #ffffff;
  color: #1f2937;
  font-size: 14px;
  outline: none;
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236b7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 8px center;
  background-size: 16px;
}
.toolbar[_ngcontent-%COMP%]   .filters[_ngcontent-%COMP%]   .filter-dropdown[_ngcontent-%COMP%]:focus {
  border-color: #f97316;
}
.toolbar[_ngcontent-%COMP%]   .actions[_ngcontent-%COMP%] {
  display: flex;
  gap: 16px;
  align-items: center;
}
.toolbar[_ngcontent-%COMP%]   .actions[_ngcontent-%COMP%]   .search-box[_ngcontent-%COMP%] {
  position: relative;
}
.toolbar[_ngcontent-%COMP%]   .actions[_ngcontent-%COMP%]   .search-box[_ngcontent-%COMP%]   .search-icon[_ngcontent-%COMP%] {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: #6b7280;
  font-size: 14px;
}
.toolbar[_ngcontent-%COMP%]   .actions[_ngcontent-%COMP%]   .search-box[_ngcontent-%COMP%]   input[_ngcontent-%COMP%] {
  padding: 8px 12px 8px 36px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  font-size: 14px;
  width: 250px;
  outline: none;
}
.toolbar[_ngcontent-%COMP%]   .actions[_ngcontent-%COMP%]   .search-box[_ngcontent-%COMP%]   input[_ngcontent-%COMP%]:focus {
  border-color: #f97316;
}
.toolbar[_ngcontent-%COMP%]   .actions[_ngcontent-%COMP%]   .btn-add[_ngcontent-%COMP%] {
  background-color: #f97316;
  color: #ffffff;
  border: none;
  border-radius: 6px;
  padding: 8px 16px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: background-color 0.2s;
}
.toolbar[_ngcontent-%COMP%]   .actions[_ngcontent-%COMP%]   .btn-add[_ngcontent-%COMP%]:hover {
  background-color: #ea580c;
}
.toolbar[_ngcontent-%COMP%]   .actions[_ngcontent-%COMP%]   .btn-add[_ngcontent-%COMP%]   .plus-icon[_ngcontent-%COMP%] {
  font-size: 16px;
  font-weight: bold;
}
.table-scroll-wrapper[_ngcontent-%COMP%] {
  overflow-x: auto;
  background-color: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  margin-bottom: 24px;
}
.data-table[_ngcontent-%COMP%] {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
  font-size: 14px;
}
.data-table[_ngcontent-%COMP%]   th[_ngcontent-%COMP%], 
.data-table[_ngcontent-%COMP%]   td[_ngcontent-%COMP%] {
  padding: 16px;
  border-bottom: 1px solid #e5e7eb;
}
.data-table[_ngcontent-%COMP%]   th[_ngcontent-%COMP%] {
  background-color: #f8fafc;
  font-weight: 600;
  color: #6b7280;
  white-space: nowrap;
}
.data-table[_ngcontent-%COMP%]   tbody[_ngcontent-%COMP%]   tr[_ngcontent-%COMP%]:hover {
  background-color: #f1f5f9;
}
.data-table[_ngcontent-%COMP%]   tbody[_ngcontent-%COMP%]   tr[_ngcontent-%COMP%]:last-child   td[_ngcontent-%COMP%] {
  border-bottom: none;
}
.data-table[_ngcontent-%COMP%]   .col-checkbox[_ngcontent-%COMP%] {
  width: 40px;
  text-align: center;
}
.data-table[_ngcontent-%COMP%]   .font-medium[_ngcontent-%COMP%] {
  font-weight: 500;
  color: #1f2937;
}
.data-table[_ngcontent-%COMP%]   .avatar-container[_ngcontent-%COMP%] {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  overflow: hidden;
  background-color: #e5e7eb;
}
.data-table[_ngcontent-%COMP%]   .avatar-container[_ngcontent-%COMP%]   .avatar[_ngcontent-%COMP%] {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.data-table[_ngcontent-%COMP%]   .fee-status[_ngcontent-%COMP%] {
  display: flex;
  align-items: center;
  gap: 6px;
}
.data-table[_ngcontent-%COMP%]   .fee-status[_ngcontent-%COMP%]   .status-dot[_ngcontent-%COMP%] {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}
.data-table[_ngcontent-%COMP%]   .fee-status[_ngcontent-%COMP%]   .status-dot.paid[_ngcontent-%COMP%] {
  background-color: #22c55e;
}
.data-table[_ngcontent-%COMP%]   .fee-status[_ngcontent-%COMP%]   .status-dot.pending[_ngcontent-%COMP%] {
  background-color: #eab308;
}
.data-table[_ngcontent-%COMP%]   .fee-status[_ngcontent-%COMP%]   .status-dot.overdue[_ngcontent-%COMP%] {
  background-color: #ef4444;
}
.data-table[_ngcontent-%COMP%]   .badge[_ngcontent-%COMP%] {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 9999px;
  font-size: 12px;
  font-weight: 500;
}
.data-table[_ngcontent-%COMP%]   .badge.active[_ngcontent-%COMP%] {
  background-color: #dcfce7;
  color: #166534;
}
.data-table[_ngcontent-%COMP%]   .badge.inactive[_ngcontent-%COMP%] {
  background-color: #fee2e2;
  color: #991b1b;
}
.data-table[_ngcontent-%COMP%]   .col-actions[_ngcontent-%COMP%] {
  white-space: nowrap;
}
.data-table[_ngcontent-%COMP%]   .col-actions[_ngcontent-%COMP%]   .action-btn[_ngcontent-%COMP%] {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 16px;
  padding: 4px 8px;
  color: #6b7280;
  border-radius: 4px;
}
.data-table[_ngcontent-%COMP%]   .col-actions[_ngcontent-%COMP%]   .action-btn[_ngcontent-%COMP%]:hover {
  background-color: #e5e7eb;
  color: #1f2937;
}
.data-table[_ngcontent-%COMP%]   .col-actions[_ngcontent-%COMP%]   .action-btn.delete-btn[_ngcontent-%COMP%]:hover {
  color: #ef4444;
}
.pagination[_ngcontent-%COMP%] {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 14px;
  color: #6b7280;
}
.pagination[_ngcontent-%COMP%]   .pagination-controls[_ngcontent-%COMP%] {
  display: flex;
  gap: 4px;
}
.pagination[_ngcontent-%COMP%]   .pagination-controls[_ngcontent-%COMP%]   .page-btn[_ngcontent-%COMP%] {
  background-color: #ffffff;
  border: 1px solid #e5e7eb;
  padding: 6px 12px;
  border-radius: 4px;
  cursor: pointer;
  color: #1f2937;
  transition: all 0.2s;
}
.pagination[_ngcontent-%COMP%]   .pagination-controls[_ngcontent-%COMP%]   .page-btn[_ngcontent-%COMP%]:hover:not(.active) {
  background-color: #f9fafb;
}
.pagination[_ngcontent-%COMP%]   .pagination-controls[_ngcontent-%COMP%]   .page-btn.active[_ngcontent-%COMP%] {
  background-color: #f97316;
  color: #ffffff;
  border-color: #f97316;
}
/*# sourceMappingURL=students.page.css.map */`] });
  }
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(StudentsPage, [{
    type: Component,
    args: [{ selector: "app-students-page", standalone: true, imports: [CommonModule, FormsModule], template: `<div class="page-container">
  <header class="page-header">
    <h1>All Students</h1>
  </header>

  <div class="toolbar">
    <div class="filters">
      <select class="filter-dropdown">
        <option>Class: Grade 6</option>
      </select>
      <select class="filter-dropdown">
        <option>Gender: All</option>
      </select>
      <select class="filter-dropdown">
        <option>Status: Active</option>
      </select>
    </div>
    
    <div class="actions">
      <div class="search-box">
        <span class="search-icon">\u{1F50D}</span>
        <input type="text" placeholder="Search students..." />
      </div>
      <button class="btn-add">
        <span class="plus-icon">+</span> Add Student
      </button>
    </div>
  </div>

  <div class="table-scroll-wrapper">
    <table class="data-table">
      <thead>
        <tr>
          <th class="col-checkbox"><input type="checkbox" /></th>
          <th>Photo</th>
          <th>Student ID</th>
          <th>Full Name</th>
          <th>Class</th>
          <th>Gender</th>
          <th>Parent/Guardian</th>
          <th>Fee Status</th>
          <th>Status</th>
          <th class="col-actions">Actions</th>
        </tr>
      </thead>
      <tbody>
        <tr *ngFor="let student of students">
          <td class="col-checkbox"><input type="checkbox" /></td>
          <td>
            <div class="avatar-container">
              <!-- Fallback to a placeholder if avatar image doesn't exist -->
              <img [src]="student.photo" alt="{{ student.fullName }}" onerror="this.src='https://ui-avatars.com/api/?name=' + student.fullName + '&background=random'" class="avatar" />
            </div>
          </td>
          <td class="font-medium">{{ student.studentId }}</td>
          <td class="font-medium">{{ student.fullName }}</td>
          <td>{{ student.studentClass }}</td>
          <td>{{ student.gender }}</td>
          <td>{{ student.parent }}</td>
          <td>
            <div class="fee-status">
              <span class="status-dot" [ngClass]="student.feeStatus.toLowerCase()"></span>
              {{ student.feeStatus }}
            </div>
          </td>
          <td>
            <span class="badge" [ngClass]="student.status.toLowerCase()">
              {{ student.status }}
            </span>
          </td>
          <td class="col-actions">
            <button class="action-btn edit-btn" title="Edit">\u270E</button>
            <button class="action-btn delete-btn" title="Delete">\u{1F5D1}</button>
          </td>
        </tr>
      </tbody>
    </table>
  </div>

  <div class="pagination">
    <div class="pagination-info">
      Showing 1-7 of 1,247 students
    </div>
    <div class="pagination-controls">
      <button class="page-btn">Previous</button>
      <button class="page-btn active">1</button>
      <button class="page-btn">2</button>
      <button class="page-btn">Next</button>
    </div>
  </div>
</div>
`, styles: [`/* src/app/features/dashboard/pages/students/students.page.scss */
.page-container {
  padding: 24px;
  background-color: #f9fafb;
  font-family:
    "Inter",
    -apple-system,
    BlinkMacSystemFont,
    "Segoe UI",
    Roboto,
    Helvetica,
    Arial,
    sans-serif;
  color: #1f2937;
}
.page-header {
  margin-bottom: 24px;
}
.page-header h1 {
  font-size: 24px;
  font-weight: 600;
  margin: 0;
}
.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  flex-wrap: wrap;
  gap: 16px;
}
.toolbar .filters {
  display: flex;
  gap: 12px;
}
.toolbar .filters .filter-dropdown {
  padding: 8px 32px 8px 12px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  background-color: #ffffff;
  color: #1f2937;
  font-size: 14px;
  outline: none;
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236b7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 8px center;
  background-size: 16px;
}
.toolbar .filters .filter-dropdown:focus {
  border-color: #f97316;
}
.toolbar .actions {
  display: flex;
  gap: 16px;
  align-items: center;
}
.toolbar .actions .search-box {
  position: relative;
}
.toolbar .actions .search-box .search-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: #6b7280;
  font-size: 14px;
}
.toolbar .actions .search-box input {
  padding: 8px 12px 8px 36px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  font-size: 14px;
  width: 250px;
  outline: none;
}
.toolbar .actions .search-box input:focus {
  border-color: #f97316;
}
.toolbar .actions .btn-add {
  background-color: #f97316;
  color: #ffffff;
  border: none;
  border-radius: 6px;
  padding: 8px 16px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: background-color 0.2s;
}
.toolbar .actions .btn-add:hover {
  background-color: #ea580c;
}
.toolbar .actions .btn-add .plus-icon {
  font-size: 16px;
  font-weight: bold;
}
.table-scroll-wrapper {
  overflow-x: auto;
  background-color: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  margin-bottom: 24px;
}
.data-table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
  font-size: 14px;
}
.data-table th,
.data-table td {
  padding: 16px;
  border-bottom: 1px solid #e5e7eb;
}
.data-table th {
  background-color: #f8fafc;
  font-weight: 600;
  color: #6b7280;
  white-space: nowrap;
}
.data-table tbody tr:hover {
  background-color: #f1f5f9;
}
.data-table tbody tr:last-child td {
  border-bottom: none;
}
.data-table .col-checkbox {
  width: 40px;
  text-align: center;
}
.data-table .font-medium {
  font-weight: 500;
  color: #1f2937;
}
.data-table .avatar-container {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  overflow: hidden;
  background-color: #e5e7eb;
}
.data-table .avatar-container .avatar {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.data-table .fee-status {
  display: flex;
  align-items: center;
  gap: 6px;
}
.data-table .fee-status .status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}
.data-table .fee-status .status-dot.paid {
  background-color: #22c55e;
}
.data-table .fee-status .status-dot.pending {
  background-color: #eab308;
}
.data-table .fee-status .status-dot.overdue {
  background-color: #ef4444;
}
.data-table .badge {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 9999px;
  font-size: 12px;
  font-weight: 500;
}
.data-table .badge.active {
  background-color: #dcfce7;
  color: #166534;
}
.data-table .badge.inactive {
  background-color: #fee2e2;
  color: #991b1b;
}
.data-table .col-actions {
  white-space: nowrap;
}
.data-table .col-actions .action-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 16px;
  padding: 4px 8px;
  color: #6b7280;
  border-radius: 4px;
}
.data-table .col-actions .action-btn:hover {
  background-color: #e5e7eb;
  color: #1f2937;
}
.data-table .col-actions .action-btn.delete-btn:hover {
  color: #ef4444;
}
.pagination {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 14px;
  color: #6b7280;
}
.pagination .pagination-controls {
  display: flex;
  gap: 4px;
}
.pagination .pagination-controls .page-btn {
  background-color: #ffffff;
  border: 1px solid #e5e7eb;
  padding: 6px 12px;
  border-radius: 4px;
  cursor: pointer;
  color: #1f2937;
  transition: all 0.2s;
}
.pagination .pagination-controls .page-btn:hover:not(.active) {
  background-color: #f9fafb;
}
.pagination .pagination-controls .page-btn.active {
  background-color: #f97316;
  color: #ffffff;
  border-color: #f97316;
}
/*# sourceMappingURL=students.page.css.map */
`] }]
  }], null, null);
})();
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && \u0275setClassDebugInfo(StudentsPage, { className: "StudentsPage", filePath: "src/app/features/dashboard/pages/students/students.page.ts", lineNumber: 24 });
})();
export {
  StudentsPage
};
//# sourceMappingURL=chunk-YQSSQ4KQ.js.map
