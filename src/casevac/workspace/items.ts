import {
  azimuth,
  gridDelta,
  norm360,
  offsetMgrs,
  parseMgrs,
  type NorthReference,
  type Vec,
} from '../geo';
import type { HlzGeom } from '../hlz';
import {
  CCP_AREA_META,
  NODE_KINDS,
  OBSTACLE_KINDS,
  newId,
  type CasevacPlan,
  type CcpAreaKind,
  type NodeKind,
  type ObstacleKind,
  type SheetId,
} from '../model';

/**
 * Everything the workspace can select on a sheet, keyed by the same ids the sketch layers
 * put on `data-item` (`obs:<id>`, `sec:<id>`, `area:<kind>`, `node:<id>`, `load`, `ccp`,
 * `appr`, `dep`, `zone`). All edits return a new plan; nothing here touches React.
 */

export type ItemKind =
  'obstacle' | 'security' | 'load' | 'ccp' | 'approach' | 'departure' | 'zone' | 'area' | 'node';

export interface SketchItem {
  id: string;
  kind: ItemKind;
  title: string;
  pos: Vec;
  /** Selection-ring radius, world meters. */
  r: number;
  canDrag: boolean;
  canDelete: boolean;
  canDuplicate: boolean;
}

export interface ItemCtx {
  /** Drawing unit of the sheet (view.w / 100). */
  u: number;
  hlzGeom: HlzGeom;
  hlzNorth: NorthReference | null;
}

const split = (id: string) => {
  const i = id.indexOf(':');
  return i < 0 ? [id, ''] : [id.slice(0, i), id.slice(i + 1)];
};

const obstacleLabel = (kind: ObstacleKind) =>
  OBSTACLE_KINDS.find((o) => o.kind === kind)?.label ?? 'Obstacle';
export const nodeKindLabel = (kind: NodeKind) =>
  NODE_KINDS.find((k) => k.kind === kind)?.label ?? 'Node';

export function listItems(plan: CasevacPlan, sheet: SheetId, ctx: ItemCtx): SketchItem[] {
  const { u } = ctx;
  if (sheet === 'hlz') {
    const g = ctx.hlzGeom;
    const h = plan.hlz;
    const items: SketchItem[] = [
      {
        id: 'zone',
        kind: 'zone',
        title: h.name || 'HLZ',
        pos: { x: 0, y: 0 },
        r: Math.max(g.L, g.W) / 2 + u * 2,
        canDrag: false,
        canDelete: false,
        canDuplicate: false,
      },
      {
        id: 'appr',
        kind: 'approach',
        title: 'Final approach',
        pos: g.approachFrom,
        r: u * 3.2,
        canDrag: true,
        canDelete: false,
        canDuplicate: false,
      },
      {
        id: 'dep',
        kind: 'departure',
        title: 'Departure',
        pos: g.departureTo,
        r: u * 3.2,
        canDrag: true,
        canDelete: false,
        canDuplicate: false,
      },
      ...h.obstacles.map<SketchItem>((o) => ({
        id: `obs:${o.id}`,
        kind: 'obstacle',
        title: `${obstacleLabel(o.kind)} · ${o.heightM} m`,
        pos: o.pos,
        r: u * 4,
        canDrag: true,
        canDelete: true,
        canDuplicate: true,
      })),
      ...h.security.map<SketchItem>((m) => ({
        id: `sec:${m.id}`,
        kind: 'security',
        title: m.label || 'Security position',
        pos: m.pos,
        r: u * 3.4,
        canDrag: true,
        canDelete: true,
        canDuplicate: true,
      })),
      {
        id: 'load',
        kind: 'load',
        title: 'Casualty loading point',
        pos: h.loadPoint,
        r: u * 3.4,
        canDrag: true,
        canDelete: false,
        canDuplicate: false,
      },
    ];
    if (!g.ccpFromGrid)
      items.push({
        id: 'ccp',
        kind: 'ccp',
        title: plan.ccp.name || 'CCP',
        pos: g.ccpPos,
        r: u * 4.6,
        canDrag: true,
        canDelete: false,
        canDuplicate: false,
      });
    return items;
  }
  if (sheet === 'ccp') {
    return [
      ...plan.ccp.areas
        .filter((a) => a.enabled)
        .map<SketchItem>((a) => ({
          id: `area:${a.kind}`,
          kind: 'area',
          title: CCP_AREA_META[a.kind].label,
          pos: a.pos,
          r: Math.hypot(a.w, a.h) / 2 + u,
          canDrag: true,
          canDelete: a.kind !== 'triage',
          canDuplicate: false,
        })),
      ...plan.ccp.security.map<SketchItem>((m) => ({
        id: `sec:${m.id}`,
        kind: 'security',
        title: m.label || 'Security position',
        pos: m.pos,
        r: u * 3.4,
        canDrag: true,
        canDelete: true,
        canDuplicate: true,
      })),
    ];
  }
  return plan.route.nodes.map<SketchItem>((n) => ({
    id: `node:${n.id}`,
    kind: 'node',
    title: n.name || nodeKindLabel(n.kind),
    pos: n.pos,
    r: u * 4.2,
    canDrag: true,
    canDelete: plan.route.nodes.length > 2,
    canDuplicate: false,
  }));
}

export const findItem = (plan: CasevacPlan, sheet: SheetId, id: string | null, ctx: ItemCtx) =>
  id ? (listItems(plan, sheet, ctx).find((i) => i.id === id) ?? null) : null;

const round = (v: Vec): Vec => ({ x: Math.round(v.x), y: Math.round(v.y) });
const mag = (gridAz: number, ctx: ItemCtx) =>
  (Math.round(norm360(gridAz - (ctx.hlzNorth?.gm ?? 0)) / 5) * 5) % 360;

/** Move an item. Dragging the approach tail / departure head turns the heading (5° steps). */
export function moveItem(
  plan: CasevacPlan,
  sheet: SheetId,
  id: string,
  pos: Vec,
  ctx: ItemCtx
): CasevacPlan {
  const [kind, key] = split(id);
  const p = round(pos);
  if (sheet === 'hlz') {
    const h = plan.hlz;
    if (kind === 'appr') {
      if (Math.hypot(p.x, p.y) < 5) return plan;
      return { ...plan, hlz: { ...h, approachMag: mag(azimuth(p, { x: 0, y: 0 }), ctx) } };
    }
    if (kind === 'dep') {
      if (Math.hypot(p.x, p.y) < 5) return plan;
      return { ...plan, hlz: { ...h, departureMag: mag(azimuth({ x: 0, y: 0 }, p), ctx) } };
    }
    if (kind === 'obs')
      return {
        ...plan,
        hlz: { ...h, obstacles: h.obstacles.map((o) => (o.id === key ? { ...o, pos: p } : o)) },
      };
    if (kind === 'sec')
      return {
        ...plan,
        hlz: { ...h, security: h.security.map((m) => (m.id === key ? { ...m, pos: p } : m)) },
      };
    if (kind === 'load') return { ...plan, hlz: { ...h, loadPoint: p } };
    if (kind === 'ccp') return { ...plan, hlz: { ...h, ccpPos: p } };
  }
  if (sheet === 'ccp') {
    const c = plan.ccp;
    if (kind === 'area')
      return {
        ...plan,
        ccp: { ...c, areas: c.areas.map((a) => (a.kind === key ? { ...a, pos: p } : a)) },
      };
    if (kind === 'sec')
      return {
        ...plan,
        ccp: { ...c, security: c.security.map((m) => (m.id === key ? { ...m, pos: p } : m)) },
      };
  }
  if (sheet === 'route' && kind === 'node')
    return {
      ...plan,
      route: {
        ...plan.route,
        nodes: plan.route.nodes.map((n) => (n.id === key ? { ...n, pos: p } : n)),
      },
    };
  return plan;
}

export function deleteItem(plan: CasevacPlan, sheet: SheetId, id: string): CasevacPlan {
  const [kind, key] = split(id);
  if (sheet === 'hlz') {
    const h = plan.hlz;
    if (kind === 'obs')
      return { ...plan, hlz: { ...h, obstacles: h.obstacles.filter((o) => o.id !== key) } };
    if (kind === 'sec')
      return { ...plan, hlz: { ...h, security: h.security.filter((m) => m.id !== key) } };
  }
  if (sheet === 'ccp') {
    const c = plan.ccp;
    if (kind === 'sec')
      return { ...plan, ccp: { ...c, security: c.security.filter((m) => m.id !== key) } };
    if (kind === 'area' && key !== 'triage')
      return {
        ...plan,
        ccp: { ...c, areas: c.areas.map((a) => (a.kind === key ? { ...a, enabled: false } : a)) },
      };
  }
  if (sheet === 'route' && kind === 'node') {
    const r = plan.route;
    const i = r.nodes.findIndex((n) => n.id === key);
    if (i < 0 || r.nodes.length <= 2) return plan;
    const legs = [...r.legs];
    if (i === 0) legs.splice(0, 1);
    else if (i === r.nodes.length - 1) legs.splice(i - 1, 1);
    else {
      // Merge the legs on either side so the chain's totals don't change.
      const a = legs[i - 1];
      const b = legs[i];
      legs.splice(i - 1, 2, {
        ...a,
        distKm: Math.round((a.distKm + b.distKm) * 10) / 10,
        timeMin: a.timeMin + b.timeMin,
      });
    }
    return { ...plan, route: { ...r, nodes: r.nodes.filter((n) => n.id !== key), legs } };
  }
  return plan;
}

export function duplicateItem(
  plan: CasevacPlan,
  sheet: SheetId,
  id: string
): { plan: CasevacPlan; id: string | null } {
  const [kind, key] = split(id);
  const nudge = (v: Vec) => ({ x: v.x + 12, y: v.y - 12 });
  const fresh = newId();
  if (sheet === 'hlz' && kind === 'obs') {
    const o = plan.hlz.obstacles.find((x) => x.id === key);
    if (!o) return { plan, id: null };
    return {
      plan: {
        ...plan,
        hlz: {
          ...plan.hlz,
          obstacles: [...plan.hlz.obstacles, { ...o, id: fresh, pos: nudge(o.pos) }],
        },
      },
      id: `obs:${fresh}`,
    };
  }
  if (kind === 'sec' && (sheet === 'hlz' || sheet === 'ccp')) {
    const list = sheet === 'hlz' ? plan.hlz.security : plan.ccp.security;
    const m = list.find((x) => x.id === key);
    if (!m) return { plan, id: null };
    const next = [...list, { ...m, id: fresh, pos: nudge(m.pos) }];
    return {
      plan:
        sheet === 'hlz'
          ? { ...plan, hlz: { ...plan.hlz, security: next } }
          : { ...plan, ccp: { ...plan.ccp, security: next } },
      id: `sec:${fresh}`,
    };
  }
  return { plan, id: null };
}

export interface AddOption {
  key: string;
  label: string;
  group: string;
}

export function addOptions(plan: CasevacPlan, sheet: SheetId, ctx: ItemCtx): AddOption[] {
  if (sheet === 'hlz')
    return [
      ...OBSTACLE_KINDS.map((o) => ({ key: `obs:${o.kind}`, label: o.label, group: 'Obstacle' })),
      { key: 'sec', label: 'Security position', group: 'Position' },
      { key: 'load', label: 'Move the casualty loading point here', group: 'Position' },
      ...(ctx.hlzGeom.ccpFromGrid
        ? []
        : [{ key: 'ccp', label: 'Move the CCP here', group: 'Position' }]),
    ];
  if (sheet === 'ccp')
    return [
      { key: 'sec', label: 'Security position', group: 'Position' },
      ...plan.ccp.areas
        .filter((a) => !a.enabled)
        .map((a) => ({
          key: `area:${a.kind}`,
          label: `${CCP_AREA_META[a.kind].label} area`,
          group: 'Show area',
        })),
    ];
  return NODE_KINDS.map((k) => ({ key: `node:${k.kind}`, label: k.label, group: 'Stop' }));
}

/** Add something at `pos`. Route stops go after `afterId` when given, else at the end. */
export function addItem(
  plan: CasevacPlan,
  sheet: SheetId,
  key: string,
  pos: Vec,
  afterId: string | null
): { plan: CasevacPlan; id: string | null } {
  const [kind, sub] = split(key);
  const p = round(pos);
  const id = newId();
  if (sheet === 'hlz') {
    const h = plan.hlz;
    if (kind === 'obs') {
      const meta = OBSTACLE_KINDS.find((o) => o.kind === sub) ?? OBSTACLE_KINDS[0];
      return {
        plan: {
          ...plan,
          hlz: {
            ...h,
            obstacles: [
              ...h.obstacles,
              { id, kind: meta.kind, pos: p, heightM: meta.defaultH, note: '' },
            ],
          },
        },
        id: `obs:${id}`,
      };
    }
    if (kind === 'sec')
      return {
        plan: { ...plan, hlz: { ...h, security: [...h.security, { id, pos: p, label: 'SEC' }] } },
        id: `sec:${id}`,
      };
    if (kind === 'load') return { plan: { ...plan, hlz: { ...h, loadPoint: p } }, id: 'load' };
    if (kind === 'ccp') return { plan: { ...plan, hlz: { ...h, ccpPos: p } }, id: 'ccp' };
  }
  if (sheet === 'ccp') {
    const c = plan.ccp;
    if (kind === 'sec')
      return {
        plan: { ...plan, ccp: { ...c, security: [...c.security, { id, pos: p, label: 'SEC' }] } },
        id: `sec:${id}`,
      };
    if (kind === 'area')
      return {
        plan: {
          ...plan,
          ccp: {
            ...c,
            areas: c.areas.map((a) =>
              a.kind === (sub as CcpAreaKind) ? { ...a, enabled: true, pos: p } : a
            ),
          },
        },
        id: `area:${sub}`,
      };
  }
  if (sheet === 'route' && kind === 'node') {
    const r = plan.route;
    const nk = (NODE_KINDS.find((k) => k.kind === sub)?.kind ?? 'other') as NodeKind;
    const afterIdx = afterId ? r.nodes.findIndex((n) => `node:${n.id}` === afterId) : -1;
    const at = afterIdx >= 0 ? afterIdx + 1 : r.nodes.length;
    const nodes = [...r.nodes];
    nodes.splice(at, 0, { id, kind: nk, name: nodeKindLabel(nk), grid: '', note: '', pos: p });
    const legs = [...r.legs];
    // New leg joins nodes[at - 1] → the new node; the old leg now starts at the new node.
    legs.splice(Math.max(0, at - 1), 0, {
      mode: 'ground',
      distKm: 0,
      timeMin: 0,
      route: '',
      net: '',
      platform: '',
    });
    return { plan: { ...plan, route: { ...r, nodes, legs } }, id: `node:${id}` };
  }
  return { plan, id: null };
}

/** The sheet's reference grid for exact placement, or null when the sheet isn't to scale. */
export function sheetGrid(plan: CasevacPlan, sheet: SheetId, hasImage: boolean): string | null {
  if (sheet === 'hlz') return parseMgrs(plan.hlz.grid) ? plan.hlz.grid : null;
  if (sheet === 'ccp' && hasImage) return parseMgrs(plan.ccp.grid) ? plan.ccp.grid : null;
  return null;
}

/** 10-digit MGRS of a world position on a gridded sheet. */
export function itemGrid(refGrid: string, pos: Vec): string | null {
  const ref = parseMgrs(refGrid);
  return ref ? offsetMgrs(ref, pos.x, pos.y, 5) : null;
}

/** World position of a typed MGRS on a gridded sheet, or null if it doesn't parse / is far off. */
export function gridToPos(refGrid: string, typed: string): Vec | null {
  const d = gridDelta(refGrid, typed);
  return d && Math.hypot(d.x, d.y) < 20000 ? round(d) : null;
}
