import "./chunk-QHQP2P2Z.js";

// src/app/features/auth/auth.routes.ts
var AUTH_ROUTES = [
  {
    path: "login",
    loadComponent: () => import("./chunk-3NFOZNKT.js").then((m) => m.LoginPage)
  },
  {
    path: "register",
    loadComponent: () => import("./chunk-3KGXQSHX.js").then((m) => m.RegisterPage)
  },
  {
    path: "",
    redirectTo: "login",
    pathMatch: "full"
  }
];
export {
  AUTH_ROUTES
};
//# sourceMappingURL=chunk-4FQFGUVQ.js.map
