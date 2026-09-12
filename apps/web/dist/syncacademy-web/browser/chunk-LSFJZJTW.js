import {
  CommonModule,
  Component,
  Input,
  NgClass,
  setClassMetadata,
  ɵsetClassDebugInfo,
  ɵɵdefineComponent,
  ɵɵelement,
  ɵɵelementEnd,
  ɵɵelementStart,
  ɵɵnamespaceHTML,
  ɵɵnamespaceSVG,
  ɵɵproperty,
  ɵɵpureFunction2,
  ɵɵtext
} from "./chunk-3IPAKGA7.js";

// src/app/shared/components/logo/logo.component.ts
var _c0 = (a0, a1) => [a0, a1];
var LogoComponent = class _LogoComponent {
  constructor() {
    this.variant = "dark";
    this.size = "md";
  }
  static {
    this.\u0275fac = function LogoComponent_Factory(__ngFactoryType__) {
      return new (__ngFactoryType__ || _LogoComponent)();
    };
  }
  static {
    this.\u0275cmp = /* @__PURE__ */ \u0275\u0275defineComponent({ type: _LogoComponent, selectors: [["app-logo"]], inputs: { variant: "variant", size: "size" }, decls: 9, vars: 4, consts: [[1, "logo-container", 3, "ngClass"], [1, "logo-icon"], ["viewBox", "0 0 24 24", "fill", "white", "xmlns", "http://www.w3.org/2000/svg"], ["d", "M12 3L1 9L12 15L21 10.09V17H23V9M5 13.18V17.18L12 21L19 17.18V13.18L12 17L5 13.18Z"], [1, "logo-text"], [1, "text-sync"], [1, "text-academy"]], template: function LogoComponent_Template(rf, ctx) {
      if (rf & 1) {
        \u0275\u0275elementStart(0, "div", 0)(1, "div", 1);
        \u0275\u0275namespaceSVG();
        \u0275\u0275elementStart(2, "svg", 2);
        \u0275\u0275element(3, "path", 3);
        \u0275\u0275elementEnd()();
        \u0275\u0275namespaceHTML();
        \u0275\u0275elementStart(4, "div", 4)(5, "span", 5);
        \u0275\u0275text(6, "Sync");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(7, "span", 6);
        \u0275\u0275text(8, "Academy");
        \u0275\u0275elementEnd()()();
      }
      if (rf & 2) {
        \u0275\u0275property("ngClass", \u0275\u0275pureFunction2(1, _c0, ctx.variant, ctx.size));
      }
    }, dependencies: [CommonModule, NgClass], styles: ['\n\n[_ngcontent-%COMP%]:root {\n  --sa-primary: #E87E24;\n  --sa-primary-hover: #D06E1A;\n  --sa-sidebar-bg: #1E293B;\n  --sa-body-bg: #F8F9FA;\n  --sa-text-primary: #111827;\n  --sa-text-secondary: #6B7280;\n  --sa-input-border: #D1D5DB;\n  --sa-success: #10B981;\n  --sa-error: #EF4444;\n  --sa-radius: 8px;\n  --sa-font:\n    Inter,\n    -apple-system,\n    BlinkMacSystemFont,\n    Segoe UI,\n    Roboto,\n    sans-serif;\n}\n.logo-container[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  gap: 8px;\n}\n.logo-container[_ngcontent-%COMP%]   .logo-icon[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  background-color: #E87E24;\n  border-radius: 8px;\n}\n.logo-container[_ngcontent-%COMP%]   .logo-icon[_ngcontent-%COMP%]   svg[_ngcontent-%COMP%] {\n  width: 60%;\n  height: 60%;\n}\n.logo-container[_ngcontent-%COMP%]   .logo-text[_ngcontent-%COMP%] {\n  font-family:\n    "Inter",\n    -apple-system,\n    BlinkMacSystemFont,\n    "Segoe UI",\n    Roboto,\n    sans-serif;\n  font-weight: 700;\n  line-height: 1;\n}\n.logo-container[_ngcontent-%COMP%]   .logo-text[_ngcontent-%COMP%]   .text-academy[_ngcontent-%COMP%] {\n  color: #E87E24;\n}\n.logo-container.dark[_ngcontent-%COMP%]   .text-sync[_ngcontent-%COMP%] {\n  color: #111827;\n}\n.logo-container.light[_ngcontent-%COMP%]   .text-sync[_ngcontent-%COMP%] {\n  color: #FFFFFF;\n}\n.logo-container.sm[_ngcontent-%COMP%]   .logo-icon[_ngcontent-%COMP%] {\n  width: 28px;\n  height: 28px;\n  border-radius: 6px;\n}\n.logo-container.sm[_ngcontent-%COMP%]   .logo-text[_ngcontent-%COMP%] {\n  font-size: 1rem;\n}\n.logo-container.md[_ngcontent-%COMP%]   .logo-icon[_ngcontent-%COMP%] {\n  width: 36px;\n  height: 36px;\n  border-radius: 8px;\n}\n.logo-container.md[_ngcontent-%COMP%]   .logo-text[_ngcontent-%COMP%] {\n  font-size: 1.25rem;\n}\n.logo-container.lg[_ngcontent-%COMP%]   .logo-icon[_ngcontent-%COMP%] {\n  width: 44px;\n  height: 44px;\n  border-radius: 10px;\n}\n.logo-container.lg[_ngcontent-%COMP%]   .logo-text[_ngcontent-%COMP%] {\n  font-size: 1.5rem;\n}\n/*# sourceMappingURL=logo.component.css.map */'] });
  }
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(LogoComponent, [{
    type: Component,
    args: [{ selector: "app-logo", standalone: true, imports: [CommonModule], template: `
    <div class="logo-container" [ngClass]="[variant, size]">
      <div class="logo-icon">
        <svg viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 3L1 9L12 15L21 10.09V17H23V9M5 13.18V17.18L12 21L19 17.18V13.18L12 17L5 13.18Z"/>
        </svg>
      </div>
      <div class="logo-text">
        <span class="text-sync">Sync</span>
        <span class="text-academy">Academy</span>
      </div>
    </div>
  `, styles: ['/* src/app/shared/components/logo/logo.component.scss */\n:root {\n  --sa-primary: #E87E24;\n  --sa-primary-hover: #D06E1A;\n  --sa-sidebar-bg: #1E293B;\n  --sa-body-bg: #F8F9FA;\n  --sa-text-primary: #111827;\n  --sa-text-secondary: #6B7280;\n  --sa-input-border: #D1D5DB;\n  --sa-success: #10B981;\n  --sa-error: #EF4444;\n  --sa-radius: 8px;\n  --sa-font:\n    Inter,\n    -apple-system,\n    BlinkMacSystemFont,\n    Segoe UI,\n    Roboto,\n    sans-serif;\n}\n.logo-container {\n  display: flex;\n  align-items: center;\n  gap: 8px;\n}\n.logo-container .logo-icon {\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  background-color: #E87E24;\n  border-radius: 8px;\n}\n.logo-container .logo-icon svg {\n  width: 60%;\n  height: 60%;\n}\n.logo-container .logo-text {\n  font-family:\n    "Inter",\n    -apple-system,\n    BlinkMacSystemFont,\n    "Segoe UI",\n    Roboto,\n    sans-serif;\n  font-weight: 700;\n  line-height: 1;\n}\n.logo-container .logo-text .text-academy {\n  color: #E87E24;\n}\n.logo-container.dark .text-sync {\n  color: #111827;\n}\n.logo-container.light .text-sync {\n  color: #FFFFFF;\n}\n.logo-container.sm .logo-icon {\n  width: 28px;\n  height: 28px;\n  border-radius: 6px;\n}\n.logo-container.sm .logo-text {\n  font-size: 1rem;\n}\n.logo-container.md .logo-icon {\n  width: 36px;\n  height: 36px;\n  border-radius: 8px;\n}\n.logo-container.md .logo-text {\n  font-size: 1.25rem;\n}\n.logo-container.lg .logo-icon {\n  width: 44px;\n  height: 44px;\n  border-radius: 10px;\n}\n.logo-container.lg .logo-text {\n  font-size: 1.5rem;\n}\n/*# sourceMappingURL=logo.component.css.map */\n'] }]
  }], null, { variant: [{
    type: Input
  }], size: [{
    type: Input
  }] });
})();
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && \u0275setClassDebugInfo(LogoComponent, { className: "LogoComponent", filePath: "src/app/shared/components/logo/logo.component.ts", lineNumber: 23 });
})();

export {
  LogoComponent
};
//# sourceMappingURL=chunk-LSFJZJTW.js.map
