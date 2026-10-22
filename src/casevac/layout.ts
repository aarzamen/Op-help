import { add, len, mul, sub, type Vec } from './geo';
import type { ViewBox } from './hlz';

/** Approximate width of a JetBrains Mono label (0.6 em advance per character). */
export const monoWidth = (text: string, size: number) => text.length * size * 0.6;

/**
 * Shift a label's anchor so the whole text box stays inside the sketch frame
 * (labels at the end of long arrows otherwise run off the edge).
 */
export function clampLabel(
  at: Vec,
  text: string,
  size: number,
  view: ViewBox,
  anchor: 'start' | 'middle' | 'end' = 'middle'
): Vec {
  const u = view.w / 100;
  const w = monoWidth(text, size);
  const left = anchor === 'start' ? at.x : anchor === 'end' ? at.x - w : at.x - w / 2;
  const minLeft = view.minX + u;
  const maxLeft = view.minX + view.w - u - w;
  const dx =
    left < minLeft ? minLeft - left : left > maxLeft ? Math.max(minLeft - left, maxLeft - left) : 0;
  const halfH = size * 0.6;
  const y = Math.min(Math.max(at.y, view.minY + u + halfH), view.minY + view.h - u - halfH);
  return { x: at.x + dx, y };
}

/** Points every `step` along a polyline — stand-ins for "something is drawn here". */
export function samplePath(path: Vec[], step: number): Vec[] {
  const out: Vec[] = [];
  for (let i = 0; i < path.length - 1; i++) {
    const a = path[i];
    const d = sub(path[i + 1], a);
    const n = Math.max(1, Math.ceil(len(d) / step));
    for (let k = 0; k <= n; k++) out.push(add(a, mul(d, k / n)));
  }
  return out;
}

/** Sample points across a centered label so badges keep clear of the text. */
export const labelPoints = (at: Vec, text: string, size: number): Vec[] => {
  const half = monoWidth(text, size) / 2;
  return samplePath(
    [
      { x: at.x - half, y: at.y },
      { x: at.x + half, y: at.y },
    ],
    Math.max(size, 1)
  );
};

export type Corner = 'tr' | 'tl' | 'br' | 'bl' | 'tm' | 'bm' | 'lm' | 'rm';

/** Center of a round badge (radius ≈ 8.5% of the frame) parked at a frame position. */
function spot(view: ViewBox, c: Corner): Vec {
  const u = view.w / 100;
  const xL = view.minX + u * 9;
  const xR = view.minX + view.w - u * 9;
  const xM = view.minX + view.w / 2;
  const yT = view.minY + view.h - u * 9.5;
  const yB = view.minY + u * 9.5;
  const yM = view.minY + view.h / 2;
  return {
    tr: { x: xR, y: yT },
    tl: { x: xL, y: yT },
    br: { x: xR, y: yB },
    bl: { x: xL, y: yB },
    tm: { x: xM, y: yT },
    bm: { x: xM, y: yB },
    lm: { x: xL, y: yM },
    rm: { x: xR, y: yM },
  }[c];
}

/**
 * Pick badge positions (north arrow, wind rose) in preference order: the first spot with
 * nothing drawn within `clear` (default 8.5% of the frame) wins; failing that, the
 * emptiest spot. Each pick is then treated as occupied for the next badge.
 */
export function freeSpots(
  view: ViewBox,
  occupied: Vec[],
  prefs: Corner[][],
  clear = view.w * 0.085
): Vec[] {
  const taken = [...occupied];
  const used = new Set<Corner>();
  return prefs.map((order) => {
    const scored = order
      .filter((c) => !used.has(c))
      .map((c) => {
        const at = spot(view, c);
        const score = taken.length ? Math.min(...taken.map((p) => len(sub(p, at)))) : Infinity;
        return { c, at, score };
      });
    const pick =
      scored.find((s) => s.score >= clear) ?? scored.reduce((a, b) => (b.score > a.score ? b : a));
    used.add(pick.c);
    taken.push(pick.at);
    return pick.at;
  });
}

/** Scale-bar footprint (bottom-left), matching ScaleBar in svg.tsx. */
export function scaleBarPoints(view: ViewBox): Vec[] {
  const u = view.w / 100;
  const steps = [5, 10, 20, 25, 50, 100, 200, 250, 500, 1000, 2000, 5000];
  const L = steps.find((s) => s >= view.w * 0.2) ?? 5000;
  const x0 = view.minX + u * 4;
  const y0 = view.minY + u * 6;
  return samplePath(
    [
      { x: x0 - u * 2, y: y0 },
      { x: x0 + L + u * 3, y: y0 },
    ],
    u * 2
  );
}

/** Badge centers → the anchor each component draws from. */
export const northAnchor = (center: Vec, u: number): Vec => ({ x: center.x, y: center.y - u * 3 });
export const windAnchor = (center: Vec, u: number): Vec => ({ x: center.x, y: center.y + u * 1.5 });
