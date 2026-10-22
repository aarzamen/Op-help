import {
  add,
  azimuth,
  gridDelta,
  len,
  mul,
  pad3,
  unit,
  type NorthReference,
  type Vec,
} from './geo';
import { fitView, type ViewBox } from './hlz';
import {
  clampLabel,
  freeSpots,
  labelPoints,
  northAnchor,
  samplePath,
  scaleBarPoints,
} from './layout';
import type { CcpArea, CcpAreaKind, CcpSheet } from './model';

export interface CcpGeom {
  view: ViewBox;
  byKind: Partial<Record<CcpAreaKind, CcpArea>>;
  flow: Vec; // unit vector, entrance → loading
  hlz: { distM: number; azGrid: number; azMag: number | null } | null;
  poiFrom: Vec; // start of the "from POI" arrow
  exitTo: Vec; // end of the "to HLZ / AXP" arrow
  exitFrom: Vec;
}

/** Point where the segment from a rectangle's center toward `toward` leaves the rectangle. */
export function rectEdge(c: Vec, w: number, h: number, toward: Vec): Vec {
  const dx = toward.x - c.x;
  const dy = toward.y - c.y;
  if (!dx && !dy) return c;
  const tx = dx ? w / 2 / Math.abs(dx) : Infinity;
  const ty = dy ? h / 2 / Math.abs(dy) : Infinity;
  const t = Math.min(tx, ty);
  return { x: c.x + dx * t, y: c.y + dy * t };
}

export function computeCcp(ccp: CcpSheet, hlzGrid: string, north: NorthReference | null): CcpGeom {
  const byKind: Partial<Record<CcpAreaKind, CcpArea>> = {};
  ccp.areas.forEach((a) => {
    if (a.enabled) byKind[a.kind] = a;
  });
  const flow = unit(ccp.flowAz);

  const delta = ccp.grid.trim() && hlzGrid.trim() ? gridDelta(ccp.grid, hlzGrid) : null;
  const hlz =
    delta && len(delta) > 0 && len(delta) < 20000
      ? {
          distM: len(delta),
          azGrid: azimuth({ x: 0, y: 0 }, delta),
          azMag: north ? (((azimuth({ x: 0, y: 0 }, delta) - north.gm) % 360) + 360) % 360 : null,
        }
      : null;

  const triage = byKind.triage;
  const loading = byKind.loading ?? byKind.evac;
  const poiTo = triage
    ? rectEdge(triage.pos, triage.w, triage.h, {
        x: triage.pos.x - flow.x * 50,
        y: triage.pos.y - flow.y * 50,
      })
    : { x: 0, y: 0 };
  const poiFrom = { x: poiTo.x - flow.x * 14, y: poiTo.y - flow.y * 14 };
  // The exit continues the one-way flow out of the loading point; the label carries the real
  // distance and bearing to the HLZ (the CCP sheet is a not-to-scale layout).
  const exitFrom = loading
    ? rectEdge(loading.pos, loading.w, loading.h, {
        x: loading.pos.x + flow.x * 60,
        y: loading.pos.y + flow.y * 60,
      })
    : { x: 0, y: 0 };
  const exitTo = { x: exitFrom.x + flow.x * 14, y: exitFrom.y + flow.y * 14 };

  const corners: Vec[] = [];
  ccp.areas
    .filter((a) => a.enabled)
    .forEach((a) => {
      corners.push(
        { x: a.pos.x - a.w / 2, y: a.pos.y - a.h / 2 },
        { x: a.pos.x + a.w / 2, y: a.pos.y + a.h / 2 }
      );
    });
  ccp.security.forEach((m) => corners.push(m.pos));
  // Room past both arrow ends for their labels.
  corners.push(add(poiFrom, mul(flow, -8)), add(exitTo, mul(flow, 8)));

  return { view: fitView(corners, 0.18, 60), byKind, flow, hlz, poiFrom, exitTo, exitFrom };
}

/** Labels at the two ends of the flow: casualties in from the POI, out toward the HLZ. */
export function ccpFlowLabels(g: CcpGeom, view: ViewBox, hlzName: string) {
  const u = view.w / 100;
  const size = u * 1.6;
  const vertical = Math.abs(g.flow.y) > 0.5;
  const exit = g.hlz
    ? `TO ${hlzName || 'HLZ'} · ${Math.round(g.hlz.distM)} m @ ${pad3(g.hlz.azGrid)}°G${g.hlz.azMag !== null ? ` / ${pad3(g.hlz.azMag)}°M` : ''}`
    : 'TO HLZ / AXP';
  const poi = 'FROM POI · LITTER TEAMS';
  const below = { x: 0, y: -u * 2.6 };
  return {
    size,
    poi: {
      text: poi,
      at: clampLabel(add(g.poiFrom, vertical ? mul(g.flow, -u * 2.6) : below), poi, size, view),
    },
    exit: {
      text: exit,
      at: clampLabel(add(g.exitTo, vertical ? mul(g.flow, u * 2.6) : below), exit, size, view),
    },
  };
}

/** North-arrow anchor on the CCP sheet, clear of the areas, arrows and security. */
export function ccpDecor(
  ccp: CcpSheet,
  g: CcpGeom,
  view: ViewBox,
  hlzName: string
): { north: Vec; centers: Vec[] } {
  const u = view.w / 100;
  const labels = ccpFlowLabels(g, view, hlzName);
  const occupied = [
    ...ccp.areas
      .filter((a) => a.enabled)
      .flatMap((a) => {
        const x0 = a.pos.x - a.w / 2;
        const x1 = a.pos.x + a.w / 2;
        const y0 = a.pos.y - a.h / 2;
        const y1 = a.pos.y + a.h / 2;
        return samplePath(
          [
            { x: x0, y: y0 },
            { x: x1, y: y0 },
            { x: x1, y: y1 },
            { x: x0, y: y1 },
            { x: x0, y: y0 },
          ],
          u * 3
        );
      }),
    ...ccp.security.map((m) => m.pos),
    ...samplePath([g.poiFrom, add(g.poiFrom, mul(g.flow, 14))], u * 2),
    ...samplePath([g.exitFrom, g.exitTo], u * 2),
    ...labelPoints(labels.poi.at, labels.poi.text, labels.size),
    ...labelPoints(labels.exit.at, labels.exit.text, labels.size),
    ...scaleBarPoints(view),
  ];
  const [center] = freeSpots(view, occupied, [['tr', 'tl', 'br', 'bl', 'rm', 'lm', 'tm', 'bm']]);
  return { north: northAnchor(center, u), centers: [center] };
}
