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

> Note: despite the AI Studio scaffolding (`metadata.json` declares a server-side
> Gemini capability and `@google/genai` is a dependency), **no AI is wired up yet**.
> See the to-do list below.

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
npm run lint       # tsc --noEmit (type-check only — there is no ESLint yet)
```

There are no automated tests. Verify changes by running the app and exercising the
affected tab.

## Project structure

```
index.html          # entry; loads Google Fonts + /src/main.tsx
src/main.tsx        # React root
src/App.tsx         # the entire app (~1.4k lines): all views, components, export logic
src/MapSymbols.tsx  # NATO/APP-6 map-symbol glyphs + MapSymbolsSection (TOOLS appendix)
src/index.css       # design tokens (:root), component CSS, blackout theme, map-symbols
metadata.json       # AI Studio app manifest (name, permissions, capabilities)
vite.config.ts      # Vite/Tailwind config; injects GEMINI_API_KEY (see security to-do)
docs/INTEGRATION_PROMPT.md  # spec for the map-symbols integration (task #1 below)
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
- [x] Load `JetBrains Mono` + `IBM Plex Sans` via Google Fonts in `index.html` —
      both were referenced throughout the CSS but never imported, so all labels were
      falling back to system fonts. This fixes app-wide typography.
- Spec: [`docs/INTEGRATION_PROMPT.md`](docs/INTEGRATION_PROMPT.md).
- Acceptance: TOOLS tab shows a "MAP SYMBOLS" 4-column grid of 12 cards; friendly =
  rectangle, hostile = diamond; BN COC = two echelon ticks, CO COC = one; toggling
  blackout turns all 12 glyphs (including the red cross) red; labels in JetBrains Mono.

### Open issues (from code review) — roughly highest-impact first

**Safety / correctness**
- [ ] **Compass grid-north is faked.** `TopCompass` hardcodes a 12° declination
      (`App.tsx` ~L266: `setHeading(mHeading - 12)`) and never uses the geolocation it
      requests. The "G" (grid/true) arrow is therefore wrong everywhere. Compute real
      declination from the fetched lat/lon, or remove the G arrow and label the widget
      magnetic-only. Misleading grid-north is a real hazard for a land-nav tool.
- [ ] **Blackout mode isn't persisted.** It's plain `useState(false)` (`App.tsx`
      ~L550), so a reload during night ops flashes a white screen and resets. Move it
      to `useLocalStorage`.
- [ ] **Edited checklists are never exported.** Copy/PDF for the TOOLS view only emit
      `notes-tools`; user edits to `pcc-*`/`pci-*` checklists are unreachable. Include
      them in `generateExportText`/`handleExportPDF`.

**Security / viability**
- [ ] **`GEMINI_API_KEY` is inlined into the client bundle** via `vite.config.ts`
      `define` (L11). It's unused today, but this pattern leaks the key to anyone who
      views source. Remove the define; route any future AI calls through a server.
- [ ] **No AI despite the "AI Studio app" framing.** Either build a real feature
      (e.g. draft an EMLCOA from SALUTE+DRAWD, critique a mission statement, expand
      notes into a full OPORD) or drop the Gemini capability, `@google/genai` dep, and
      key so the app stops advertising it.
- [ ] **OPSEC.** Operational content (enemy SALUTE, friendly forces, grids, mission)
      is stored unencrypted in `localStorage` with no auth on a public-ish deployment.
      Review handling before any real-world use.
- [ ] **Not a PWA** (no manifest, no service worker) — no guaranteed offline load,
      which undercuts the field-use value prop.

**Robustness / edge cases**
- [ ] **GET GRID failures are silent.** MGRS conversion errors only `console.error`
      (`App.tsx` ~L929), e.g. polar latitudes; and the geolocation call has no timeout
      or loading state. Add user-visible error/loading feedback.
- [ ] **Clipboard copy failure is silent** — the success toast only fires on success;
      the `.catch` just logs. Surface failures (e.g. non-secure context).
- [ ] **Unguarded `localStorage.setItem`** in `InlineNotes`/`NotesBlock` `handleChange`
      can throw `QuotaExceededError` mid-keystroke; there's no React error boundary.
      Wrap writes and add a top-level boundary.
- [ ] **`EditableChecklist` uses array index as React key** (`App.tsx` ~L70); deleting
      while editing mis-targets rows. Use stable ids.
- [ ] **No "new operation"/reset and a single global note namespace** — can't keep
      multiple plans, and clearing site data wipes everything with no export/backup.

**Cleanup / tooling**
- [ ] **Remove dead backend deps:** `express`, `better-sqlite3`, `@types/express`,
      `dotenv` — there is no server in the repo and `better-sqlite3` bloats installs.
- [ ] **De-hardcode unit-specifics** baked into the reference: PDF footer
      `"WCC · SEABEE CONSTRUCTION ORDER"` (`App.tsx` ~L812), `"In this OPORD: MLR Obj
      1/2"` (~L1311), `"BPT task in this OPORD"` (~L1345), `"relevant in Okinawa"`
      (~L1202). Parameterize so the doctrinal reference is reusable.
- [ ] **Accessibility:** tabs, bottom nav, and accordions are `<div onClick>` with no
      keyboard handling or ARIA roles. Make them real buttons / focusable.
- [ ] **Split `App.tsx`** (~1.4k lines) into components and move the doctrinal content
      into data; add ESLint/Prettier, a test setup, and CI. `@ts-ignore` usages
      (compass, speech) should be typed properly.
