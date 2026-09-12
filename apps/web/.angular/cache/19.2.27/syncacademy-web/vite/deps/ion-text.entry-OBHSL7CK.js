import {
  createColorClasses
} from "./chunk-BZ3ZQXVS.js";
import {
  getIonMode
} from "./chunk-QTCPVNPG.js";
import {
  Host,
  h,
  registerInstance
} from "./chunk-B2RZHD3E.js";
import "./chunk-QHQP2P2Z.js";

// node_modules/@ionic/core/dist/esm/ion-text.entry.js
var textCss = () => `:host(.ion-color){color:var(--ion-color-base)}`;
var Text = class {
  constructor(hostRef) {
    registerInstance(this, hostRef);
  }
  render() {
    const mode = getIonMode(this);
    return h(Host, {
      key: "bfaa49d35f43b8036725ae8a322c716fc6e43bdf",
      class: createColorClasses(this.color, {
        [mode]: true
      })
    }, h("slot", {
      key: "c04880cd1935b42cbe60f58fd523b4d8a96072dc"
    }));
  }
};
Text.style = textCss();
export {
  Text as ion_text
};
/*! Bundled license information:

@ionic/core/dist/esm/ion-text.entry.js:
  (*!
   * (C) Ionic http://ionicframework.com - MIT License
   *)
*/
//# sourceMappingURL=ion-text.entry-OBHSL7CK.js.map
