import {
  NgSelectOption,
  ReactiveFormsModule,
  ɵNgSelectMultipleOption
} from "./chunk-JZPTM7M7.js";
import {
  CommonModule,
  Component,
  NgClass,
  NgForOf,
  NgSwitch,
  NgSwitchCase,
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
  ɵɵnamespaceHTML,
  ɵɵnamespaceSVG,
  ɵɵnextContext,
  ɵɵproperty,
  ɵɵresetView,
  ɵɵrestoreView,
  ɵɵtemplate,
  ɵɵtext,
  ɵɵtextInterpolate,
  ɵɵtextInterpolate1
} from "./chunk-3IPAKGA7.js";
import "./chunk-QHQP2P2Z.js";

// src/app/features/dashboard/pages/users/users.page.ts
function UsersPage_li_10_Template(rf, ctx) {
  if (rf & 1) {
    const _r1 = \u0275\u0275getCurrentView();
    \u0275\u0275elementStart(0, "li", 25);
    \u0275\u0275listener("click", function UsersPage_li_10_Template_li_click_0_listener() {
      const tab_r2 = \u0275\u0275restoreView(_r1).$implicit;
      const ctx_r2 = \u0275\u0275nextContext();
      return \u0275\u0275resetView(ctx_r2.activeTab = tab_r2);
    });
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const tab_r2 = ctx.$implicit;
    const ctx_r2 = \u0275\u0275nextContext();
    \u0275\u0275classProp("active", ctx_r2.activeTab === tab_r2);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate1(" ", tab_r2, " ");
  }
}
function UsersPage_tr_47_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "tr")(1, "td", 26)(2, "div", 27);
    \u0275\u0275text(3);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(4, "div", 28)(5, "span", 29);
    \u0275\u0275text(6);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(7, "span", 30);
    \u0275\u0275text(8);
    \u0275\u0275elementEnd()()();
    \u0275\u0275elementStart(9, "td")(10, "span", 31);
    \u0275\u0275text(11);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(12, "td")(13, "span", 32);
    \u0275\u0275text(14);
    \u0275\u0275elementEnd()();
    \u0275\u0275elementStart(15, "td", 33);
    \u0275\u0275text(16);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(17, "td", 34)(18, "button", 35);
    \u0275\u0275namespaceSVG();
    \u0275\u0275elementStart(19, "svg", 36);
    \u0275\u0275element(20, "path", 37)(21, "path", 38);
    \u0275\u0275elementEnd()();
    \u0275\u0275namespaceHTML();
    \u0275\u0275elementStart(22, "button", 39);
    \u0275\u0275namespaceSVG();
    \u0275\u0275elementStart(23, "svg", 36);
    \u0275\u0275element(24, "polyline", 40)(25, "path", 41)(26, "line", 42)(27, "line", 43);
    \u0275\u0275elementEnd()()()();
  }
  if (rf & 2) {
    const user_r4 = ctx.$implicit;
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate(user_r4.initials);
    \u0275\u0275advance(3);
    \u0275\u0275textInterpolate(user_r4.name);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(user_r4.email);
    \u0275\u0275advance(2);
    \u0275\u0275property("ngClass", user_r4.roleClass);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate(user_r4.role);
    \u0275\u0275advance(2);
    \u0275\u0275property("ngClass", user_r4.status.toLowerCase());
    \u0275\u0275advance();
    \u0275\u0275textInterpolate(user_r4.status);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(user_r4.lastLogin);
  }
}
function UsersPage_div_55__svg_svg_2_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275namespaceSVG();
    \u0275\u0275elementStart(0, "svg", 48);
    \u0275\u0275element(1, "path", 49);
    \u0275\u0275elementEnd();
  }
}
function UsersPage_div_55__svg_svg_3_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275namespaceSVG();
    \u0275\u0275elementStart(0, "svg", 48);
    \u0275\u0275element(1, "path", 50)(2, "circle", 51)(3, "polyline", 52);
    \u0275\u0275elementEnd();
  }
}
function UsersPage_div_55__svg_svg_4_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275namespaceSVG();
    \u0275\u0275elementStart(0, "svg", 48);
    \u0275\u0275element(1, "path", 53)(2, "circle", 54)(3, "path", 55)(4, "path", 56);
    \u0275\u0275elementEnd();
  }
}
function UsersPage_div_55_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 44)(1, "div", 45);
    \u0275\u0275template(2, UsersPage_div_55__svg_svg_2_Template, 2, 0, "svg", 46)(3, UsersPage_div_55__svg_svg_3_Template, 4, 0, "svg", 46)(4, UsersPage_div_55__svg_svg_4_Template, 5, 0, "svg", 46);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(5, "h3");
    \u0275\u0275text(6);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(7, "p");
    \u0275\u0275text(8);
    \u0275\u0275elementEnd();
    \u0275\u0275elementStart(9, "button", 47);
    \u0275\u0275text(10, "Edit Permissions");
    \u0275\u0275elementEnd()();
  }
  if (rf & 2) {
    const role_r5 = ctx.$implicit;
    \u0275\u0275advance();
    \u0275\u0275property("ngSwitch", role_r5.iconType);
    \u0275\u0275advance();
    \u0275\u0275property("ngSwitchCase", "shield");
    \u0275\u0275advance();
    \u0275\u0275property("ngSwitchCase", "teacher");
    \u0275\u0275advance();
    \u0275\u0275property("ngSwitchCase", "student");
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(role_r5.name);
    \u0275\u0275advance(2);
    \u0275\u0275textInterpolate(role_r5.description);
  }
}
var UsersPage = class _UsersPage {
  constructor() {
    this.activeTab = "Users";
    this.tabs = ["Users", "Roles", "Permissions"];
    this.users = [
      { id: "1", name: "Alice Johnson", email: "alice@example.com", initials: "AJ", role: "Super Administrator", roleClass: "purple", status: "Active", lastLogin: "2 mins ago" },
      { id: "2", name: "Bob Smith", email: "bob@example.com", initials: "BS", role: "Teacher", roleClass: "green", status: "Active", lastLogin: "1 hour ago" },
      { id: "3", name: "Charlie Davis", email: "charlie@example.com", initials: "CD", role: "Student", roleClass: "gray", status: "Suspended", lastLogin: "2 weeks ago" },
      { id: "4", name: "Diana Prince", email: "diana@example.com", initials: "DP", role: "Administrator", roleClass: "blue", status: "Active", lastLogin: "Just now" }
    ];
    this.roles = [
      { name: "Super Administrator", description: "Full access to all system settings and user management.", iconType: "shield" },
      { name: "Teacher", description: "Can manage classes, grades, and student records.", iconType: "teacher" },
      { name: "Student", description: "Can access assigned courses and view own grades.", iconType: "student" }
    ];
  }
  static {
    this.\u0275fac = function UsersPage_Factory(__ngFactoryType__) {
      return new (__ngFactoryType__ || _UsersPage)();
    };
  }
  static {
    this.\u0275cmp = /* @__PURE__ */ \u0275\u0275defineComponent({ type: _UsersPage, selectors: [["app-users"]], decls: 56, vars: 3, consts: [[1, "page-container"], [1, "page-header"], [1, "breadcrumb"], [1, "page-title"], [1, "tabs-container"], [1, "tabs"], [3, "active", "click", 4, "ngFor", "ngForOf"], [1, "toolbar"], [1, "filters"], ["type", "text", "placeholder", "Search users...", 1, "search-input"], [1, "filter-select"], ["value", ""], ["value", "admin"], ["value", "teacher"], ["value", "student"], ["value", "active"], ["value", "suspended"], [1, "btn-add"], [1, "table-scroll-wrapper"], [1, "users-table"], [4, "ngFor", "ngForOf"], [1, "roles-section"], [1, "roles-header"], [1, "roles-grid"], ["class", "role-card", 4, "ngFor", "ngForOf"], [3, "click"], [1, "user-info-cell"], [1, "avatar"], [1, "user-details"], [1, "user-name"], [1, "user-email"], [1, "role-text", 3, "ngClass"], [1, "status-badge", 3, "ngClass"], [1, "last-login"], [1, "actions-cell"], ["title", "Edit", 1, "action-btn"], ["xmlns", "http://www.w3.org/2000/svg", "width", "16", "height", "16", "viewBox", "0 0 24 24", "fill", "none", "stroke", "currentColor", "stroke-width", "2", "stroke-linecap", "round", "stroke-linejoin", "round"], ["d", "M12 20h9"], ["d", "M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"], ["title", "Delete", 1, "action-btn", "delete"], ["points", "3 6 5 6 21 6"], ["d", "M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"], ["x1", "10", "y1", "11", "x2", "10", "y2", "17"], ["x1", "14", "y1", "11", "x2", "14", "y2", "17"], [1, "role-card"], [1, "card-icon", 3, "ngSwitch"], ["xmlns", "http://www.w3.org/2000/svg", "width", "32", "height", "32", "viewBox", "0 0 24 24", "fill", "none", "stroke", "currentColor", "stroke-width", "2", "stroke-linecap", "round", "stroke-linejoin", "round", 4, "ngSwitchCase"], [1, "btn-edit-permissions"], ["xmlns", "http://www.w3.org/2000/svg", "width", "32", "height", "32", "viewBox", "0 0 24 24", "fill", "none", "stroke", "currentColor", "stroke-width", "2", "stroke-linecap", "round", "stroke-linejoin", "round"], ["d", "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"], ["d", "M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"], ["cx", "8.5", "cy", "7", "r", "4"], ["points", "17 11 19 13 23 9"], ["d", "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"], ["cx", "9", "cy", "7", "r", "4"], ["d", "M23 21v-2a4 4 0 0 0-3-3.87"], ["d", "M16 3.13a4 4 0 0 1 0 7.75"]], template: function UsersPage_Template(rf, ctx) {
      if (rf & 1) {
        \u0275\u0275elementStart(0, "div", 0)(1, "header", 1)(2, "div", 2);
        \u0275\u0275text(3, "Administration / ");
        \u0275\u0275elementStart(4, "span");
        \u0275\u0275text(5, "Users & Roles");
        \u0275\u0275elementEnd()();
        \u0275\u0275elementStart(6, "h1", 3);
        \u0275\u0275text(7, "Users & Roles");
        \u0275\u0275elementEnd()();
        \u0275\u0275elementStart(8, "div", 4)(9, "ul", 5);
        \u0275\u0275template(10, UsersPage_li_10_Template, 2, 3, "li", 6);
        \u0275\u0275elementEnd()();
        \u0275\u0275elementStart(11, "div", 7)(12, "div", 8);
        \u0275\u0275element(13, "input", 9);
        \u0275\u0275elementStart(14, "select", 10)(15, "option", 11);
        \u0275\u0275text(16, "All Roles");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(17, "option", 12);
        \u0275\u0275text(18, "Administrator");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(19, "option", 13);
        \u0275\u0275text(20, "Teacher");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(21, "option", 14);
        \u0275\u0275text(22, "Student");
        \u0275\u0275elementEnd()();
        \u0275\u0275elementStart(23, "select", 10)(24, "option", 11);
        \u0275\u0275text(25, "All Statuses");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(26, "option", 15);
        \u0275\u0275text(27, "Active");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(28, "option", 16);
        \u0275\u0275text(29, "Suspended");
        \u0275\u0275elementEnd()()();
        \u0275\u0275elementStart(30, "button", 17);
        \u0275\u0275text(31, "+ Add User");
        \u0275\u0275elementEnd()();
        \u0275\u0275elementStart(32, "div", 18)(33, "table", 19)(34, "thead")(35, "tr")(36, "th");
        \u0275\u0275text(37, "FULL NAME");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(38, "th");
        \u0275\u0275text(39, "ROLE");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(40, "th");
        \u0275\u0275text(41, "STATUS");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(42, "th");
        \u0275\u0275text(43, "LAST LOGIN");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(44, "th");
        \u0275\u0275text(45, "ACTIONS");
        \u0275\u0275elementEnd()()();
        \u0275\u0275elementStart(46, "tbody");
        \u0275\u0275template(47, UsersPage_tr_47_Template, 28, 8, "tr", 20);
        \u0275\u0275elementEnd()()();
        \u0275\u0275elementStart(48, "div", 21)(49, "div", 22)(50, "h2");
        \u0275\u0275text(51, "Roles Overview");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(52, "p");
        \u0275\u0275text(53, "Manage standard roles and customize permissions across the platform.");
        \u0275\u0275elementEnd()();
        \u0275\u0275elementStart(54, "div", 23);
        \u0275\u0275template(55, UsersPage_div_55_Template, 11, 6, "div", 24);
        \u0275\u0275elementEnd()()();
      }
      if (rf & 2) {
        \u0275\u0275advance(10);
        \u0275\u0275property("ngForOf", ctx.tabs);
        \u0275\u0275advance(37);
        \u0275\u0275property("ngForOf", ctx.users);
        \u0275\u0275advance(8);
        \u0275\u0275property("ngForOf", ctx.roles);
      }
    }, dependencies: [CommonModule, NgClass, NgForOf, NgSwitch, NgSwitchCase, ReactiveFormsModule, NgSelectOption, \u0275NgSelectMultipleOption], styles: ['\n\n[_ngcontent-%COMP%]:root {\n  --sa-primary: #E87E24;\n  --sa-primary-hover: #D06E1A;\n  --sa-sidebar-bg: #1E293B;\n  --sa-body-bg: #F8F9FA;\n  --sa-text-primary: #111827;\n  --sa-text-secondary: #6B7280;\n  --sa-input-border: #D1D5DB;\n  --sa-success: #10B981;\n  --sa-error: #EF4444;\n  --sa-radius: 8px;\n  --sa-font:\n    Inter,\n    -apple-system,\n    BlinkMacSystemFont,\n    Segoe UI,\n    Roboto,\n    sans-serif;\n}\n.page-container[_ngcontent-%COMP%] {\n  display: flex;\n  flex-direction: column;\n  gap: 24px;\n  padding: 24px;\n  width: 100%;\n  max-width: 1400px;\n  margin: 0 auto;\n}\n.page-header[_ngcontent-%COMP%] {\n  display: flex;\n  flex-direction: column;\n  gap: 8px;\n}\n.page-header[_ngcontent-%COMP%]   .breadcrumb[_ngcontent-%COMP%] {\n  font-size: 14px;\n  color: var(--text-secondary, #6b7280);\n}\n.page-header[_ngcontent-%COMP%]   .breadcrumb[_ngcontent-%COMP%]   span[_ngcontent-%COMP%] {\n  font-weight: 600;\n  color: var(--text-primary, #111827);\n}\n.page-header[_ngcontent-%COMP%]   .page-title[_ngcontent-%COMP%] {\n  font-size: 28px;\n  font-weight: 700;\n  margin: 0;\n  color: var(--text-primary, #111827);\n}\n.tabs-container[_ngcontent-%COMP%] {\n  border-bottom: 1px solid var(--border-color, #e5e7eb);\n}\n.tabs-container[_ngcontent-%COMP%]   .tabs[_ngcontent-%COMP%] {\n  display: flex;\n  list-style: none;\n  padding: 0;\n  margin: 0;\n  gap: 32px;\n  overflow-x: auto;\n  -webkit-overflow-scrolling: touch;\n}\n.tabs-container[_ngcontent-%COMP%]   .tabs[_ngcontent-%COMP%]   li[_ngcontent-%COMP%] {\n  padding: 12px 4px;\n  cursor: pointer;\n  color: var(--text-secondary, #6b7280);\n  font-weight: 500;\n  font-size: 15px;\n  position: relative;\n  transition: color 0.2s ease;\n  white-space: nowrap;\n}\n.tabs-container[_ngcontent-%COMP%]   .tabs[_ngcontent-%COMP%]   li[_ngcontent-%COMP%]:hover {\n  color: var(--text-primary, #374151);\n}\n.tabs-container[_ngcontent-%COMP%]   .tabs[_ngcontent-%COMP%]   li.active[_ngcontent-%COMP%] {\n  color: var(--color-primary, #f97316);\n}\n.tabs-container[_ngcontent-%COMP%]   .tabs[_ngcontent-%COMP%]   li.active[_ngcontent-%COMP%]::after {\n  content: "";\n  position: absolute;\n  bottom: -1px;\n  left: 0;\n  right: 0;\n  height: 2px;\n  background-color: var(--color-primary, #f97316);\n}\n.toolbar[_ngcontent-%COMP%] {\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n  gap: 16px;\n  flex-wrap: wrap;\n}\n.toolbar[_ngcontent-%COMP%]   .filters[_ngcontent-%COMP%] {\n  display: flex;\n  gap: 16px;\n  flex: 1;\n  flex-wrap: wrap;\n}\n.toolbar[_ngcontent-%COMP%]   .filters[_ngcontent-%COMP%]   .search-input[_ngcontent-%COMP%], \n.toolbar[_ngcontent-%COMP%]   .filters[_ngcontent-%COMP%]   .filter-select[_ngcontent-%COMP%] {\n  padding: 10px 14px;\n  border: 1px solid var(--border-color, #d1d5db);\n  border-radius: 8px;\n  outline: none;\n  font-size: 14px;\n  background-color: white;\n  color: var(--text-primary, #111827);\n  transition: border-color 0.2s, box-shadow 0.2s;\n}\n.toolbar[_ngcontent-%COMP%]   .filters[_ngcontent-%COMP%]   .search-input[_ngcontent-%COMP%]:focus, \n.toolbar[_ngcontent-%COMP%]   .filters[_ngcontent-%COMP%]   .filter-select[_ngcontent-%COMP%]:focus {\n  border-color: var(--color-primary, #f97316);\n  box-shadow: 0 0 0 3px rgba(249, 115, 22, 0.1);\n}\n.toolbar[_ngcontent-%COMP%]   .filters[_ngcontent-%COMP%]   .search-input[_ngcontent-%COMP%] {\n  min-width: 280px;\n  flex-grow: 1;\n  max-width: 400px;\n}\n.toolbar[_ngcontent-%COMP%]   .filters[_ngcontent-%COMP%]   .filter-select[_ngcontent-%COMP%] {\n  min-width: 160px;\n}\n.toolbar[_ngcontent-%COMP%]   .btn-add[_ngcontent-%COMP%] {\n  background-color: var(--color-primary, #f97316);\n  color: white;\n  border: none;\n  padding: 10px 20px;\n  border-radius: 8px;\n  font-weight: 600;\n  cursor: pointer;\n  transition: background-color 0.2s;\n  white-space: nowrap;\n}\n.toolbar[_ngcontent-%COMP%]   .btn-add[_ngcontent-%COMP%]:hover {\n  background-color: var(--color-primary-dark, #ea580c);\n}\n.users-table[_ngcontent-%COMP%] {\n  width: 100%;\n  border-collapse: separate;\n  border-spacing: 0;\n  min-width: 900px;\n}\n.users-table[_ngcontent-%COMP%]   th[_ngcontent-%COMP%] {\n  text-align: left;\n  padding: 16px;\n  background-color: var(--bg-secondary, #f9fafb);\n  color: var(--text-secondary, #6b7280);\n  font-size: 12px;\n  font-weight: 600;\n  text-transform: uppercase;\n  letter-spacing: 0.05em;\n  border-bottom: 1px solid var(--border-color, #e5e7eb);\n}\n.users-table[_ngcontent-%COMP%]   th[_ngcontent-%COMP%]:first-child {\n  border-top-left-radius: 8px;\n}\n.users-table[_ngcontent-%COMP%]   th[_ngcontent-%COMP%]:last-child {\n  border-top-right-radius: 8px;\n}\n.users-table[_ngcontent-%COMP%]   td[_ngcontent-%COMP%] {\n  padding: 16px;\n  border-bottom: 1px solid var(--border-color, #e5e7eb);\n  vertical-align: middle;\n  background-color: white;\n}\n.users-table[_ngcontent-%COMP%]   .user-info-cell[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  gap: 16px;\n}\n.users-table[_ngcontent-%COMP%]   .user-info-cell[_ngcontent-%COMP%]   .avatar[_ngcontent-%COMP%] {\n  width: 44px;\n  height: 44px;\n  border-radius: 50%;\n  background-color: var(--bg-tertiary, #e0e7ff);\n  color: var(--text-indigo, #4f46e5);\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  font-weight: 600;\n  font-size: 16px;\n}\n.users-table[_ngcontent-%COMP%]   .user-info-cell[_ngcontent-%COMP%]   .user-details[_ngcontent-%COMP%] {\n  display: flex;\n  flex-direction: column;\n  gap: 2px;\n}\n.users-table[_ngcontent-%COMP%]   .user-info-cell[_ngcontent-%COMP%]   .user-details[_ngcontent-%COMP%]   .user-name[_ngcontent-%COMP%] {\n  font-weight: 600;\n  color: var(--text-primary, #111827);\n}\n.users-table[_ngcontent-%COMP%]   .user-info-cell[_ngcontent-%COMP%]   .user-details[_ngcontent-%COMP%]   .user-email[_ngcontent-%COMP%] {\n  font-size: 13px;\n  color: var(--text-secondary, #6b7280);\n}\n.users-table[_ngcontent-%COMP%]   .role-text[_ngcontent-%COMP%] {\n  font-weight: 500;\n  font-size: 14px;\n}\n.users-table[_ngcontent-%COMP%]   .role-text.purple[_ngcontent-%COMP%] {\n  color: #7c3aed;\n}\n.users-table[_ngcontent-%COMP%]   .role-text.green[_ngcontent-%COMP%] {\n  color: #059669;\n}\n.users-table[_ngcontent-%COMP%]   .role-text.blue[_ngcontent-%COMP%] {\n  color: var(--sa-primary);\n}\n.users-table[_ngcontent-%COMP%]   .role-text.gray[_ngcontent-%COMP%] {\n  color: #4b5563;\n}\n.users-table[_ngcontent-%COMP%]   .status-badge[_ngcontent-%COMP%] {\n  padding: 4px 10px;\n  border-radius: 12px;\n  font-size: 12px;\n  font-weight: 600;\n  display: inline-flex;\n  align-items: center;\n}\n.users-table[_ngcontent-%COMP%]   .status-badge.active[_ngcontent-%COMP%] {\n  background-color: #d1fae5;\n  color: #065f46;\n}\n.users-table[_ngcontent-%COMP%]   .status-badge.suspended[_ngcontent-%COMP%] {\n  background-color: #fee2e2;\n  color: #991b1b;\n}\n.users-table[_ngcontent-%COMP%]   .last-login[_ngcontent-%COMP%] {\n  color: var(--text-secondary, #6b7280);\n  font-size: 14px;\n}\n.users-table[_ngcontent-%COMP%]   .actions-cell[_ngcontent-%COMP%] {\n  display: flex;\n  gap: 8px;\n}\n.users-table[_ngcontent-%COMP%]   .actions-cell[_ngcontent-%COMP%]   .action-btn[_ngcontent-%COMP%] {\n  background: none;\n  border: none;\n  color: var(--text-secondary, #6b7280);\n  cursor: pointer;\n  padding: 8px;\n  border-radius: 6px;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  transition: all 0.2s;\n}\n.users-table[_ngcontent-%COMP%]   .actions-cell[_ngcontent-%COMP%]   .action-btn[_ngcontent-%COMP%]:hover {\n  background-color: var(--bg-secondary, #f3f4f6);\n  color: var(--text-primary, #111827);\n}\n.users-table[_ngcontent-%COMP%]   .actions-cell[_ngcontent-%COMP%]   .action-btn.delete[_ngcontent-%COMP%]:hover {\n  color: #dc2626;\n  background-color: #fef2f2;\n}\n.roles-section[_ngcontent-%COMP%] {\n  margin-top: 16px;\n}\n.roles-section[_ngcontent-%COMP%]   .roles-header[_ngcontent-%COMP%] {\n  margin-bottom: 24px;\n}\n.roles-section[_ngcontent-%COMP%]   .roles-header[_ngcontent-%COMP%]   h2[_ngcontent-%COMP%] {\n  font-size: 22px;\n  font-weight: 600;\n  margin: 0 0 8px;\n  color: var(--text-primary, #111827);\n}\n.roles-section[_ngcontent-%COMP%]   .roles-header[_ngcontent-%COMP%]   p[_ngcontent-%COMP%] {\n  color: var(--text-secondary, #6b7280);\n  margin: 0;\n  font-size: 15px;\n}\n.roles-section[_ngcontent-%COMP%]   .roles-grid[_ngcontent-%COMP%] {\n  display: grid;\n  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));\n  gap: 24px;\n}\n.roles-section[_ngcontent-%COMP%]   .roles-grid[_ngcontent-%COMP%]   .role-card[_ngcontent-%COMP%] {\n  border: 1px solid var(--border-color, #e5e7eb);\n  border-radius: 12px;\n  padding: 24px;\n  display: flex;\n  flex-direction: column;\n  gap: 16px;\n  background-color: white;\n  transition: transform 0.2s, box-shadow 0.2s;\n}\n.roles-section[_ngcontent-%COMP%]   .roles-grid[_ngcontent-%COMP%]   .role-card[_ngcontent-%COMP%]:hover {\n  transform: translateY(-2px);\n  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);\n}\n.roles-section[_ngcontent-%COMP%]   .roles-grid[_ngcontent-%COMP%]   .role-card[_ngcontent-%COMP%]   .card-icon[_ngcontent-%COMP%] {\n  color: var(--color-primary, #f97316);\n  display: flex;\n  align-items: center;\n}\n.roles-section[_ngcontent-%COMP%]   .roles-grid[_ngcontent-%COMP%]   .role-card[_ngcontent-%COMP%]   .card-icon[_ngcontent-%COMP%]   svg[_ngcontent-%COMP%] {\n  width: 36px;\n  height: 36px;\n}\n.roles-section[_ngcontent-%COMP%]   .roles-grid[_ngcontent-%COMP%]   .role-card[_ngcontent-%COMP%]   h3[_ngcontent-%COMP%] {\n  margin: 0;\n  font-size: 18px;\n  font-weight: 600;\n  color: var(--text-primary, #111827);\n}\n.roles-section[_ngcontent-%COMP%]   .roles-grid[_ngcontent-%COMP%]   .role-card[_ngcontent-%COMP%]   p[_ngcontent-%COMP%] {\n  margin: 0;\n  color: var(--text-secondary, #6b7280);\n  font-size: 14px;\n  flex: 1;\n  line-height: 1.5;\n}\n.roles-section[_ngcontent-%COMP%]   .roles-grid[_ngcontent-%COMP%]   .role-card[_ngcontent-%COMP%]   .btn-edit-permissions[_ngcontent-%COMP%] {\n  margin-top: auto;\n  background: none;\n  border: 1px solid var(--border-color, #d1d5db);\n  padding: 10px;\n  border-radius: 8px;\n  font-weight: 600;\n  font-size: 14px;\n  cursor: pointer;\n  color: var(--text-primary, #374151);\n  transition: all 0.2s;\n}\n.roles-section[_ngcontent-%COMP%]   .roles-grid[_ngcontent-%COMP%]   .role-card[_ngcontent-%COMP%]   .btn-edit-permissions[_ngcontent-%COMP%]:hover {\n  background-color: var(--bg-secondary, #f9fafb);\n  border-color: #9ca3af;\n}\n@media (max-width: 768px) {\n  .toolbar[_ngcontent-%COMP%] {\n    flex-direction: column;\n    align-items: stretch;\n  }\n  .toolbar[_ngcontent-%COMP%]   .filters[_ngcontent-%COMP%] {\n    flex-direction: column;\n  }\n  .toolbar[_ngcontent-%COMP%]   .filters[_ngcontent-%COMP%]   .search-input[_ngcontent-%COMP%] {\n    width: 100%;\n    min-width: unset;\n  }\n  .toolbar[_ngcontent-%COMP%]   .filters[_ngcontent-%COMP%]   .filter-select[_ngcontent-%COMP%] {\n    width: 100%;\n  }\n  .toolbar[_ngcontent-%COMP%]   .btn-add[_ngcontent-%COMP%] {\n    width: 100%;\n  }\n}\n/*# sourceMappingURL=users.page.css.map */'] });
  }
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(UsersPage, [{
    type: Component,
    args: [{ selector: "app-users", standalone: true, imports: [CommonModule, ReactiveFormsModule], template: `<div class="page-container">
  <header class="page-header">
    <div class="breadcrumb">Administration / <span>Users & Roles</span></div>
    <h1 class="page-title">Users & Roles</h1>
  </header>

  <div class="tabs-container">
    <ul class="tabs">
      <li *ngFor="let tab of tabs" 
          [class.active]="activeTab === tab" 
          (click)="activeTab = tab">
        {{ tab }}
      </li>
    </ul>
  </div>

  <div class="toolbar">
    <div class="filters">
      <input type="text" placeholder="Search users..." class="search-input">
      <select class="filter-select">
        <option value="">All Roles</option>
        <option value="admin">Administrator</option>
        <option value="teacher">Teacher</option>
        <option value="student">Student</option>
      </select>
      <select class="filter-select">
        <option value="">All Statuses</option>
        <option value="active">Active</option>
        <option value="suspended">Suspended</option>
      </select>
    </div>
    <button class="btn-add">+ Add User</button>
  </div>

  <div class="table-scroll-wrapper">
    <table class="users-table">
      <thead>
        <tr>
          <th>FULL NAME</th>
          <th>ROLE</th>
          <th>STATUS</th>
          <th>LAST LOGIN</th>
          <th>ACTIONS</th>
        </tr>
      </thead>
      <tbody>
        <tr *ngFor="let user of users">
          <td class="user-info-cell">
            <div class="avatar">{{ user.initials }}</div>
            <div class="user-details">
              <span class="user-name">{{ user.name }}</span>
              <span class="user-email">{{ user.email }}</span>
            </div>
          </td>
          <td>
            <span class="role-text" [ngClass]="user.roleClass">{{ user.role }}</span>
          </td>
          <td>
            <span class="status-badge" [ngClass]="user.status.toLowerCase()">{{ user.status }}</span>
          </td>
          <td class="last-login">{{ user.lastLogin }}</td>
          <td class="actions-cell">
            <button class="action-btn" title="Edit">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
            </button>
            <button class="action-btn delete" title="Delete">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
            </button>
          </td>
        </tr>
      </tbody>
    </table>
  </div>

  <div class="roles-section">
    <div class="roles-header">
      <h2>Roles Overview</h2>
      <p>Manage standard roles and customize permissions across the platform.</p>
    </div>
    
    <div class="roles-grid">
      <div class="role-card" *ngFor="let role of roles">
        <div class="card-icon" [ngSwitch]="role.iconType">
          <svg *ngSwitchCase="'shield'" xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
          <svg *ngSwitchCase="'teacher'" xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><polyline points="17 11 19 13 23 9"></polyline></svg>
          <svg *ngSwitchCase="'student'" xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
        </div>
        <h3>{{ role.name }}</h3>
        <p>{{ role.description }}</p>
        <button class="btn-edit-permissions">Edit Permissions</button>
      </div>
    </div>
  </div>
</div>
`, styles: ['/* src/app/features/dashboard/pages/users/users.page.scss */\n:root {\n  --sa-primary: #E87E24;\n  --sa-primary-hover: #D06E1A;\n  --sa-sidebar-bg: #1E293B;\n  --sa-body-bg: #F8F9FA;\n  --sa-text-primary: #111827;\n  --sa-text-secondary: #6B7280;\n  --sa-input-border: #D1D5DB;\n  --sa-success: #10B981;\n  --sa-error: #EF4444;\n  --sa-radius: 8px;\n  --sa-font:\n    Inter,\n    -apple-system,\n    BlinkMacSystemFont,\n    Segoe UI,\n    Roboto,\n    sans-serif;\n}\n.page-container {\n  display: flex;\n  flex-direction: column;\n  gap: 24px;\n  padding: 24px;\n  width: 100%;\n  max-width: 1400px;\n  margin: 0 auto;\n}\n.page-header {\n  display: flex;\n  flex-direction: column;\n  gap: 8px;\n}\n.page-header .breadcrumb {\n  font-size: 14px;\n  color: var(--text-secondary, #6b7280);\n}\n.page-header .breadcrumb span {\n  font-weight: 600;\n  color: var(--text-primary, #111827);\n}\n.page-header .page-title {\n  font-size: 28px;\n  font-weight: 700;\n  margin: 0;\n  color: var(--text-primary, #111827);\n}\n.tabs-container {\n  border-bottom: 1px solid var(--border-color, #e5e7eb);\n}\n.tabs-container .tabs {\n  display: flex;\n  list-style: none;\n  padding: 0;\n  margin: 0;\n  gap: 32px;\n  overflow-x: auto;\n  -webkit-overflow-scrolling: touch;\n}\n.tabs-container .tabs li {\n  padding: 12px 4px;\n  cursor: pointer;\n  color: var(--text-secondary, #6b7280);\n  font-weight: 500;\n  font-size: 15px;\n  position: relative;\n  transition: color 0.2s ease;\n  white-space: nowrap;\n}\n.tabs-container .tabs li:hover {\n  color: var(--text-primary, #374151);\n}\n.tabs-container .tabs li.active {\n  color: var(--color-primary, #f97316);\n}\n.tabs-container .tabs li.active::after {\n  content: "";\n  position: absolute;\n  bottom: -1px;\n  left: 0;\n  right: 0;\n  height: 2px;\n  background-color: var(--color-primary, #f97316);\n}\n.toolbar {\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n  gap: 16px;\n  flex-wrap: wrap;\n}\n.toolbar .filters {\n  display: flex;\n  gap: 16px;\n  flex: 1;\n  flex-wrap: wrap;\n}\n.toolbar .filters .search-input,\n.toolbar .filters .filter-select {\n  padding: 10px 14px;\n  border: 1px solid var(--border-color, #d1d5db);\n  border-radius: 8px;\n  outline: none;\n  font-size: 14px;\n  background-color: white;\n  color: var(--text-primary, #111827);\n  transition: border-color 0.2s, box-shadow 0.2s;\n}\n.toolbar .filters .search-input:focus,\n.toolbar .filters .filter-select:focus {\n  border-color: var(--color-primary, #f97316);\n  box-shadow: 0 0 0 3px rgba(249, 115, 22, 0.1);\n}\n.toolbar .filters .search-input {\n  min-width: 280px;\n  flex-grow: 1;\n  max-width: 400px;\n}\n.toolbar .filters .filter-select {\n  min-width: 160px;\n}\n.toolbar .btn-add {\n  background-color: var(--color-primary, #f97316);\n  color: white;\n  border: none;\n  padding: 10px 20px;\n  border-radius: 8px;\n  font-weight: 600;\n  cursor: pointer;\n  transition: background-color 0.2s;\n  white-space: nowrap;\n}\n.toolbar .btn-add:hover {\n  background-color: var(--color-primary-dark, #ea580c);\n}\n.users-table {\n  width: 100%;\n  border-collapse: separate;\n  border-spacing: 0;\n  min-width: 900px;\n}\n.users-table th {\n  text-align: left;\n  padding: 16px;\n  background-color: var(--bg-secondary, #f9fafb);\n  color: var(--text-secondary, #6b7280);\n  font-size: 12px;\n  font-weight: 600;\n  text-transform: uppercase;\n  letter-spacing: 0.05em;\n  border-bottom: 1px solid var(--border-color, #e5e7eb);\n}\n.users-table th:first-child {\n  border-top-left-radius: 8px;\n}\n.users-table th:last-child {\n  border-top-right-radius: 8px;\n}\n.users-table td {\n  padding: 16px;\n  border-bottom: 1px solid var(--border-color, #e5e7eb);\n  vertical-align: middle;\n  background-color: white;\n}\n.users-table .user-info-cell {\n  display: flex;\n  align-items: center;\n  gap: 16px;\n}\n.users-table .user-info-cell .avatar {\n  width: 44px;\n  height: 44px;\n  border-radius: 50%;\n  background-color: var(--bg-tertiary, #e0e7ff);\n  color: var(--text-indigo, #4f46e5);\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  font-weight: 600;\n  font-size: 16px;\n}\n.users-table .user-info-cell .user-details {\n  display: flex;\n  flex-direction: column;\n  gap: 2px;\n}\n.users-table .user-info-cell .user-details .user-name {\n  font-weight: 600;\n  color: var(--text-primary, #111827);\n}\n.users-table .user-info-cell .user-details .user-email {\n  font-size: 13px;\n  color: var(--text-secondary, #6b7280);\n}\n.users-table .role-text {\n  font-weight: 500;\n  font-size: 14px;\n}\n.users-table .role-text.purple {\n  color: #7c3aed;\n}\n.users-table .role-text.green {\n  color: #059669;\n}\n.users-table .role-text.blue {\n  color: var(--sa-primary);\n}\n.users-table .role-text.gray {\n  color: #4b5563;\n}\n.users-table .status-badge {\n  padding: 4px 10px;\n  border-radius: 12px;\n  font-size: 12px;\n  font-weight: 600;\n  display: inline-flex;\n  align-items: center;\n}\n.users-table .status-badge.active {\n  background-color: #d1fae5;\n  color: #065f46;\n}\n.users-table .status-badge.suspended {\n  background-color: #fee2e2;\n  color: #991b1b;\n}\n.users-table .last-login {\n  color: var(--text-secondary, #6b7280);\n  font-size: 14px;\n}\n.users-table .actions-cell {\n  display: flex;\n  gap: 8px;\n}\n.users-table .actions-cell .action-btn {\n  background: none;\n  border: none;\n  color: var(--text-secondary, #6b7280);\n  cursor: pointer;\n  padding: 8px;\n  border-radius: 6px;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  transition: all 0.2s;\n}\n.users-table .actions-cell .action-btn:hover {\n  background-color: var(--bg-secondary, #f3f4f6);\n  color: var(--text-primary, #111827);\n}\n.users-table .actions-cell .action-btn.delete:hover {\n  color: #dc2626;\n  background-color: #fef2f2;\n}\n.roles-section {\n  margin-top: 16px;\n}\n.roles-section .roles-header {\n  margin-bottom: 24px;\n}\n.roles-section .roles-header h2 {\n  font-size: 22px;\n  font-weight: 600;\n  margin: 0 0 8px;\n  color: var(--text-primary, #111827);\n}\n.roles-section .roles-header p {\n  color: var(--text-secondary, #6b7280);\n  margin: 0;\n  font-size: 15px;\n}\n.roles-section .roles-grid {\n  display: grid;\n  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));\n  gap: 24px;\n}\n.roles-section .roles-grid .role-card {\n  border: 1px solid var(--border-color, #e5e7eb);\n  border-radius: 12px;\n  padding: 24px;\n  display: flex;\n  flex-direction: column;\n  gap: 16px;\n  background-color: white;\n  transition: transform 0.2s, box-shadow 0.2s;\n}\n.roles-section .roles-grid .role-card:hover {\n  transform: translateY(-2px);\n  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);\n}\n.roles-section .roles-grid .role-card .card-icon {\n  color: var(--color-primary, #f97316);\n  display: flex;\n  align-items: center;\n}\n.roles-section .roles-grid .role-card .card-icon svg {\n  width: 36px;\n  height: 36px;\n}\n.roles-section .roles-grid .role-card h3 {\n  margin: 0;\n  font-size: 18px;\n  font-weight: 600;\n  color: var(--text-primary, #111827);\n}\n.roles-section .roles-grid .role-card p {\n  margin: 0;\n  color: var(--text-secondary, #6b7280);\n  font-size: 14px;\n  flex: 1;\n  line-height: 1.5;\n}\n.roles-section .roles-grid .role-card .btn-edit-permissions {\n  margin-top: auto;\n  background: none;\n  border: 1px solid var(--border-color, #d1d5db);\n  padding: 10px;\n  border-radius: 8px;\n  font-weight: 600;\n  font-size: 14px;\n  cursor: pointer;\n  color: var(--text-primary, #374151);\n  transition: all 0.2s;\n}\n.roles-section .roles-grid .role-card .btn-edit-permissions:hover {\n  background-color: var(--bg-secondary, #f9fafb);\n  border-color: #9ca3af;\n}\n@media (max-width: 768px) {\n  .toolbar {\n    flex-direction: column;\n    align-items: stretch;\n  }\n  .toolbar .filters {\n    flex-direction: column;\n  }\n  .toolbar .filters .search-input {\n    width: 100%;\n    min-width: unset;\n  }\n  .toolbar .filters .filter-select {\n    width: 100%;\n  }\n  .toolbar .btn-add {\n    width: 100%;\n  }\n}\n/*# sourceMappingURL=users.page.css.map */\n'] }]
  }], null, null);
})();
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && \u0275setClassDebugInfo(UsersPage, { className: "UsersPage", filePath: "src/app/features/dashboard/pages/users/users.page.ts", lineNumber: 29 });
})();
export {
  UsersPage
};
//# sourceMappingURL=chunk-OZKWZB5Y.js.map
