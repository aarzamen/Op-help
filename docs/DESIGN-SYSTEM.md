# Design system — colors that mean something, one icon language

The app is organized around the five-paragraph order, so its colors are too. A color on a
tile, a stripe, or a badge always answers one question: **which part of the order does
this belong to (or feed)?** Two other color families exist, and each stays in its own lane.

## 1. Order colors (tiles, stripes, section accents)

| Token | Part of the order | Color | Why |
|---|---|---|---|
| `--c-orient` | Orientation — terrain, weather, TCMs, the terrain model | contour brown `#86592D` | map convention: terrain is brown |
| `--c-situation` | ¶1 Situation — enemy, friendly, task org, attachments | navy `#0A2540` | the picture; friendly blue |
| `--c-mission` | ¶2 Mission — higher's tasking statement, mission analysis | red `#D7263D` | the one thing that must happen |
| `--c-execution` | ¶3 Execution — intent, parts, tasks, fires, coord. instructions, timeline | green `#2D6A4F` | "go" |
| `--c-admin` | ¶4 Admin & Logistics — **including all of CASEVAC** | amber `#D4A017` (dark ink on top) | sustainment |
| `--c-command` | ¶5 Command & Signal | purple `#5A189A` | comms |
| `--c-ref` | reference, notes, meta (glossary, concepts, header, time hack) | slate `#3D4B5C` | neutral |

Rules:

- **Everything takes the color of the paragraph it feeds.** METT-T: Mission → mission red,
  Enemy → situation navy, Terrain & weather → orientation brown, Troops & fires → situation
  navy (task organization), Time → execution green (the timeline lives in coordinating
  instructions). Grading-sheet sections, ORDER blocks, GUIDE sections and TOOLS blocks
  follow the same rule. TCMs and map symbols are orientation (they are briefed there).
- **CASEVAC is ¶4**, so every CASEVAC block is amber; icons, not colors, tell its blocks
  apart.
- Sub-blocks may take a different order color than their parent when their content feeds
  a different paragraph (e.g. "Enemy" inside the GUIDE's writing formulas is navy).
- The `Theme` prop is semantic: `orient | situation | mission | execution | admin |
  command | ref`. Never pick a theme for looks.

## 2. Status colors (findings, checks, callouts)

`--ok-*` green, `--warn-*` amber, `--bad-*` red — **always** paired with an icon
(✓ check, ! alert, ✗ cross) and shown as a tinted strip, never as a solid tile, so a
status can't be mistaken for a paragraph. Callouts: INSTRUCTOR TIP (ok tint), COMMON
MISTAKE (bad tint), EXAMPLE and NOTE (neutral tints).

## 3. Sketch symbology (inside SVG sketches only)

Doctrinal, not ours to change: friendly **blue**, hostile **red**, medical red cross, triage
**red / yellow / green / black**, departure green, wind blue, obstacles rust. These colors
appear only inside sketches and the map-symbols appendix, each with a legend or label.

## Blackout

Blackout remaps every token above to red-on-black; meaning is then carried by icons,
labels and position, which is why every colored element also has one of those.

## Icons

One icon language for every tile, chip and toolbar:

- 24 × 24 grid, 2 px stroke, round caps and joins, `currentColor`, no fills except small
  dots — the same construction as the lucide icons in the header and nav, so custom and
  library icons sit together.
- Custom icons (`src/components/icons.tsx`) cover what lucide doesn't draw in military
  terms: HLZ, CCP, security position, TCM boundary, phase line, objective, obstacle wire,
  terrain model, tasking statement, grading sheet, stopwatch (replaces the ⏱ emoji, which
  rendered as a color emoji on iOS), etc.
- **Letters and numerals stay where they *are* the content:** paragraph numbers on ORDER
  tiles (1–5), METT-T letters, and mnemonic sub-block codes (TK, CI, EN). Everything else
  that was a stray glyph (✓ ◇ Σ Aa ▣ ↔ ▲ ⊸ ⊘ ⬒ ◫ ✎ ⏱ #) is an icon.
- Icons are decorative (`aria-hidden`); the block name carries the meaning.
