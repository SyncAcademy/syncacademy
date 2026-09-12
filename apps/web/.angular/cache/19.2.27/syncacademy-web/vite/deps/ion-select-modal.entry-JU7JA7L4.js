import {
  safeCall
} from "./chunk-UZAJWERZ.js";
import "./chunk-PDAAPJ33.js";
import "./chunk-BQY6VNDM.js";
import "./chunk-K7HJBWQB.js";
import {
  getClassMap
} from "./chunk-BZ3ZQXVS.js";
import {
  getIonMode
} from "./chunk-QTCPVNPG.js";
import "./chunk-OWX7YSRF.js";
import "./chunk-S7SX67A6.js";
import "./chunk-AM533ZC5.js";
import {
  Host,
  forceUpdate,
  getElement,
  h,
  registerInstance
} from "./chunk-B2RZHD3E.js";
import "./chunk-QHQP2P2Z.js";

// node_modules/@ionic/core/dist/esm/ion-select-modal.entry.js
var ionicSelectModalMdCss = () => `.sc-ion-select-modal-ionic-h{height:100%}ion-list.sc-ion-select-modal-ionic ion-radio.sc-ion-select-modal-ionic::part(container),ion-list.sc-ion-select-modal-ionic ion-radio.sc-ion-select-modal-ionic [part~="container"]{display:none}ion-list.sc-ion-select-modal-ionic ion-radio.sc-ion-select-modal-ionic::part(label),ion-list.sc-ion-select-modal-ionic ion-radio.sc-ion-select-modal-ionic [part~="label"]{margin-left:0;margin-right:0;margin-top:0;margin-bottom:0}ion-item.sc-ion-select-modal-ionic{--inner-border-width:0}.item-radio-checked.sc-ion-select-modal-ionic{--background:rgba(var(--ion-color-primary-rgb, 0, 84, 233), 0.08);--background-focused:var(--ion-color-primary, #0054e9);--background-focused-opacity:0.2;--background-hover:var(--ion-color-primary, #0054e9);--background-hover-opacity:0.12}.item-checkbox-checked.sc-ion-select-modal-ionic{--background-activated:var(--ion-item-color, var(--ion-text-color, #000));--background-focused:var(--ion-item-color, var(--ion-text-color, #000));--background-hover:var(--ion-item-color, var(--ion-text-color, #000));--color:var(--ion-color-primary, #0054e9)}`;
var selectModalIosCss = () => `.sc-ion-select-modal-ios-h{height:100%}ion-item.sc-ion-select-modal-ios{--inner-padding-end:0}ion-radio.sc-ion-select-modal-ios::after{bottom:0;position:absolute;width:calc(100% - 0.9375rem - 16px);border-width:0px 0px 0.55px 0px;border-style:solid;border-color:var(--ion-item-border-color, var(--ion-border-color, var(--ion-color-step-250, var(--ion-background-color-step-250, #c8c7cc))));content:""}ion-radio.sc-ion-select-modal-ios::after{inset-inline-start:calc(0.9375rem + 16px)}`;
var selectModalMdCss = () => `.sc-ion-select-modal-md-h{height:100%}ion-list.sc-ion-select-modal-md ion-radio.sc-ion-select-modal-md::part(container),ion-list.sc-ion-select-modal-md ion-radio.sc-ion-select-modal-md [part~="container"]{display:none}ion-list.sc-ion-select-modal-md ion-radio.sc-ion-select-modal-md::part(label),ion-list.sc-ion-select-modal-md ion-radio.sc-ion-select-modal-md [part~="label"]{margin-left:0;margin-right:0;margin-top:0;margin-bottom:0}ion-item.sc-ion-select-modal-md{--inner-border-width:0}.item-radio-checked.sc-ion-select-modal-md{--background:rgba(var(--ion-color-primary-rgb, 0, 84, 233), 0.08);--background-focused:var(--ion-color-primary, #0054e9);--background-focused-opacity:0.2;--background-hover:var(--ion-color-primary, #0054e9);--background-hover-opacity:0.12}.item-checkbox-checked.sc-ion-select-modal-md{--background-activated:var(--ion-item-color, var(--ion-text-color, #000));--background-focused:var(--ion-item-color, var(--ion-text-color, #000));--background-hover:var(--ion-item-color, var(--ion-text-color, #000));--color:var(--ion-color-primary, #0054e9)}`;
var SelectModal = class {
  constructor(hostRef) {
    registerInstance(this, hostRef);
    this.pendingEnterTarget = null;
    this.cancelText = "Close";
    this.options = [];
  }
  closeModal() {
    const modal = this.el.closest("ion-modal");
    if (modal) {
      modal.dismiss();
    }
  }
  findOptionFromEvent(ev) {
    const {
      options
    } = this;
    return options.find((o) => o.value === ev.target.value);
  }
  getValues(ev) {
    const {
      multiple,
      options
    } = this;
    if (multiple) {
      return options.filter((o) => o.checked).map((o) => o.value);
    }
    const option = ev ? this.findOptionFromEvent(ev) : null;
    return option ? option.value : void 0;
  }
  callOptionHandler(ev) {
    const option = this.findOptionFromEvent(ev);
    const values = this.getValues(ev);
    if (option === null || option === void 0 ? void 0 : option.handler) {
      safeCall(option.handler, values);
    }
  }
  setChecked(ev) {
    const {
      multiple
    } = this;
    const option = this.findOptionFromEvent(ev);
    if (multiple && option) {
      option.checked = ev.detail.checked;
    }
  }
  renderRadioOptions() {
    const checked = this.options.filter((o) => o.checked).map((o) => o.value)[0];
    return h("ion-radio-group", {
      value: checked,
      onIonChange: (ev) => this.callOptionHandler(ev)
    }, this.options.map((option) => h("ion-item", {
      lines: "none",
      class: Object.assign({
        // TODO FW-4784
        "item-radio-checked": option.value === checked
      }, getClassMap(option.cssClass))
    }, h("ion-radio", {
      value: option.value,
      disabled: option.disabled,
      justify: "start",
      labelPlacement: "end",
      onClick: () => this.closeModal(),
      onKeyDown: (ev) => {
        if (ev.key === "Enter" && !ev.repeat) {
          this.pendingEnterTarget = ev.currentTarget;
        }
      },
      onKeyUp: (ev) => {
        if (ev.key === " ") {
          this.closeModal();
        } else if (ev.key === "Enter") {
          const shouldClose = this.pendingEnterTarget === ev.currentTarget;
          this.pendingEnterTarget = null;
          if (shouldClose) {
            this.closeModal();
          }
        }
      }
    }, option.text))));
  }
  renderCheckboxOptions() {
    return this.options.map((option) => h("ion-item", {
      class: Object.assign({
        // TODO FW-4784
        "item-checkbox-checked": option.checked
      }, getClassMap(option.cssClass))
    }, h("ion-checkbox", {
      value: option.value,
      disabled: option.disabled,
      checked: option.checked,
      justify: "start",
      labelPlacement: "end",
      onIonChange: (ev) => {
        this.setChecked(ev);
        this.callOptionHandler(ev);
        forceUpdate(this);
      }
    }, option.text)));
  }
  render() {
    return h(Host, {
      key: "fda0bf6f93cd5ec9f3c64f88a52de849e0e140a2",
      class: getIonMode(this)
    }, h("ion-header", {
      key: "27c0b17175a53db9ff159feeeb96451a3f011dab"
    }, h("ion-toolbar", {
      key: "91a4155ebc317fbc9f1bb3e26a7e94754b953c9b"
    }, this.header !== void 0 && h("ion-title", {
      key: "f6dae8e4e381f322cc90efefd9bb6ef81d4d2f3e"
    }, this.header), h("ion-buttons", {
      key: "e7760532fb2e7e7385ed6e62097d92d96ff20148",
      slot: "end"
    }, h("ion-button", {
      key: "4999b6fc46cba138186546dca67b7950855e6fb7",
      onClick: () => this.closeModal()
    }, this.cancelText)))), h("ion-content", {
      key: "c73f80a4bc25b9061ea65cf11e5d811c1a4d8704"
    }, h("ion-list", {
      key: "b21905d15b36ad5eb45845e768918d2763cf48b1"
    }, this.multiple === true ? this.renderCheckboxOptions() : this.renderRadioOptions())));
  }
  get el() {
    return getElement(this);
  }
};
SelectModal.style = {
  ionic: ionicSelectModalMdCss(),
  ios: selectModalIosCss(),
  md: selectModalMdCss()
};
export {
  SelectModal as ion_select_modal
};
/*! Bundled license information:

@ionic/core/dist/esm/ion-select-modal.entry.js:
  (*!
   * (C) Ionic http://ionicframework.com - MIT License
   *)
*/
//# sourceMappingURL=ion-select-modal.entry-JU7JA7L4.js.map
