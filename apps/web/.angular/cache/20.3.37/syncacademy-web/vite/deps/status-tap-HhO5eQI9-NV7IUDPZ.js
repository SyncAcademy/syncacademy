import {
  findClosestIonContent,
  scrollToTop
} from "./chunk-6FXANU3X.js";
import {
  componentOnReady
} from "./chunk-ZLISAISA.js";
import "./chunk-76LRAEET.js";
import {
  readTask,
  writeTask
} from "./chunk-6HBB4VHM.js";
import {
  __async
} from "./chunk-QHQP2P2Z.js";

// ../../node_modules/@ionic/core/dist/esm/status-tap-HhO5eQI9.js
var startStatusTap = () => {
  const win = window;
  win.addEventListener("statusTap", () => {
    readTask(() => {
      const width = win.innerWidth;
      const height = win.innerHeight;
      const el = document.elementFromPoint(width / 2, height / 2);
      if (!el) {
        return;
      }
      const contentEl = findClosestIonContent(el);
      if (contentEl) {
        new Promise((resolve) => componentOnReady(contentEl, resolve)).then(() => {
          writeTask(() => __async(null, null, function* () {
            contentEl.style.setProperty("--overflow", "hidden");
            yield scrollToTop(contentEl, 300);
            contentEl.style.removeProperty("--overflow");
          }));
        });
      }
    });
  });
};
export {
  startStatusTap
};
//# sourceMappingURL=status-tap-HhO5eQI9-NV7IUDPZ.js.map
