import { describe, expect, it } from 'vitest';
import { computeCcp, rectEdge } from './ccp';
import { ccpLayout, defaultCcp } from './model';

describe('CCP flow and geometry', () => {
  it.each([
    [
      { x: 100, y: 0 },
      { x: 10, y: 0 },
    ],
    [
      { x: 0, y: -100 },
      { x: 0, y: -5 },
    ],
    [
      { x: 100, y: 100 },
      { x: 5, y: 5 },
    ],
    [
      { x: 0, y: 0 },
      { x: 0, y: 0 },
    ],
  ])('ends an arrow at the rectangle boundary toward %j', (toward, expected) => {
    expect(rectEdge({ x: 0, y: 0 }, 20, 10, toward)).toEqual(expected);
  });

  it.each([
    [0, 0, 1],
    [90, 1, 0],
    [180, 0, -1],
    [270, -1, 0],
  ] as const)('keeps entry and exit on the one-way %s° flow', (flowAz, east, north) => {
    const sheet = { ...defaultCcp(), flowAz, areas: ccpLayout(flowAz) };
    const geometry = computeCcp(sheet, '', null);
    expect(geometry.flow.x).toBeCloseTo(east);
    expect(geometry.flow.y).toBeCloseTo(north);
    const triage = geometry.byKind.triage!;
    const loading = geometry.byKind.loading!;
    const along = (a: { x: number; y: number }, b: { x: number; y: number }) =>
      (a.x - b.x) * geometry.flow.x + (a.y - b.y) * geometry.flow.y;
    expect(along(geometry.poiFrom, triage.pos)).toBeLessThan(0);
    expect(along(geometry.exitFrom, loading.pos)).toBeGreaterThan(0);
    expect(along(geometry.exitTo, geometry.exitFrom)).toBeCloseTo(14);
    for (const area of sheet.areas.filter((area) => area.enabled)) {
      expect(area.pos.x - area.w / 2).toBeGreaterThanOrEqual(geometry.view.minX);
      expect(area.pos.y - area.h / 2).toBeGreaterThanOrEqual(geometry.view.minY);
      expect(area.pos.x + area.w / 2).toBeLessThanOrEqual(geometry.view.minX + geometry.view.w);
      expect(area.pos.y + area.h / 2).toBeLessThanOrEqual(geometry.view.minY + geometry.view.h);
    }
  });

  it('falls back to the evacuation area if the optional loading point is hidden', () => {
    const sheet = defaultCcp();
    sheet.areas = sheet.areas.map((area) =>
      area.kind === 'loading' ? { ...area, enabled: false } : area
    );
    const geometry = computeCcp(sheet, '', null);
    expect(geometry.byKind.loading).toBeUndefined();
    expect(geometry.exitFrom.y).toBeCloseTo(
      geometry.byKind.evac!.pos.y + geometry.byKind.evac!.h / 2
    );
  });

  it('computes nearby HLZ distance and both bearings without inventing a magnetic bearing', () => {
    const sheet = { ...defaultCcp(), grid: '10S FE 6200 8100' };
    const gridOnly = computeCcp(sheet, '10S FE 6210 8110', null);
    expect(gridOnly.hlz!.distM).toBeCloseTo(Math.sqrt(100 ** 2 + 100 ** 2));
    expect(gridOnly.hlz!.azGrid).toBeCloseTo(45);
    expect(gridOnly.hlz!.azMag).toBeNull();
    expect(
      computeCcp(sheet, '10S FE 6210 8110', { gm: 10, declination: 12, convergence: 2 }).hlz!.azMag
    ).toBeCloseTo(35);
    expect(computeCcp(sheet, 'not a grid', null).hlz).toBeNull();
    expect(computeCcp(sheet, sheet.grid, null).hlz).toBeNull();
  });
});
