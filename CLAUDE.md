# CLAUDE.md

Guidance for Claude Code (and other agents) working in this repo.

## What this is

**OPORD Analyst** (`Op-help`) — a mobile-first tactical leadership reference and
note-taking tool for the **Five Paragraph Order (SMEAC/OSMEAC)** and **METT-T**
mission-analysis frameworks, with a tactical-reference **TOOLS** tab (OODA, PCC/PCI
checklists, warfare concepts, tactical control measures, combat orders, and a NATO/
APP-6 map-symbols appendix). It is a client-only React SPA scaffolded as a Google
AI Studio app. All user data lives in the browser via `localStorage`; there is no
backend.

> Note: the AI Studio Gemini scaffolding has been **removed** — no `@google/genai`
> dependency, no `metadata.json` capability, and no build-time key injection. The app
> is a pure client-side reference/notes tool. If AI is added later, route it through a
> server proxy; never reintroduce a client-side API key.

## Tech stack

- React 19 + TypeScript (`~5.8`), built with Vite 6
- Tailwind CSS v4 (`@tailwindcss/vite`) plus hand-written rules in `src/index.css`
- `lucide-react` (icons), `jspdf` (PDF export), `mgrs` (grid conversion), `motion`
- Browser APIs: Geolocation, DeviceOrientation (compass), Web Speech (dictation),
  Clipboard

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
exercising the affected tab.

## Project structure

```
index.html          # entry; /src/main.tsx
src/main.tsx        # React root; ErrorBoundary + self-hosted @fontsource imports
src/App.tsx         # the bulk of the app (~1.4k lines): all views, components, export logic
src/MapSymbols.tsx  # NATO/APP-6 map-symbol glyphs + MapSymbolsSection (TOOLS appendix)
src/ErrorBoundary.tsx       # top-level error boundary (wraps <App/> in main.tsx)
src/index.css       # design tokens (:root), component CSS, blackout theme, map-symbols
metadata.json       # AI Studio app manifest (name, permissions)
vite.config.ts      # Vite/Tailwind config
eslint.config.js    # flat ESLint config
.github/workflows/ci.yml    # CI: typecheck + lint + build
docs/INTEGRATION_PROMPT.md  # spec for the map-symbols integration
```

## Architecture & conventions (read before editing)

- **One big component file.** `src/App.tsx` holds `App` plus every sub-component
  (`Block`, `SubBlock`, `LeafItem`, `EditableChecklist`, `InlineNotes`, `NotesBlock`,
  `TopCompass`, the `useLocalStorage`/`useDictation` hooks, and PDF/clipboard export).
  Three views switch off a single `view` state: `'smeac' | 'mettt' | 'tools'`.
- **Persistence is `localStorage`, by key convention:**
  - `inline-note-<id>` — per-section note fields (e.g. `inline-note-osmeac-o`)
  - `notes-<view>` — the free-text NotesBlock per view (`notes-smeac`, etc.)
  - `pcc-*` / `pci-*` — editable checklist contents
  - `insert-note` is a `window` CustomEvent used to push text (e.g. a fetched MGRS
    grid) into an `InlineNotes` field by `id`.
- **Toast + safe writes.** Use the module-level `notify(msg, type)` to surface a
  transient toast from anywhere (App renders it via the `app-toast` event), and
  `safeSetItem` for `localStorage` writes so a `QuotaExceededError` can't break typing.
- **Export reads `localStorage` directly** (not React state) in `generateExportText`
  and `handleExportPDF`. If you add a new note field, wire it into both exporters.
- **Theming via CSS variables.** Light theme is the `:root` block in `index.css`.
  **Blackout mode** sets `data-theme="blackout"` on `<html>`, which remaps every
  `--accent-*`/text/`--bg` token to red-on-black. Prefer existing tokens so new UI
  inherits blackout for free — avoid hardcoded colors and per-element blackout rules.
- **TOOLS sections** are a `.section-label` followed by `.block` cards, rendered as
  siblings inside `.scroll-area`. `MapSymbolsSection` follows this pattern and renders
  its own label.
- **Domain accuracy matters.** This is doctrinal military content (SMEAC, METT-T,
  SALUTE/DRAWD, KOCOA, TCMs, APP-6 symbology). Preserve correct terminology and
  meaning; don't paraphrase doctrine loosely.

---

## Tasks & to-dos

### Task 1 — Integrate the map-symbols reference (DONE in this change)

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

### Remaining issues — roughly highest-impact first

**Robustness / data**
- [ ] **Edited checklists are never exported.** Copy/PDF for the TOOLS view only emit
      `notes-tools`; user edits to `pcc-*`/`pci-*` checklists are unreachable. Include
      them in `generateExportText`/`handleExportPDF`.
- [ ] **`EditableChecklist` uses array index as React key**; deleting while editing
      mis-targets rows. Use stable ids.
- [ ] **No "new operation"/reset and a single global note namespace** — can't keep
      multiple plans, and clearing site data wipes everything with no export/backup.

**Viability**
- [ ] **OPSEC.** Operational content (enemy SALUTE, friendly forces, grids, mission)
      is stored unencrypted in `localStorage` with no auth. Review handling (consider
      client-side encryption / a panic-wipe) before any real-world use.
- [ ] **Not a PWA** (no manifest, no service worker) — no guaranteed offline load,
      which undercuts the field-use value prop. (Fonts are already self-hosted.)

**Accuracy / cleanup**
- [ ] **Grid vs. true north.** The compass now corrects for magnetic declination (true
      north). Grid north additionally differs by UTM grid convergence; add it if exact
      grid bearings are required.
- [ ] **De-hardcode unit-specifics** baked into the reference: PDF footer
      `"WCC · SEABEE CONSTRUCTION ORDER"`, `"In this OPORD: MLR Obj 1/2"`, `"BPT task in
      this OPORD"`, `"relevant in Okinawa"`. Parameterize so the reference is reusable.
- [ ] **Accessibility:** tabs, bottom nav, and accordions are `<div onClick>` with no
      keyboard handling or ARIA roles. Make them real buttons / focusable.
- [ ] **Split `App.tsx`** (~1.4k lines) into components and move the doctrinal content
      into data; add a test setup (Vitest + RTL). Remaining `@ts-ignore` usages
      (compass, speech) should be typed properly.
