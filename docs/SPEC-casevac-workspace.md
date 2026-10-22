# SPEC — CASEVAC workspace (mobile-first sketch editor)

Status: implemented in `feat/casevac-workspace`. Owner of record: the CASEVAC module
(`src/casevac/`). Read with `docs/DESIGN-SYSTEM.md`.

## Problem

The CASEVAC sketches were edited inline in a scrolling page. On a phone:

- dragging a marker and scrolling the page fight each other (a near miss scrolls the page,
  a scroll that starts on a marker drags it);
- the sketch is ~390 px wide, labels are ~7 px, and there is no zoom;
- there is no way to *select* something and see its options, no undo, and no way to type an
  exact grid or a unit name next to the item on the sketch;
- a plan drafted on a phone cannot move to an iPad or a computer for finishing.

The PDF/PNG exports also read heavy ("Fisher-Price"): on-screen stroke weights and bold
labels were reused unchanged for print.

## Goals

1. **A workspace of its own.** Editing happens in a full-viewport overlay whose edges are
   snapped to the window. While it is open the page cannot scroll, and every gesture inside
   the canvas belongs to the canvas.
2. **Direct manipulation that works with a thumb.** Tap selects, drag moves, one finger on
   empty paper pans, two fingers pinch-zoom, tap on empty paper offers "add here".
3. **An inspector for the selection.** Bottom sheet on phones (peek → half → full), side
   panel on tablets and desktops. Exact grid entry, labels, heights, delete, duplicate.
4. **Draft on a phone, finish anywhere.** Send the plan as a link (no server) or as a file.
5. **Lighter print.** Exports use thinner lines and lighter type than the screen.
6. **Separable later.** The module talks to the host app through one file (`host.ts`).

Non-goals: multi-user editing, a server, freehand drawing, rotating CCP areas.

## Architecture

```
src/casevac/
  host.ts             ← the only imports from the host app (storage, toast, dtg, pdf text)
  CasevacTab.tsx      ← the tab: sheet switcher, static preview + EDIT, forms, exports, handoff
  workspace/
    Workspace.tsx     ← full-viewport overlay: top bar, canvas, inspector/sheet
    useCamera.ts      ← camera (center + m/px) ↔ SVG viewBox, fit, clamp to sheet bounds
    useGestures.ts    ← pointer state machine: tap / drag item / pan / pinch / wheel
    useHistory.ts     ← undo/redo of the whole plan (one entry per gesture or edit burst)
    items.ts          ← item registry per sheet: list, hit radius, get/set position,
                        add, duplicate, delete, labels
    Inspector.tsx     ← editors for the selected item and the sheet (no selection)
    AddMenu.tsx       ← "add here" choices for a tapped point
  handoff.ts          ← plan ⇄ link fragment (deflate + base64url) and ⇄ .json file
  …existing geometry (geo, hlz, ccp, route), layers, svg, exportSheet, forms…
```

### Coordinates

Unchanged: world meters, x = grid east, y = grid north, origin at the sheet's reference
grid. The *sheet view* (`hlzView`, `computeCcp().view`, route `fitView`) still sets the
drawing unit `u = view.w / 100` so label sizes match the export. The workspace adds a
**camera** — a viewBox in the same world space — so zoom is a pure viewBox change and
geometry never re-computes during a gesture.

- Camera = `{ cx, cy, mpp }` (meters per CSS pixel). `viewBox = [cx − W·mpp/2, …]` for a
  container `W × H` (ResizeObserver). Fit = the sheet view centered with 6 % margin.
- Clamp: the camera center stays inside the sheet view grown by 50 %, and `mpp` stays
  between fit × 4 (zoomed out) and 0.05 m/px (zoomed in). The paper can't be lost off-screen.
- Gridlines and paper cover the camera area, not only the sheet view, so panning never
  shows a void.

### Gestures (`useGestures`)

| Input | Result |
|---|---|
| tap item (< 8 px travel, < 700 ms) | select it |
| tap empty paper | deselect; if nothing was selected, open **add here** at that point. On the route sheet with a stop selected, open **add here** for a stop inserted after it |
| drag from an item | move it (one undo step); snaps to 1 m, or 5 m with SNAP on |
| drag from empty paper (1 finger / mouse) | pan |
| two fingers | pinch-zoom about the midpoint + pan |
| wheel / trackpad pinch | zoom about the cursor; zoom stops at the limits without drifting |
| buttons over the canvas (zoom, banners) | their own clicks; never a map tap |

The SVG has `touch-action: none`; the overlay locks body scroll (`position: fixed` on
`body` with the scroll offset restored on close — the iOS-safe pattern) and uses
`overscroll-behavior: contain` on the inspector so a fling never chains to the page.

### Selection & items (`items.ts`)

Every selectable thing has an id `kind:key` (existing drag ids are reused):

| Sheet | Items | Drag | Add | Delete |
|---|---|---|---|---|
| HLZ | `obs:<id>`, `sec:<id>`, `load`, `ccp` (when not from grid), `appr`, `dep`, `zone` | all but `zone`; `appr`/`dep` drag the arrow end and set the °M heading | obstacle (by kind), security position, move load point / CCP here | obstacles, security |
| CCP | `area:<kind>`, `sec:<id>` | yes | security, re-enable a hidden area here | security; areas are *hidden* |
| Route (map layout) | `node:<id>` | yes | node of any kind (appended, or after the selected node) | nodes (min 2) |

The registry gives each item a label, a hit radius (for the selection ring) and its
editable fields; the inspector renders from it. Sketch layers mark items with
`data-item="<id>"` (and keep `data-drag` for draggable ones).

### Inspector

- **Phone** (< 900 px): bottom sheet with a grab handle and three snap heights (peek 88 px,
  half 46 %, full 88 %). Peek shows the selection's name and its primary actions
  (DELETE / DUPLICATE / DONE); with nothing selected it shows the sheet name and hints.
- **Wide** (≥ 900 px): 340 px side panel, always open.
- Fields per item: name/label, kind, height (obstacles), **grid** (10-digit MGRS read-out;
  typing a grid moves the item exactly — HLZ and to-scale sheets), distance/bearing from
  the sheet origin, 10:1 status (obstacles), headings (`appr`/`dep`/`zone`).
- No selection: the sheet's own settings (LP size/count/formation for the HLZ; flow
  direction for the CCP; layout for the route), background image (load, ground width,
  opacity, move image), SNAP, and RESET SHEET.

### Undo / redo (`useHistory`)

Snapshots of the whole `CasevacPlan` (≈ 5 KB) in a 60-step ring. A drag commits once at
pointer-up; inspector typing coalesces into one step per field per 800 ms. Keyboard:
⌘/Ctrl-Z, ⇧⌘/Ctrl-Z.

### Keyboard (wide screens)

Delete/Backspace delete · arrows nudge 1 m (⇧ 10 m) · Esc deselect, then close ·
`+`/`-` zoom · `0` fit · ⌘/Ctrl-Z undo.

## Handoff (`handoff.ts`)

- **Send link**: `#cv=<base64url(deflate-raw(JSON))>` appended to the app's own URL. The
  fragment is never sent to a server. Shared with the Web Share sheet (AirDrop, Messages)
  where available, else copied. Background images are *not* in links (size); the receiving
  side is told so.
- **Plan file**: `CASEVAC_<HLZ>.json` with plan + backgrounds; shared as a file where the
  browser supports it, else downloaded. **Open plan file** imports it.
- **Receiving**: on load, a `#cv=` fragment switches to the CASEVAC tab and shows a banner
  — LOAD IT (replaces this device's plan, after confirmation) or IGNORE. The fragment is
  removed from the address bar either way.
- Imports are normalized through the same merge-with-defaults as `loadPlan`, so an older
  or partial plan can't crash the app.

## Print weights

`Palette` gains `lw` (line-weight multiplier) and `labelWeight` (max font weight).
Screen: `lw 1`, weight 800. Print: `lw 0.55`, weight 600, thinner halos. Every sketch
stroke is `u × k × P.lw`; dash patterns scale with it.

## Module boundary

`src/casevac/**` may import from outside the folder only through `host.ts` (plus React,
lucide-react, jspdf, mgrs, geomagnetism). The shared form/accordion UI it uses is listed
there too, so lifting the planner into its own app means copying `src/casevac/`,
re-implementing `host.ts`, and nothing else.

## Acceptance

- Phone (393 × 852, touch): open EDIT, pinch to 3×, pan, drag an obstacle, the page does
  not scroll; tap empty → add a security position; undo restores it; DONE returns to the
  tab with the preview updated.
- iPad (1024 × 1366) and desktop: side inspector; type a grid → the item jumps there;
  arrow keys nudge; Delete removes.
- Send link on one browser profile, open it in another → LOAD IT → identical sketches.
- PNG/PDF exports: strokes visibly lighter than on screen; nothing clipped.
- Blackout mode recolors the workspace like the rest of the app.
