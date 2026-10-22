# CLAUDE.md

Guidance for Claude Code (and other agents) working in this repo.

## What this is

**OPORD Analyst** (`Op-help`) — a mobile-first reference, worksheet and briefing aid for
writing and briefing a **five-paragraph order** (Orientation + SMEAC) the way the EULC
"Issue a Combat Order" course teaches it, with **METT-T** mission analysis, a **CASEVAC**
planner that draws HLZ / CCP / evacuation-route sketches, and a tactical-reference
**TOOLS** tab (PCC/PCI checklists, order types, tactical control measures, and a NATO/
APP-6 map-symbols appendix). It is written so someone with **no tactical background**
(e.g. a clinician in the course) can follow it end to end. It is a client-only React SPA
scaffolded as a Google AI Studio app. All user data lives in the browser via
`localStorage`; there is no backend.

Five tabs (bottom nav on phones, top nav ≥ 900 px), one `view` state in `App.tsx`:

| Tab | View file | What it is |
|---|---|---|
| GUIDE | `views/GuideView.tsx` | The whole method on one page: 5-step flow, the graded checklist as a rehearsal tracker, taking apart higher's order (specified / implied / essential), the writing formulas, task verbs, the terrain-model brief, a clinical-to-tactical translation table, warfighting concepts, a searchable glossary |
| ANALYZE | `views/AnalyzeView.tsx` | METT-T worksheet with the course's rules and labeled examples |
| ORDER | `views/OrderView.tsx` | Orientation + ¶1–5 + time hack, each block listing what the grading sheet checks (with points), TEMPLATE quick-fill, a tasking-statement builder |
| CASEVAC | `views/CasevacView.tsx` | HLZ, CCP and route sketches (drag markers, overlay a map image), 9-line, and the graded ¶4.a paragraph; PNG per sheet + a packet PDF |
| TOOLS | `views/ToolsView.tsx` | PCC/PCI, order types, TCMs, map symbols |

> Note: the AI Studio Gemini scaffolding has been **removed** — no `@google/genai`
> dependency, no `metadata.json` capability, and no build-time key injection. The app
> is a pure client-side reference/notes tool. If AI is added later, route it through a
> server proxy; never reintroduce a client-side API key.

## Tech stack

- React 19 + TypeScript (`~5.8`), built with Vite 6
- Tailwind CSS v4 (`@tailwindcss/vite`) plus hand-written rules in `src/index.css`
- `lucide-react` (icons), `jspdf` (PDF export), `mgrs` (grid conversion), `geomagnetism`
  (WMM declination), `motion`
- Browser APIs: Geolocation, DeviceOrientation (compass), Web Speech (dictation),
  Clipboard, Canvas (sketch → PNG)

## Commands

```bash
npm install        # install deps
npm run dev        # Vite dev server on :3000 (host 0.0.0.0)
npm run build      # production build to dist/
npm run preview    # preview the production build
npm run typecheck  # tsc --noEmit (type-check)
npm run lint       # eslint .
npm run format     # prettier --write .
```

There are no automated tests yet. CI (`.github/workflows/ci.yml`) runs `typecheck`,
`lint`, and `build` on every PR. Verify behavioral changes by running the app and
exercising the affected tab (phone width *and* desktop, light *and* blackout).

## Project structure

```
index.html                 # entry; /src/main.tsx; favicon, viewport-fit=cover
public/favicon.svg
src/main.tsx               # React root; ErrorBoundary + self-hosted @fontsource imports
src/App.tsx                # shell only: header (clock, compass, blackout, PDF, copy), nav, view switch, toast
src/views/                 # one file per tab (Guide, Analyze, Order, Casevac, Tools)
src/components/
  ui.tsx                   # Block / SubBlock accordions, LeafItem, Callout, SectionLabel, Info
  notes.tsx                # InlineNotes (TEMPLATE + DICTATE), NotesBlock, useDictation
  form.tsx                 # TextField, NumberField, SelectField, CheckGroup, Segmented, FieldRow
  compass.tsx              # TopCompass (G/M arrows, real G-M angle), GetGridButton
  EditableChecklist.tsx    # PCC/PCI lists ({id, text}[])
  TaskingBuilder.tsx       # "[Unit]. You are the main effort. Upon …, <task> IOT <purpose>."
  GuideWidgets.tsx         # RubricChecklist, Glossary, TaskVerbList
src/content/               # doctrinal content as data: rubric, templates, tactical tasks, glossary
src/lib/                   # storage (notify, safeSetItem, appendNote, useLocalStorage, copyText),
                           # checklists, orderMeta, pdfText (WinAnsi-safe), dtg, useMediaQuery
src/export/exporters.ts    # copy-as-text + PDF for every tab (reads localStorage, not React state)
src/casevac/               # the CASEVAC planner (see below)
src/MapSymbols.tsx         # NATO/APP-6 map-symbol glyphs + MapSymbolsSection (TOOLS appendix)
src/ErrorBoundary.tsx      # top-level error boundary (wraps <App/> in main.tsx)
src/globals.d.ts           # ambient types: native ASR bridge, Web Speech, app CustomEvents
src/index.css              # design tokens (:root), components, blackout theme, map-symbols
metadata.json              # AI Studio app manifest (name, permissions)
docs/                      # specs: map-symbols integration, dictation/ASR, hardening (B–E)
```

## Architecture & conventions (read before editing)

- **Views are thin; content is data.** Doctrinal text that is listed, scored or searched
  lives in `src/content/*` (rubric with point values, note templates, task verbs,
  glossary). Prose explanations live in the view JSX.
- **Persistence is `localStorage`, by key convention:**
  - `inline-note-<id>` — per-section note fields (`osmeac-o`, `osmeac-s-to|en|fr|ad`,
    `osmeac-m`, `osmeac-e-ci|co|tk|fs|coord`, `osmeac-a`, `osmeac-c`, `mettt-*`)
  - `notes-<view>` — the free-text NotesBlock per view (`notes-smeac`, `notes-mettt`,
    `notes-tools`; the ORDER tab still uses `smeac` and ANALYZE `mettt` so old notes survive)
  - `pcc-*` / `pci-*` — editable checklists (`{id, text}[]`, keys in `CHECKLIST_KEYS`)
  - `order-meta` (unit, operation, banner), `brief-rubric` (checked items + section
    owners), `tasking-builder` (draft), `active-view`, `blackout-mode`
  - `casevac-plan` (versioned `CasevacPlan`), `casevac-bg-{hlz|ccp|route}` (overlay
    image, downscaled JPEG data URL), `casevac-sub` (open sheet)
- **Pushing text into a note:** call `appendNote(id, text)` (`lib/storage.ts`). It writes
  storage first and then fires the `note-changed` event, so a mounted `InlineNotes`
  reloads and an unmounted one picks it up on mount (this replaced the old `insert-note`
  event, whose appends were lost when the target tab wasn't mounted).
- **Toast + safe writes.** Use `notify(msg, type)` for a transient toast (App renders it
  via the `app-toast` event), and `safeSetItem` for every `localStorage` write so a
  `QuotaExceededError` can't break typing.
- **Dictation is provider-agnostic.** `useDictation` (in `components/notes.tsx`) uses the
  native Apple-Speech bridge (`window.webkit.messageHandlers.opordSpeech` + the
  `opord-asr-result` event) inside a WKWebView host, else the browser Web Speech API;
  each instance has a stable `useId` `targetId`. See `docs/SPEC-dictation-apple-asr.md`.
- **Export reads `localStorage` directly** (`src/export/exporters.ts`). If you add a note
  field, add it to the matching `*Doc()` builder; PDF text goes through `pdfSafe`
  (jsPDF's built-in fonts are WinAnsi — arrows, ✓, ≤ etc. are mapped to ASCII).
- **Theming via CSS variables.** Light theme is `:root` in `index.css`; **blackout** sets
  `data-theme="blackout"` on `<html>` and remaps every token to red-on-black. Use tokens
  (including the sketch / triage / callout tokens) so new UI inherits blackout for free.
- **Accordions are real buttons.** `Block` / `SubBlock` headers are `<button
  aria-expanded>`; closed bodies are `inert` and animate with a grid-row transition.
- **Domain accuracy matters.** Doctrinal content (SMEAC, METT-T, KOCOA, TCMs, APP-6, the
  9-line, LP sizes, triage) must keep correct terminology. Course-exercise specifics are
  shown as labeled EXAMPLE callouts, never as doctrine.

### CASEVAC module (`src/casevac/`)

- **World coordinates are meters, x east / y north, origin at the sheet's reference grid**
  (HLZ center, CCP grid, or route origin). SVG is y-down, so draw with `-y` (`pts()` in
  `geo.ts`, `Txt`/`Arrow` in `svg.tsx` take world coords).
- `geo.ts` — MGRS parse/format/offset/delta (planar within a 100 km square), lat/lon,
  **G-M angle = WMM declination − UTM grid convergence** (`northReference`), mag→grid.
- `model.ts` — the `CasevacPlan` type, doctrine tables (LP sizes, precedence, markings,
  node kinds), labeled defaults, `loadPlan`/`savePlan` (merges defaults for old saves).
- Geometry is pure: `hlz.ts` (`computeHlz`: LPs, zone, corridors, FM 3-21.38 **10:1**
  checks, wind components), `ccp.ts`, `route.ts` (timeline, golden-hour check),
  `layout.ts` (label clamping, free spots for the north arrow / wind rose).
- Layers render geometry: `HlzLayer`, `CcpLayer`, `RouteLayer` (schematic + map) inside
  `SketchCanvas` (`svg.tsx`: paper, imagery, real MGRS gridlines, north arrow, scale bar,
  pointer dragging of any `[data-drag]` child).
- `palette.ts` — `UI_PALETTE` (CSS vars, blackout-aware) vs `PRINT_PALETTE` (hex) for
  exports. `exportSheet.tsx` renders a 1600×1000 sheet → embeds the fonts → PNG at 2×;
  the packet PDF is three sheets + the 9-line card + ¶4.a (images deflated, ~1 MB).
- `sheetData.ts` — the data-block lines, the read-aloud 9-line script (JTS card format,
  wartime/peacetime lines 6 and 9), and the graded ¶4.a paragraph text.

---

## Tasks & to-dos

### Task 1 — Integrate the map-symbols reference (DONE)

- [x] Add `src/MapSymbols.tsx`, append its CSS to `src/index.css`, and render
      `<MapSymbolsSection />` at the bottom of the TOOLS tab (placed after
      "COMBAT ORDERS", before the tools NotesBlock).
- [x] Load `JetBrains Mono` + `IBM Plex Sans` — both were referenced throughout the
      CSS but never imported, so all labels were falling back to system fonts. Fonts
      are **self-hosted** via `@fontsource` (latin subsets imported in `src/main.tsx`),
      not the Google Fonts CDN, so typography is consistent offline and the app makes
      no third-party font request (relevant for field use / OPSEC).
- Spec: [`docs/INTEGRATION_PROMPT.md`](docs/INTEGRATION_PROMPT.md).
- Acceptance: TOOLS tab shows a "MAP SYMBOLS" 4-column grid of 12 cards; friendly =
  rectangle, hostile = diamond; BN COC = two echelon ticks, CO COC = one; toggling
  blackout turns all 12 glyphs (including the red cross) red; labels in JetBrains Mono.

### Task 2 — CASEVAC planner, orders-writing GUIDE, IA reshuffle (DONE in this change)

- [x] **Information architecture.** Five tabs in workflow order — GUIDE → ANALYZE →
      ORDER → CASEVAC → TOOLS — replacing SMEAC / METT-T / TOOLS. `App.tsx` split from
      ~1.4k lines into `views/`, `components/`, `content/`, `lib/`, `export/`. Persisted
      keys are unchanged, so existing notes and checklists carry over.
- [x] **ORDER tab follows the EULC format**: Orientation (briefed first), ¶1–¶5, time
      hack; each block lists what the grading sheet checks, with points; TEMPLATE fills
      a note with the expected outline; ¶1 gains Task Organization, ¶3 gains Fire
      Support; the tasking-statement builder writes into ¶3 Tasks; order header (unit,
      operation, classification banner) prints on the PDF.
- [x] **GUIDE tab** — an orders-writing reference for a novice: the graded checklist as a
      rehearsal tracker (assign sections, check off, points covered), taking apart
      higher's order (five questions for implied tasks + the "don't brief what training
      covers" filter), writing formulas, task verbs, the terrain-model brief (build / run
      / split four ways / common mistakes), a clinical-practice translation table, and a
      searchable glossary.
- [x] **CASEVAC planner** — HLZ overhead sketch (LP size/count/formation, corridors,
      10:1 obstacle check, wind components, markings, security, litter route), CCP
      layout (one-way flow, triage areas, evac lanes by precedence), evacuation route
      (schematic with T+ times and the 1-hour POI→surgical check, or nodes over a map),
      9-line (JTS card format) with MIST, and the graded ¶4.a paragraph with
      INSERT INTO ORDER. Markers drag; a map screenshot or terrain-model photo can be
      overlaid and scaled. PNG per sheet; packet PDF.
- [x] **Cut / moved:** exercise-specific strings (unit footer, "In this OPORD …",
      "relevant in Okinawa") removed or turned into labeled examples; warfighting concepts
      and OODA moved from TOOLS to GUIDE; course exercise residue in METT-T became
      EXAMPLE callouts.
- [x] **Fixes along the way:** grid convergence applied to the compass (G arrow is now
      grid north); `insert-note` replaced by `appendNote` (no lost appends); accordions
      and nav are real buttons; 16 px inputs on iOS (no zoom-on-focus); PDF text made
      WinAnsi-safe.

### Milestone A — safety & cleanup (DONE)

- [x] **Compass rebuilt.** `TopCompass` shows live **G** (grid/true) and **M** (magnetic)
      arrows. The G–M angle is the **real WMM declination** computed from the fetched
      lat/lon (`geomagnetism`), replacing the hardcoded 12° fake. iOS/iframe handling:
      requests orientation + motion permission together from the tap (before geolocation,
      so the gesture isn't consumed); activates immediately and fetches declination in the
      background; detects the AI Studio iframe / missing sensor events and shows a useful
      message instead of a dead widget. Sensor frame permissions (`accelerometer` /
      `gyroscope` / `magnetometer`) added to `metadata.json`.
- [x] **Blackout mode persists** via `useLocalStorage('blackout-mode', …)`.
- [x] **Silent failures surfaced.** GET GRID (now `GetGridButton`) has a loading state,
      a geolocation timeout, and success/error toasts; clipboard copy reports failure.
      A module-level toast system (`notify` + the `app-toast` event) drives all of it.
- [x] **Guarded storage + error boundary.** `safeSetItem` wraps `localStorage` writes
      so a `QuotaExceededError` can't break typing; `src/ErrorBoundary.tsx` wraps the app.
- [x] **AI scaffolding stripped.** Removed `@google/genai`, the `vite.config` key
      `define`, and the `metadata.json` Gemini capability — closes the key-leak vector.
- [x] **Dead deps removed:** `express`, `better-sqlite3`, `@types/express`, `dotenv`.
- [x] **Tooling:** ESLint (flat config) + Prettier + GitHub Actions CI (typecheck,
      lint, build). Also added the missing `@types/react` / `@types/react-dom`, so the
      app now actually type-checks against React types (it previously treated React as
      `any`).

### Milestone B — data & robustness (in progress)

- [x] **Edited PCC/PCI checklists are exported** (B1). `generateExportText` — and thus
      `handleExportPDF`, which delegates to it — now emits every checklist's current items
      grouped by scenario. Storage keys are centralized in `CHECKLIST_KEYS` (referenced by
      both the export registry and each `<EditableChecklist>`) so they can't silently desync.
- [x] **Stable checklist item ids** (B2). `EditableChecklist` stores `{id, text}[]` keyed by
      a stable id; edit/delete operate on `id`, not array index, so deleting a row while
      editing another no longer mis-targets. Legacy `string[]` storage migrates on first
      read (idempotent), and malformed/`id`-less entries are repaired rather than trusted.
- [ ] B3 (operations namespace + reset + JSON backup), B4 (PWA) — see the hardening spec.

> **Dictation Phase 1** (provider-agnostic `useDictation` adapter) is merged (#4); the
> Apple on-device backend is the next phase — see `docs/SPEC-dictation-apple-asr.md`.

### Remaining issues — roughly highest-impact first

> Expanded, implementable specs: [`docs/SPEC-framework-hardening.md`](docs/SPEC-framework-hardening.md)
> (Milestones B–E) and [`docs/SPEC-dictation-apple-asr.md`](docs/SPEC-dictation-apple-asr.md)
> (provider-agnostic dictation + optional Apple on-device ASR).

**Robustness / data**
- [ ] **No "new operation"/reset and a single global note namespace** (B3) — can't keep
      multiple plans, and clearing site data wipes everything with no export/backup.

**Viability**
- [ ] **OPSEC.** Operational content (enemy SALUTE, friendly forces, grids, mission)
      is stored unencrypted in `localStorage` with no auth. Review handling (consider
      client-side encryption / a panic-wipe) before any real-world use.
- [ ] **Not a PWA** (no manifest, no service worker) — no guaranteed offline load,
      which undercuts the field-use value prop. (Fonts are already self-hosted.)

**Accuracy / cleanup**
- [x] **Grid vs. true north.** G-M = WMM declination − UTM grid convergence, in both the
      compass and the CASEVAC sheets.
- [x] **De-hardcode unit-specifics** — unit / operation / banner come from the ORDER
      header; exercise specifics are labeled examples.
- [x] **Accessibility basics** — nav, tabs and accordions are buttons with
      `aria-current` / `aria-pressed` / `aria-expanded`; closed panels are `inert`.
- [x] **Split `App.tsx`** and move doctrinal lists into `src/content/`.
- [ ] **Tests.** Add Vitest + RTL; the pure CASEVAC geometry (`geo.ts`, `hlz.ts`,
      `route.ts`, `sheetData.ts`) and `normalizeChecklistItems` are the easy first targets.

**Candidates (proposed, not built)**
- [ ] **Terrain-model kit printout** — labels for every control measure / unit marker
      plus the board (grids, astro data, challenge & pass, timeline), from the order.
- [ ] **Static hosting** (GitHub Pages / Cloudflare Pages) so a classmate can open it
      on a phone without a dev setup; pairs with B4 (PWA) for offline use.
- [ ] **Practice mode** — glossary / task-verb flashcards and "find the implied task"
      drills from the worked examples.
- [ ] **Brief timer** — per-section timing for rehearsals against the 30–60 min window.
