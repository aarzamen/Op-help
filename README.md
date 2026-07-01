# OPORD Analyst (`Op-help`)

A mobile-first tactical leadership reference and note-taking tool for the **Five
Paragraph Order (SMEAC/OSMEAC)** and **METT-T** mission-analysis frameworks, plus a
tactical-reference **TOOLS** tab (OODA, PCC/PCI checklists, warfare concepts, tactical
control measures, combat orders, and a NATO/APP-6 map-symbols appendix).

It is a **client-only React SPA** — all user data lives in the browser via
`localStorage`; there is no backend and no third-party API calls. Originally scaffolded
as a Google AI Studio app, the AI/Gemini scaffolding has been removed.

## Features

- **SMEAC** and **METT-T** interactive, collapsible framework views with per-section notes.
- **TOOLS** reference: PCC/PCI checklists (editable, per scenario), TCMs, warfare
  concepts, combat orders, and a **MAP SYMBOLS** NATO/APP-6 appendix.
- **Live compass** with a magnetic (**M**) and grid/true (**G**) arrow; the G–M angle is
  the real magnetic declination for your location (World Magnetic Model), not a fake
  offset. iOS/AI-Studio-iframe aware.
- **GET GRID** — one tap converts your GPS position to an MGRS grid.
- **Dictation** into any note field (browser Web Speech; provider-agnostic so an
  Apple on-device backend can be added later — see `docs/`).
- **Blackout mode** — red-on-black night theme, persisted.
- **Export** — copy-to-clipboard and PDF of the current view, including edited checklists.
- **Self-hosted fonts** (no third-party font request) and a top-level error boundary.

## Tech stack

React 19 + TypeScript, built with Vite 6. Tailwind CSS v4, `lucide-react`, `jspdf`
(PDF), `mgrs` (grid), `geomagnetism` (WMM declination), self-hosted `@fontsource` fonts.

## Run locally

**Prerequisites:** Node.js

```bash
npm install        # install dependencies
npm run dev        # Vite dev server on :3000
npm run build      # production build to dist/
npm run preview    # preview the production build
npm run typecheck  # tsc --noEmit
npm run lint       # eslint .
npm run format     # prettier --write .
```

CI (`.github/workflows/ci.yml`) runs typecheck + lint + build on every PR.

## Project layout & roadmap

- `src/App.tsx` — the bulk of the app (all views, components, export logic).
- `src/MapSymbols.tsx`, `src/ErrorBoundary.tsx`, `src/globals.d.ts`, `src/index.css`.
- `CLAUDE.md` — contributor guide, conventions, and the prioritized to-do list.
- `docs/SPEC-framework-hardening.md` — Milestones B–E (implementable specs).
- `docs/SPEC-dictation-apple-asr.md` — provider-agnostic dictation + optional Apple ASR.

> ⚠️ **OPSEC:** operational content is stored **unencrypted** in the browser. Review the
> handling notes in `CLAUDE.md` before any real-world use.
