import {
  getHourCycle,
  getLocalizedDateTime,
  getLocalizedTime,
  parseDate
} from "./chunk-MPWPLHAX.js";
import {
  addEventListener,
  componentOnReady
} from "./chunk-ZLISAISA.js";
import "./chunk-76LRAEET.js";
import {
  createColorClasses
} from "./chunk-HXIHL5AX.js";
import {
  getIonMode
} from "./chunk-LRIQZPX3.js";
import {
  Host,
  getElement,
  h,
  printIonError,
  registerInstance
} from "./chunk-6HBB4VHM.js";
import {
  __async
} from "./chunk-QHQP2P2Z.js";

// ../../node_modules/@ionic/core/dist/esm/ion-datetime-button.entry.js
var datetimeButtonIosCss = () => `:host{display:-ms-flexbox;display:flex;-ms-flex-wrap:wrap;flex-wrap:wrap;-ms-flex-align:center;align-items:center;-ms-flex-pack:center;justify-content:center}:host button{border-radius:8px;-webkit-margin-start:2px;margin-inline-start:2px;-webkit-margin-end:2px;margin-inline-end:2px;margin-top:0px;margin-bottom:0px;position:relative;-webkit-transition:150ms color ease-in-out;transition:150ms color ease-in-out;border:none;background:var(--ion-color-step-300, var(--ion-background-color-step-300, #edeef0));color:var(--ion-text-color, #000);font-family:inherit;font-size:1rem;cursor:pointer;overflow:hidden;-webkit-appearance:none;-moz-appearance:none;appearance:none}:host(.time-active) #time-button,:host(.date-active) #date-button{color:var(--ion-color-base)}:host(.datetime-button-disabled){pointer-events:none}:host(.datetime-button-disabled) button{opacity:0.4}:host button{-webkit-padding-start:13px;padding-inline-start:13px;-webkit-padding-end:13px;padding-inline-end:13px;padding-top:7px;padding-bottom:7px}:host button.ion-activated{color:var(--ion-color-step-600, var(--ion-text-color-step-400, #666666))}`;
var datetimeButtonMdCss = () => `:host{display:-ms-flexbox;display:flex;-ms-flex-wrap:wrap;flex-wrap:wrap;-ms-flex-align:center;align-items:center;-ms-flex-pack:center;justify-content:center}:host button{border-radius:8px;-webkit-margin-start:2px;margin-inline-start:2px;-webkit-margin-end:2px;margin-inline-end:2px;margin-top:0px;margin-bottom:0px;position:relative;-webkit-transition:150ms color ease-in-out;transition:150ms color ease-in-out;border:none;background:var(--ion-color-step-300, var(--ion-background-color-step-300, #edeef0));color:var(--ion-text-color, #000);font-family:inherit;font-size:1rem;cursor:pointer;overflow:hidden;-webkit-appearance:none;-moz-appearance:none;appearance:none}:host(.time-active) #time-button,:host(.date-active) #date-button{color:var(--ion-color-base)}:host(.datetime-button-disabled){pointer-events:none}:host(.datetime-button-disabled) button{opacity:0.4}:host button{-webkit-padding-start:12px;padding-inline-start:12px;-webkit-padding-end:12px;padding-inline-end:12px;padding-top:6px;padding-bottom:6px}`;
var DatetimeButton = class {
  constructor(hostRef) {
    registerInstance(this, hostRef);
    this.datetimeEl = null;
    this.overlayEl = null;
    this.datetimePresentation = "date-time";
    this.datetimeActive = false;
    this.color = "primary";
    this.disabled = false;
    this.getParsedDateValues = (value) => {
      if (value === void 0 || value === null) {
        return [];
      }
      if (Array.isArray(value)) {
        return value;
      }
      return [value];
    };
    this.setDateTimeText = () => __async(this, null, function* () {
      var _a, _b, _c, _d, _e;
      const { datetimeEl, datetimePresentation } = this;
      if (!datetimeEl) {
        return;
      }
      const { value, locale, formatOptions, hourCycle, preferWheel, multiple, titleSelectedDatesFormatter } = datetimeEl;
      const parsedValues = this.getParsedDateValues(value);
      const parsedDatetimes = parsedValues.length > 0 ? parseDate(parsedValues) : [yield datetimeEl.getDefaultPart()];
      if (!parsedDatetimes) {
        return;
      }
      const firstParsedDatetime = parsedDatetimes[0];
      const computedHourCycle = getHourCycle(locale, hourCycle);
      this.dateText = this.timeText = void 0;
      switch (datetimePresentation) {
        case "date-time":
        case "time-date":
          const dateText = getLocalizedDateTime(locale, firstParsedDatetime, (_a = formatOptions === null || formatOptions === void 0 ? void 0 : formatOptions.date) !== null && _a !== void 0 ? _a : { month: "short", day: "numeric", year: "numeric" });
          const timeText = getLocalizedTime(locale, firstParsedDatetime, computedHourCycle, formatOptions === null || formatOptions === void 0 ? void 0 : formatOptions.time);
          if (preferWheel) {
            this.dateText = `${dateText} ${timeText}`;
          } else {
            this.dateText = dateText;
            this.timeText = timeText;
          }
          break;
        case "date":
          if (multiple && parsedValues.length !== 1) {
            let headerText = `${parsedValues.length} days`;
            if (titleSelectedDatesFormatter !== void 0) {
              try {
                headerText = titleSelectedDatesFormatter(parsedValues);
              } catch (e) {
                printIonError("[ion-datetime-button] - Exception in provided `titleSelectedDatesFormatter`:", e);
              }
            }
            this.dateText = headerText;
          } else {
            this.dateText = getLocalizedDateTime(locale, firstParsedDatetime, (_b = formatOptions === null || formatOptions === void 0 ? void 0 : formatOptions.date) !== null && _b !== void 0 ? _b : { month: "short", day: "numeric", year: "numeric" });
          }
          break;
        case "time":
          this.timeText = getLocalizedTime(locale, firstParsedDatetime, computedHourCycle, formatOptions === null || formatOptions === void 0 ? void 0 : formatOptions.time);
          break;
        case "month-year":
          this.dateText = getLocalizedDateTime(locale, firstParsedDatetime, (_c = formatOptions === null || formatOptions === void 0 ? void 0 : formatOptions.date) !== null && _c !== void 0 ? _c : { month: "long", year: "numeric" });
          break;
        case "month":
          this.dateText = getLocalizedDateTime(locale, firstParsedDatetime, (_d = formatOptions === null || formatOptions === void 0 ? void 0 : formatOptions.time) !== null && _d !== void 0 ? _d : { month: "long" });
          break;
        case "year":
          this.dateText = getLocalizedDateTime(locale, firstParsedDatetime, (_e = formatOptions === null || formatOptions === void 0 ? void 0 : formatOptions.time) !== null && _e !== void 0 ? _e : { year: "numeric" });
          break;
      }
    });
    this.waitForDatetimeChanges = () => __async(this, null, function* () {
      const { datetimeEl } = this;
      if (!datetimeEl) {
        return Promise.resolve();
      }
      return new Promise((resolve) => {
        addEventListener(datetimeEl, "ionRender", resolve, { once: true });
      });
    });
    this.handleDateClick = (ev) => __async(this, null, function* () {
      const { datetimeEl, datetimePresentation } = this;
      if (!datetimeEl) {
        return;
      }
      let needsPresentationChange = false;
      switch (datetimePresentation) {
        case "date-time":
        case "time-date":
          const needsChange = datetimeEl.presentation !== "date";
          if (!datetimeEl.preferWheel && needsChange) {
            datetimeEl.presentation = "date";
            needsPresentationChange = true;
          }
          break;
      }
      this.selectedButton = "date";
      this.presentOverlay(ev, needsPresentationChange, this.dateTargetEl);
    });
    this.handleTimeClick = (ev) => {
      const { datetimeEl, datetimePresentation } = this;
      if (!datetimeEl) {
        return;
      }
      let needsPresentationChange = false;
      switch (datetimePresentation) {
        case "date-time":
        case "time-date":
          const needsChange = datetimeEl.presentation !== "time";
          if (needsChange) {
            datetimeEl.presentation = "time";
            needsPresentationChange = true;
          }
          break;
      }
      this.selectedButton = "time";
      this.presentOverlay(ev, needsPresentationChange, this.timeTargetEl);
    };
    this.presentOverlay = (ev, needsPresentationChange, triggerEl) => __async(this, null, function* () {
      const { overlayEl } = this;
      if (!overlayEl) {
        return;
      }
      if (overlayEl.tagName === "ION-POPOVER") {
        if (needsPresentationChange) {
          yield this.waitForDatetimeChanges();
        }
        overlayEl.present(Object.assign(Object.assign({}, ev), { detail: {
          ionShadowTarget: triggerEl
        } }));
      } else {
        overlayEl.present();
      }
    });
  }
  componentWillLoad() {
    return __async(this, null, function* () {
      const { datetime } = this;
      if (!datetime) {
        printIonError("[ion-datetime-button] - An ID associated with an ion-datetime instance is required to function properly.", this.el);
        return;
      }
      const datetimeEl = this.datetimeEl = document.getElementById(datetime);
      if (!datetimeEl) {
        printIonError(`[ion-datetime-button] - No ion-datetime instance found for ID '${datetime}'.`, this.el);
        return;
      }
      if (datetimeEl.tagName !== "ION-DATETIME") {
        printIonError(`[ion-datetime-button] - Expected an ion-datetime instance for ID '${datetime}' but received '${datetimeEl.tagName.toLowerCase()}' instead.`, datetimeEl);
        return;
      }
      const io = new IntersectionObserver((entries) => {
        const ev = entries[0];
        this.datetimeActive = ev.isIntersecting;
      }, {
        threshold: 0.01
      });
      io.observe(datetimeEl);
      const overlayEl = this.overlayEl = datetimeEl.closest("ion-modal, ion-popover");
      if (overlayEl) {
        overlayEl.classList.add("ion-datetime-button-overlay");
      }
      componentOnReady(datetimeEl, () => {
        const datetimePresentation = this.datetimePresentation = datetimeEl.presentation || "date-time";
        this.setDateTimeText();
        addEventListener(datetimeEl, "ionValueChange", this.setDateTimeText);
        switch (datetimePresentation) {
          case "date-time":
          case "date":
          case "month-year":
          case "month":
          case "year":
            this.selectedButton = "date";
            break;
          case "time-date":
          case "time":
            this.selectedButton = "time";
            break;
        }
      });
    });
  }
  render() {
    const { color, dateText, timeText, selectedButton, datetimeActive, disabled } = this;
    const mode = getIonMode(this);
    return h(Host, { key: "c28e5e428111f18eaceb030dca8aba5579867eaa", class: createColorClasses(color, {
      [mode]: true,
      [`${selectedButton}-active`]: datetimeActive,
      ["datetime-button-disabled"]: disabled
    }) }, dateText && h("button", { key: "a08f41b3150ef7171d0f1d9b3d69b51be67b7b84", class: "ion-activatable", id: "date-button", "aria-expanded": datetimeActive ? "true" : "false", onClick: this.handleDateClick, disabled, part: "native", ref: (el) => this.dateTargetEl = el }, h("slot", { key: "35ee68ca1cea59f03e1b59b72606e618141c8e1f", name: "date-target" }, dateText), mode === "md" && h("ion-ripple-effect", { key: "4be53227aaf0acd20e8ebbff9f645140e8a96f33" })), timeText && h("button", { key: "ab500f9b78f8c194180073eaf7325041adbd02f7", class: "ion-activatable", id: "time-button", "aria-expanded": datetimeActive ? "true" : "false", onClick: this.handleTimeClick, disabled, part: "native", ref: (el) => this.timeTargetEl = el }, h("slot", { key: "5822486dfdedba6c071a0f5233cc06f8321a1f5d", name: "time-target" }, timeText), mode === "md" && h("ion-ripple-effect", { key: "054a4acb811a98cc6d9bb6a3cf51232a1f09b0ea" })));
  }
  get el() {
    return getElement(this);
  }
};
DatetimeButton.style = {
  ios: datetimeButtonIosCss(),
  md: datetimeButtonMdCss()
};
export {
  DatetimeButton as ion_datetime_button
};
//# sourceMappingURL=ion-datetime-button.entry-GSTAWXSV.js.map
