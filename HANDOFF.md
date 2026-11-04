# HANDOFF

State: NEAR
Last wrap: 2026-11-04, branch `cloud/v1-paperwork`, on `main` 4c944dc

`main` is the product. It holds the named plans, backup and wipe (#13, #14), the
October 23 review fixes (#18), the new icon (#19), the build stamp and the iOS app (#20),
the offline fix for `Vary: Origin` hosts (#12) and the CASEVAC math tests (#15). The seven
PRs that were open at the last wrap (#11 to #16, #18) were merged or closed on 2026-10-28.
CI (typecheck, lint, unit tests, build) is green.

**v1.0 is the iPhone app on the owner's own devices plus the website as it is.** The app
is installed on the owner's iPhone 17 Pro from `main` with a clean build stamp (no
`+dirty`), and on-device dictation was confirmed there. The live website
(<https://op-help.annonable.chatgpt.site>) still runs an older build and must be
redeployed from `main` through ChatGPT Sites by the owner. TestFlight is blocked by an
App Store Connect agreement problem, so a release is a GitHub Release plus "build it
yourself with your own Apple team" (README, _iOS app_). Android is later and out of scope.

Two PRs from the 2026-11-04 cloud session are open against `main`:

- #21 `cloud/audit-fix`: `npm audit fix` (no `--force`) and the build tools moved to
  `devDependencies`. 15 dev-only advisories remain (vitest 5 and the eslint/minimatch
  chain need major bumps). Reinstall the iPhone app after merging.
- `cloud/v1-paperwork` (this file): HLZ marking entries from a plan file capped at 80
  characters, this handoff, `AGENTS.md` reduced to rules, `docs/INTEGRATION_PROMPT.md`
  moved to `docs/history/`, version 1.0.0 and `CHANGELOG.md`.

## Who it's for

The maintainer is a Navy physician. First users are classmates in the EULC "Issue a
Combat Order" course, some of them clinicians with no tactical background; the course
ends in a group-of-four terrain-model brief graded on the checklist in
`src/content/rubric.ts`. Plain language and correct doctrine both matter.

## Works (verified)

- 2026-11-04, headless, both cloud branches: `npm ci`, typecheck, lint, 110 unit tests
  (109 plus the marking-cap test), build; `npm audit` down from 29 to 15 advisories, none
  in the shipped bundle.
- 2026-10-28, on the owner's iPhone 17 Pro: the app installs from `main` with
  `scripts/ios-device.sh`, the build stamp shows the `main` commit with no `+dirty`, and
  DICTATE uses on-device Apple Speech.
- 2026-10-23 (headless Chromium, phone, small phone and desktop, light and blackout; still
  valid, the code has not moved): all five tabs, GET GRID, INSERT INTO ORDER, every export
  (tab PDFs on US Letter, sheet PNGs, packet PDF), the sketch-editor suite, offline reload
  behind a plain server and one that sends `Vary: Origin`, and a fresh clone of `main`
  (install, test, typecheck, lint, build, dev, preview).
- The live site, phone profile (2026-10-23 build): five tabs, sketch editor, service
  worker, offline reload and offline PDF export.

## Broken, unknown or deferred

- The live website is behind `main` (it predates #18 to #20) until the owner redeploys.
- Not tested on a real iPad, nor the website (as opposed to the app) on a real iPhone:
  gestures, safe areas, share sheet, compass permission, Add to Home Screen.
- Compass on Android may drift: it mixes relative `deviceorientation` with absolute
  readings (`src/components/compass.tsx`, the orientation handler). Needs an Android phone.
- OPSEC: operational text sits unencrypted in `localStorage`. The typed-confirmation WIPE
  exists (#14); there is no encryption.
- `npm audit` after #21: 15 advisories, all dev tooling (vitest 3 → 5 is a major; the
  eslint/minimatch chain has no non-major fix; `eslint-plugin-react-refresh` has none).
- Performance: the overlay opacity slider and ground-width field rewrite the stored image
  on every input; workspace drags re-render the hidden tab and save at pointer rate;
  `useMediaQuery` resubscribes every render.
- The browser test scripts used at the October wraps live outside the repo; the repo has
  unit tests only.

## Next steps (in order)

### M1: ship v1.0 (owner, about 30 min, human-only)

1. [S] Merge #21 and the `cloud/v1-paperwork` PR once CI is green, then `git pull` on the
   laptop. Files: none.
2. [S] Rerun `scripts/ios-device.sh` so the phone carries v1.0.0 and the audit-fixed
   lockfile; the build stamp should read `iOS app · v1.0.0 · <sha> · main` with no
   `+dirty`. Human-only: the signing team and the device.
3. [S] Redeploy the website from `main` through ChatGPT Sites: `npm ci && npm run build`,
   save a version, check it on the phone, deploy; then confirm the live `index.html`
   asset names match the local build. Human-only: the Sites account.
4. [S] Tag `v1.0.0` on the merge commit and publish a GitHub Release with the 1.0.0 entry
   from `CHANGELOG.md`: use the website, or build the iPhone app with your own Apple team
   (README, _iOS app_). Human-only: tags and releases.
5. [S] Delete the stale remote branches (branches of merged or closed PRs; the list is in
   the `cloud/v1-paperwork` PR). Human-only: nothing else should delete branches.

### M2: real-device pass (what is left)

1. [S] iPad: side panel; SEND LINK from the phone opens the plan; SAVE / OPEN FILE with a
   map overlay. Human-only: iPad.
2. [M] iPhone Safari, the website rather than the app: each tab; EDIT SKETCH drag, pinch,
   bottom sheet, DONE; PNG and PACKET PDF download and share sheet; compass permission;
   Add to Home Screen; airplane-mode reload. Human-only: iPhone.
3. [S] Any Android phone a classmate has: compass heading stability. Out of scope for
   v1.0. Human-only: device.

### M3: backlog (small PRs, about 3 h total)

1. [S] Android compass: ignore relative `deviceorientation` once absolute events arrive.
   Files: `src/components/compass.tsx`. Verify on a device.
2. [S] Persist overlay opacity and width on release, not every input. Files:
   `src/casevac/workspace/Inspector.tsx`.
3. [S] During workspace drags, skip the hidden tab's preview and forms, and save on drag
   end. Files: `src/casevac/CasevacTab.tsx`.
4. [S] Memoize `subscribe` and `getSnapshot` in `src/lib/useMediaQuery.ts`.
5. [M] Fit the CCP and route sketches to their content on phones. Files:
   `src/casevac/workspace/Workspace.tsx`.
6. [M] Add a Playwright smoke test of the five tabs and the sketch editor to the repo and
   CI; component tests (RTL + jsdom) for `EditableChecklist` and the workspace inspector.
7. [S] `npm audit` leftovers: take vitest 5 and the eslint/minimatch majors in a PR of
   their own when they land, then rerun every check.
8. [M] OPSEC: optional passphrase encryption of the stored operations
   (`docs/SPEC-framework-hardening.md`, Milestone E).
9. [S] Instructor tips: if Mike shares the lecture recording or transcript, add the
   points the instructors stressed as INSTRUCTOR TIP callouts. Human-only: the file.

Later candidates: terrain-model kit printout (labels for every control measure and unit
marker plus the board: grids, astro data, challenge and pass, timeline), practice mode
(glossary and task-verb flashcards, "find the implied task" drills), brief timer
(per-section timing against the 30 to 60 min window), Android.

## Human-only before next session

- Merge the two cloud PRs, reinstall the app, redeploy the website, tag v1.0.0 (M1).
- An iPad, and an iPhone for the website pass (M2, about 45 min).
- Optional: the lecture recording or transcript for more instructor tips.

## Kickoff prompt (paste into the next session)

Read HANDOFF.md and README.md. State is NEAR: `main` is v1.0, the iPhone app is installed
from it, and the website is redeployed from `main` (if M1 is done; otherwise stop and
say so). Start with M3 in order, one small PR each, CI green before merge. Do not rename
or drop a `localStorage` key, and do not change the CASEVAC geometry or doctrine text
beyond what an item needs. Done for this session means: the M3 items you took are merged,
`npm run typecheck && npm run lint && npm test && npm run build` pass on `main`, and this
file's state and session log are updated.

## Session log

- 2026-11-04: cloud session; PR #21 (`npm audit fix`, build tools to `devDependencies`)
  and the `cloud/v1-paperwork` PR (marking cap, this handoff, `AGENTS.md` rules-only,
  `docs/history/`, version 1.0.0, `CHANGELOG.md`). No deploy, tag or device work.
- 2026-10-28: merged #12 to #15 and #18 to #20, closed #11 and #16; new icon; iOS app
  (Capacitor) with on-device dictation and a build stamp, installed on the iPhone 17 Pro
  from `main`; review left the findings the 2026-11-04 PRs close.
- 2026-10-23: wrap; fixed 10 review findings (10:1 corridors, export with pasted text,
  dictation mic, route totals, 9-line, Letter PDFs); verified `main`, live site,
  fresh clone and the merged release candidate; deferred M1 merges and M2 device pass.
- 2026-10-22: merged #6 to #10: CASEVAC planner, GUIDE, sketch editor, device handoff,
  colors and icons, AI Studio removed, offline PWA, unit tests, AGENTS.md; Codex opened
  #11 to #16 and published to ChatGPT Sites (#17 merged 10-23).

---

## Project history (moved from `AGENTS.md` on 2026-11-04)

The task list the repo was built from, kept for the record. Open items here are
repeated in the backlog above; the backlog is the one to work from.

### Task 1 — Integrate the map-symbols reference (DONE)

- [x] Add `src/MapSymbols.tsx`, append its CSS to `src/index.css`, and render
      `<MapSymbolsSection />` at the bottom of the TOOLS tab (placed after
      "COMBAT ORDERS", before the tools NotesBlock).
- [x] Load `JetBrains Mono` + `IBM Plex Sans` — both were referenced throughout the
      CSS but never imported, so all labels were falling back to system fonts. Fonts
      are **self-hosted** via `@fontsource` (latin subsets imported in `src/main.tsx`),
      not the Google Fonts CDN, so typography is consistent offline and the app makes
      no third-party font request (relevant for field use / OPSEC).
- Spec: [`docs/history/INTEGRATION_PROMPT.md`](docs/history/INTEGRATION_PROMPT.md).
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

### Milestone B — data & robustness (DONE)

- [x] **Edited PCC/PCI checklists are exported** (B1). `generateExportText` — and thus
      `handleExportPDF`, which delegates to it — now emits every checklist's current items
      grouped by scenario. Storage keys are centralized in `CHECKLIST_KEYS` (referenced by
      both the export registry and each `<EditableChecklist>`) so they can't silently desync.
- [x] **Stable checklist item ids** (B2). `EditableChecklist` stores `{id, text}[]` keyed by
      a stable id; edit/delete operate on `id`, not array index, so deleting a row while
      editing another no longer mis-targets. Legacy `string[]` storage migrates on first
      read (idempotent), and malformed/`id`-less entries are repaired rather than trusted.
- [x] **B4 — PWA / offline.** Manifest, icons and a build-generated service worker; the
      second load works with no connection (see _Hosting & deploy_ in `AGENTS.md`).
- [x] B3 — named operations, JSON backup / restore and a guarded wipe (#13, #14;
      `src/components/OperationManager.tsx`, `src/lib/operationStore.ts`).

> **Dictation Phase 1** (provider-agnostic `useDictation` adapter) is merged (#4); the
> Apple on-device backend is the next phase — see `docs/SPEC-dictation-apple-asr.md`.

### Remaining issues — roughly highest-impact first

> Expanded, implementable specs: [`docs/SPEC-framework-hardening.md`](docs/SPEC-framework-hardening.md)
> (Milestones B–E) and [`docs/SPEC-dictation-apple-asr.md`](docs/SPEC-dictation-apple-asr.md)
> (provider-agnostic dictation + optional Apple on-device ASR).

**Robustness / data**

- [x] **Named operations, reset and JSON backup** (B3) — several named plans, BACKUP /
      RESTORE of one or all, and a typed-confirmation WIPE (#13, #14).

**Viability**

- [ ] **OPSEC.** Operational content (enemy SALUTE, friendly forces, grids, mission)
      is stored unencrypted in `localStorage` with no auth. The typed-confirmation WIPE
      exists (#14); client-side encryption does not. Review before any real-world use.
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
- [x] **CASEVAC math and text tests** — `hlz.ts` 10:1 checks and wind components,
      `sheetData.ts` (9-line script and ¶4.a text), `ccp.ts` (#15).
- [ ] **More tests.** Component tests (RTL + jsdom) for `EditableChecklist` and the
      workspace inspector; a Playwright smoke test of the five tabs and the workspace.

**Candidates (proposed, not built)**

- [ ] **Terrain-model kit printout** — labels for every control measure / unit marker
      plus the board (grids, astro data, challenge & pass, timeline), from the order.
- [x] **Publish on ChatGPT Sites** — live at
      [OPORD Analyst](https://op-help.annonable.chatgpt.site) (see _Hosting & deploy_ in
      `AGENTS.md`).
- [ ] **Practice mode** — glossary / task-verb flashcards and "find the implied task"
      drills from the worked examples.
- [ ] **Brief timer** — per-section timing for rehearsals against the 30–60 min window.
