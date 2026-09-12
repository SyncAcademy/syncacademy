import {
  LogoComponent
} from "./chunk-LSFJZJTW.js";
import {
  CommonModule,
  Component,
  Input,
  setClassMetadata,
  ɵsetClassDebugInfo,
  ɵɵadvance,
  ɵɵdefineComponent,
  ɵɵelement,
  ɵɵelementEnd,
  ɵɵelementStart,
  ɵɵprojection,
  ɵɵprojectionDef,
  ɵɵstyleProp,
  ɵɵtext
} from "./chunk-3IPAKGA7.js";

// src/app/shared/layouts/auth-layout/auth-layout.component.ts
var _c0 = ["*"];
var AuthLayoutComponent = class _AuthLayoutComponent {
  constructor() {
    this.bgImage = "/assets/signin.png";
  }
  static {
    this.\u0275fac = function AuthLayoutComponent_Factory(__ngFactoryType__) {
      return new (__ngFactoryType__ || _AuthLayoutComponent)();
    };
  }
  static {
    this.\u0275cmp = /* @__PURE__ */ \u0275\u0275defineComponent({ type: _AuthLayoutComponent, selectors: [["app-auth-layout"]], inputs: { bgImage: "bgImage" }, ngContentSelectors: _c0, decls: 26, vars: 2, consts: [[1, "auth-layout"], [1, "auth-layout__hero"], [1, "auth-layout__hero-overlay"], [1, "auth-layout__hero-content"], ["variant", "light", "size", "md"], [1, "auth-layout__hero-text"], [1, "auth-layout__hero-stats"], [1, "auth-layout__stat"], [1, "auth-layout__stat-value"], [1, "auth-layout__stat-label"], [1, "auth-layout__form"], [1, "auth-layout__form-inner"], [1, "auth-layout__footer"]], template: function AuthLayoutComponent_Template(rf, ctx) {
      if (rf & 1) {
        \u0275\u0275projectionDef();
        \u0275\u0275elementStart(0, "div", 0)(1, "div", 1);
        \u0275\u0275element(2, "div", 2);
        \u0275\u0275elementStart(3, "div", 3);
        \u0275\u0275element(4, "app-logo", 4);
        \u0275\u0275elementStart(5, "div", 5)(6, "h1");
        \u0275\u0275text(7, "A smarter way to manage your school");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(8, "p");
        \u0275\u0275text(9, "Sync Academy coordinates administration, teachers, accounting, security, and parent communication into one seamless modern SaaS system.");
        \u0275\u0275elementEnd()();
        \u0275\u0275elementStart(10, "div", 6)(11, "div", 7)(12, "span", 8);
        \u0275\u0275text(13, "1,240+");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(14, "span", 9);
        \u0275\u0275text(15, "Active Institutions");
        \u0275\u0275elementEnd()();
        \u0275\u0275elementStart(16, "div", 7)(17, "span", 8);
        \u0275\u0275text(18, "99.98%");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(19, "span", 9);
        \u0275\u0275text(20, "Operational Uptime");
        \u0275\u0275elementEnd()()()()();
        \u0275\u0275elementStart(21, "div", 10)(22, "div", 11);
        \u0275\u0275projection(23);
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(24, "footer", 12);
        \u0275\u0275text(25, " \xA9 2026 Sync Academy. All rights reserved. ");
        \u0275\u0275elementEnd()()();
      }
      if (rf & 2) {
        \u0275\u0275advance();
        \u0275\u0275styleProp("background-image", "url(" + ctx.bgImage + ")");
      }
    }, dependencies: [CommonModule, LogoComponent], styles: ["\n\n[_ngcontent-%COMP%]:root {\n  --sa-primary: #E87E24;\n  --sa-primary-hover: #D06E1A;\n  --sa-sidebar-bg: #1E293B;\n  --sa-body-bg: #F8F9FA;\n  --sa-text-primary: #111827;\n  --sa-text-secondary: #6B7280;\n  --sa-input-border: #D1D5DB;\n  --sa-success: #10B981;\n  --sa-error: #EF4444;\n  --sa-radius: 8px;\n  --sa-font:\n    Inter,\n    -apple-system,\n    BlinkMacSystemFont,\n    Segoe UI,\n    Roboto,\n    sans-serif;\n}\nion-content[_ngcontent-%COMP%] {\n  --background: #F8F9FA;\n}\n.auth-layout[_ngcontent-%COMP%] {\n  display: flex;\n  min-height: 100%;\n  height: auto;\n}\n@media (max-width: 767px) {\n  .auth-layout[_ngcontent-%COMP%] {\n    flex-direction: column;\n  }\n}\n.auth-layout__hero[_ngcontent-%COMP%] {\n  flex: 0 0 42%;\n  position: relative;\n  background-color: #E87E24;\n  background-image: url(/assets/signin.png);\n  background-size: cover;\n  background-position: center;\n  display: flex;\n  flex-direction: column;\n  justify-content: flex-end;\n  padding: 40px;\n}\n@media (max-width: 767px) {\n  .auth-layout__hero[_ngcontent-%COMP%] {\n    flex: 0 0 auto;\n    min-height: 200px;\n    padding: 24px;\n    justify-content: center;\n  }\n  .auth-layout__hero[_ngcontent-%COMP%]   .auth-layout__hero-stats[_ngcontent-%COMP%] {\n    display: none;\n  }\n  .auth-layout__hero[_ngcontent-%COMP%]   .auth-layout__hero-text[_ngcontent-%COMP%]   p[_ngcontent-%COMP%] {\n    display: none;\n  }\n  .auth-layout__hero[_ngcontent-%COMP%]   .auth-layout__hero-text[_ngcontent-%COMP%]   h1[_ngcontent-%COMP%] {\n    font-size: 1.5rem;\n    margin-bottom: 0;\n    margin-top: 16px;\n  }\n}\n.auth-layout__hero-overlay[_ngcontent-%COMP%] {\n  position: absolute;\n  inset: 0;\n  background:\n    linear-gradient(\n      135deg,\n      rgba(232, 126, 36, 0.95) 0%,\n      rgba(197, 106, 27, 0.9) 100%);\n}\n.auth-layout__hero-content[_ngcontent-%COMP%] {\n  position: relative;\n  z-index: 1;\n  color: white;\n}\n.auth-layout__hero-text[_ngcontent-%COMP%] {\n  margin-top: 32px;\n}\n.auth-layout__hero-text[_ngcontent-%COMP%]   h1[_ngcontent-%COMP%] {\n  font-size: 2.25rem;\n  font-weight: 700;\n  color: white;\n  margin-bottom: 16px;\n  line-height: 1.2;\n}\n.auth-layout__hero-text[_ngcontent-%COMP%]   p[_ngcontent-%COMP%] {\n  color: rgba(255, 255, 255, 0.85);\n  font-size: 0.9375rem;\n  line-height: 1.6;\n  margin-bottom: 32px;\n}\n.auth-layout__hero-stats[_ngcontent-%COMP%] {\n  display: flex;\n  gap: 48px;\n  padding-top: 24px;\n  border-top: 2px solid rgba(255, 255, 255, 0.3);\n}\n.auth-layout__stat[_ngcontent-%COMP%] {\n  display: flex;\n  flex-direction: column;\n  gap: 4px;\n}\n.auth-layout__stat-value[_ngcontent-%COMP%] {\n  font-size: 1.75rem;\n  font-weight: 700;\n}\n.auth-layout__stat-label[_ngcontent-%COMP%] {\n  font-size: 0.8125rem;\n  opacity: 0.8;\n}\n.auth-layout__form[_ngcontent-%COMP%] {\n  flex: 1;\n  display: flex;\n  flex-direction: column;\n  justify-content: center;\n  padding: 48px 64px;\n  align-items: center;\n}\n@media (max-width: 767px) {\n  .auth-layout__form[_ngcontent-%COMP%] {\n    padding: 24px;\n    justify-content: flex-start;\n    margin-top: 24px;\n  }\n}\n.auth-layout__form-inner[_ngcontent-%COMP%] {\n  max-width: 480px;\n  width: 100%;\n}\n.auth-layout__footer[_ngcontent-%COMP%] {\n  text-align: center;\n  padding-top: 24px;\n  font-size: 0.8125rem;\n  color: #6B7280;\n  margin-top: auto;\n}\n/*# sourceMappingURL=auth-layout.component.css.map */"] });
  }
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(AuthLayoutComponent, [{
    type: Component,
    args: [{ selector: "app-auth-layout", standalone: true, imports: [CommonModule, LogoComponent], template: `<div class="auth-layout">
  <div class="auth-layout__hero" [style.background-image]="'url(' + bgImage + ')'">
    <div class="auth-layout__hero-overlay"></div>
    <div class="auth-layout__hero-content">
      <app-logo variant="light" size="md"></app-logo>
      <div class="auth-layout__hero-text">
        <h1>A smarter way to manage your school</h1>
        <p>Sync Academy coordinates administration, teachers, accounting, security, and parent communication into one seamless modern SaaS system.</p>
      </div>
      <div class="auth-layout__hero-stats">
        <div class="auth-layout__stat">
          <span class="auth-layout__stat-value">1,240+</span>
          <span class="auth-layout__stat-label">Active Institutions</span>
        </div>
        <div class="auth-layout__stat">
          <span class="auth-layout__stat-value">99.98%</span>
          <span class="auth-layout__stat-label">Operational Uptime</span>
        </div>
      </div>
    </div>
  </div>
  <div class="auth-layout__form">
    <div class="auth-layout__form-inner">
      <ng-content></ng-content>
    </div>
    <footer class="auth-layout__footer">
      \xA9 2026 Sync Academy. All rights reserved.
    </footer>
  </div>
</div>
`, styles: ["/* src/app/shared/layouts/auth-layout/auth-layout.component.scss */\n:root {\n  --sa-primary: #E87E24;\n  --sa-primary-hover: #D06E1A;\n  --sa-sidebar-bg: #1E293B;\n  --sa-body-bg: #F8F9FA;\n  --sa-text-primary: #111827;\n  --sa-text-secondary: #6B7280;\n  --sa-input-border: #D1D5DB;\n  --sa-success: #10B981;\n  --sa-error: #EF4444;\n  --sa-radius: 8px;\n  --sa-font:\n    Inter,\n    -apple-system,\n    BlinkMacSystemFont,\n    Segoe UI,\n    Roboto,\n    sans-serif;\n}\nion-content {\n  --background: #F8F9FA;\n}\n.auth-layout {\n  display: flex;\n  min-height: 100%;\n  height: auto;\n}\n@media (max-width: 767px) {\n  .auth-layout {\n    flex-direction: column;\n  }\n}\n.auth-layout__hero {\n  flex: 0 0 42%;\n  position: relative;\n  background-color: #E87E24;\n  background-image: url(/assets/signin.png);\n  background-size: cover;\n  background-position: center;\n  display: flex;\n  flex-direction: column;\n  justify-content: flex-end;\n  padding: 40px;\n}\n@media (max-width: 767px) {\n  .auth-layout__hero {\n    flex: 0 0 auto;\n    min-height: 200px;\n    padding: 24px;\n    justify-content: center;\n  }\n  .auth-layout__hero .auth-layout__hero-stats {\n    display: none;\n  }\n  .auth-layout__hero .auth-layout__hero-text p {\n    display: none;\n  }\n  .auth-layout__hero .auth-layout__hero-text h1 {\n    font-size: 1.5rem;\n    margin-bottom: 0;\n    margin-top: 16px;\n  }\n}\n.auth-layout__hero-overlay {\n  position: absolute;\n  inset: 0;\n  background:\n    linear-gradient(\n      135deg,\n      rgba(232, 126, 36, 0.95) 0%,\n      rgba(197, 106, 27, 0.9) 100%);\n}\n.auth-layout__hero-content {\n  position: relative;\n  z-index: 1;\n  color: white;\n}\n.auth-layout__hero-text {\n  margin-top: 32px;\n}\n.auth-layout__hero-text h1 {\n  font-size: 2.25rem;\n  font-weight: 700;\n  color: white;\n  margin-bottom: 16px;\n  line-height: 1.2;\n}\n.auth-layout__hero-text p {\n  color: rgba(255, 255, 255, 0.85);\n  font-size: 0.9375rem;\n  line-height: 1.6;\n  margin-bottom: 32px;\n}\n.auth-layout__hero-stats {\n  display: flex;\n  gap: 48px;\n  padding-top: 24px;\n  border-top: 2px solid rgba(255, 255, 255, 0.3);\n}\n.auth-layout__stat {\n  display: flex;\n  flex-direction: column;\n  gap: 4px;\n}\n.auth-layout__stat-value {\n  font-size: 1.75rem;\n  font-weight: 700;\n}\n.auth-layout__stat-label {\n  font-size: 0.8125rem;\n  opacity: 0.8;\n}\n.auth-layout__form {\n  flex: 1;\n  display: flex;\n  flex-direction: column;\n  justify-content: center;\n  padding: 48px 64px;\n  align-items: center;\n}\n@media (max-width: 767px) {\n  .auth-layout__form {\n    padding: 24px;\n    justify-content: flex-start;\n    margin-top: 24px;\n  }\n}\n.auth-layout__form-inner {\n  max-width: 480px;\n  width: 100%;\n}\n.auth-layout__footer {\n  text-align: center;\n  padding-top: 24px;\n  font-size: 0.8125rem;\n  color: #6B7280;\n  margin-top: auto;\n}\n/*# sourceMappingURL=auth-layout.component.css.map */\n"] }]
  }], null, { bgImage: [{
    type: Input
  }] });
})();
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && \u0275setClassDebugInfo(AuthLayoutComponent, { className: "AuthLayoutComponent", filePath: "src/app/shared/layouts/auth-layout/auth-layout.component.ts", lineNumber: 12 });
})();

export {
  AuthLayoutComponent
};
//# sourceMappingURL=chunk-E3DPMYMO.js.map
