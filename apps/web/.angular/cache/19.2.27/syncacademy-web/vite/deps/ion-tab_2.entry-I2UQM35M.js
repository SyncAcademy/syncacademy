import {
  attachComponent
} from "./chunk-PDAAPJ33.js";
import "./chunk-BQY6VNDM.js";
import "./chunk-K7HJBWQB.js";
import {
  Host,
  createEvent,
  getElement,
  h,
  printIonError,
  registerInstance
} from "./chunk-B2RZHD3E.js";
import {
  __async
} from "./chunk-QHQP2P2Z.js";

// node_modules/@ionic/core/dist/esm/ion-tab_2.entry.js
var tabCss = () => `:host(.tab-hidden){display:none !important}`;
var Tab = class {
  constructor(hostRef) {
    registerInstance(this, hostRef);
    this.active = false;
  }
  componentWillLoad() {
    return __async(this, null, function* () {
      if (this.active) {
        yield this.setActive();
      }
    });
  }
  /** Set the active component for the tab */
  setActive() {
    return __async(this, null, function* () {
      yield this.prepareLazyLoaded();
      this.active = true;
    });
  }
  changeActive(isActive) {
    if (isActive) {
      this.prepareLazyLoaded().catch((e) => {
        printIonError("[ion-tab] - Exception in prepareLazyLoaded:", e);
      });
    }
  }
  prepareLazyLoaded() {
    if (this.component == null) {
      return Promise.resolve(void 0);
    }
    if (this.loadPromise === void 0) {
      this.loadPromise = attachComponent(this.delegate, this.el, this.component, ["ion-page"]).catch((e) => {
        this.loadPromise = void 0;
        throw e;
      });
    }
    return this.loadPromise;
  }
  render() {
    const {
      tab,
      active,
      component
    } = this;
    return h(Host, {
      key: "c35c9f96ed3a73270b23f30d9e279dcad9032e28",
      role: "tabpanel",
      "aria-hidden": !active ? "true" : null,
      "aria-labelledby": `tab-button-${tab}`,
      class: {
        "ion-page": component === void 0,
        "tab-hidden": !active
      }
    }, h("slot", {
      key: "1c03523327e571f9ba140be0ccd6fe089e16a77a"
    }));
  }
  get el() {
    return getElement(this);
  }
  static get watchers() {
    return {
      "active": [{
        "changeActive": 0
      }]
    };
  }
};
Tab.style = tabCss();
var tabsCss = () => `:host{left:0;right:0;top:0;bottom:0;display:-ms-flexbox;display:flex;position:absolute;-ms-flex-direction:column;flex-direction:column;width:100%;height:100%;contain:layout size style;z-index:0}.tabs-inner{position:relative;-ms-flex:1;flex:1;contain:layout size style}`;
var Tabs = class {
  constructor(hostRef) {
    registerInstance(this, hostRef);
    this.ionNavWillLoad = createEvent(this, "ionNavWillLoad", 7);
    this.ionTabsWillChange = createEvent(this, "ionTabsWillChange", 3);
    this.ionTabsDidChange = createEvent(this, "ionTabsDidChange", 3);
    this.transitioning = false;
    this.useRouter = false;
    this.onTabClicked = (ev) => {
      const {
        href,
        tab
      } = ev.detail;
      if (this.useRouter && href !== void 0) {
        const router = document.querySelector("ion-router");
        if (router) {
          router.push(href);
        }
      } else {
        this.select(tab);
      }
    };
  }
  componentWillLoad() {
    return __async(this, null, function* () {
      if (!this.useRouter) {
        this.useRouter = (!!this.el.querySelector("ion-router-outlet") || !!document.querySelector("ion-router")) && !this.el.closest("[no-router]");
      }
      if (!this.useRouter) {
        const tabs = this.tabs;
        if (tabs.length > 0) {
          yield this.select(tabs[0]);
        }
      }
      this.ionNavWillLoad.emit();
    });
  }
  componentDidLoad() {
    this.updateTabBar();
  }
  componentDidUpdate() {
    this.updateTabBar();
  }
  updateTabBar() {
    const tabBar = this.el.querySelector("ion-tab-bar");
    if (!tabBar) {
      return;
    }
    const tab = this.selectedTab ? this.selectedTab.tab : void 0;
    if (tab === void 0) {
      return;
    }
    if (tabBar.selectedTab === tab) {
      return;
    }
    tabBar.selectedTab = tab;
  }
  /**
   * Select a tab by the value of its `tab` property or an element reference. This method is only available for vanilla JavaScript projects. The Angular, React, and Vue implementations of tabs are coupled to each framework's router.
   *
   * @param tab The tab instance to select. If passed a string, it should be the value of the tab's `tab` property.
   */
  select(tab) {
    return __async(this, null, function* () {
      const selectedTab = getTab(this.tabs, tab);
      if (!this.shouldSwitch(selectedTab)) {
        return false;
      }
      yield this.setActive(selectedTab);
      yield this.notifyRouter();
      this.tabSwitch();
      return true;
    });
  }
  /**
   * Get a specific tab by the value of its `tab` property or an element reference. This method is only available for vanilla JavaScript projects. The Angular, React, and Vue implementations of tabs are coupled to each framework's router.
   *
   * @param tab The tab instance to select. If passed a string, it should be the value of the tab's `tab` property.
   */
  getTab(tab) {
    return __async(this, null, function* () {
      return getTab(this.tabs, tab);
    });
  }
  /**
   * Get the currently selected tab. This method is only available for vanilla JavaScript projects. The Angular, React, and Vue implementations of tabs are coupled to each framework's router.
   */
  getSelected() {
    return Promise.resolve(this.selectedTab ? this.selectedTab.tab : void 0);
  }
  /** @internal */
  setRouteId(id) {
    return __async(this, null, function* () {
      const selectedTab = getTab(this.tabs, id);
      if (!this.shouldSwitch(selectedTab)) {
        return {
          changed: false,
          element: this.selectedTab
        };
      }
      yield this.setActive(selectedTab);
      return {
        changed: true,
        element: this.selectedTab,
        markVisible: () => this.tabSwitch()
      };
    });
  }
  /** @internal */
  getRouteId() {
    return __async(this, null, function* () {
      var _a;
      const tabId = (_a = this.selectedTab) === null || _a === void 0 ? void 0 : _a.tab;
      return tabId !== void 0 ? {
        id: tabId,
        element: this.selectedTab
      } : void 0;
    });
  }
  setActive(selectedTab) {
    if (this.transitioning) {
      return Promise.reject("transitioning already happening");
    }
    this.transitioning = true;
    this.leavingTab = this.selectedTab;
    this.selectedTab = selectedTab;
    this.ionTabsWillChange.emit({
      tab: selectedTab.tab
    });
    selectedTab.active = true;
    this.updateTabBar();
    return Promise.resolve();
  }
  tabSwitch() {
    const selectedTab = this.selectedTab;
    const leavingTab = this.leavingTab;
    this.leavingTab = void 0;
    this.transitioning = false;
    if (!selectedTab) {
      return;
    }
    if (leavingTab !== selectedTab) {
      if (leavingTab) {
        leavingTab.active = false;
      }
      this.ionTabsDidChange.emit({
        tab: selectedTab.tab
      });
    }
  }
  notifyRouter() {
    if (this.useRouter) {
      const router = document.querySelector("ion-router");
      if (router) {
        return router.navChanged("forward");
      }
    }
    return Promise.resolve(false);
  }
  shouldSwitch(selectedTab) {
    const leavingTab = this.selectedTab;
    return selectedTab !== void 0 && selectedTab !== leavingTab && !this.transitioning;
  }
  get tabs() {
    return Array.from(this.el.querySelectorAll("ion-tab"));
  }
  render() {
    return h(Host, {
      key: "c7131135b31aa312dc0207602561e1c0f4ac3e53",
      onIonTabButtonClick: this.onTabClicked
    }, h("slot", {
      key: "6c46e91c0389bbcea1f15f35cf3ea513a74ac545",
      name: "top"
    }), h("div", {
      key: "4f1b649d8bb60b61402b97359de204979c5eda52",
      class: "tabs-inner"
    }, h("slot", {
      key: "8d1ef4952be4fb33567376e1083ea4da697fcae0"
    })), h("slot", {
      key: "260b8da8031494e9cb4635b3d22c49a433042db1",
      name: "bottom"
    }));
  }
  get el() {
    return getElement(this);
  }
};
var getTab = (tabs, tab) => {
  const tabEl = typeof tab === "string" ? tabs.find((t) => t.tab === tab) : tab;
  if (!tabEl) {
    printIonError(`[ion-tabs] - Tab with id: "${tabEl}" does not exist`);
  }
  return tabEl;
};
Tabs.style = tabsCss();
export {
  Tab as ion_tab,
  Tabs as ion_tabs
};
/*! Bundled license information:

@ionic/core/dist/esm/ion-tab_2.entry.js:
  (*!
   * (C) Ionic http://ionicframework.com - MIT License
   *)
*/
//# sourceMappingURL=ion-tab_2.entry-I2UQM35M.js.map
