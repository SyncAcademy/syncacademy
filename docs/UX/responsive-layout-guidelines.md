# Responsive Layout Guidelines

- Keep dashboard and portal headers constrained to the available content column beside the sidebar. Use `min-width: 0`, `max-width: 100%`, and responsive wrapping so titles and actions do not overflow.
- Keep desktop sidebars user-resizable from a 270px minimum to the smaller of 420px or 35vw. Apply the shared `--sidebar-size` preference to the sidebar and split pane, and persist the user's selection. Use an accessible edge handle instead of a visible width slider.
- At compact viewport widths, use the Ionic overlay menu, cap it to the viewport, and preserve the menu toggle. Do not allow the desktop sidebar width to force horizontal page scrolling.
- Use a recognizable, accessible SVG icon beside each sidebar label. Keep icon sizes aligned, text contrast clear, and the full label visible at narrow widths.
- Use flexible content sizing (`min-width: 0`, `max-width: 100%`, and grid/flex wrapping) for dashboard content, tables, and headers. Let data tables scroll within their own wrapper instead of widening the page.
- Crop landing-page photography with `object-fit: cover` inside an aspect-ratio constrained region and adjust the crop for mobile so the subject remains visible.
- Preserve existing routes, menu behavior, and page features when applying shared layout or design changes.
