# HANDOFF

State: FAR
Last wrap: 2026-10-23, commit fbfa915, branch chore/wrap-2026-10-23

The live site (<https://op-help.annonable.chatgpt.site>) works and was checked end to end.
GitHub `main` is behind it: the live build was made from a local release branch that
combined Codex PRs #11 to #15, and those PRs are still open. The milestone is getting
`main` to match production, then a real-device pass.

## Works (verified this session)

- `main` (ca52e33): typecheck, lint (0 problems after this wrap), 46 unit tests, build.
- Wrap branch: 54 unit tests, including a new `src/casevac/regressions.test.ts` that fails
  without its fixes.
- Browser suites on `main` and on the wrap branch (headless Chromium, phone, small phone
  and desktop, light and blackout): all five tabs, GET GRID, INSERT INTO ORDER, every
  export (tab PDFs now US Letter, sheet PNGs, packet PDF), the sketch-editor suite, and
  the 21 earlier review-fix checks.
- Offline: the production build served from a subpath reloads, opens the sketch editor
  and exports a PDF with the network off, behind both a plain server and one that sends
  `Vary: Origin`.
- Live site, phone profile: five tabs, sketch editor, service worker, offline reload and
  offline PDF export (11/11). Its bundle contains code from PRs #12, #13 and #14.
- Fresh clone of `main`: `npm install`, test, typecheck, lint, build, `npm run dev` and
  `npm run preview` all work; nothing tracked changes.
- Release candidate: `main` + #12 + #13 + #14 + #15 + this wrap branch merges with no
  conflicts and passes typecheck, lint, 109 tests, build and the browser suites.

## Broken or unknown

- `main` lacks #12 (offline fix for `Vary: Origin` hosts; Chromium does not reproduce
  the bug, so it is probably Safari), #13 (named plans, backup and restore), #14 (data
  wipe) and #15 (tests). Redeploying from `main` today would drop those features.
- Not tested on a real iPhone or iPad: gestures, safe areas, share sheet, compass
  permission, dictation, Add to Home Screen.
- Compass on Android may drift: it mixes relative `deviceorientation` with absolute
  readings (`src/components/compass.tsx`, the orientation handler). Unfixed.
- Since #13 removes the text-length cap, `hlz.markDay` / `markNight` entries are
  unbounded; a crafted 25 MB plan file could freeze the 4.a view. Needs a decision.
- Performance: the overlay opacity slider and ground-width field rewrite the stored image
  on every input; workspace drags re-render the hidden tab and save at pointer rate;
  `useMediaQuery` resubscribes every render.
- `npm audit`: 7 advisories (6 in build tools; DOMPurify via jsPDF on an unused path).
- The browser test scripts used at wrap time live outside the repo; the repo has unit
  tests only.

## Next steps (in order)

### M1: `main` matches the live site (about 45 min)

1. [S] START HERE. Review and merge, in this order: #12, #13, #14 (built on #13), #15,
   then the PR for `chore/wrap-2026-10-23`. Close #11 (its hosting file is already on
   `main` from #17) and #16 (its notes are folded into this file; it also conflicts with
   #17). Files: none. Human-only: Mike approves the merges, or tells an agent to merge
   them in this order.
2. [S] Build from `main` and redeploy to ChatGPT Sites: save a version, check it on a
   phone, deploy. Then confirm the live `index.html` asset names match a local
   `npm run build` of `main`. Files: none.
3. [S] Move the status sections of `AGENTS.md` ("Tasks & to-dos" and "Handoff") into this
   file so `AGENTS.md` is rules only, under 200 lines. Files: `AGENTS.md`, `HANDOFF.md`.
4. [S] `npm audit fix` (never `--force`) in its own PR, then run every check. Files:
   `package-lock.json`. Codex may already have this in progress.

### M2: real-device pass (about 45 min)

1. [M] iPhone Safari: each tab; EDIT SKETCH drag, pinch, bottom sheet, DONE; PNG and
   PACKET PDF download and share sheet; compass permission; dictation (the mic must stop
   when you leave the tab); Add to Home Screen; airplane-mode reload. Human-only: iPhone.
2. [S] iPad: side panel; SEND LINK from the phone opens the plan; SAVE / OPEN FILE with a
   map overlay. Human-only: iPad.
3. [S] Any Android phone a classmate has: compass heading stability. Human-only: device.

### M3: backlog (small PRs, about 3 h total)

1. [S] Android compass: ignore relative `deviceorientation` once absolute events arrive.
   Files: `src/components/compass.tsx`. Verify on a device.
2. [S] Persist overlay opacity and width on release, not every input. Files:
   `src/casevac/workspace/Inspector.tsx`.
3. [S] During workspace drags, skip the hidden tab's preview and forms, and save on drag
   end. Files: `src/casevac/CasevacTab.tsx`.
4. [S] Memoize `subscribe` and `getSnapshot` in `src/lib/useMediaQuery.ts`.
5. [S] Decide a per-entry cap for `markDay` / `markNight` after #13. Files:
   `src/casevac/model.ts`.
6. [M] Fit the CCP and route sketches to their content on phones. Files:
   `src/casevac/workspace/Workspace.tsx`.
7. [M] Add a Playwright smoke test of the five tabs and the sketch editor to the repo and
   CI.
8. [S] Instructor tips: if Mike shares the lecture recording or transcript, add the
   points the instructors stressed as INSTRUCTOR TIP callouts. Human-only: the file.

Later candidates: terrain-model kit printout, practice mode (flashcards and implied-task
drills), brief timer.

## Human-only before next session

- An iPhone and an iPad for M2 (about 45 min).
- Decide whether to merge the M1 PRs yourself or authorize an agent to (about 15 min).
- Optional: the lecture recording or transcript for more instructor tips.

## Kickoff prompt (paste into the next session)

Read HANDOFF.md and README.md. State is FAR: the live site works, but GitHub `main` is
behind it. Start with M1 step 1: review the open PRs and, if the review finds no
blockers, merge them in the listed order; then redeploy from `main`. Do not change storage keys or the
CASEVAC geometry beyond what those PRs contain. Done for this session means: `main`
contains #12 to #15 and the wrap fixes, CI is green on `main`, the live site is
redeployed from `main`, and its asset names match a local build of `main`.

## Session log

- 2026-10-23: wrap; fixed 10 review findings (10:1 corridors, export with pasted text,
  dictation mic, route totals, 9-line, Letter PDFs); verified `main`, live site,
  fresh clone and the merged release candidate; deferred M1 merges and M2 device pass.
- 2026-10-22: merged #6 to #10: CASEVAC planner, GUIDE, sketch editor, device handoff,
  colors and icons, AI Studio removed, offline PWA, unit tests, AGENTS.md; Codex opened
  #11 to #16 and published to ChatGPT Sites (#17 merged 10-23).
