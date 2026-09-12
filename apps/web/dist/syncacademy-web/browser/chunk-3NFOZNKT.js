import {
  AuthLayoutComponent
} from "./chunk-E3DPMYMO.js";
import {
  LogoComponent
} from "./chunk-LSFJZJTW.js";
import {
  CheckboxControlValueAccessor,
  DefaultValueAccessor,
  FormBuilder,
  FormControlName,
  FormGroupDirective,
  NgControlStatus,
  NgControlStatusGroup,
  ReactiveFormsModule,
  Validators,
  ɵNgNoValidate
} from "./chunk-JZPTM7M7.js";
import {
  Router,
  RouterLink
} from "./chunk-GIJX6M6U.js";
import {
  CommonModule,
  Component,
  NgIf,
  setClassMetadata,
  signal,
  ɵsetClassDebugInfo,
  ɵɵadvance,
  ɵɵdefineComponent,
  ɵɵdirectiveInject,
  ɵɵelement,
  ɵɵelementEnd,
  ɵɵelementStart,
  ɵɵlistener,
  ɵɵnamespaceSVG,
  ɵɵproperty,
  ɵɵtemplate,
  ɵɵtext
} from "./chunk-3IPAKGA7.js";
import "./chunk-QHQP2P2Z.js";

// src/app/features/auth/pages/login/login.page.ts
function LoginPage_div_13_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 26);
    \u0275\u0275text(1, " Please enter a valid email address. ");
    \u0275\u0275elementEnd();
  }
}
function LoginPage__svg_svg_20_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275namespaceSVG();
    \u0275\u0275elementStart(0, "svg", 23);
    \u0275\u0275element(1, "path", 27)(2, "circle", 28);
    \u0275\u0275elementEnd();
  }
}
function LoginPage__svg_svg_21_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275namespaceSVG();
    \u0275\u0275elementStart(0, "svg", 23);
    \u0275\u0275element(1, "path", 29)(2, "line", 30);
    \u0275\u0275elementEnd();
  }
}
function LoginPage_div_22_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 26);
    \u0275\u0275text(1, " Password must be at least 6 characters. ");
    \u0275\u0275elementEnd();
  }
}
var LoginPage = class _LoginPage {
  constructor(fb, router) {
    this.fb = fb;
    this.router = router;
    this.showPassword = signal(false);
    this.loginForm = this.fb.group({
      email: ["", [Validators.required, Validators.email]],
      password: ["", [Validators.required, Validators.minLength(6)]],
      rememberMe: [false]
    });
  }
  togglePassword() {
    this.showPassword.update((show) => !show);
  }
  onSubmit() {
    if (this.loginForm.valid) {
      console.log("Login form submitted:", this.loginForm.value);
      this.router.navigate(["/dashboard/overview"]);
    }
  }
  static {
    this.\u0275fac = function LoginPage_Factory(__ngFactoryType__) {
      return new (__ngFactoryType__ || _LoginPage)(\u0275\u0275directiveInject(FormBuilder), \u0275\u0275directiveInject(Router));
    };
  }
  static {
    this.\u0275cmp = /* @__PURE__ */ \u0275\u0275defineComponent({ type: _LoginPage, selectors: [["app-login"]], decls: 44, vars: 7, consts: [[1, "login"], ["variant", "dark", "size", "md"], [1, "login__header"], [1, "login__form", 3, "ngSubmit", "formGroup"], [1, "form-group"], ["for", "email", 1, "sa-label"], ["id", "email", "type", "email", "formControlName", "email", "placeholder", "director@syncacademy.sc.tz", 1, "sa-input"], ["class", "sa-error", 4, "ngIf"], ["for", "password", 1, "sa-label"], [1, "input-with-toggle"], ["id", "password", "formControlName", "password", "placeholder", "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022", 1, "sa-input", 3, "type"], ["type", "button", "aria-label", "Toggle password visibility", 1, "toggle-password", 3, "click"], ["xmlns", "http://www.w3.org/2000/svg", "width", "20", "height", "20", "viewBox", "0 0 24 24", "fill", "none", "stroke", "currentColor", "stroke-width", "2", "stroke-linecap", "round", "stroke-linejoin", "round", 4, "ngIf"], [1, "form-row", "form-row--between"], [1, "checkbox-label"], ["type", "checkbox", "formControlName", "rememberMe"], [1, "checkmark"], ["routerLink", "/auth/forgot-password", 1, "forgot-link"], ["type", "submit", 1, "sa-btn", "sa-btn--primary", 3, "disabled"], [1, "login__divider"], [1, "login__switch"], ["routerLink", "/auth/register"], [1, "login__ssl-badge"], ["xmlns", "http://www.w3.org/2000/svg", "width", "20", "height", "20", "viewBox", "0 0 24 24", "fill", "none", "stroke", "currentColor", "stroke-width", "2", "stroke-linecap", "round", "stroke-linejoin", "round"], ["d", "M22 11.08V12a10 10 0 1 1-5.93-9.14"], ["points", "22 4 12 14.01 9 11.01"], [1, "sa-error"], ["d", "M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"], ["cx", "12", "cy", "12", "r", "3"], ["d", "M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"], ["x1", "1", "y1", "1", "x2", "23", "y2", "23"]], template: function LoginPage_Template(rf, ctx) {
      if (rf & 1) {
        \u0275\u0275elementStart(0, "app-auth-layout")(1, "div", 0);
        \u0275\u0275element(2, "app-logo", 1);
        \u0275\u0275elementStart(3, "div", 2)(4, "h1");
        \u0275\u0275text(5, "Welcome back");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(6, "p");
        \u0275\u0275text(7, "Sign in to access your administrative dashboard.");
        \u0275\u0275elementEnd()();
        \u0275\u0275elementStart(8, "form", 3);
        \u0275\u0275listener("ngSubmit", function LoginPage_Template_form_ngSubmit_8_listener() {
          return ctx.onSubmit();
        });
        \u0275\u0275elementStart(9, "div", 4)(10, "label", 5);
        \u0275\u0275text(11, "Email Address");
        \u0275\u0275elementEnd();
        \u0275\u0275element(12, "input", 6);
        \u0275\u0275template(13, LoginPage_div_13_Template, 2, 0, "div", 7);
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(14, "div", 4)(15, "label", 8);
        \u0275\u0275text(16, "Password");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(17, "div", 9);
        \u0275\u0275element(18, "input", 10);
        \u0275\u0275elementStart(19, "button", 11);
        \u0275\u0275listener("click", function LoginPage_Template_button_click_19_listener() {
          return ctx.togglePassword();
        });
        \u0275\u0275template(20, LoginPage__svg_svg_20_Template, 3, 0, "svg", 12)(21, LoginPage__svg_svg_21_Template, 3, 0, "svg", 12);
        \u0275\u0275elementEnd()();
        \u0275\u0275template(22, LoginPage_div_22_Template, 2, 0, "div", 7);
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(23, "div", 13)(24, "label", 14);
        \u0275\u0275element(25, "input", 15)(26, "span", 16);
        \u0275\u0275text(27, " Remember me ");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(28, "a", 17);
        \u0275\u0275text(29, "Forgot password?");
        \u0275\u0275elementEnd()();
        \u0275\u0275elementStart(30, "button", 18);
        \u0275\u0275text(31, " Sign In ");
        \u0275\u0275elementEnd()();
        \u0275\u0275elementStart(32, "div", 19)(33, "span");
        \u0275\u0275text(34, "OR");
        \u0275\u0275elementEnd()();
        \u0275\u0275elementStart(35, "p", 20);
        \u0275\u0275text(36, " Don't have an account? ");
        \u0275\u0275elementStart(37, "a", 21);
        \u0275\u0275text(38, "Create Account");
        \u0275\u0275elementEnd()();
        \u0275\u0275elementStart(39, "div", 22);
        \u0275\u0275namespaceSVG();
        \u0275\u0275elementStart(40, "svg", 23);
        \u0275\u0275element(41, "path", 24)(42, "polyline", 25);
        \u0275\u0275elementEnd();
        \u0275\u0275text(43, " Secure SSL environment: All academic records are synchronized. ");
        \u0275\u0275elementEnd()()();
      }
      if (rf & 2) {
        let tmp_1_0;
        let tmp_5_0;
        \u0275\u0275advance(8);
        \u0275\u0275property("formGroup", ctx.loginForm);
        \u0275\u0275advance(5);
        \u0275\u0275property("ngIf", ((tmp_1_0 = ctx.loginForm.get("email")) == null ? null : tmp_1_0.invalid) && ((tmp_1_0 = ctx.loginForm.get("email")) == null ? null : tmp_1_0.touched));
        \u0275\u0275advance(5);
        \u0275\u0275property("type", ctx.showPassword() ? "text" : "password");
        \u0275\u0275advance(2);
        \u0275\u0275property("ngIf", !ctx.showPassword());
        \u0275\u0275advance();
        \u0275\u0275property("ngIf", ctx.showPassword());
        \u0275\u0275advance();
        \u0275\u0275property("ngIf", ((tmp_5_0 = ctx.loginForm.get("password")) == null ? null : tmp_5_0.invalid) && ((tmp_5_0 = ctx.loginForm.get("password")) == null ? null : tmp_5_0.touched));
        \u0275\u0275advance(8);
        \u0275\u0275property("disabled", ctx.loginForm.invalid);
      }
    }, dependencies: [
      CommonModule,
      NgIf,
      ReactiveFormsModule,
      \u0275NgNoValidate,
      DefaultValueAccessor,
      CheckboxControlValueAccessor,
      NgControlStatus,
      NgControlStatusGroup,
      FormGroupDirective,
      FormControlName,
      RouterLink,
      AuthLayoutComponent,
      LogoComponent
    ], styles: ['\n\n.login[_ngcontent-%COMP%] {\n  width: 100%;\n  max-width: 400px;\n  margin: 0 auto;\n}\n.login__header[_ngcontent-%COMP%] {\n  margin-top: 24px;\n}\n.login__header[_ngcontent-%COMP%]   h1[_ngcontent-%COMP%] {\n  font-size: 1.875rem;\n  font-weight: 700;\n  margin-bottom: 8px;\n  color: #111827;\n}\n.login__header[_ngcontent-%COMP%]   p[_ngcontent-%COMP%] {\n  color: #6B7280;\n  margin-bottom: 32px;\n  font-size: 1rem;\n  line-height: 1.5;\n}\n.login__form[_ngcontent-%COMP%] {\n  display: flex;\n  flex-direction: column;\n}\n.form-group[_ngcontent-%COMP%] {\n  margin-bottom: 20px;\n}\n.input-with-toggle[_ngcontent-%COMP%] {\n  position: relative;\n  display: flex;\n  align-items: center;\n}\n.input-with-toggle[_ngcontent-%COMP%]   .sa-input[_ngcontent-%COMP%] {\n  width: 100%;\n  padding-right: 48px;\n}\n.input-with-toggle[_ngcontent-%COMP%]   .toggle-password[_ngcontent-%COMP%] {\n  position: absolute;\n  right: 12px;\n  background: transparent;\n  border: none;\n  cursor: pointer;\n  color: #6B7280;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  padding: 4px;\n  transition: color 0.2s ease;\n}\n.input-with-toggle[_ngcontent-%COMP%]   .toggle-password[_ngcontent-%COMP%]:hover {\n  color: #111827;\n}\n.form-row--between[_ngcontent-%COMP%] {\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n  margin-bottom: 24px;\n}\n.checkbox-label[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  gap: 8px;\n  cursor: pointer;\n  font-size: 0.875rem;\n  color: #111827;\n  position: relative;\n  -webkit-user-select: none;\n  user-select: none;\n}\n.checkbox-label[_ngcontent-%COMP%]   input[_ngcontent-%COMP%] {\n  position: absolute;\n  opacity: 0;\n  cursor: pointer;\n  height: 0;\n  width: 0;\n}\n.checkbox-label[_ngcontent-%COMP%]   input[_ngcontent-%COMP%]:checked    ~ .checkmark[_ngcontent-%COMP%] {\n  background-color: #E87E24;\n  border-color: #E87E24;\n}\n.checkbox-label[_ngcontent-%COMP%]   input[_ngcontent-%COMP%]:checked    ~ .checkmark[_ngcontent-%COMP%]:after {\n  display: block;\n}\n.checkbox-label[_ngcontent-%COMP%]   .checkmark[_ngcontent-%COMP%] {\n  height: 16px;\n  width: 16px;\n  background-color: #fff;\n  border: 1px solid #D1D5DB;\n  border-radius: 4px;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n}\n.checkbox-label[_ngcontent-%COMP%]   .checkmark[_ngcontent-%COMP%]:after {\n  content: "";\n  display: none;\n  width: 4px;\n  height: 8px;\n  border: solid white;\n  border-width: 0 2px 2px 0;\n  transform: rotate(45deg);\n  margin-bottom: 2px;\n}\n.forgot-link[_ngcontent-%COMP%] {\n  color: #E87E24;\n  font-size: 0.875rem;\n  font-weight: 500;\n  text-decoration: none;\n}\n.forgot-link[_ngcontent-%COMP%]:hover {\n  color: #D06E1A;\n  text-decoration: underline;\n}\n.login__divider[_ngcontent-%COMP%] {\n  text-align: center;\n  position: relative;\n  margin: 24px 0;\n  border-top: 1px solid #D1D5DB;\n}\n.login__divider[_ngcontent-%COMP%]   span[_ngcontent-%COMP%] {\n  position: absolute;\n  top: 50%;\n  left: 50%;\n  transform: translate(-50%, -50%);\n  background: #fff;\n  padding: 0 12px;\n  color: #9CA3AF;\n  font-size: 0.875rem;\n  font-weight: 500;\n}\n.login__switch[_ngcontent-%COMP%] {\n  text-align: center;\n  font-size: 0.9375rem;\n  color: #6B7280;\n  margin: 0;\n}\n.login__switch[_ngcontent-%COMP%]   a[_ngcontent-%COMP%] {\n  color: #E87E24;\n  font-weight: 500;\n  text-decoration: none;\n}\n.login__switch[_ngcontent-%COMP%]   a[_ngcontent-%COMP%]:hover {\n  color: #D06E1A;\n  text-decoration: underline;\n}\n.login__ssl-badge[_ngcontent-%COMP%] {\n  background: #ECFDF5;\n  color: #10B981;\n  border-radius: 8px;\n  padding: 12px 16px;\n  text-align: center;\n  font-size: 0.875rem;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  gap: 8px;\n  margin-top: 24px;\n  font-weight: 500;\n  line-height: 1.4;\n}\n/*# sourceMappingURL=login.page.css.map */'] });
  }
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(LoginPage, [{
    type: Component,
    args: [{ selector: "app-login", standalone: true, imports: [
      CommonModule,
      ReactiveFormsModule,
      RouterLink,
      AuthLayoutComponent,
      LogoComponent
    ], template: `\r
<app-auth-layout>\r
  <div class="login">\r
    <app-logo variant="dark" size="md"></app-logo>\r
    \r
    <div class="login__header">\r
      <h1>Welcome back</h1>\r
      <p>Sign in to access your administrative dashboard.</p>\r
    </div>\r
\r
    <form [formGroup]="loginForm" (ngSubmit)="onSubmit()" class="login__form">\r
      <div class="form-group">\r
        <label class="sa-label" for="email">Email Address</label>\r
        <input \r
          id="email"\r
          type="email" \r
          class="sa-input" \r
          formControlName="email"\r
          placeholder="director@syncacademy.sc.tz">\r
        <div class="sa-error" *ngIf="loginForm.get('email')?.invalid && loginForm.get('email')?.touched">\r
          Please enter a valid email address.\r
        </div>\r
      </div>\r
\r
      <div class="form-group">\r
        <label class="sa-label" for="password">Password</label>\r
        <div class="input-with-toggle">\r
          <input \r
            id="password"\r
            [type]="showPassword() ? 'text' : 'password'" \r
            class="sa-input" \r
            formControlName="password"\r
            placeholder="\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022">\r
          <button type="button" class="toggle-password" (click)="togglePassword()" aria-label="Toggle password visibility">\r
            <svg *ngIf="!showPassword()" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">\r
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>\r
              <circle cx="12" cy="12" r="3"></circle>\r
            </svg>\r
            <svg *ngIf="showPassword()" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">\r
              <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>\r
              <line x1="1" y1="1" x2="23" y2="23"></line>\r
            </svg>\r
          </button>\r
        </div>\r
        <div class="sa-error" *ngIf="loginForm.get('password')?.invalid && loginForm.get('password')?.touched">\r
          Password must be at least 6 characters.\r
        </div>\r
      </div>\r
\r
      <div class="form-row form-row--between">\r
        <label class="checkbox-label">\r
          <input type="checkbox" formControlName="rememberMe">\r
          <span class="checkmark"></span>\r
          Remember me\r
        </label>\r
        <a routerLink="/auth/forgot-password" class="forgot-link">Forgot password?</a>\r
      </div>\r
\r
      <button type="submit" class="sa-btn sa-btn--primary" [disabled]="loginForm.invalid">\r
        Sign In\r
      </button>\r
    </form>\r
\r
    <div class="login__divider">\r
      <span>OR</span>\r
    </div>\r
\r
    <p class="login__switch">\r
      Don't have an account? <a routerLink="/auth/register">Create Account</a>\r
    </p>\r
\r
    <div class="login__ssl-badge">\r
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">\r
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>\r
        <polyline points="22 4 12 14.01 9 11.01"></polyline>\r
      </svg>\r
      Secure SSL environment: All academic records are synchronized.\r
    </div>\r
  </div>\r
</app-auth-layout>\r
\r
`, styles: ['/* src/app/features/auth/pages/login/login.page.scss */\n.login {\n  width: 100%;\n  max-width: 400px;\n  margin: 0 auto;\n}\n.login__header {\n  margin-top: 24px;\n}\n.login__header h1 {\n  font-size: 1.875rem;\n  font-weight: 700;\n  margin-bottom: 8px;\n  color: #111827;\n}\n.login__header p {\n  color: #6B7280;\n  margin-bottom: 32px;\n  font-size: 1rem;\n  line-height: 1.5;\n}\n.login__form {\n  display: flex;\n  flex-direction: column;\n}\n.form-group {\n  margin-bottom: 20px;\n}\n.input-with-toggle {\n  position: relative;\n  display: flex;\n  align-items: center;\n}\n.input-with-toggle .sa-input {\n  width: 100%;\n  padding-right: 48px;\n}\n.input-with-toggle .toggle-password {\n  position: absolute;\n  right: 12px;\n  background: transparent;\n  border: none;\n  cursor: pointer;\n  color: #6B7280;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  padding: 4px;\n  transition: color 0.2s ease;\n}\n.input-with-toggle .toggle-password:hover {\n  color: #111827;\n}\n.form-row--between {\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n  margin-bottom: 24px;\n}\n.checkbox-label {\n  display: flex;\n  align-items: center;\n  gap: 8px;\n  cursor: pointer;\n  font-size: 0.875rem;\n  color: #111827;\n  position: relative;\n  -webkit-user-select: none;\n  user-select: none;\n}\n.checkbox-label input {\n  position: absolute;\n  opacity: 0;\n  cursor: pointer;\n  height: 0;\n  width: 0;\n}\n.checkbox-label input:checked ~ .checkmark {\n  background-color: #E87E24;\n  border-color: #E87E24;\n}\n.checkbox-label input:checked ~ .checkmark:after {\n  display: block;\n}\n.checkbox-label .checkmark {\n  height: 16px;\n  width: 16px;\n  background-color: #fff;\n  border: 1px solid #D1D5DB;\n  border-radius: 4px;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n}\n.checkbox-label .checkmark:after {\n  content: "";\n  display: none;\n  width: 4px;\n  height: 8px;\n  border: solid white;\n  border-width: 0 2px 2px 0;\n  transform: rotate(45deg);\n  margin-bottom: 2px;\n}\n.forgot-link {\n  color: #E87E24;\n  font-size: 0.875rem;\n  font-weight: 500;\n  text-decoration: none;\n}\n.forgot-link:hover {\n  color: #D06E1A;\n  text-decoration: underline;\n}\n.login__divider {\n  text-align: center;\n  position: relative;\n  margin: 24px 0;\n  border-top: 1px solid #D1D5DB;\n}\n.login__divider span {\n  position: absolute;\n  top: 50%;\n  left: 50%;\n  transform: translate(-50%, -50%);\n  background: #fff;\n  padding: 0 12px;\n  color: #9CA3AF;\n  font-size: 0.875rem;\n  font-weight: 500;\n}\n.login__switch {\n  text-align: center;\n  font-size: 0.9375rem;\n  color: #6B7280;\n  margin: 0;\n}\n.login__switch a {\n  color: #E87E24;\n  font-weight: 500;\n  text-decoration: none;\n}\n.login__switch a:hover {\n  color: #D06E1A;\n  text-decoration: underline;\n}\n.login__ssl-badge {\n  background: #ECFDF5;\n  color: #10B981;\n  border-radius: 8px;\n  padding: 12px 16px;\n  text-align: center;\n  font-size: 0.875rem;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  gap: 8px;\n  margin-top: 24px;\n  font-weight: 500;\n  line-height: 1.4;\n}\n/*# sourceMappingURL=login.page.css.map */\n'] }]
  }], () => [{ type: FormBuilder }, { type: Router }], null);
})();
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && \u0275setClassDebugInfo(LoginPage, { className: "LoginPage", filePath: "src/app/features/auth/pages/login/login.page.ts", lineNumber: 23 });
})();
export {
  LoginPage
};
//# sourceMappingURL=chunk-3NFOZNKT.js.map
