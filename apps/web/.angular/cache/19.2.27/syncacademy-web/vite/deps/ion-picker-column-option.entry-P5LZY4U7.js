import {
  inheritAttributes
} from "./chunk-BQY6VNDM.js";
import "./chunk-K7HJBWQB.js";
import {
  createColorClasses
} from "./chunk-BZ3ZQXVS.js";
import {
  getIonMode
} from "./chunk-QTCPVNPG.js";
import {
  Host,
  getElement,
  h,
  registerInstance
} from "./chunk-B2RZHD3E.js";
import "./chunk-QHQP2P2Z.js";

// node_modules/@ionic/core/dist/esm/ion-picker-column-option.entry.js
var pickerColumnOptionIosCss = () => `.picker-column-option-button{padding-left:0;padding-right:0;padding-top:0;padding-bottom:0;margin-left:0;margin-right:0;margin-top:0;margin-bottom:0;width:100%;height:34px;border:0px;outline:none;background:transparent;color:inherit;font-family:var(--ion-font-family, inherit);font-size:inherit;line-height:34px;text-align:inherit;text-overflow:ellipsis;white-space:nowrap;cursor:pointer;overflow:hidden}:host(.option-disabled){opacity:0.4}:host(.option-disabled) .picker-column-option-button{cursor:default}`;
var pickerColumnOptionMdCss = () => `.picker-column-option-button{padding-left:0;padding-right:0;padding-top:0;padding-bottom:0;margin-left:0;margin-right:0;margin-top:0;margin-bottom:0;width:100%;height:34px;border:0px;outline:none;background:transparent;color:inherit;font-family:var(--ion-font-family, inherit);font-size:inherit;line-height:34px;text-align:inherit;text-overflow:ellipsis;white-space:nowrap;cursor:pointer;overflow:hidden}:host(.option-disabled){opacity:0.4}:host(.option-disabled) .picker-column-option-button{cursor:default}:host(.option-active),:host([part~=active]){color:var(--ion-color-base)}`;
var PickerColumnOption = class {
  constructor(hostRef) {
    registerInstance(this, hostRef);
    this.pickerColumn = null;
    this.ariaLabel = null;
    this.disabled = false;
    this.color = "primary";
  }
  /**
   * The aria-label of the option has changed after the
   * first render and needs to be updated within the component.
   *
   * @param ariaLbl The new aria-label value.
   */
  onAriaLabelChange(ariaLbl) {
    this.ariaLabel = ariaLbl;
  }
  componentWillLoad() {
    const inheritedAttributes = inheritAttributes(this.el, ["aria-label"]);
    this.ariaLabel = inheritedAttributes["aria-label"] || null;
  }
  connectedCallback() {
    this.pickerColumn = this.el.closest("ion-picker-column");
  }
  disconnectedCallback() {
    this.pickerColumn = null;
  }
  /**
   * The column options can load at any time
   * so the options needs to tell the
   * parent picker column when it is loaded
   * so the picker column can ensure it is
   * centered in the view.
   *
   * We intentionally run this for every
   * option. If we only ran this from
   * the selected option then if the newly
   * loaded options were not selected then
   * scrollActiveItemIntoView would not be called.
   */
  componentDidLoad() {
    const {
      pickerColumn
    } = this;
    if (pickerColumn !== null) {
      pickerColumn.scrollActiveItemIntoView();
    }
  }
  /**
   * When an option is clicked, update the
   * parent picker column value. This
   * component will handle centering the option
   * in the column view.
   */
  onClick() {
    const {
      pickerColumn
    } = this;
    if (pickerColumn !== null) {
      pickerColumn.setValue(this.value);
    }
  }
  render() {
    const {
      color,
      disabled,
      ariaLabel
    } = this;
    const mode = getIonMode(this);
    return h(Host, {
      key: "c45a1c14a351bf57d7113671164852349be5aa8a",
      class: createColorClasses(color, {
        [mode]: true,
        ["option-disabled"]: disabled
      })
    }, h("div", {
      key: "824930b658c6e3fb493ac4c6c2451d38c6bc4829",
      class: "picker-column-option-button",
      role: "button",
      "aria-label": ariaLabel,
      onClick: () => this.onClick()
    }, h("slot", {
      key: "019df4dcf46e629bdbebcd46ed3ab29669feab27"
    })));
  }
  get el() {
    return getElement(this);
  }
  static get watchers() {
    return {
      "aria-label": [{
        "onAriaLabelChange": 0
      }]
    };
  }
};
PickerColumnOption.style = {
  ios: pickerColumnOptionIosCss(),
  md: pickerColumnOptionMdCss()
};
export {
  PickerColumnOption as ion_picker_column_option
};
/*! Bundled license information:

@ionic/core/dist/esm/ion-picker-column-option.entry.js:
  (*!
   * (C) Ionic http://ionicframework.com - MIT License
   *)
*/
//# sourceMappingURL=ion-picker-column-option.entry-P5LZY4U7.js.map
