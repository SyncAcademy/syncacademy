# SyncAcademy — UI & Responsive Layout Guidelines

## 1. Strict UI Preservation Policy

The SyncAcademy Angular 18 + Ionic 8 user interface in `apps/web` is **strictly protected**.

Do **not**:
- Redesign existing screens, dashboards, or modals.
- Change page layouts, grid structures, colors, gradients, or typography.
- Replace components, icons, or navigation flows.
- Introduce another frontend or CSS framework.

Any visual or structural UI modification requires explicit prior approval from the repository owner.

---

## 2. Responsive Layout & Portal Shell Standards

When maintaining or extending approved portal views, adhere to the existing responsive layout rules:

1. **Header & Column Containment**:
   - Keep dashboard and portal headers constrained to the available content column beside the sidebar. Use `min-width: 0`, `max-width: 100%`, and responsive wrapping so titles and action buttons never overflow horizontally.
2. **Resizable Desktop Sidebars**:
   - Keep desktop sidebars user-resizable from a `270px` minimum to `min(420px, 35vw)`. Apply the shared `--sidebar-size` CSS custom property to the sidebar and split pane, and persist the user's selection. Use an accessible edge handle rather than a visible width slider.
3. **Mobile & Compact Viewports**:
   - At compact viewport widths, use the responsive mobile overlay menu capped to the viewport and preserve the menu toggle button. Never allow desktop sidebar dimensions to force horizontal page scrolling.
4. **Sidebar Navigation Icons & Contrast**:
   - Use recognizable, accessible icons beside each sidebar label. Keep icon sizes aligned, text contrast clear, and the full label visible at narrow widths.
5. **Scrollable Data Tables**:
   - Use flexible content sizing (`min-width: 0`, `max-width: 100%`, and grid/flex wrapping) for dashboard cards, tables, and headers. Allow wide data tables (such as marks sheets and fee ledgers) to scroll horizontally within their own wrapper container instead of widening the page viewport.
6. **Landing Page Media**:
   - Crop landing-page photography with `object-fit: cover` inside an aspect-ratio-constrained region and adjust focal crops for mobile viewports so subjects remain visible.
7. **Modal & Dialog Accessibility**:
   - Ensure native `<dialog>` and modal overlays handle backdrop clicks cleanly and remain keyboard-accessible (`Escape` to close).
