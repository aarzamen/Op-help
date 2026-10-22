import {
  add,
  dot,
  gridDelta,
  len,
  magToGrid,
  mul,
  norm360,
  pad3,
  sub,
  unit,
  type NorthReference,
  type Vec,
} from './geo';
import {
  clampLabel,
  freeSpots,
  labelPoints,
  northAnchor,
  samplePath,
  scaleBarPoints,
  windAnchor,
} from './layout';
import { lpDiameter, type HlzSheet } from './model';

export interface ViewBox {
  minX: number;
  minY: number; // bottom edge (world y is north-up)
  w: number;
  h: number;
}

export interface ObstacleCheck {
  id: string;
  path: 'approach' | 'departure' | null;
  along: number; // m from the nearest landing point, along the flight path
  required: number; // 10 × obstacle height
  ok: boolean | null; // null = not on an approach/departure path
}

export interface WindCheck {
  head: number; // + headwind / − tailwind (kt)
  cross: number; // magnitude (kt)
  from: 'left' | 'right' | 'none';
}

export interface HlzGeom {
  gm: number;
  approachAz: number; // grid, direction of flight
  departureAz: number;
  windFromAz: number;
  D: number;
  L: number;
  W: number;
  uA: Vec;
  uP: Vec;
  uD: Vec;
  lps: Vec[]; // LP1 (lead) first
  corners: Vec[];
  approachFrom: Vec;
  approachTo: Vec;
  departureFrom: Vec;
  departureTo: Vec;
  checks: ObstacleCheck[];
  wind: WindCheck | null;
  ccpPos: Vec;
  ccpFromGrid: boolean;
  litterRouteM: number;
}

/** "10:1" — FM 3-21.38: with obstacles on the approach/departure route, 1 m of height needs 10 m of distance. */
export const OBSTACLE_RATIO = 10;

export function computeHlz(hlz: HlzSheet, north: NorthReference | null, ccpGrid: string): HlzGeom {
  const gm = north?.gm ?? 0;
  const approachAz = magToGrid(hlz.approachMag, gm);
  const departureAz = magToGrid(hlz.departureMag, gm);
  const windFromAz = magToGrid(hlz.windFromMag, gm);
  const uA = unit(approachAz);
  const uP = unit(approachAz + 90);
  const uD = unit(departureAz);
  const D = lpDiameter(hlz.lpSize);
  const n = Math.max(1, Math.min(8, Math.round(hlz.lpCount) || 1));
  const s = Math.max(D, hlz.lpSpacing || D);
  const margin = D * 0.25;

  // Trail: lead aircraft lands farthest along the direction of flight, the rest behind it.
  const lps: Vec[] = [];
  for (let i = 0; i < n; i++) {
    const k = (n - 1) / 2 - i;
    lps.push(hlz.formation === 'trail' ? mul(uA, k * s) : mul(uP, -k * s));
  }

  const autoL = hlz.formation === 'trail' ? (n - 1) * s + D + 2 * margin : D + 2 * margin;
  const autoW = hlz.formation === 'trail' ? D + 2 * margin : (n - 1) * s + D + 2 * margin;
  const L = hlz.autoZone ? autoL : Math.max(10, hlz.zoneL);
  const W = hlz.autoZone ? autoW : Math.max(10, hlz.zoneW);

  const corners = [
    add(mul(uA, L / 2), mul(uP, -W / 2)),
    add(mul(uA, L / 2), mul(uP, W / 2)),
    add(mul(uA, -L / 2), mul(uP, W / 2)),
    add(mul(uA, -L / 2), mul(uP, -W / 2)),
  ];

  const arrow = Math.min(320, Math.max(90, L * 0.9));
  const approachTo = mul(uA, -L / 2 - 6);
  const approachFrom = mul(uA, -L / 2 - arrow);
  const extentD = Math.max(...corners.map((c) => dot(c, uD)));
  const departureFrom = mul(uD, extentD + 6);
  const departureTo = mul(uD, extentD + arrow);

  // 10:1 check against the most restrictive landing point for each path.
  const rear = lps.reduce((a, b) => (dot(b, uA) < dot(a, uA) ? b : a));
  const front = lps.reduce((a, b) => (dot(b, uD) > dot(a, uD) ? b : a));
  const uDp = unit(departureAz + 90);
  const halfCorridor = W / 2 + D / 4;
  const checks: ObstacleCheck[] = hlz.obstacles.map((o) => {
    const relA = sub(o.pos, rear);
    const alongA = -dot(relA, uA);
    const inA = alongA > 0 && Math.abs(dot(relA, uP)) <= halfCorridor;
    const relD = sub(o.pos, front);
    const alongD = dot(relD, uD);
    const inD = alongD > 0 && Math.abs(dot(relD, uDp)) <= halfCorridor;
    const required = OBSTACLE_RATIO * Math.max(0, o.heightM);
    if (!inA && !inD) return { id: o.id, path: null, along: 0, required, ok: null };
    const useA = inA && (!inD || alongA <= alongD);
    const along = useA ? alongA : alongD;
    return {
      id: o.id,
      path: useA ? 'approach' : 'departure',
      along,
      required,
      ok: along >= required,
    };
  });

  let wind: WindCheck | null = null;
  if (hlz.windKts > 0) {
    const diff = ((windFromAz - approachAz + 540) % 360) - 180; // + = wind from the right
    const rad = (diff * Math.PI) / 180;
    const cross = Math.abs(hlz.windKts * Math.sin(rad));
    wind = {
      head: hlz.windKts * Math.cos(rad),
      cross,
      from: cross < 0.5 ? 'none' : diff > 0 ? 'right' : 'left',
    };
  }

  const delta = ccpGrid.trim() ? gridDelta(hlz.grid, ccpGrid) : null;
  const ccpFromGrid = !!delta && len(delta) < 5000;
  const ccpPos = ccpFromGrid ? delta! : hlz.ccpPos;

  return {
    gm,
    approachAz,
    departureAz,
    windFromAz,
    D,
    L,
    W,
    uA,
    uP,
    uD,
    lps,
    corners,
    approachFrom,
    approachTo,
    departureFrom,
    departureTo,
    checks,
    wind,
    ccpPos,
    ccpFromGrid,
    litterRouteM: len(sub(ccpPos, hlz.loadPoint)),
  };
}

/** Square view around every drawn element, padded for labels. */
export function fitView(points: Vec[], pad = 0.14, minSize = 120): ViewBox {
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const size = Math.max(minSize, maxX - minX, maxY - minY) * (1 + pad * 2);
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  return { minX: cx - size / 2, minY: cy - size / 2, w: size, h: size };
}

export function hlzView(hlz: HlzSheet, g: HlzGeom): ViewBox {
  return fitView([
    ...g.corners,
    g.approachFrom,
    g.departureTo,
    ...hlz.obstacles.map((o) => o.pos),
    ...hlz.security.map((m) => m.pos),
    hlz.loadPoint,
    g.ccpPos,
  ]);
}

/** Approach / departure labels just past each arrow's far end, kept inside the frame. */
export function hlzEdgeLabels(hlz: HlzSheet, g: HlzGeom, view: ViewBox) {
  const u = view.w / 100;
  const size = u * 2.1;
  const approach = `APPROACH ${pad3(hlz.approachMag)}°M`;
  const departure = `DEPART ${pad3(hlz.departureMag)}°M`;
  return {
    size,
    approach: {
      text: approach,
      at: clampLabel(add(g.approachFrom, mul(g.uA, -u * 3.5)), approach, size, view),
    },
    departure: {
      text: departure,
      at: clampLabel(add(g.departureTo, mul(g.uD, u * 3.5)), departure, size, view),
    },
  };
}

/** North-arrow and wind-rose anchors on the HLZ sketch, parked clear of arrows, labels and markers. */
export function hlzDecor(
  hlz: HlzSheet,
  g: HlzGeom,
  view: ViewBox
): { north: Vec; wind: Vec; centers: Vec[] } {
  const u = view.w / 100;
  const labels = hlzEdgeLabels(hlz, g, view);
  const occupied = [
    ...samplePath([g.approachFrom, g.approachTo], u * 2),
    ...samplePath([g.departureFrom, g.departureTo], u * 2),
    ...samplePath([...g.corners, g.corners[0]], u * 3),
    ...g.lps,
    ...hlz.obstacles.flatMap((o) => [o.pos, { x: o.pos.x, y: o.pos.y - u * 4.2 }]),
    ...hlz.security.map((m) => m.pos),
    ...samplePath([hlz.loadPoint, g.ccpPos], u * 3),
    { x: hlz.loadPoint.x, y: hlz.loadPoint.y - u * 4 },
    ...labelPoints(labels.approach.at, labels.approach.text, labels.size),
    ...labelPoints(labels.departure.at, labels.departure.text, labels.size),
    ...scaleBarPoints(view),
  ];
  const [north, wind] = freeSpots(view, occupied, [
    ['tr', 'tl', 'br', 'bl', 'tm', 'rm', 'lm', 'bm'],
    ['tl', 'tr', 'bl', 'br', 'lm', 'rm', 'tm', 'bm'],
  ]);
  return { north: northAnchor(north, u), wind: windAnchor(wind, u), centers: [north, wind] };
}

/** Plain-English one-liners for the warnings strip and the data block. */
export function hlzFindings(
  hlz: HlzSheet,
  g: HlzGeom
): { level: 'ok' | 'warn' | 'bad'; text: string }[] {
  const out: { level: 'ok' | 'warn' | 'bad'; text: string }[] = [];
  hlz.obstacles.forEach((o) => {
    const c = g.checks.find((k) => k.id === o.id);
    if (!c || c.ok === null) return;
    const what = `${o.kind.toUpperCase()} ${o.heightM} m on ${c.path}`;
    out.push(
      c.ok
        ? { level: 'ok', text: `10:1 ✓ ${what}: ${Math.round(c.along)} m ≥ ${c.required} m` }
        : {
            level: 'bad',
            text: `10:1 ✗ ${what}: ${Math.round(c.along)} m < ${c.required} m — move LPs, lengthen the zone, or change heading`,
          }
    );
  });
  if (g.wind) {
    if (g.wind.head < -0.5) {
      out.push({
        level: 'bad',
        text: `TAILWIND ${Math.abs(g.wind.head).toFixed(0)} kt on approach — land into the wind`,
      });
    } else {
      out.push({
        level: g.wind.cross > 10 ? 'warn' : 'ok',
        text: `HEADWIND ${g.wind.head.toFixed(0)} kt · CROSSWIND ${g.wind.cross.toFixed(0)} kt${g.wind.from === 'none' ? '' : ` from ${g.wind.from}`}`,
      });
    }
  }
  if (
    Math.abs(norm360(hlz.departureMag - hlz.approachMag)) > 90 &&
    Math.abs(norm360(hlz.departureMag - hlz.approachMag)) < 270
  ) {
    out.push({
      level: 'warn',
      text: 'Departure turns more than 90° from the approach — confirm with aviation',
    });
  }
  return out;
}
