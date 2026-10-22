import { describe, expect, it } from 'vitest';
import { computeHlz } from '../hlz';
import { defaultPlan, type CasevacPlan } from '../model';
import { routeTimeline } from '../route';
import {
  addItem,
  deleteItem,
  duplicateItem,
  gridToPos,
  itemGrid,
  listItems,
  moveItem,
  type ItemCtx,
} from './items';

const ctxFor = (plan: CasevacPlan, gm = 0): ItemCtx => {
  const north = { declination: gm, convergence: 0, gm };
  return { u: 5, hlzGeom: computeHlz(plan.hlz, north, plan.ccp.grid), hlzNorth: north };
};

describe('sketch items', () => {
  it('lists every movable thing on the HLZ sheet with unique ids', () => {
    const plan = defaultPlan();
    const items = listItems(plan, 'hlz', ctxFor(plan));
    const ids = items.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toEqual(expect.arrayContaining(['zone', 'appr', 'dep', 'load']));
    expect(ids.filter((i) => i.startsWith('obs:'))).toHaveLength(plan.hlz.obstacles.length);
  });

  it('moves an obstacle to whole meters without touching the input plan', () => {
    const plan = defaultPlan();
    const before = JSON.stringify(plan);
    const o = plan.hlz.obstacles[0];
    const next = moveItem(plan, 'hlz', `obs:${o.id}`, { x: 10.4, y: -20.6 }, ctxFor(plan));
    expect(next.hlz.obstacles[0].pos).toEqual({ x: 10, y: -21 });
    expect(JSON.stringify(plan)).toBe(before);
  });

  it('turns the approach heading in 5° magnetic steps from the dragged tail', () => {
    const plan = defaultPlan();
    // Tail due south of the zone → flying north (grid 000) → magnetic 350 with a 10°E G-M.
    const next = moveItem(plan, 'hlz', 'appr', { x: 0, y: -200 }, ctxFor(plan, 10));
    expect(next.hlz.approachMag).toBe(350);
    const odd = moveItem(plan, 'hlz', 'appr', { x: -100, y: -173 }, ctxFor(plan, 0));
    expect(odd.hlz.approachMag % 5).toBe(0);
  });

  it('keeps the route chain consistent when stops are added and removed', () => {
    const plan = defaultPlan();
    const t0 = routeTimeline(plan.route);
    const nodes = plan.route.nodes;
    const mid = nodes[1];

    const removed = deleteItem(plan, 'route', `node:${mid.id}`);
    expect(removed.route.nodes).toHaveLength(nodes.length - 1);
    expect(removed.route.legs).toHaveLength(removed.route.nodes.length - 1);
    // Merging the two legs keeps the chain's total time and distance.
    const t1 = routeTimeline(removed.route);
    expect(t1.cum.at(-1)).toBe(t0.cum.at(-1));
    expect(t1.cumKm.at(-1)).toBeCloseTo(t0.cumKm.at(-1)!, 1);

    const added = addItem(plan, 'route', 'node:axp', { x: 5, y: 5 }, `node:${nodes[0].id}`);
    expect(added.plan.route.nodes[1].kind).toBe('axp');
    expect(added.plan.route.legs).toHaveLength(added.plan.route.nodes.length - 1);

    const atEnd = addItem(plan, 'route', 'node:r3', { x: 5, y: 5 }, null);
    expect(atEnd.plan.route.nodes.at(-1)!.kind).toBe('r3');
    expect(atEnd.plan.route.legs).toHaveLength(atEnd.plan.route.nodes.length - 1);
  });

  it('never drops a route below two stops', () => {
    let plan = defaultPlan();
    while (plan.route.nodes.length > 2) {
      plan = deleteItem(plan, 'route', `node:${plan.route.nodes[0].id}`);
    }
    const again = deleteItem(plan, 'route', `node:${plan.route.nodes[0].id}`);
    expect(again.route.nodes).toHaveLength(2);
    expect(again.route.legs).toHaveLength(1);
  });

  it('hides CCP areas instead of deleting them, but never the triage point', () => {
    const plan = defaultPlan();
    const hidden = deleteItem(plan, 'ccp', 'area:expectant');
    expect(hidden.ccp.areas.find((a) => a.kind === 'expectant')?.enabled).toBe(false);
    expect(deleteItem(plan, 'ccp', 'area:triage')).toBe(plan);
  });

  it('duplicates a security position next to the original', () => {
    const plan = defaultPlan();
    const m = plan.hlz.security[0];
    const { plan: next, id } = duplicateItem(plan, 'hlz', `sec:${m.id}`);
    expect(next.hlz.security).toHaveLength(plan.hlz.security.length + 1);
    const copy = next.hlz.security.find((s) => `sec:${s.id}` === id)!;
    expect(copy.pos).toEqual({ x: m.pos.x + 12, y: m.pos.y - 12 });
  });

  it('places a typed grid exactly and reads it back', () => {
    const ref = '10S FE 62300 81500';
    const g = itemGrid(ref, { x: 123, y: -456 })!;
    expect(g).toBe('10S FE 62423 81044');
    expect(gridToPos(ref, g)).toEqual({ x: 123, y: -456 });
    expect(gridToPos(ref, 'not a grid')).toBeNull();
    expect(gridToPos(ref, '10S FE 99999 99999')).toBeNull(); // > 20 km away
  });
});
