import {
  provideIonicAngular
} from "./chunk-FT6D5ZZE.js";
import "./chunk-VOG4NQYV.js";
import "./chunk-4I6ASPBG.js";
import "./chunk-JZPTM7M7.js";
import {
  RouterOutlet,
  bootstrapApplication,
  provideHttpClient,
  provideRouter
} from "./chunk-GIJX6M6U.js";
import {
  Component,
  setClassMetadata,
  ɵsetClassDebugInfo,
  ɵɵdefineComponent,
  ɵɵelement
} from "./chunk-3IPAKGA7.js";
import "./chunk-QUBSOQB2.js";
import "./chunk-4KHAQK6T.js";
import "./chunk-HL23XIE3.js";
import "./chunk-FSRM5CKM.js";
import "./chunk-OZMYMBYB.js";
import "./chunk-BWHC4MHB.js";
import "./chunk-BFTKRJPC.js";
import "./chunk-NTCHRBFX.js";
import "./chunk-4DIQB3FT.js";
import "./chunk-YETX66NL.js";
import "./chunk-QHQP2P2Z.js";

// src/app/app.component.ts
var AppComponent = class _AppComponent {
  static {
    this.\u0275fac = function AppComponent_Factory(__ngFactoryType__) {
      return new (__ngFactoryType__ || _AppComponent)();
    };
  }
  static {
    this.\u0275cmp = /* @__PURE__ */ \u0275\u0275defineComponent({ type: _AppComponent, selectors: [["app-root"]], decls: 1, vars: 0, template: function AppComponent_Template(rf, ctx) {
      if (rf & 1) {
        \u0275\u0275element(0, "router-outlet");
      }
    }, dependencies: [RouterOutlet], encapsulation: 2 });
  }
};
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && setClassMetadata(AppComponent, [{
    type: Component,
    args: [{
      selector: "app-root",
      template: `<router-outlet></router-outlet>`,
      standalone: true,
      imports: [RouterOutlet]
    }]
  }], null, null);
})();
(() => {
  (typeof ngDevMode === "undefined" || ngDevMode) && \u0275setClassDebugInfo(AppComponent, { className: "AppComponent", filePath: "src/app/app.component.ts", lineNumber: 10 });
})();

// src/app/app.routes.ts
var routes = [
  {
    path: "",
    loadComponent: () => import("./chunk-UWIHHQJW.js").then((m) => m.LandingPage)
  },
  {
    path: "auth",
    loadChildren: () => import("./chunk-4FQFGUVQ.js").then((m) => m.AUTH_ROUTES)
  },
  {
    path: "dashboard",
    loadChildren: () => import("./chunk-PF2FOCJT.js").then((m) => m.DASHBOARD_ROUTES)
  },
  { path: "**", redirectTo: "" }
];

// src/main.ts
bootstrapApplication(AppComponent, {
  providers: [
    provideRouter(routes),
    provideIonicAngular({ mode: "md" }),
    provideHttpClient()
  ]
}).catch((err) => console.error(err));
//# sourceMappingURL=main.js.map
