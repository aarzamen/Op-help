# AGENTS.md

Guidance for coding agents (Codex, Claude Code, others) and people working in this repo.
`CLAUDE.md` just imports this file. Current state, open PRs and next steps: `HANDOFF.md`.

## What this is

**OPORD Analyst** (`Op-help`) — a mobile-first reference, worksheet and briefing aid for
writing and briefing a **five-paragraph order** (Orientation + SMEAC) the way the EULC
"Issue a Combat Order" course teaches it, with **METT-T** mission analysis, a **CASEVAC**
planner that draws HLZ / CCP / evacuation-route sketches, and a tactical-reference
**TOOLS** tab (PCC/PCI checklists, order types, tactical control measures, and a NATO/
APP-6 map-symbols appendix). It is written so someone with **no tactical background**
(e.g. a clinician in the course) can follow it end to end. It is a client-only React SPA
shipped as a **static site** (built to `dist/`, hosted on ChatGPT Sites; any static host
works). All user data lives in the browser via `localStorage`; there is no backend.

Five tabs (bottom nav on phones, top nav ≥ 900 px), one `view` state in `App.tsx`:

| Tab | View file | What it is |
|---|---|---|
| GUIDE | `views/GuideView.tsx` | The whole method on one page: 5-step flow, the graded checklist as a rehearsal tracker, taking apart higher's order (specified / implied / essential), the writing formulas, task verbs, the terrain-model brief, a clinical-to-tactical translation table, warfighting concepts, a searchable glossary |
| ANALYZE | `views/AnalyzeView.tsx` | METT-T worksheet with the course's rules and labeled examples |
| ORDER | `views/OrderView.tsx` | Orientation + ¶1–5 + time hack, each block listing what the grading sheet checks (with points), TEMPLATE quick-fill, a tasking-statement builder |
| CASEVAC | `casevac/CasevacTab.tsx` | HLZ, CCP and route sketches edited in a full-screen workspace (tap / drag / pinch, inspector, undo), device handoff (link or file), 9-line, and the graded ¶4.a paragraph; PNG per sheet + a packet PDF |
| TOOLS | `views/ToolsView.tsx` | PCC/PCI, order types, TCMs, map symbols |

> No AI features, no API keys, no environment variables. The app began as a Google AI
> Studio scaffold; all of that (Gemini SDK, `metadata.json`, Cloud Run env, HMR switches)
> has been removed and nothing depends on AI Studio. If AI is ever added, route it through
> a server you control; never ship a key in the client bundle.

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
npm test           # vitest run (unit tests, src/**/*.test.ts)
npm run format     # prettier --write .
```

CI (`.github/workflows/ci.yml`, Node 20) runs `npm ci`, `typecheck`, `lint`, `test` and
`build` on every PR and on `main`. Unit tests cover the pure logic (grid math, camera,
sketch items, plan validation, link decoding, route timing, checklists, PDF text). UI
changes still need a manual pass: run the app and exercise the affected tab at phone
width *and* desktop, light *and* blackout. Prettier is applied to files you touch; a few
old files (`MapSymbols.tsx`, `main.tsx`, `ErrorBoundary.tsx`) were never reformatted, so
don't run `npm run format` across the repo in an unrelated change.

## Project structure

```
index.html                 # entry; /src/main.tsx; favicon, manifest, apple-touch-icon
public/                    # icons (generated: `uv run tools/make-icons.py` from design/app-icon-source.png), manifest
tools/serviceWorker.ts     # Vite plugin: emits dist/sw.js (tools/sw.js + the precache list)
tools/sw.js                # the service worker (offline after one online visit)
src/main.tsx               # React root; ErrorBoundary, @fontsource imports, SW registration (prod)
src/App.tsx                # shell only: header (clock, compass, blackout, PDF, copy), nav, view switch, toast
src/views/                 # one file per tab (Guide, Analyze, Order, Tools); CASEVAC lives in src/casevac/
src/components/
  ui.tsx                   # Block / SubBlock accordions (semantic Theme), LeafItem, Callout, StatusIcon, Info
  icons.tsx                # the app's own icon set (lucide construction): tiles, CASEVAC, TCMs
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
src/**/*.test.ts           # Vitest unit tests next to the code they test
docs/                      # specs: map-symbols, dictation/ASR, hardening (B–E), CASEVAC workspace,
                           # DESIGN-SYSTEM.md (what each color means, icon rules)
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
- **Colors mean paragraphs** (`docs/DESIGN-SYSTEM.md`). `Theme` is semantic — `orient |
  situation | mission | execution | admin | command | ref` — and a block takes the color of
  the part of the order it feeds (all of CASEVAC is ¶4 `admin`). Never pick one for looks.
  Each `.theme-<role>` sets `--tone*` vars, so the nearest themed ancestor wins. Status
  (ok / warn / bad) is a tinted strip with a `StatusIcon`, never a solid tile.
- **Tile glyphs:** letters and numerals stay where they are the content (ORDER ¶ numbers,
  METT-T letters, mnemonic codes like TK / CI / EN); anything else is an icon from
  `components/icons.tsx` (24-grid, 2 px stroke, `currentColor`; CSS sizes it per tile).
- **Accordions are real buttons.** `Block` / `SubBlock` headers are `<button
  aria-expanded>`; closed bodies are `inert` and animate with a grid-row transition.
- **Domain accuracy matters.** Doctrinal content (SMEAC, METT-T, KOCOA, TCMs, APP-6, the
  9-line, LP sizes, triage) must keep correct terminology. Course-exercise specifics are
  shown as labeled EXAMPLE callouts, never as doctrine.

### CASEVAC module (`src/casevac/`)

- **Self-contained.** The module imports the host app only through `casevac/host.ts`
  (storage, toasts, form controls, `Block`, icons, `StatusIcon`). Keep it that way so the
  planner can be split into its own app later. `CasevacTab.tsx` is the tab.
- **Editing happens in the workspace** (`workspace/`, spec in
  `docs/SPEC-casevac-workspace.md`): a portal over the page with the body scroll-locked.
  `camera.ts` (center + meters-per-pixel → viewBox, fit, clamp, zoom-at), `useGestures.ts`
  (tap / drag item / pan / pinch / wheel), `items.ts` (every selectable item by
  `data-item` id: list, move, delete, duplicate, add, grid↔position), `useHistory.ts`
  (undo/redo; typing and drags coalesce), `Inspector.tsx` (bottom sheet < 900 px, side
  panel above). The tab itself shows a static preview (TAP TO EDIT) and the forms.
- **Handoff** (`handoff.ts`): SEND LINK puts the plan in the URL fragment (`#cv=`,
  deflate-raw + base64url; never sent to a server; images excluded); SAVE / OPEN FILE
  carries plan + background images as JSON. Everything incoming goes through
  `normalizePlan` / `normalizeBackground` (`model.ts`).
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
  `SketchCanvas` (`svg.tsx`, presentational: paper, imagery, real MGRS gridlines, north
  arrow, scale bar, selection ring; an optional `camera` viewBox for the workspace).
  Layers take `interactive` to add `data-item` hit targets.
- `palette.ts` — `UI_PALETTE` (CSS vars, blackout-aware) vs `PRINT_PALETTE` (hex, lighter
  line weight `lw` 0.55, semibold labels, smaller arrowheads) for exports. Multiply every
  stroke by `P.lw`. `exportSheet.tsx` renders a 1600×1000 sheet → embeds the fonts → PNG at 2×;
  the packet PDF is three sheets + the 9-line card + ¶4.a (images deflated, ~1 MB).
- `sheetData.ts` — the data-block lines, the read-aloud 9-line script (JTS card format,
  wartime/peacetime lines 6 and 9), and the graded ¶4.a paragraph text.

### Hosting & deploy

- **It's a static site.** `npm ci && npm run build` → upload `dist/`. No server code, no
  env vars, no secrets, no API calls at runtime (fonts are bundled). Target host is
  **ChatGPT Sites**; GitHub Pages, Cloudflare Pages, Netlify or any static host also work.
- **`base: './'`** (vite.config.ts): every URL in the build is relative, so `dist/` works at
  a domain root or under a subpath. There are no client-side routes, so no SPA rewrite
  rule is needed. The only URL state is the `#cv=` fragment of a CASEVAC link, which never
  reaches the server.
- **Offline / installable.** `tools/serviceWorker.ts` emits `dist/sw.js` with every built
  file precached; `src/main.tsx` registers it in production only (never in `npm run dev`).
  The cache name is a hash of the file list and public files, so each deploy that changes
  anything replaces the cache on its own — nothing to bump. The page is network-first, so
  an online visit always gets the latest deploy. Needs HTTPS (or localhost).
- **iOS notes.** "Add to Home Screen" gives the installed app its **own** storage,
  separate from Safari's, and a CASEVAC link opens in Safari. Use SAVE FILE / OPEN FILE to
  move a plan into the installed app. Compass and dictation prompt for permission on first
  use; both need the site opened directly (not inside an iframe).
- **ChatGPT Sites specifics.** Sites builds a project and records it in
  `.openai/hosting.json` (project id, optional storage bindings). Let the Sites tooling
  create and update that file; commit it so later deploys reuse the same site. Every Sites
  deploy URL is production: save a version, check it, then deploy. The app needs none of
  the Sites storage features (D1/R2) — all data stays in the visitor's browser.
- **Deploy only from `main`.** Merge first, then build and deploy. After a deploy, check
  that the live `index.html` asset names match a local `npm run build` of `main`. A deploy
  from a local or PR branch leaves production ahead of the repo (this happened in October
  2026; see `HANDOFF.md`).

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

### Task 3 — CASEVAC workspace, device handoff, design system (DONE in this change)

- [x] **Sketch workspace.** EDIT SKETCH opens a full-screen editor that holds the page
      still (no scrolling into other sections): tap an item for its options, drag, pinch /
      wheel zoom, one-finger pan, tap empty ground to ADD HERE, undo / redo, typed grids,
      arrow-key nudges, approach / departure handles. Phone = bottom sheet (peek / half /
      full); iPad and desktop = side panel. Spec: `docs/SPEC-casevac-workspace.md`.
- [x] **Phone → iPad / computer handoff.** SEND LINK (plan in the URL fragment) and SAVE /
      OPEN FILE (plan + overlay images); incoming plans are validated.
- [x] **Lighter print.** Exported sheets draw lines at ~0.55× weight with semibold labels.
- [x] **Module boundary.** `src/casevac/` reaches the app only through `host.ts`.
- [x] **Colors mean paragraphs; one icon language.** Semantic `Theme`, `--c-*` tokens,
      custom icons replace stray glyphs and the color ⏱ emoji, status strips carry icons,
      rubric sections carry their paragraph color. See `docs/DESIGN-SYSTEM.md`.

### Milestone A — safety & cleanup (DONE)

- [x] **Compass rebuilt.** `TopCompass` shows live **G** (grid/true) and **M** (magnetic)
      arrows. The G–M angle is the **real WMM declination** computed from the fetched
      lat/lon (`geomagnetism`), replacing the hardcoded 12° fake. iOS/iframe handling:
      requests orientation + motion permission together from the tap (before geolocation,
      so the gesture isn't consumed); activates immediately and fetches declination in the
      background; detects an embedding iframe / missing sensor events and shows a useful
      message instead of a dead widget. (The AI Studio `metadata.json` that granted sensor
      permissions to its preview frame has since been removed with the rest of AI Studio.)
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
- [x] **B4 — PWA / offline.** Manifest, icons and a build-generated service worker; the
      second load works with no connection (see *Hosting & deploy*).
- [ ] B3 (operations namespace + reset + JSON backup) — see the hardening spec.

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
- [x] **PWA / offline** — done (B4).

**Accuracy / cleanup**
- [x] **Grid vs. true north.** G-M = WMM declination − UTM grid convergence, in both the
      compass and the CASEVAC sheets.
- [x] **De-hardcode unit-specifics** — unit / operation / banner come from the ORDER
      header; exercise specifics are labeled examples.
- [x] **Accessibility basics** — nav, tabs and accordions are buttons with
      `aria-current` / `aria-pressed` / `aria-expanded`; closed panels are `inert`.
- [x] **Split `App.tsx`** and move doctrinal lists into `src/content/`.
- [x] **Unit tests** — Vitest over the pure modules, run in CI.
- [ ] **More tests.** `hlz.ts` 10:1 checks and wind components, `sheetData.ts` (9-line
      script and ¶4.a text), `ccp.ts`; component tests (RTL + jsdom) for `EditableChecklist`
      and the workspace inspector; a Playwright smoke test of the five tabs and the workspace.

**Candidates (proposed, not built)**
- [ ] **Terrain-model kit printout** — labels for every control measure / unit marker
      plus the board (grids, astro data, challenge & pass, timeline), from the order.
- [x] **Publish on ChatGPT Sites** — live at
      [OPORD Analyst](https://op-help.annonable.chatgpt.site) (see *Hosting & deploy*).
- [ ] **Practice mode** — glossary / task-verb flashcards and "find the implied task"
      drills from the worked examples.
- [ ] **Brief timer** — per-section timing for rehearsals against the 30–60 min window.

---

## Handoff — where things stand

*Written Oct 2026 when development moved from Claude Code to Codex. Update it as you go.*

**State of `main`.** Five tabs, the CASEVAC workspace and handoff, the color/icon system,
offline PWA and a static build are all merged; CI (typecheck, lint, unit tests, build) is
green. Nothing depends on Google AI Studio any more. The AI Studio copy of this project
is abandoned: don't sync from it, and never take its `package-lock.json` (it is stale and
once broke `npm ci` on `main`).

**Who it's for.** The maintainer is a Navy physician. First users are classmates in the
EULC "Issue a Combat Order" course, some of them clinicians with no tactical background;
the course ends in a group-of-four terrain-model brief graded on the checklist in
`src/content/rubric.ts`. Plain language and correct doctrine both matter.

**Next, in order:**

1. [x] **Publish on ChatGPT Sites — done.** Live:
   [OPORD Analyst](https://op-help.annonable.chatgpt.site). The original
   `.openai/hosting.json` is committed with the existing project ID and `dist/` static
   output setting so future deploys reuse the same site. The real iPhone/iPad pass
   remains step 2.
2. **Real-device pass on iPhone and iPad** — headless Chromium can't prove these: workspace
   gestures, bottom sheet and safe areas; compass permission prompt; dictation; PDF / PNG
   download and the share sheet; Add to Home Screen and offline; SEND LINK from phone →
   open on iPad. Fix what breaks.
3. **Keep the review bar.** An independent review of the CASEVAC workspace and handoff
   (Oct 2026) found 14 defects (dead zoom buttons with a mouse, link payloads that could
   break or hang the tab, image-move mode sticking, clamped number fields, …); all were
   fixed and the plan validation is now fuzz-tested. Anything that accepts outside data
   (links, files, storage) goes through `normalizePlan` / `normalizeBackground`.
4. **B3 — operations + backup** (`docs/SPEC-framework-hardening.md`): several named plans,
   reset, JSON export / import of everything. Today there is one global plan and clearing
   site data loses it all.
5. **OPSEC** — operational text sits unencrypted in `localStorage`. At minimum a "wipe all
   data" control; consider optional passphrase encryption.
6. **More tests**, then the candidates list above.

**Ground rules.**

- Run `npm run typecheck && npm run lint && npm test && npm run build` before every push;
  small PRs into `main`; CI green before merge. Don't commit `dist/`.
- Never rename or drop a `localStorage` key: people already have notes and plans in them.
  Migrations must be idempotent and keep the old data readable (see `normalizePlan`,
  `normalizeChecklistItems`).
- Doctrine stays correct; course specifics are labeled EXAMPLE; `INSTRUCTOR TIP` is only
  for points the course instructors made (see the `Callout` doc comment in `ui.tsx`).
- Colors mean paragraphs and glyphs come from `components/icons.tsx`
  (`docs/DESIGN-SYSTEM.md`); new UI uses tokens so blackout keeps working.
- `src/casevac/` imports the app only through `casevac/host.ts`.
- No client-side API keys, no third-party runtime requests (fonts are bundled for OPSEC
  and offline use).
