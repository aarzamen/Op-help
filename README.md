# OPORD Analyst (`Op-help`)

A mobile-first reference, worksheet and briefing aid for writing and briefing a
**five-paragraph order** (Orientation + SMEAC), built around how the EULC "Issue a Combat
Order" course teaches and grades it — written so that someone with **no tactical
background** can follow it end to end. It adds **METT-T** mission analysis, a **CASEVAC
planner** that draws HLZ, CCP and evacuation-route sketches, and a tactical-reference tab.

It is a **client-only React SPA** — all user data lives in the browser via
`localStorage`; there is no backend and no third-party API calls. Originally scaffolded
as a Google AI Studio app, the AI/Gemini scaffolding has been removed.

## The five tabs

| Tab | Use it to… |
|---|---|
| **GUIDE** | Learn the method on one page: the 5-step flow, the graded checklist as a rehearsal tracker (assign sections to briefers, tick items off, see points covered), taking apart higher's order (specified / implied / essential tasks), the writing formulas, task verbs, the terrain-model brief, a clinical-to-tactical translation table, and a searchable glossary. |
| **ANALYZE** | Work METT-T on higher's order, with the course's rules and labeled examples. |
| **ORDER** | Write your order: Orientation, ¶1–¶5 and the time hack. Every block lists what the grading sheet checks (with points); TEMPLATE drops the expected outline into the notes; a builder writes tasking statements in the course format. |
| **CASEVAC** | Plan casualty evacuation: an HLZ overhead sketch (LP sizes, approach/departure corridors, the 10:1 obstacle check, wind), a CCP layout (one-way flow, triage areas), the evacuation route with T+ times and the 1-hour POI→surgical check, a prepared 9-line with MIST, and the graded ¶4.a paragraph (one tap inserts it into the order). Drag markers, overlay a map screenshot or a photo of the terrain model, export PNGs or a packet PDF. |
| **TOOLS** | PCC/PCI checklists (editable), order types, tactical control measures, and a NATO/APP-6 map-symbols appendix. |

Also: a live **compass** with grid (**G**) and magnetic (**M**) arrows using the real G-M
angle for your location (WMM declination − UTM grid convergence), **GET GRID** (GPS →
MGRS into your notes), **dictation** into any note, **blackout mode** (red-on-black,
including the sketches), and **copy / PDF export** of every tab.

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

- `src/App.tsx` — app shell (header, navigation, view switch).
- `src/views/` — one file per tab; `src/components/` — shared UI (accordions, notes,
  forms, compass, checklists, tasking builder, guide widgets).
- `src/content/` — doctrinal content as data (grading rubric, note templates, task verbs,
  glossary); `src/lib/` — storage, export helpers, time formatting.
- `src/casevac/` — the CASEVAC planner: geometry (`geo`, `hlz`, `ccp`, `route`), SVG
  layers, forms, and the PNG/PDF sheet exporter.
- `src/export/exporters.ts` — copy-as-text and PDF for every tab.
- `CLAUDE.md` — contributor guide, conventions, storage keys, and the prioritized to-dos.
- `docs/SPEC-framework-hardening.md` — Milestones B–E (implementable specs).
- `docs/SPEC-dictation-apple-asr.md` — provider-agnostic dictation + optional Apple ASR.

> ⚠️ **OPSEC:** operational content is stored **unencrypted** in the browser. Review the
> handling notes in `CLAUDE.md` before any real-world use. The CASEVAC sheets are
> planning aids — verify grids, headings and LP sizes with aviation and your SOP.
