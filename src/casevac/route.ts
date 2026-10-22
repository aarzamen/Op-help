import { NODE_KINDS, type RouteSheet } from './model';

export interface RouteTimeline {
  cum: number[]; // minutes from point of injury at each node
  cumKm: number[];
  firstSurgical: number; // index of the first Role 2/3 node, -1 if none
  toSurgicalMin: number | null;
  urgentOk: boolean | null; // ≤ 60 min POI → surgical (Urgent / Urgent-Surgical planning standard)
}

export const isSurgical = (kind: string) => !!NODE_KINDS.find((k) => k.kind === kind)?.surgical;

export function routeTimeline(route: RouteSheet): RouteTimeline {
  const cum = [0];
  const cumKm = [0];
  route.legs.forEach((l, i) => {
    cum.push(cum[i] + Math.max(0, l.timeMin || 0));
    cumKm.push(cumKm[i] + Math.max(0, l.distKm || 0));
  });
  const firstSurgical = route.nodes.findIndex((n) => isSurgical(n.kind));
  const toSurgicalMin = firstSurgical > 0 ? cum[firstSurgical] : null;
  return {
    cum,
    cumKm,
    firstSurgical,
    toSurgicalMin,
    urgentOk: toSurgicalMin === null ? null : toSurgicalMin <= 60,
  };
}

export const fmtMin = (m: number) =>
  m >= 60
    ? `${Math.floor(m / 60)} h ${String(Math.round(m % 60)).padStart(2, '0')} min`
    : `${Math.round(m)} min`;

/** Node-link schematic geometry, shared by the on-screen chain and the export sheet. */
export function schematicGeom(n: number, vertical: boolean) {
  const S = vertical ? 108 : 236;
  const boxW = vertical ? 170 : 116;
  const boxH = vertical ? 52 : 58;
  const view = vertical
    ? { x: -boxW / 2 - 10, y: -boxH / 2 - 14, w: boxW + 112, h: (n - 1) * S + boxH + 74 }
    : { x: -boxW / 2 - 18, y: -boxH / 2 - 30, w: (n - 1) * S + boxW + 36, h: boxH + 150 };
  return { S, boxW, boxH, view };
}
