# Spec — Framework hardening & remaining roadmap (Milestones B–E)

Status: **proposed** (downstream coding tasks). Companion to the to-do list in
`CLAUDE.md`. Milestone A (safety hardening, AI strip, real WMM compass, CI/lint) is
**done** and merged. This spec expands the remaining items into implementable units with
approach, files, and acceptance criteria. Roughly highest-impact first.

Conventions to follow (already established):
- Persistence is `localStorage` by key convention; **all writes go through `safeSetItem`**
  (or `useLocalStorage`, which now wraps it). Reads are plain `getItem`.
- Surface user-facing outcomes with the module-level `notify(msg, type)` toast.
- Theme via CSS variables; new UI should inherit blackout for free (no hardcoded colors).
- Export reads `localStorage` directly in `generateExportText` / `handleExportPDF` — wire
  any new persisted field into **both** exporters.
- CI (`.github/workflows/ci.yml`) runs `typecheck` + `lint` + `build`; keep it green.

---

## Milestone B — Robustness & data model

### B1. Export edited checklists (PCC/PCI) — ✅ DONE
**Problem.** Copy/PDF for the TOOLS view only emit `notes-tools`. User edits to the
`pcc-*` / `pci-*` `EditableChecklist`s are unreachable by either exporter.
**Approach.** Enumerate the checklist storage keys (or, better, derive them from a single
source once B2 lands). In `generateExportText` (tools branch) and `handleExportPDF` (tools
branch), read each checklist from `localStorage`, render under a clear heading
("PCC/PCI — <scenario>"), include the item text. Keep the existing `notes-tools` section.
**Files.** `src/App.tsx` (`generateExportText`, `handleExportPDF`).
**Acceptance.** Editing a checklist item then Copy/PDF includes the edited items in the
output, grouped by scenario; empty/unedited checklists still export their defaults.

### B2. Stable checklist item keys — ✅ DONE
**Problem.** `EditableChecklist` keys list rows by **array index**; deleting/reordering
while a row is being edited mis-targets `editingIndex`.
**Approach.** Change the item model from `string[]` to `{ id: string, text: string }[]`
(id via `crypto.randomUUID()`); key rows by `id`; track edit state by `id` not index.
**Migration.** On load, if stored data is the old `string[]` shape, map to `{id,text}`.
**Files.** `src/App.tsx` (`EditableChecklist`, its `useLocalStorage` usage).
**Acceptance.** Deleting a row above the one being edited keeps the correct row in edit
mode; existing saved checklists still load (migration); export (B1) still works.

### B3. Operations namespace + reset + JSON backup/restore
**Problem.** A single global `localStorage` namespace = one plan. No way to keep multiple
operations, start clean, or back up before clearing site data (data-loss risk).
**Approach.** Introduce an **operation** concept:
- An `operations` index + an `activeOperationId`. Namespace all per-plan keys under the
  operation (e.g. `op:<id>:inline-note-osmeac-o`, `op:<id>:notes-smeac`, `op:<id>:pcc-*`).
  Keep app-global prefs (`blackout-mode`) un-namespaced.
- A small **operations manager** UI (create / rename / switch / delete) — a modal or a
  header menu; keep it minimal and blackout-friendly.
- **Backup/restore:** export the active operation (or all) as a JSON file; import to
  restore. This doubles as the OPSEC backup story (E1).
- Centralize key construction in one helper (`opKey(name)`) so exporters, notes,
  checklists, and the compass all resolve the same namespace. Do this **after** routing
  reads through a single accessor to keep the blast radius contained.
**Migration.** On first load with legacy un-namespaced keys, create a "Default operation"
and migrate existing keys into it. Guard with a stored `schemaVersion` (or a `migrated:v1`
flag) so the migration runs **exactly once** and never re-runs or double-migrates on
subsequent loads.
**Files.** `src/App.tsx` (storage accessors, exporters, `InlineNotes`/`NotesBlock`/
`EditableChecklist`), new small component(s). Consider extracting a `storage.ts` module.
**Acceptance.** Can create/switch/delete operations; switching swaps all notes/checklists;
delete asks confirmation; JSON export then import round-trips an operation exactly; legacy
data migrates into "Default operation" with nothing lost.

### B4. PWA / offline
**Problem.** No manifest, no service worker → no guaranteed offline load, undercutting the
field-use value prop. (Fonts are already self-hosted, so a SW can fully cache the shell.)
**Approach.** Add `vite-plugin-pwa` (Workbox) with a web app manifest (name, icons,
`display: standalone`, theme/background colors matching the design tokens) and a service
worker that precaches the built assets (incl. the `@fontsource` woff2). Verify offline
load and installability. Note: this gives offline **web**; it is independent of the native
iOS wrapper in `SPEC-dictation-apple-asr.md`.
**Files.** `vite.config.ts`, `public/` (icons/manifest), maybe `index.html`.
**Acceptance.** Lighthouse "installable"; second load works fully offline (airplane mode);
icons render on home-screen install.

---

## Milestone C — Domain accuracy & accessibility

### C1. Grid convergence (true → grid north) — compass refinement
**Problem.** The compass now corrects for **magnetic declination** (→ true north) and
labels the arrow "G" with a "G-M" readout. The true map **G-M angle** also includes
**UTM grid convergence** (true→grid), which the WMM declination omits. Usually small
(< ~3°) but matters for precise grid bearings.
**Approach.** Compute grid convergence from lat/lon and the UTM zone central meridian
(`γ ≈ atan(tan(Δλ)·sin(φ))`, Δλ = lon − zone_central_meridian), then
`G-M angle = declination − convergence` (mind sign conventions; validate against a known
map-margin value). Show the combined G-M angle; keep declination available. Add a brief
in-app note that it's computed, not the map-margin authority.
**Files.** `src/App.tsx` (`TopCompass`). No new dep (compute inline or tiny helper).
**Acceptance.** For a test point, the displayed G-M angle matches a known map-margin G-M
within tolerance; behavior unchanged when location is unavailable (declination-only).

### C2. De-hardcode unit-specifics
**Problem.** One exercise's details are baked into what reads as general doctrine: PDF
footer `"WCC · SEABEE CONSTRUCTION ORDER"`, `"In this OPORD: MLR Obj 1/2"`, `"BPT task in
this OPORD"`, `"relevant in Okinawa"`.
**Approach.** Extract these to a `config`/constants module (or per-operation settings from
B3 — e.g. unit name, AO, footer). Default to neutral text; let an operation override.
**Files.** `src/App.tsx` → new `src/config.ts` (or operation settings).
**Acceptance.** No exercise-specific string remains hardcoded in doctrinal content; the
PDF footer and any unit references come from config/operation; defaults are generic.

### C3. Accessibility
**Problem.** Tabs, bottom nav, and accordions (`Block`/`SubBlock`) are `<div onClick>` —
no keyboard operation, no ARIA. (Header buttons already have `aria-label`s; the compass
and GET GRID are now real `<button>`s after Milestone A.)
**Approach.** Convert interactive `div`s to `<button>` (or add `role`, `tabIndex={0}`,
Enter/Space handlers, `aria-expanded` on accordions, `aria-selected`/`role="tab"` on
tabs). Ensure visible focus styles that also work in blackout.
**Files.** `src/App.tsx` (`Block`, `SubBlock`, tab bar, bottom nav). Pairs well with D1.
**Acceptance.** Full keyboard operation of tabs, nav, and accordions; screen reader
announces expanded/collapsed and selected tab; focus visible in both themes; lint clean.

---

## Milestone D — Architecture & tests

### D1. Split `App.tsx` + content-as-data
**Problem.** `src/App.tsx` is ~1.4k lines holding every component, all doctrinal content,
templates, and PDF logic. Hard to test, hard to change; remaining `@ts-ignore` in
compass/speech.
**Approach.** Extract components into `src/components/*` (Block, SubBlock, LeafItem,
EditableChecklist, InlineNotes, NotesBlock, TopCompass, GetGridButton, Toast) and hooks
into `src/hooks/*` (`useLocalStorage`, `useDictation`). Move the SMEAC/METT-T/TOOLS
doctrinal content into typed **data modules** (`src/content/*.ts`) rendered by small
generic components — this directly enables C2 (config) and C3 (a11y) and B1/B3 (storage).
Replace `@ts-ignore` with proper types (the `IOSOrientationEvent`/`PermissionCapableCtor`
pattern from the compass is the model). Do this **incrementally** behind green CI.
**Files.** new `src/components/`, `src/hooks/`, `src/content/`; shrink `src/App.tsx`.
**Acceptance.** `App.tsx` is a thin shell; no behavior change (verify each tab); no
`@ts-ignore` remains; typecheck/lint/build green at each step.

### D2. Test setup (Vitest + React Testing Library)
**Problem.** No automated tests; only manual verification.
**Approach.** Add Vitest + `@testing-library/react` + jsdom. First tests target the
high-risk, pure-ish logic: `safeSetItem`/`useLocalStorage` (quota path fires `notify`),
the compass math (`normalizeDeg`, `smoothCompassDeg`, declination→G-M sign), MGRS
formatting in `GetGridButton`, export text generation, and (post-B2) checklist edit/delete
by id. Wire `npm test` into CI.
**Files.** `vitest.config.ts`, `src/**/*.test.ts(x)`, `package.json` scripts,
`.github/workflows/ci.yml`.
**Acceptance.** `npm test` runs in CI and passes; the compass-sign and storage-quota cases
are covered (they're the safety-critical ones).

---

## Milestone E — Viability / product

### E1. OPSEC — encryption / panic-wipe (decision-gated)
**Problem.** Operational content is stored unencrypted in `localStorage` with no auth.
**Approach (options — needs a threat model decision):**
- **At-rest encryption:** derive a key from a passphrase (WebCrypto PBKDF2/AES-GCM),
  encrypt per-operation payloads; unlock on open. Pairs with B3 (operations) and the JSON
  backup (encrypt the export).
- **Panic-wipe:** a guarded "wipe all" action (and/or a duress gesture) that clears
  storage immediately; rely on B3's JSON backup so wipe isn't catastrophic.
- **Minimum:** if encryption is out of scope, at least a clear in-app warning about
  unencrypted local storage + the backup/wipe controls.
**Decision needed.** What's the threat model (lost/seized device? shared device?)? That
determines whether full encryption is warranted vs. wipe + warning.
**Acceptance.** Per chosen option: stored payloads are unreadable without the passphrase /
panic-wipe clears all operational data instantly / a warning + backup+wipe controls exist.

### E2. AI direction — deferred (stripped in Milestone A)
AI scaffolding was intentionally **removed** in Milestone A (no `@google/genai`, no key
injection, no Gemini capability). If AI is revisited later, route it through a **server
proxy** (never a client-side key) or use Apple Foundation Models on-device per
`SPEC-dictation-apple-asr.md` §7 (transcript cleanup) — not a cloud key in the bundle.

---

## Suggested sequence

B1 + B2 (small, unblock export) → B3 (data model; touches storage app-wide, do behind a single
accessor) → B4 (PWA, mostly additive) → C1/C2/C3 → D1 (enables clean C2/C3) → D2 → E1
(after a threat-model decision). Each unit must land with CI green and no behavior
regressions in the three tabs.
