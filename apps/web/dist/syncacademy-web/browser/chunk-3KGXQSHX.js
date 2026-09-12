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
  NgSelectOption,
  ReactiveFormsModule,
  SelectControlValueAccessor,
  Validators,
  ɵNgNoValidate,
  ɵNgSelectMultipleOption
} from "./chunk-JZPTM7M7.js";
import {
  RouterLink
} from "./chunk-GIJX6M6U.js";
import {
  CommonModule,
  Component,
  NgForOf,
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
  ɵɵtext,
  ɵɵtextInterpolate
} from "./chunk-3IPAKGA7.js";
import "./chunk-QHQP2P2Z.js";

// src/app/features/auth/pages/register/register.page.ts
function RegisterPage_div_13_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 29);
    \u0275\u0275text(1, " Full Name is required. ");
    \u0275\u0275elementEnd();
  }
}
function RegisterPage_div_19_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 29);
    \u0275\u0275text(1, " Please enter a valid email address. ");
    \u0275\u0275elementEnd();
  }
}
function RegisterPage_div_24_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 29);
    \u0275\u0275text(1, " Phone Number is required. ");
    \u0275\u0275elementEnd();
  }
}
function RegisterPage__svg_svg_32_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275namespaceSVG();
    \u0275\u0275elementStart(0, "svg", 30);
    \u0275\u0275element(1, "path", 31)(2, "circle", 32);
    \u0275\u0275elementEnd();
  }
}
function RegisterPage__svg_svg_33_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275namespaceSVG();
    \u0275\u0275elementStart(0, "svg", 30);
    \u0275\u0275element(1, "path", 33)(2, "line", 34);
    \u0275\u0275elementEnd();
  }
}
function RegisterPage_div_34_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 29);
    \u0275\u0275text(1, " Password must be at least 8 characters. ");
    \u0275\u0275elementEnd();
  }
}
function RegisterPage__svg_svg_41_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275namespaceSVG();
    \u0275\u0275elementStart(0, "svg", 30);
    \u0275\u0275element(1, "path", 31)(2, "circle", 32);
    \u0275\u0275elementEnd();
  }
}
function RegisterPage__svg_svg_42_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275namespaceSVG();
    \u0275\u0275elementStart(0, "svg", 30);
    \u0275\u0275element(1, "path", 33)(2, "line", 34);
    \u0275\u0275elementEnd();
  }
}
function RegisterPage_div_43_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 29);
    \u0275\u0275text(1, " Passwords do not match. ");
    \u0275\u0275elementEnd();
  }
}
function RegisterPage_option_51_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "option", 35);
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const school_r1 = ctx.$implicit;
    \u0275\u0275property("value", school_r1);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate(school_r1);
  }
}
function RegisterPage_div_52_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 29);
    \u0275\u0275text(1, " Please select a school. ");
    \u0275\u0275elementEnd();
  }
}
function RegisterPage_option_59_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "option", 35);
    \u0275\u0275text(1);
    \u0275\u0275elementEnd();
  }
  if (rf & 2) {
    const role_r2 = ctx.$implicit;
    \u0275\u0275property("value", role_r2);
    \u0275\u0275advance();
    \u0275\u0275textInterpolate(role_r2);
  }
}
function RegisterPage_div_60_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 29);
    \u0275\u0275text(1, " Please select a role. ");
    \u0275\u0275elementEnd();
  }
}
function RegisterPage_div_65_Template(rf, ctx) {
  if (rf & 1) {
    \u0275\u0275elementStart(0, "div", 36);
    \u0275\u0275text(1, " You must agree to the terms to register. ");
    \u0275\u0275elementEnd();
  }
}
function matchPasswordValidator(passwordKey, confirmPasswordKey) {
  return (control) => {
    const formGroup = control;
    const password = formGroup.get(passwordKey)?.value;
    const confirmPassword = formGroup.get(confirmPasswordKey)?.value;
    if (!password || !confirmPassword) {
      return null;
    }
    if (password !== confirmPassword) {
      formGroup.get(confirmPasswordKey)?.setErrors({ passwordMismatch: true });
      return { passwordMismatch: true };
    }
    const confirmControl = formGroup.get(confirmPasswordKey);
    if (confirmControl?.errors && confirmControl.errors["passwordMismatch"]) {
      delete confirmControl.errors["passwordMismatch"];
      if (Object.keys(confirmControl.errors).length === 0) {
        confirmControl.setErrors(null);
      }
    }
    return null;
  };
}
var RegisterPage = class _RegisterPage {
  constructor(fb) {
    this.fb = fb;
    this.showPassword = signal(false);
    this.showConfirmPassword = signal(false);
    this.schoolOptions = [
      "Sync Academy Dar es Salaam",
      "Sync Academy Arusha",
      "Sync Academy Dodoma"
    ];
    this.roleOptions = [
      "Administrator",
      "Teacher",
      "Accountant",
      "Secretary"
    ];
    this.registerForm = this.fb.group({
      fullName: ["", Validators.required],
      email: ["", [Validators.required, Validators.email]],
      phone: ["", Validators.required],
      password: ["", [Validators.required, Validators.minLength(8)]],
      confirmPassword: ["", Validators.required],
      school: ["", Validators.required],
      role: ["", Validators.required],
      terms: [false, Validators.requiredTrue]
    }, { validators: matchPasswordValidator("password", "confirmPassword") });
  }
  togglePassword(field) {
    if (field === "password") {
      this.showPassword.update((show) => !show);
    } else {
      this.showConfirmPassword.update((show) => !show);
    }
  }
  onSubmit() {
    if (this.registerForm.valid) {
      console.log("Register form submitted:", this.registerForm.value);
    }
  }
  static {
    this.\u0275fac = function RegisterPage_Factory(__ngFactoryType__) {
      return new (__ngFactoryType__ || _RegisterPage)(\u0275\u0275directiveInject(FormBuilder));
    };
  }
  static {
    this.\u0275cmp = /* @__PURE__ */ \u0275\u0275defineComponent({ type: _RegisterPage, selectors: [["app-register"]], decls: 72, vars: 18, consts: [["bgImage", "/assets/register.png"], [1, "register"], ["variant", "dark", "size", "md"], [1, "register__header"], [1, "register__form", 3, "ngSubmit", "formGroup"], [1, "form-group"], [1, "sa-label"], ["formControlName", "fullName", "placeholder", "e.g. David Mwangi", 1, "sa-input"], ["class", "sa-error", 4, "ngIf"], [1, "form-row", "form-row--half"], ["formControlName", "email", "placeholder", "e.g. david@school.ac.tz", 1, "sa-input"], ["formControlName", "phone", "placeholder", "e.g. +255 712 345 678", 1, "sa-input"], [1, "input-with-toggle"], ["formControlName", "password", "placeholder", "Create robust password", 1, "sa-input", 3, "type"], ["type", "button", "aria-label", "Toggle password visibility", 1, "toggle-password", 3, "click"], ["xmlns", "http://www.w3.org/2000/svg", "width", "20", "height", "20", "viewBox", "0 0 24 24", "fill", "none", "stroke", "currentColor", "stroke-width", "2", "stroke-linecap", "round", "stroke-linejoin", "round", 4, "ngIf"], ["formControlName", "confirmPassword", "placeholder", "Repeat password", 1, "sa-input", 3, "type"], ["type", "button", "aria-label", "Toggle confirm password visibility", 1, "toggle-password", 3, "click"], ["formControlName", "school", 1, "sa-select"], ["value", "", "disabled", ""], [3, "value", 4, "ngFor", "ngForOf"], ["formControlName", "role", 1, "sa-select"], [1, "checkbox-label"], ["type", "checkbox", "formControlName", "terms"], [1, "checkmark"], ["class", "sa-error", "style", "margin-top: 4px;", 4, "ngIf"], ["type", "submit", 1, "sa-btn", "sa-btn--primary", "btn-submit", 3, "disabled"], [1, "register__switch"], ["routerLink", "/auth/login"], [1, "sa-error"], ["xmlns", "http://www.w3.org/2000/svg", "width", "20", "height", "20", "viewBox", "0 0 24 24", "fill", "none", "stroke", "currentColor", "stroke-width", "2", "stroke-linecap", "round", "stroke-linejoin", "round"], ["d", "M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"], ["cx", "12", "cy", "12", "r", "3"], ["d", "M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"], ["x1", "1", "y1", "1", "x2", "23", "y2", "23"], [3, "value"], [1, "sa-error", 2, "margin-top", "4px"]], template: function RegisterPage_Template(rf, ctx) {
      if (rf & 1) {
        \u0275\u0275elementStart(0, "app-auth-layout", 0)(1, "div", 1);
        \u0275\u0275element(2, "app-logo", 2);
        \u0275\u0275elementStart(3, "div", 3)(4, "h1");
        \u0275\u0275text(5, "Create your Sync Academy account");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(6, "p");
        \u0275\u0275text(7, "Connect your campus to the leading unified educational workspace.");
        \u0275\u0275elementEnd()();
        \u0275\u0275elementStart(8, "form", 4);
        \u0275\u0275listener("ngSubmit", function RegisterPage_Template_form_ngSubmit_8_listener() {
          return ctx.onSubmit();
        });
        \u0275\u0275elementStart(9, "div", 5)(10, "label", 6);
        \u0275\u0275text(11, "Full Name");
        \u0275\u0275elementEnd();
        \u0275\u0275element(12, "input", 7);
        \u0275\u0275template(13, RegisterPage_div_13_Template, 2, 0, "div", 8);
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(14, "div", 9)(15, "div", 5)(16, "label", 6);
        \u0275\u0275text(17, "Email Address");
        \u0275\u0275elementEnd();
        \u0275\u0275element(18, "input", 10);
        \u0275\u0275template(19, RegisterPage_div_19_Template, 2, 0, "div", 8);
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(20, "div", 5)(21, "label", 6);
        \u0275\u0275text(22, "Phone Number");
        \u0275\u0275elementEnd();
        \u0275\u0275element(23, "input", 11);
        \u0275\u0275template(24, RegisterPage_div_24_Template, 2, 0, "div", 8);
        \u0275\u0275elementEnd()();
        \u0275\u0275elementStart(25, "div", 9)(26, "div", 5)(27, "label", 6);
        \u0275\u0275text(28, "Password");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(29, "div", 12);
        \u0275\u0275element(30, "input", 13);
        \u0275\u0275elementStart(31, "button", 14);
        \u0275\u0275listener("click", function RegisterPage_Template_button_click_31_listener() {
          return ctx.togglePassword("password");
        });
        \u0275\u0275template(32, RegisterPage__svg_svg_32_Template, 3, 0, "svg", 15)(33, RegisterPage__svg_svg_33_Template, 3, 0, "svg", 15);
        \u0275\u0275elementEnd()();
        \u0275\u0275template(34, RegisterPage_div_34_Template, 2, 0, "div", 8);
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(35, "div", 5)(36, "label", 6);
        \u0275\u0275text(37, "Confirm Password");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(38, "div", 12);
        \u0275\u0275element(39, "input", 16);
        \u0275\u0275elementStart(40, "button", 17);
        \u0275\u0275listener("click", function RegisterPage_Template_button_click_40_listener() {
          return ctx.togglePassword("confirm");
        });
        \u0275\u0275template(41, RegisterPage__svg_svg_41_Template, 3, 0, "svg", 15)(42, RegisterPage__svg_svg_42_Template, 3, 0, "svg", 15);
        \u0275\u0275elementEnd()();
        \u0275\u0275template(43, RegisterPage_div_43_Template, 2, 0, "div", 8);
        \u0275\u0275elementEnd()();
        \u0275\u0275elementStart(44, "div", 9)(45, "div", 5)(46, "label", 6);
        \u0275\u0275text(47, "Select School");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(48, "select", 18)(49, "option", 19);
        \u0275\u0275text(50, "e.g. Sync Academy Dar es Sala...");
        \u0275\u0275elementEnd();
        \u0275\u0275template(51, RegisterPage_option_51_Template, 2, 2, "option", 20);
        \u0275\u0275elementEnd();
        \u0275\u0275template(52, RegisterPage_div_52_Template, 2, 0, "div", 8);
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(53, "div", 5)(54, "label", 6);
        \u0275\u0275text(55, "Your School Role");
        \u0275\u0275elementEnd();
        \u0275\u0275elementStart(56, "select", 21)(57, "option", 19);
        \u0275\u0275text(58, "Select role");
        \u0275\u0275elementEnd();
        \u0275\u0275template(59, RegisterPage_option_59_Template, 2, 2, "option", 20);
        \u0275\u0275elementEnd();
        \u0275\u0275template(60, RegisterPage_div_60_Template, 2, 0, "div", 8);
        \u0275\u0275elementEnd()();
        \u0275\u0275elementStart(61, "label", 22);
        \u0275\u0275element(62, "input", 23)(63, "span", 24);
        \u0275\u0275text(64, " I agree to the Terms of Service and Privacy Policy ");
        \u0275\u0275elementEnd();
        \u0275\u0275template(65, RegisterPage_div_65_Template, 2, 0, "div", 25);
        \u0275\u0275elementStart(66, "button", 26);
        \u0275\u0275text(67, " Create Account ");
        \u0275\u0275elementEnd()();
        \u0275\u0275elementStart(68, "p", 27);
        \u0275\u0275text(69, " Already have an account? ");
        \u0275\u0275elementStart(70, "a", 28);
        \u0275\u0275text(71, "Sign In");
        \u0275\u0275elementEnd()()()();
      }
      if (rf & 2) {
        let tmp_1_0;
        let tmp_2_0;
        let tmp_3_0;
        let tmp_7_0;
        let tmp_11_0;
        let tmp_13_0;
        let tmp_15_0;
        let tmp_16_0;
        \u0275\u0275advance(8);
        \u0275\u0275property("formGroup", ctx.registerForm);
        \u0275\u0275advance(5);
        \u0275\u0275property("ngIf", ((tmp_1_0 = ctx.registerForm.get("fullName")) == null ? null : tmp_1_0.invalid) && ((tmp_1_0 = ctx.registerForm.get("fullName")) == null ? null : tmp_1_0.touched));
        \u0275\u0275advance(6);
        \u0275\u0275property("ngIf", ((tmp_2_0 = ctx.registerForm.get("email")) == null ? null : tmp_2_0.invalid) && ((tmp_2_0 = ctx.registerForm.get("email")) == null ? null : tmp_2_0.touched));
        \u0275\u0275advance(5);
        \u0275\u0275property("ngIf", ((tmp_3_0 = ctx.registerForm.get("phone")) == null ? null : tmp_3_0.invalid) && ((tmp_3_0 = ctx.registerForm.get("phone")) == null ? null : tmp_3_0.touched));
        \u0275\u0275advance(6);
        \u0275\u0275property("type", ctx.showPassword() ? "text" : "password");
        \u0275\u0275advance(2);
        \u0275\u0275property("ngIf", !ctx.showPassword());
        \u0275\u0275advance();
        \u0275\u0275property("ngIf", ctx.showPassword());
        \u0275\u0275advance();
        \u0275\u0275property("ngIf", ((tmp_7_0 = ctx.registerForm.get("password")) == null ? null : tmp_7_0.invalid) && ((tmp_7_0 = ctx.registerForm.get("password")) == null ? null : tmp_7_0.touched));
        \u0275\u0275advance(5);
        \u0275\u0275property("type", ctx.showConfirmPassword() ? "text" : "password");
        \u0275\u0275advance(2);
        \u0275\u0275property("ngIf", !ctx.showConfirmPassword());
        \u0275\u0275advance();
        \u0275\u0275property("ngIf", ctx.showConfirmPassword());
        \u0275\u0275advance();
        \u0275\u0275property("ngIf", ((tmp_11_0 = ctx.registerForm.get("confirmPassword")) == null ? null : tmp_11_0.errors == null ? null : tmp_11_0.errors["passwordMismatch"]) && ((tmp_11_0 = ctx.registerForm.get("confirmPassword")) == null ? null : tmp_11_0.touched));
        \u0275\u0275advance(8);
        \u0275\u0275property("ngForOf", ctx.schoolOptions);
        \u0275\u0275advance();
        \u0275\u0275property("ngIf", ((tmp_13_0 = ctx.registerForm.get("school")) == null ? null : tmp_13_0.invalid) && ((tmp_13_0 = ctx.registerForm.get("school")) == null ? null : tmp_13_0.touched));
        \u0275\u0275advance(7);
        \u0275\u0275property("ngForOf", ctx.roleOptions);
        \u0275\u0275advance();
        \u0275\u0275property("ngIf", ((tmp_15_0 = ctx.registerForm.get("role")) == null ? null : tmp_15_0.invalid) && ((tmp_15_0 = ctx.registerForm.get("role")) == null ? null : tmp_15_0.touched));
        \u0275\u0275advance(5);
        \u0275\u0275property("ngIf", ((tmp_16_0 = ctx.registerForm.get("terms")) == null ? null : tmp_16_0.invalid) && ((tmp_16_0 = ctx.registerForm.get("terms")) == null ? null : tmp_16_0.touched));
        \u0275\u0275advance();
        \u0275\u0275property("disabled", ctx.registerForm.invalid);
      }
    }, dependencies: [
      CommonModule,
      NgForOf,
      NgIf,
      ReactiveFormsModule,
      \u0275NgNoValidate,
      NgSelectOption,
      \u0275NgSelectMultipleOption,
      DefaultValueAccessor,
      CheckboxControlValueAccessor,
      SelectControlValueAccessor,
      NgControlStatus,
      NgControlStatusGroup,
      FormGroupDirective,
      FormControlName,
      RouterLink,
      AuthLayoutComponent,
      LogoComponent
    ], styles: ['\n\n[_ngcontent-%COMP%]:root {\n  --sa-primary: #E87E24;\n  --sa-primary-hover: #D06E1A;\n  --sa-sidebar-bg: #1E293B;\n  --sa-body-bg: #F8F9FA;\n  --sa-text-primary: #111827;\n  --sa-text-secondary: #6B7280;\n  --sa-input-border: #D1D5DB;\n  --sa-success: #10B981;\n  --sa-error: #EF4444;\n  --sa-radius: 8px;\n  --sa-font:\n    Inter,\n    -apple-system,\n    BlinkMacSystemFont,\n    Segoe UI,\n    Roboto,\n    sans-serif;\n}\n.register[_ngcontent-%COMP%] {\n  width: 100%;\n  max-width: 600px;\n  margin: 0 auto;\n}\n.register__header[_ngcontent-%COMP%] {\n  margin-top: 24px;\n}\n.register__header[_ngcontent-%COMP%]   h1[_ngcontent-%COMP%] {\n  font-size: 1.75rem;\n  font-weight: 700;\n  margin-bottom: 8px;\n  color: #111827;\n}\n.register__header[_ngcontent-%COMP%]   p[_ngcontent-%COMP%] {\n  color: #6B7280;\n  margin-bottom: 32px;\n  font-size: 1rem;\n  line-height: 1.5;\n}\n.register__form[_ngcontent-%COMP%] {\n  display: flex;\n  flex-direction: column;\n}\n.form-group[_ngcontent-%COMP%] {\n  margin-bottom: 20px;\n}\n.form-row--half[_ngcontent-%COMP%] {\n  display: grid;\n  grid-template-columns: 1fr 1fr;\n  gap: 16px;\n}\n@media (max-width: 767px) {\n  .form-row--half[_ngcontent-%COMP%] {\n    grid-template-columns: 1fr;\n    gap: 0;\n  }\n}\n.input-with-toggle[_ngcontent-%COMP%] {\n  position: relative;\n  display: flex;\n  align-items: center;\n}\n.input-with-toggle[_ngcontent-%COMP%]   .sa-input[_ngcontent-%COMP%] {\n  width: 100%;\n  padding-right: 48px;\n}\n.input-with-toggle[_ngcontent-%COMP%]   .toggle-password[_ngcontent-%COMP%] {\n  position: absolute;\n  right: 12px;\n  background: transparent;\n  border: none;\n  cursor: pointer;\n  color: #6B7280;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  padding: 4px;\n  transition: color 0.2s ease;\n}\n.input-with-toggle[_ngcontent-%COMP%]   .toggle-password[_ngcontent-%COMP%]:hover {\n  color: #111827;\n}\n.checkbox-label[_ngcontent-%COMP%] {\n  display: flex;\n  align-items: center;\n  gap: 8px;\n  cursor: pointer;\n  font-size: 0.875rem;\n  color: #111827;\n  position: relative;\n  -webkit-user-select: none;\n  user-select: none;\n  margin-top: 8px;\n}\n.checkbox-label[_ngcontent-%COMP%]   input[_ngcontent-%COMP%] {\n  position: absolute;\n  opacity: 0;\n  cursor: pointer;\n  height: 0;\n  width: 0;\n}\n.checkbox-label[_ngcontent-%COMP%]   input[_ngcontent-%COMP%]:checked    ~ .checkmark[_ngcontent-%COMP%] {\n  background-color: #E87E24;\n  border-color: #E87E24;\n}\n.checkbox-label[_ngcontent-%COMP%]   input[_ngcontent-%COMP%]:checked    ~ .checkmark[_ngcontent-%COMP%]:after {\n  display: block;\n}\n.checkbox-label[_ngcontent-%COMP%]   .checkmark[_ngcontent-%COMP%] {\n  height: 16px;\n  width: 16px;\n  background-color: #fff;\n  border: 1px solid #D1D5DB;\n  border-radius: 4px;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  flex-shrink: 0;\n}\n.checkbox-label[_ngcontent-%COMP%]   .checkmark[_ngcontent-%COMP%]:after {\n  content: "";\n  display: none;\n  width: 4px;\n  height: 8px;\n  border: solid white;\n  border-width: 0 2px 2px 0;\n  transform: rotate(45deg);\n  margin-bottom: 2px;\n}\n.btn-submit[_ngcontent-%COMP%] {\n  margin-top: 24px;\n}\n.register__switch[_ngcontent-%COMP%] {\n  text-align: center;\n  font-size: 0.9375rem;\n  color: #6B7280;\n  margin-top: 16px;\n}\n.register__switch[_ngcontent-%COMP%]   a[_ngcontent-%COMP%] {\n  color: #E87E24;\n  font-weight: 500;\n  text-decoration: none;\n}\n.register__switch[_ngcontent-%COMP%]   a[_ngcontent-%COMP%]:hover {\n  color: #D06E1A;\n  text-decoration: underline;\n}\n/*# sourceMappingURL=register.page.css.map */'] });
  }
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(RegisterPage, [{
    type: Component,
    args: [{ selector: "app-register", standalone: true, imports: [
      CommonModule,
      ReactiveFormsModule,
      RouterLink,
      AuthLayoutComponent,
      LogoComponent
    ], template: `\r
<app-auth-layout bgImage="/assets/register.png">\r
  <div class="register">\r
    <app-logo variant="dark" size="md"></app-logo>\r
    \r
    <div class="register__header">\r
      <h1>Create your Sync Academy account</h1>\r
      <p>Connect your campus to the leading unified educational workspace.</p>\r
    </div>\r
\r
    <form [formGroup]="registerForm" (ngSubmit)="onSubmit()" class="register__form">\r
      <div class="form-group">\r
        <label class="sa-label">Full Name</label>\r
        <input class="sa-input" formControlName="fullName" placeholder="e.g. David Mwangi">\r
        <div class="sa-error" *ngIf="registerForm.get('fullName')?.invalid && registerForm.get('fullName')?.touched">\r
          Full Name is required.\r
        </div>\r
      </div>\r
\r
      <div class="form-row form-row--half">\r
        <div class="form-group">\r
          <label class="sa-label">Email Address</label>\r
          <input class="sa-input" formControlName="email" placeholder="e.g. david@school.ac.tz">\r
          <div class="sa-error" *ngIf="registerForm.get('email')?.invalid && registerForm.get('email')?.touched">\r
            Please enter a valid email address.\r
          </div>\r
        </div>\r
        <div class="form-group">\r
          <label class="sa-label">Phone Number</label>\r
          <input class="sa-input" formControlName="phone" placeholder="e.g. +255 712 345 678">\r
          <div class="sa-error" *ngIf="registerForm.get('phone')?.invalid && registerForm.get('phone')?.touched">\r
            Phone Number is required.\r
          </div>\r
        </div>\r
      </div>\r
\r
      <div class="form-row form-row--half">\r
        <div class="form-group">\r
          <label class="sa-label">Password</label>\r
          <div class="input-with-toggle">\r
            <input [type]="showPassword() ? 'text' : 'password'" class="sa-input" formControlName="password" placeholder="Create robust password">\r
            <button type="button" class="toggle-password" (click)="togglePassword('password')" aria-label="Toggle password visibility">\r
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
          <div class="sa-error" *ngIf="registerForm.get('password')?.invalid && registerForm.get('password')?.touched">\r
            Password must be at least 8 characters.\r
          </div>\r
        </div>\r
        <div class="form-group">\r
          <label class="sa-label">Confirm Password</label>\r
          <div class="input-with-toggle">\r
            <input [type]="showConfirmPassword() ? 'text' : 'password'" class="sa-input" formControlName="confirmPassword" placeholder="Repeat password">\r
            <button type="button" class="toggle-password" (click)="togglePassword('confirm')" aria-label="Toggle confirm password visibility">\r
              <svg *ngIf="!showConfirmPassword()" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">\r
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>\r
                <circle cx="12" cy="12" r="3"></circle>\r
              </svg>\r
              <svg *ngIf="showConfirmPassword()" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">\r
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>\r
                <line x1="1" y1="1" x2="23" y2="23"></line>\r
              </svg>\r
            </button>\r
          </div>\r
          <div class="sa-error" *ngIf="registerForm.get('confirmPassword')?.errors?.['passwordMismatch'] && registerForm.get('confirmPassword')?.touched">\r
            Passwords do not match.\r
          </div>\r
        </div>\r
      </div>\r
\r
      <div class="form-row form-row--half">\r
        <div class="form-group">\r
          <label class="sa-label">Select School</label>\r
          <select class="sa-select" formControlName="school">\r
            <option value="" disabled>e.g. Sync Academy Dar es Sala...</option>\r
            <option *ngFor="let school of schoolOptions" [value]="school">{{ school }}</option>\r
          </select>\r
          <div class="sa-error" *ngIf="registerForm.get('school')?.invalid && registerForm.get('school')?.touched">\r
            Please select a school.\r
          </div>\r
        </div>\r
        <div class="form-group">\r
          <label class="sa-label">Your School Role</label>\r
          <select class="sa-select" formControlName="role">\r
            <option value="" disabled>Select role</option>\r
            <option *ngFor="let role of roleOptions" [value]="role">{{ role }}</option>\r
          </select>\r
          <div class="sa-error" *ngIf="registerForm.get('role')?.invalid && registerForm.get('role')?.touched">\r
            Please select a role.\r
          </div>\r
        </div>\r
      </div>\r
\r
      <label class="checkbox-label">\r
        <input type="checkbox" formControlName="terms">\r
        <span class="checkmark"></span>\r
        I agree to the Terms of Service and Privacy Policy\r
      </label>\r
      <div class="sa-error" *ngIf="registerForm.get('terms')?.invalid && registerForm.get('terms')?.touched" style="margin-top: 4px;">\r
        You must agree to the terms to register.\r
      </div>\r
\r
      <button type="submit" class="sa-btn sa-btn--primary btn-submit" [disabled]="registerForm.invalid">\r
        Create Account\r
      </button>\r
    </form>\r
\r
    <p class="register__switch">\r
      Already have an account? <a routerLink="/auth/login">Sign In</a>\r
    </p>\r
  </div>\r
</app-auth-layout>\r
\r
`, styles: ['/* src/app/features/auth/pages/register/register.page.scss */\n:root {\n  --sa-primary: #E87E24;\n  --sa-primary-hover: #D06E1A;\n  --sa-sidebar-bg: #1E293B;\n  --sa-body-bg: #F8F9FA;\n  --sa-text-primary: #111827;\n  --sa-text-secondary: #6B7280;\n  --sa-input-border: #D1D5DB;\n  --sa-success: #10B981;\n  --sa-error: #EF4444;\n  --sa-radius: 8px;\n  --sa-font:\n    Inter,\n    -apple-system,\n    BlinkMacSystemFont,\n    Segoe UI,\n    Roboto,\n    sans-serif;\n}\n.register {\n  width: 100%;\n  max-width: 600px;\n  margin: 0 auto;\n}\n.register__header {\n  margin-top: 24px;\n}\n.register__header h1 {\n  font-size: 1.75rem;\n  font-weight: 700;\n  margin-bottom: 8px;\n  color: #111827;\n}\n.register__header p {\n  color: #6B7280;\n  margin-bottom: 32px;\n  font-size: 1rem;\n  line-height: 1.5;\n}\n.register__form {\n  display: flex;\n  flex-direction: column;\n}\n.form-group {\n  margin-bottom: 20px;\n}\n.form-row--half {\n  display: grid;\n  grid-template-columns: 1fr 1fr;\n  gap: 16px;\n}\n@media (max-width: 767px) {\n  .form-row--half {\n    grid-template-columns: 1fr;\n    gap: 0;\n  }\n}\n.input-with-toggle {\n  position: relative;\n  display: flex;\n  align-items: center;\n}\n.input-with-toggle .sa-input {\n  width: 100%;\n  padding-right: 48px;\n}\n.input-with-toggle .toggle-password {\n  position: absolute;\n  right: 12px;\n  background: transparent;\n  border: none;\n  cursor: pointer;\n  color: #6B7280;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  padding: 4px;\n  transition: color 0.2s ease;\n}\n.input-with-toggle .toggle-password:hover {\n  color: #111827;\n}\n.checkbox-label {\n  display: flex;\n  align-items: center;\n  gap: 8px;\n  cursor: pointer;\n  font-size: 0.875rem;\n  color: #111827;\n  position: relative;\n  -webkit-user-select: none;\n  user-select: none;\n  margin-top: 8px;\n}\n.checkbox-label input {\n  position: absolute;\n  opacity: 0;\n  cursor: pointer;\n  height: 0;\n  width: 0;\n}\n.checkbox-label input:checked ~ .checkmark {\n  background-color: #E87E24;\n  border-color: #E87E24;\n}\n.checkbox-label input:checked ~ .checkmark:after {\n  display: block;\n}\n.checkbox-label .checkmark {\n  height: 16px;\n  width: 16px;\n  background-color: #fff;\n  border: 1px solid #D1D5DB;\n  border-radius: 4px;\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  flex-shrink: 0;\n}\n.checkbox-label .checkmark:after {\n  content: "";\n  display: none;\n  width: 4px;\n  height: 8px;\n  border: solid white;\n  border-width: 0 2px 2px 0;\n  transform: rotate(45deg);\n  margin-bottom: 2px;\n}\n.btn-submit {\n  margin-top: 24px;\n}\n.register__switch {\n  text-align: center;\n  font-size: 0.9375rem;\n  color: #6B7280;\n  margin-top: 16px;\n}\n.register__switch a {\n  color: #E87E24;\n  font-weight: 500;\n  text-decoration: none;\n}\n.register__switch a:hover {\n  color: #D06E1A;\n  text-decoration: underline;\n}\n/*# sourceMappingURL=register.page.css.map */\n'] }]
  }], () => [{ type: FormBuilder }], null);
})();
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && \u0275setClassDebugInfo(RegisterPage, { className: "RegisterPage", filePath: "src/app/features/auth/pages/register/register.page.ts", lineNumber: 50 });
})();
export {
  RegisterPage,
  matchPasswordValidator
};
//# sourceMappingURL=chunk-3KGXQSHX.js.map
