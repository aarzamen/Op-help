# AGENTS.md

Guidance for coding agents (Codex, Claude Code, others) and people working in this repo.
`CLAUDE.md` just imports this file. This file is rules only; current state, next steps and
the project history live in `HANDOFF.md`.

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
scripts/ios-device.sh  # iOS app: build, sign, install and launch on a connected iPhone
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
tools/make-icons.py        # every icon size + the iOS app icon and launch screen (uv run)
capacitor.config.ts, ios/  # iOS app: Capacitor shell around the same build (see Hosting & deploy)
scripts/ios-device.sh      # build + install the iOS app on a connected iPhone
src/lib/native.ts          # the only place web and iOS app differ (files, share, clipboard, status bar)
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
- **iOS app (Capacitor, `ios/`).** The same `dist/` build bundled into a native shell
  (bundle ID `com.aarzamen.opord`), so it works offline from the first launch with no
  service worker. Everything that differs from the website is in `src/lib/native.ts`,
  behind `isNativeApp()`: files (PDF, PNG, plan, backup) go to the iOS share sheet,
  SEND LINK points at the public website, copy uses the native clipboard, and the status
  bar follows blackout. DICTATE uses on-device Apple Speech through
  `ios/App/App/OPORDSpeechBridge.swift` (the `opordSpeech` bridge in
  `docs/SPEC-dictation-apple-asr.md`); it never falls back to Apple's servers.
  `scripts/ios-device.sh` builds, signs, installs and launches it on a connected iPhone;
  the team ID comes from `$OPORD_TEAM_ID` or the gitignored `ios/signing.local`, never the
  repo. It never changes the Apple account. TestFlight is blocked until App Store Connect
  is fixed, so the app installs only on your own registered devices. After changing web
  code, rerun the script (it runs `npm run build` and `npx cap sync ios`). Edit
  `ios/App/App.xcodeproj` with Xcode; Capacitor manages `ios/App/CapApp-SPM`.
- **ChatGPT Sites specifics.** Sites builds a project and records it in
  `.openai/hosting.json` (project id, optional storage bindings). Let the Sites tooling
  create and update that file; commit it so later deploys reuse the same site. Every Sites
  deploy URL is production: save a version, check it, then deploy. The app needs none of
  the Sites storage features (D1/R2) — all data stays in the visitor's browser.
- **Deploy only from `main`.** Merge first, then build and deploy. After a deploy, check
  that the live `index.html` asset names match a local `npm run build` of `main`. A deploy
  from a local or PR branch leaves production ahead of the repo (this happened in October
  2026; see `HANDOFF.md`).

## Ground rules

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
- Never deploy, tag, release or delete branches from an agent session; those are the
  owner's. Current state, open PRs and next steps: `HANDOFF.md`.
