# Integration Prompt — Map Symbols section (TOOLS tab)

Paste the following to the coding agent (Claude Code / AI Studio), and add the
two files `MapSymbols.tsx` and `map-symbols.css` to the repo first.

---

## TASK

Add a **MAP SYMBOLS** reference section to the **TOOLS** tab of the Op-help app.
It renders a 4×3 grid of 12 NATO/APP-6 tactical map symbols (friendly, hostile,
Bn COC, Co COC, engineer, aid station, interlocking fire, concertina wire, mines,
MSR, checkpoint, unfordable stream). The component already exists.

## FILES PROVIDED

- `src/MapSymbols.tsx` — exports `MapSymbolsSection` (default) plus each symbol as
  an individually importable component and a `MAP_SYMBOLS` registry. **Do not
  restyle the glyphs.** They are inline SVG using `currentColor` by design.
- `map-symbols.css` — the grid/card styles, written against the existing `:root`
  tokens in `src/index.css`.

## STEPS

1. **Move/confirm files.** Place `MapSymbols.tsx` in `src/`. Append the entire
   contents of `map-symbols.css` to the end of `src/index.css` (anywhere after the
   existing rules; it does **not** need to go inside the blackout block).

2. **Render it in the TOOLS view.** In `src/App.tsx`, find where the TOOLS tab
   content is rendered (the same place the existing TOOLS sections live —
   "DECISION MAKING", "WARFARE CONCEPTS", "TACTICAL CONTROL MEASURES", each using
   a `.section-label` followed by `.block` cards). Import and drop the section in
   at the **bottom** of the TOOLS content, inside the `.scroll-area`:

   ```tsx
   import MapSymbolsSection from "./MapSymbols";
   // ...
   // inside the TOOLS tab render, after the last existing section:
   <MapSymbolsSection />
   ```

   `MapSymbolsSection` renders its own `.section-label` ("MAP SYMBOLS"), so place
   it as a sibling of the other sections — do not wrap it in another label.

3. **Do not touch the blackout logic.** This is the important part: the glyphs
   inherit `color` from `.sym-frame { color: var(--accent-blue); }`, and the SVG
   strokes are `currentColor`. The one colored element (the medical cross) uses
   `var(--accent-red)`. Because the existing `:root[data-theme='blackout']` block
   already remaps **both** `--accent-blue` and `--accent-red` to `#ff0000`, every
   symbol turns red-on-black automatically when blackout mode is toggled. **No new
   blackout CSS is needed. Do not add per-symbol `[data-theme='blackout']` rules** —
   verify it works by toggling the theme and confirming the symbols (including the
   cross) all go red.

## CONSTRAINTS

- Keep JetBrains Mono on all labels (already specified in `map-symbols.css`).
  NOTE: the app currently never imports JetBrains Mono or IBM Plex Sans — if the
  labels render in a fallback font, add the Google Fonts `<link>` for
  `JetBrains Mono` (weights 600,800) and `IBM Plex Sans` to `index.html` `<head>`.
  That fixes the whole app's typography, not just this section.
- Do not convert the glyphs to `<img src>` or external `.svg` files. They must stay
  inline JSX or they lose `currentColor` inheritance and blackout support.
- The grid is `repeat(4, 1fr)`. On the 393px phone frame the two-line labels are
  small but legible. If they're too tight, change the single value `4` → `3` in
  `.sym-grid` (yields a roomier 3×4). Do not hand-resize individual cards.

## ACCEPTANCE CHECK

- TOOLS tab shows a "MAP SYMBOLS" section with 12 cards in a 4-column grid.
- Friendly is a rectangle, Hostile is a diamond (shape encodes affiliation).
- BN COC shows two echelon ticks, CO COC shows one (same flag-frame otherwise).
- Toggling blackout mode turns all 12 symbols — including the red cross — to red.
- Labels are in JetBrains Mono.
