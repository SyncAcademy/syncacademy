import {
  DefaultValueAccessor,
  FormBuilder,
  FormControlName,
  FormGroupDirective,
  NgControlStatus,
  NgControlStatusGroup,
  NumberValueAccessor,
  ReactiveFormsModule,
  ɵNgNoValidate
} from "./chunk-JZPTM7M7.js";
import {
  CommonModule,
  Component,
  NgIf,
  setClassMetadata,
  ɵsetClassDebugInfo,
  ɵɵadvance,
  ɵɵdefineComponent,
  ɵɵdirectiveInject,
  ɵɵelement,
  ɵɵelementEnd,
  ɵɵelementStart,
  ɵɵlistener,
  ɵɵnamespaceHTML,
  ɵɵnamespaceSVG,
  ɵɵproperty,
  ɵɵtemplate,
  ɵɵtext
} from "./chunk-3IPAKGA7.js";
import "./chunk-QHQP2P2Z.js";

// src/app/features/dashboard/pages/settings/settings.page.ts
function SettingsPage_div_6_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 37);
    \u0275\u0275namespaceSVG();
    \u0275\u0275elementStart(1, "svg", 38);
    \u0275\u0275element(2, "path", 39)(3, "polyline", 40);
    \u0275\u0275elementEnd();
    \u0275\u0275namespaceHTML();
    \u0275\u0275elementStart(4, "span");
    \u0275\u0275text(5, "Settings saved successfully");
    \u0275\u0275elementEnd()();
  }
}
var SettingsPage = class _SettingsPage {
  constructor(fb) {
    this.fb = fb;
    this.showSuccessBanner = true;
    this.settingsForm = this.fb.group({
      // School Details
      schoolName: ["SyncAcademy International"],
      schoolCode: ["SA-001"],
      schoolType: ["Private"],
      registrationId: ["REG-12345"],
      streetAddress: ["123 Education Lane"],
      city: ["Learning City"],
      region: ["Knowledge State"],
      country: ["EduCountry"],
      phoneNumber: ["+1 234 567 8900"],
      contactEmail: ["admin@syncacademy.edu"],
      website: ["www.syncacademy.edu"],
      // Academic Settings
      currentAcademicYear: ["2026-2027"],
      currentTerm: ["Term 1"],
      termsPerYear: [3]
    });
  }
  saveSettings() {
    this.showSuccessBanner = true;
    setTimeout(() => {
      this.showSuccessBanner = false;
    }, 3e3);
  }
  static {
    this.\u0275fac = function SettingsPage_Factory(__ngFactoryType__) {
      return new (__ngFactoryType__ || _SettingsPage)(\u0275\u0275directiveInject(FormBuilder));
    };
  }
  static {
    this.\u0275cmp = /* @__PURE__ */ \u0275\u0275defineComponent({ type: _SettingsPage, selectors: [["app-settings"]], decls: 106, vars: 2, consts: [[1, "settings-page"], [1, "page-header"], [1, "breadcrumb"], [1, "page-title"], ["class", "success-banner", 4, "ngIf"], [1, "settings-layout"], [1, "settings-sidebar"], [1, "settings-tabs"], [1, "tab-item", "active"], [1, "tab-item"], [1, "settings-main"], [3, "ngSubmit", "formGroup"], [1, "settings-section", "branding-section"], [1, "branding-content"], [1, "logo-placeholder"], ["type", "button", 1, "upload-btn"], [1, "settings-section"], [1, "form-grid"], [1, "form-group"], [1, "sa-label"], ["type", "text", "formControlName", "schoolName", "placeholder", "Enter school name", 1, "sa-input"], ["type", "text", "formControlName", "schoolCode", "placeholder", "Enter school code", 1, "sa-input"], ["type", "text", "formControlName", "schoolType", "placeholder", "Enter school type", 1, "sa-input"], ["type", "text", "formControlName", "registrationId", "placeholder", "Enter registration ID", 1, "sa-input"], ["type", "text", "formControlName", "streetAddress", "placeholder", "Enter street address", 1, "sa-input"], ["type", "text", "formControlName", "city", "placeholder", "Enter city", 1, "sa-input"], ["type", "text", "formControlName", "region", "placeholder", "Enter region", 1, "sa-input"], ["type", "text", "formControlName", "country", "placeholder", "Enter country", 1, "sa-input"], ["type", "text", "formControlName", "phoneNumber", "placeholder", "Enter phone number", 1, "sa-input"], ["type", "email", "formControlName", "contactEmail", "placeholder", "Enter contact email", 1, "sa-input"], ["type", "text", "formControlName", "website", "placeholder", "Enter website url", 1, "sa-input"], ["type", "text", "formControlName", "currentAcademicYear", "placeholder", "e.g. 2026-2027", 1, "sa-input"], ["type", "text", "formControlName", "currentTerm", "placeholder", "e.g. Term 1", 1, "sa-input"], ["type", "number", "formControlName", "termsPerYear", "placeholder", "e.g. 3", 1, "sa-input"], [1, "settings-footer"], ["type", "button", 1, "cancel-btn"], ["type", "submit", 1, "sa-btn", "sa-btn--primary"], [1, "success-banner"], ["xmlns", "http://www.w3.org/2000/svg", "width", "20", "height", "20", "viewBox", "0 0 24 24", "fill", "none", "stroke", "currentColor", "stroke-width", "2", "stroke-linecap", "round", "stroke-linejoin", "round", 1, "checkmark-icon"], ["d", "M22 11.08V12a10 10 0 1 1-5.93-9.14"], ["points", "22 4 12 14.01 9 11.01"]], template: function SettingsPage_Template(rf, ctx) {
      if (rf & 1) {
        \u0275\u0275elementStart(0, "div", 0)(1, "div", 1)(2, "div", 2);
        \u0275\u0275text(3, "Administration / School Settings");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(4, "h1", 3);
        \u0275\u0275text(5, "School Settings");
        \u0275\u0275elementEnd()();
        \u0275\u0275template(6, SettingsPage_div_6_Template, 6, 0, "div", 4);
        \u0275\u0275elementStart(7, "div", 5)(8, "aside", 6)(9, "ul", 7)(10, "li", 8);
        \u0275\u0275text(11, "School Information");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(12, "li", 9);
        \u0275\u0275text(13, "Academic Settings");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(14, "li", 9);
        \u0275\u0275text(15, "Grading System");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(16, "li", 9);
        \u0275\u0275text(17, "Attendance Settings");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(18, "li", 9);
        \u0275\u0275text(19, "Fee Settings");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(20, "li", 9);
        \u0275\u0275text(21, "Notification Settings");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(22, "li", 9);
        \u0275\u0275text(23, "Communication Settings");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(24, "li", 9);
        \u0275\u0275text(25, "Security");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(26, "li", 9);
        \u0275\u0275text(27, "System Preferences");
        \u0275\u0275elementEnd()()();
        \u0275\u0275elementStart(28, "main", 10)(29, "form", 11);
        \u0275\u0275listener("ngSubmit", function SettingsPage_Template_form_ngSubmit_29_listener() {
          return ctx.saveSettings();
        });
        \u0275\u0275elementStart(30, "section", 12)(31, "h2");
        \u0275\u0275text(32, "School Branding");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(33, "div", 13);
        \u0275\u0275element(34, "div", 14);
        \u0275\u0275elementStart(35, "button", 15);
        \u0275\u0275text(36, "Upload New Logo");
        \u0275\u0275elementEnd()()();
        \u0275\u0275elementStart(37, "section", 16)(38, "h2");
        \u0275\u0275text(39, "School Details");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(40, "div", 17)(41, "div", 18)(42, "label", 19);
        \u0275\u0275text(43, "School Name");
        \u0275\u0275elementEnd();
        \u0275\u0275element(44, "input", 20);
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(45, "div", 18)(46, "label", 19);
        \u0275\u0275text(47, "School Code");
        \u0275\u0275elementEnd();
        \u0275\u0275element(48, "input", 21);
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(49, "div", 18)(50, "label", 19);
        \u0275\u0275text(51, "School Type");
        \u0275\u0275elementEnd();
        \u0275\u0275element(52, "input", 22);
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(53, "div", 18)(54, "label", 19);
        \u0275\u0275text(55, "Registration ID");
        \u0275\u0275elementEnd();
        \u0275\u0275element(56, "input", 23);
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(57, "div", 18)(58, "label", 19);
        \u0275\u0275text(59, "Street Address");
        \u0275\u0275elementEnd();
        \u0275\u0275element(60, "input", 24);
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(61, "div", 18)(62, "label", 19);
        \u0275\u0275text(63, "City");
        \u0275\u0275elementEnd();
        \u0275\u0275element(64, "input", 25);
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(65, "div", 18)(66, "label", 19);
        \u0275\u0275text(67, "Region");
        \u0275\u0275elementEnd();
        \u0275\u0275element(68, "input", 26);
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(69, "div", 18)(70, "label", 19);
        \u0275\u0275text(71, "Country");
        \u0275\u0275elementEnd();
        \u0275\u0275element(72, "input", 27);
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(73, "div", 18)(74, "label", 19);
        \u0275\u0275text(75, "Phone Number");
        \u0275\u0275elementEnd();
        \u0275\u0275element(76, "input", 28);
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(77, "div", 18)(78, "label", 19);
        \u0275\u0275text(79, "Contact Email");
        \u0275\u0275elementEnd();
        \u0275\u0275element(80, "input", 29);
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(81, "div", 18)(82, "label", 19);
        \u0275\u0275text(83, "Website");
        \u0275\u0275elementEnd();
        \u0275\u0275element(84, "input", 30);
        \u0275\u0275elementEnd()()();
        \u0275\u0275elementStart(85, "section", 16)(86, "h2");
        \u0275\u0275text(87, "Academic Settings");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(88, "div", 17)(89, "div", 18)(90, "label", 19);
        \u0275\u0275text(91, "Current Academic Year");
        \u0275\u0275elementEnd();
        \u0275\u0275element(92, "input", 31);
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(93, "div", 18)(94, "label", 19);
        \u0275\u0275text(95, "Current Term");
        \u0275\u0275elementEnd();
        \u0275\u0275element(96, "input", 32);
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(97, "div", 18)(98, "label", 19);
        \u0275\u0275text(99, "Terms per Year");
        \u0275\u0275elementEnd();
        \u0275\u0275element(100, "input", 33);
        \u0275\u0275elementEnd()()();
        \u0275\u0275elementStart(101, "div", 34)(102, "button", 35);
        \u0275\u0275text(103, "Cancel");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(104, "button", 36);
        \u0275\u0275text(105, " Save Changes ");
        \u0275\u0275elementEnd()()()()()();
      }
      if (rf & 2) {
        \u0275\u0275advance(6);
        \u0275\u0275property("ngIf", ctx.showSuccessBanner);
        \u0275\u0275advance(23);
        \u0275\u0275property("formGroup", ctx.settingsForm);
      }
    }, dependencies: [CommonModule, NgIf, ReactiveFormsModule, \u0275NgNoValidate, DefaultValueAccessor, NumberValueAccessor, NgControlStatus, NgControlStatusGroup, FormGroupDirective, FormControlName], styles: ["\n\n[_ngcontent-%COMP%]:root {\n  --sa-primary: #E87E24;\n  --sa-primary-hover: #D06E1A;\n  --sa-sidebar-bg: #1E293B;\n  --sa-body-bg: #F8F9FA;\n  --sa-text-primary: #111827;\n  --sa-text-secondary: #6B7280;\n  --sa-input-border: #D1D5DB;\n  --sa-success: #10B981;\n  --sa-error: #EF4444;\n  --sa-radius: 8px;\n  --sa-font:\n    Inter,\n    -apple-system,\n    BlinkMacSystemFont,\n    Segoe UI,\n    Roboto,\n    sans-serif;\n}\n.settings-page[_ngcontent-%COMP%] {\n  padding: 24px;\n  max-width: 1200px;\n  margin: 0 auto;\n}\n.settings-page[_ngcontent-%COMP%]   .page-header[_ngcontent-%COMP%] {\n  margin-bottom: 24px;\n}\n.settings-page[_ngcontent-%COMP%]   .page-header[_ngcontent-%COMP%]   .breadcrumb[_ngcontent-%COMP%] {\n  font-size: 14px;\n  color: #6B7280;\n  margin-bottom: 8px;\n}\n.settings-page[_ngcontent-%COMP%]   .page-header[_ngcontent-%COMP%]   .page-title[_ngcontent-%COMP%] {\n  font-size: 24px;\n  font-weight: 600;\n  color: #111827;\n  margin: 0;\n}\n.settings-page[_ngcontent-%COMP%]   .success-banner[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  gap: 12px;\n  background-color: #ECFDF5;\n  color: rgb(9.9104477612, 114.5895522388, 79.9029850746);\n  padding: 16px;\n  border-radius: 8px;\n  margin-bottom: 24px;\n  border: 1px solid rgb(111.4179104478, 242.5820895522, 199.1194029851);\n}\n.settings-page[_ngcontent-%COMP%]   .success-banner[_ngcontent-%COMP%]   .checkmark-icon[_ngcontent-%COMP%] {\n  color: #10B981;\n}\n.settings-page[_ngcontent-%COMP%]   .settings-layout[_ngcontent-%COMP%] {\n  display: flex;\n  gap: 32px;\n  flex-direction: column;\n}\n@media (min-width: 768px) {\n  .settings-page[_ngcontent-%COMP%]   .settings-layout[_ngcontent-%COMP%] {\n    flex-direction: row;\n  }\n}\n@media (min-width: 768px) {\n  .settings-page[_ngcontent-%COMP%]   .settings-sidebar[_ngcontent-%COMP%] {\n    flex: 0 0 240px;\n  }\n}\n.settings-page[_ngcontent-%COMP%]   .settings-sidebar[_ngcontent-%COMP%]   .settings-tabs[_ngcontent-%COMP%] {\n  list-style: none;\n  padding: 0;\n  margin: 0;\n  display: flex;\n  flex-direction: column;\n}\n.settings-page[_ngcontent-%COMP%]   .settings-sidebar[_ngcontent-%COMP%]   .settings-tabs[_ngcontent-%COMP%]   .tab-item[_ngcontent-%COMP%] {\n  padding: 12px 16px;\n  color: #6B7280;\n  cursor: pointer;\n  border-radius: 6px;\n  margin-bottom: 4px;\n  transition: background-color 0.2s, color 0.2s;\n  font-weight: 500;\n}\n.settings-page[_ngcontent-%COMP%]   .settings-sidebar[_ngcontent-%COMP%]   .settings-tabs[_ngcontent-%COMP%]   .tab-item[_ngcontent-%COMP%]:hover {\n  background-color: #f3f4f6;\n}\n.settings-page[_ngcontent-%COMP%]   .settings-sidebar[_ngcontent-%COMP%]   .settings-tabs[_ngcontent-%COMP%]   .tab-item.active[_ngcontent-%COMP%] {\n  background-color: rgba(232, 126, 36, 0.1);\n  color: #E87E24;\n}\n.settings-page[_ngcontent-%COMP%]   .settings-main[_ngcontent-%COMP%] {\n  flex: 1;\n  background: #FFFFFF;\n  border-radius: 12px;\n  padding: 24px;\n  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);\n}\n.settings-page[_ngcontent-%COMP%]   .settings-main[_ngcontent-%COMP%]   .settings-section[_ngcontent-%COMP%] {\n  margin-bottom: 32px;\n}\n.settings-page[_ngcontent-%COMP%]   .settings-main[_ngcontent-%COMP%]   .settings-section[_ngcontent-%COMP%]   h2[_ngcontent-%COMP%] {\n  font-size: 18px;\n  font-weight: 600;\n  margin-top: 0;\n  margin-bottom: 24px;\n  color: #111827;\n  padding-bottom: 8px;\n  border-bottom: 1px solid #D1D5DB;\n}\n.settings-page[_ngcontent-%COMP%]   .settings-main[_ngcontent-%COMP%]   .branding-content[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  gap: 24px;\n}\n.settings-page[_ngcontent-%COMP%]   .settings-main[_ngcontent-%COMP%]   .branding-content[_ngcontent-%COMP%]   .logo-placeholder[_ngcontent-%COMP%] {\n  width: 80px;\n  height: 80px;\n  border-radius: 50%;\n  background-color: #e5e7eb;\n  border: 2px dashed #9CA3AF;\n}\n.settings-page[_ngcontent-%COMP%]   .settings-main[_ngcontent-%COMP%]   .branding-content[_ngcontent-%COMP%]   .upload-btn[_ngcontent-%COMP%] {\n  padding: 8px 16px;\n  border: 1px solid #D1D5DB;\n  background: transparent;\n  border-radius: 6px;\n  font-weight: 500;\n  cursor: pointer;\n  color: #111827;\n  transition: background-color 0.2s;\n}\n.settings-page[_ngcontent-%COMP%]   .settings-main[_ngcontent-%COMP%]   .branding-content[_ngcontent-%COMP%]   .upload-btn[_ngcontent-%COMP%]:hover {\n  background: #f9fafb;\n}\n.settings-page[_ngcontent-%COMP%]   .settings-main[_ngcontent-%COMP%]   .form-grid[_ngcontent-%COMP%] {\n  display: grid;\n  grid-template-columns: 1fr;\n  gap: 20px;\n}\n@media (min-width: 768px) {\n  .settings-page[_ngcontent-%COMP%]   .settings-main[_ngcontent-%COMP%]   .form-grid[_ngcontent-%COMP%] {\n    grid-template-columns: repeat(2, 1fr);\n  }\n}\n.settings-page[_ngcontent-%COMP%]   .settings-main[_ngcontent-%COMP%]   .settings-footer[_ngcontent-%COMP%] {\n  display: flex;\n  justify-content: flex-end;\n  gap: 16px;\n  margin-top: 32px;\n  padding-top: 24px;\n  border-top: 1px solid #D1D5DB;\n}\n.settings-page[_ngcontent-%COMP%]   .settings-main[_ngcontent-%COMP%]   .settings-footer[_ngcontent-%COMP%]   .cancel-btn[_ngcontent-%COMP%] {\n  padding: 10px 20px;\n  background: transparent;\n  border: 1px solid #D1D5DB;\n  border-radius: 6px;\n  color: #111827;\n  font-weight: 500;\n  cursor: pointer;\n  transition: background-color 0.2s;\n}\n.settings-page[_ngcontent-%COMP%]   .settings-main[_ngcontent-%COMP%]   .settings-footer[_ngcontent-%COMP%]   .cancel-btn[_ngcontent-%COMP%]:hover {\n  background: #f9fafb;\n}\n.settings-page[_ngcontent-%COMP%]   .settings-main[_ngcontent-%COMP%]   .settings-footer[_ngcontent-%COMP%]   .sa-btn[_ngcontent-%COMP%] {\n  width: auto;\n  min-width: 140px;\n  padding: 10px 20px;\n  font-size: 0.9375rem;\n}\n@media (max-width: 575px) {\n  .settings-page[_ngcontent-%COMP%]   .settings-main[_ngcontent-%COMP%]   .settings-footer[_ngcontent-%COMP%] {\n    flex-direction: column-reverse;\n  }\n  .settings-page[_ngcontent-%COMP%]   .settings-main[_ngcontent-%COMP%]   .settings-footer[_ngcontent-%COMP%]   .cancel-btn[_ngcontent-%COMP%], \n   .settings-page[_ngcontent-%COMP%]   .settings-main[_ngcontent-%COMP%]   .settings-footer[_ngcontent-%COMP%]   .sa-btn[_ngcontent-%COMP%] {\n    width: 100%;\n  }\n}\n/*# sourceMappingURL=settings.page.css.map */"] });
  }
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(SettingsPage, [{
    type: Component,
    args: [{ selector: "app-settings", standalone: true, imports: [CommonModule, ReactiveFormsModule], template: '<div class="settings-page">\n  <!-- Page Header -->\n  <div class="page-header">\n    <div class="breadcrumb">Administration / School Settings</div>\n    <h1 class="page-title">School Settings</h1>\n  </div>\n\n  <!-- Success Banner -->\n  <div class="success-banner" *ngIf="showSuccessBanner">\n    <svg\n      xmlns="http://www.w3.org/2000/svg"\n      width="20"\n      height="20"\n      viewBox="0 0 24 24"\n      fill="none"\n      stroke="currentColor"\n      stroke-width="2"\n      stroke-linecap="round"\n      stroke-linejoin="round"\n      class="checkmark-icon"\n    >\n      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>\n      <polyline points="22 4 12 14.01 9 11.01"></polyline>\n    </svg>\n    <span>Settings saved successfully</span>\n  </div>\n\n  <!-- Layout -->\n  <div class="settings-layout">\n    <!-- Left Tabs Sidebar -->\n    <aside class="settings-sidebar">\n      <ul class="settings-tabs">\n        <li class="tab-item active">School Information</li>\n        <li class="tab-item">Academic Settings</li>\n        <li class="tab-item">Grading System</li>\n        <li class="tab-item">Attendance Settings</li>\n        <li class="tab-item">Fee Settings</li>\n        <li class="tab-item">Notification Settings</li>\n        <li class="tab-item">Communication Settings</li>\n        <li class="tab-item">Security</li>\n        <li class="tab-item">System Preferences</li>\n      </ul>\n    </aside>\n\n    <!-- Main Form Area -->\n    <main class="settings-main">\n      <form [formGroup]="settingsForm" (ngSubmit)="saveSettings()">\n        <!-- Section 1: School Branding -->\n        <section class="settings-section branding-section">\n          <h2>School Branding</h2>\n          <div class="branding-content">\n            <div class="logo-placeholder"></div>\n            <button type="button" class="upload-btn">Upload New Logo</button>\n          </div>\n        </section>\n\n        <!-- Section 2: School Details -->\n        <section class="settings-section">\n          <h2>School Details</h2>\n          <div class="form-grid">\n            <div class="form-group">\n              <label class="sa-label">School Name</label>\n              <input\n                type="text"\n                class="sa-input"\n                formControlName="schoolName"\n                placeholder="Enter school name"\n              />\n            </div>\n            <div class="form-group">\n              <label class="sa-label">School Code</label>\n              <input\n                type="text"\n                class="sa-input"\n                formControlName="schoolCode"\n                placeholder="Enter school code"\n              />\n            </div>\n            <div class="form-group">\n              <label class="sa-label">School Type</label>\n              <input\n                type="text"\n                class="sa-input"\n                formControlName="schoolType"\n                placeholder="Enter school type"\n              />\n            </div>\n            <div class="form-group">\n              <label class="sa-label">Registration ID</label>\n              <input\n                type="text"\n                class="sa-input"\n                formControlName="registrationId"\n                placeholder="Enter registration ID"\n              />\n            </div>\n            <div class="form-group">\n              <label class="sa-label">Street Address</label>\n              <input\n                type="text"\n                class="sa-input"\n                formControlName="streetAddress"\n                placeholder="Enter street address"\n              />\n            </div>\n            <div class="form-group">\n              <label class="sa-label">City</label>\n              <input\n                type="text"\n                class="sa-input"\n                formControlName="city"\n                placeholder="Enter city"\n              />\n            </div>\n            <div class="form-group">\n              <label class="sa-label">Region</label>\n              <input\n                type="text"\n                class="sa-input"\n                formControlName="region"\n                placeholder="Enter region"\n              />\n            </div>\n            <div class="form-group">\n              <label class="sa-label">Country</label>\n              <input\n                type="text"\n                class="sa-input"\n                formControlName="country"\n                placeholder="Enter country"\n              />\n            </div>\n            <div class="form-group">\n              <label class="sa-label">Phone Number</label>\n              <input\n                type="text"\n                class="sa-input"\n                formControlName="phoneNumber"\n                placeholder="Enter phone number"\n              />\n            </div>\n            <div class="form-group">\n              <label class="sa-label">Contact Email</label>\n              <input\n                type="email"\n                class="sa-input"\n                formControlName="contactEmail"\n                placeholder="Enter contact email"\n              />\n            </div>\n            <div class="form-group">\n              <label class="sa-label">Website</label>\n              <input\n                type="text"\n                class="sa-input"\n                formControlName="website"\n                placeholder="Enter website url"\n              />\n            </div>\n          </div>\n        </section>\n\n        <!-- Section 3: Academic Settings -->\n        <section class="settings-section">\n          <h2>Academic Settings</h2>\n          <div class="form-grid">\n            <div class="form-group">\n              <label class="sa-label">Current Academic Year</label>\n              <input\n                type="text"\n                class="sa-input"\n                formControlName="currentAcademicYear"\n                placeholder="e.g. 2026-2027"\n              />\n            </div>\n            <div class="form-group">\n              <label class="sa-label">Current Term</label>\n              <input\n                type="text"\n                class="sa-input"\n                formControlName="currentTerm"\n                placeholder="e.g. Term 1"\n              />\n            </div>\n            <div class="form-group">\n              <label class="sa-label">Terms per Year</label>\n              <input\n                type="number"\n                class="sa-input"\n                formControlName="termsPerYear"\n                placeholder="e.g. 3"\n              />\n            </div>\n          </div>\n        </section>\n\n        <!-- Footer -->\n        <div class="settings-footer">\n          <button type="button" class="cancel-btn">Cancel</button>\n          <button type="submit" class="sa-btn sa-btn--primary">\n            Save Changes\n          </button>\n        </div>\n      </form>\n    </main>\n  </div>\n</div>\n', styles: ["/* src/app/features/dashboard/pages/settings/settings.page.scss */\n:root {\n  --sa-primary: #E87E24;\n  --sa-primary-hover: #D06E1A;\n  --sa-sidebar-bg: #1E293B;\n  --sa-body-bg: #F8F9FA;\n  --sa-text-primary: #111827;\n  --sa-text-secondary: #6B7280;\n  --sa-input-border: #D1D5DB;\n  --sa-success: #10B981;\n  --sa-error: #EF4444;\n  --sa-radius: 8px;\n  --sa-font:\n    Inter,\n    -apple-system,\n    BlinkMacSystemFont,\n    Segoe UI,\n    Roboto,\n    sans-serif;\n}\n.settings-page {\n  padding: 24px;\n  max-width: 1200px;\n  margin: 0 auto;\n}\n.settings-page .page-header {\n  margin-bottom: 24px;\n}\n.settings-page .page-header .breadcrumb {\n  font-size: 14px;\n  color: #6B7280;\n  margin-bottom: 8px;\n}\n.settings-page .page-header .page-title {\n  font-size: 24px;\n  font-weight: 600;\n  color: #111827;\n  margin: 0;\n}\n.settings-page .success-banner {\n  display: flex;\n  align-items: center;\n  gap: 12px;\n  background-color: #ECFDF5;\n  color: rgb(9.9104477612, 114.5895522388, 79.9029850746);\n  padding: 16px;\n  border-radius: 8px;\n  margin-bottom: 24px;\n  border: 1px solid rgb(111.4179104478, 242.5820895522, 199.1194029851);\n}\n.settings-page .success-banner .checkmark-icon {\n  color: #10B981;\n}\n.settings-page .settings-layout {\n  display: flex;\n  gap: 32px;\n  flex-direction: column;\n}\n@media (min-width: 768px) {\n  .settings-page .settings-layout {\n    flex-direction: row;\n  }\n}\n@media (min-width: 768px) {\n  .settings-page .settings-sidebar {\n    flex: 0 0 240px;\n  }\n}\n.settings-page .settings-sidebar .settings-tabs {\n  list-style: none;\n  padding: 0;\n  margin: 0;\n  display: flex;\n  flex-direction: column;\n}\n.settings-page .settings-sidebar .settings-tabs .tab-item {\n  padding: 12px 16px;\n  color: #6B7280;\n  cursor: pointer;\n  border-radius: 6px;\n  margin-bottom: 4px;\n  transition: background-color 0.2s, color 0.2s;\n  font-weight: 500;\n}\n.settings-page .settings-sidebar .settings-tabs .tab-item:hover {\n  background-color: #f3f4f6;\n}\n.settings-page .settings-sidebar .settings-tabs .tab-item.active {\n  background-color: rgba(232, 126, 36, 0.1);\n  color: #E87E24;\n}\n.settings-page .settings-main {\n  flex: 1;\n  background: #FFFFFF;\n  border-radius: 12px;\n  padding: 24px;\n  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);\n}\n.settings-page .settings-main .settings-section {\n  margin-bottom: 32px;\n}\n.settings-page .settings-main .settings-section h2 {\n  font-size: 18px;\n  font-weight: 600;\n  margin-top: 0;\n  margin-bottom: 24px;\n  color: #111827;\n  padding-bottom: 8px;\n  border-bottom: 1px solid #D1D5DB;\n}\n.settings-page .settings-main .branding-content {\n  display: flex;\n  align-items: center;\n  gap: 24px;\n}\n.settings-page .settings-main .branding-content .logo-placeholder {\n  width: 80px;\n  height: 80px;\n  border-radius: 50%;\n  background-color: #e5e7eb;\n  border: 2px dashed #9CA3AF;\n}\n.settings-page .settings-main .branding-content .upload-btn {\n  padding: 8px 16px;\n  border: 1px solid #D1D5DB;\n  background: transparent;\n  border-radius: 6px;\n  font-weight: 500;\n  cursor: pointer;\n  color: #111827;\n  transition: background-color 0.2s;\n}\n.settings-page .settings-main .branding-content .upload-btn:hover {\n  background: #f9fafb;\n}\n.settings-page .settings-main .form-grid {\n  display: grid;\n  grid-template-columns: 1fr;\n  gap: 20px;\n}\n@media (min-width: 768px) {\n  .settings-page .settings-main .form-grid {\n    grid-template-columns: repeat(2, 1fr);\n  }\n}\n.settings-page .settings-main .settings-footer {\n  display: flex;\n  justify-content: flex-end;\n  gap: 16px;\n  margin-top: 32px;\n  padding-top: 24px;\n  border-top: 1px solid #D1D5DB;\n}\n.settings-page .settings-main .settings-footer .cancel-btn {\n  padding: 10px 20px;\n  background: transparent;\n  border: 1px solid #D1D5DB;\n  border-radius: 6px;\n  color: #111827;\n  font-weight: 500;\n  cursor: pointer;\n  transition: background-color 0.2s;\n}\n.settings-page .settings-main .settings-footer .cancel-btn:hover {\n  background: #f9fafb;\n}\n.settings-page .settings-main .settings-footer .sa-btn {\n  width: auto;\n  min-width: 140px;\n  padding: 10px 20px;\n  font-size: 0.9375rem;\n}\n@media (max-width: 575px) {\n  .settings-page .settings-main .settings-footer {\n    flex-direction: column-reverse;\n  }\n  .settings-page .settings-main .settings-footer .cancel-btn,\n  .settings-page .settings-main .settings-footer .sa-btn {\n    width: 100%;\n  }\n}\n/*# sourceMappingURL=settings.page.css.map */\n"] }]
  }], () => [{ type: FormBuilder }], null);
})();
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && \u0275setClassDebugInfo(SettingsPage, { className: "SettingsPage", filePath: "src/app/features/dashboard/pages/settings/settings.page.ts", lineNumber: 12 });
})();
export {
  SettingsPage
};
//# sourceMappingURL=chunk-OCGYTX74.js.map
