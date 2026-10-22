import { describe, expect, it } from 'vitest';
import { computeHlz } from './hlz';
import { defaultHlz } from './model';

function northbound() {
  return { ...defaultHlz(), lpCount: 1, approachMag: 0, departureMag: 0, obstacles: [] };
}

describe('HLZ obstacle clearance', () => {
  it('requires ten metres of approach distance per metre of obstacle height', () => {
    const sheet = northbound();
    sheet.obstacles = [99, 100, 101].map((distance) => ({
      id: String(distance),
      kind: 'trees',
      pos: { x: 0, y: -distance },
      heightM: 10,
      note: '',
    }));
    const { checks } = computeHlz(sheet, null, '');
    expect(checks.map(({ path, required, ok }) => ({ path, required, ok }))).toEqual([
      { path: 'approach', required: 100, ok: false },
      { path: 'approach', required: 100, ok: true },
      { path: 'approach', required: 100, ok: true },
    ]);
  });

  it('checks departure obstacles but makes no clearance claim for an obstacle off both paths', () => {
    const sheet = northbound();
    sheet.obstacles = [
      { id: 'departure', kind: 'wires', pos: { x: 0, y: 90 }, heightM: 10, note: '' },
      { id: 'flank', kind: 'tower', pos: { x: 1000, y: -10 }, heightM: 100, note: '' },
    ];
    const { checks } = computeHlz(sheet, null, '');
    expect(checks[0]).toMatchObject({ path: 'departure', along: 90, required: 100, ok: false });
    expect(checks[1]).toMatchObject({ path: null, ok: null });
  });

  it('measures from the nearest landing point rather than the zone centre', () => {
    const sheet = { ...northbound(), lpCount: 2, lpSpacing: 100 };
    sheet.obstacles = [
      { id: 'rear', kind: 'trees', pos: { x: 0, y: -149 }, heightM: 10, note: '' },
      { id: 'front', kind: 'trees', pos: { x: 0, y: 149 }, heightM: 10, note: '' },
    ];
    const { checks } = computeHlz(sheet, null, '');
    expect(checks.map((check) => check.along)).toEqual([99, 99]);
    expect(checks.every((check) => check.ok === false)).toBe(true);
  });
});

describe('HLZ wind components', () => {
  it.each([
    [0, 12, 0, 'none'],
    [180, -12, 0, 'none'],
    [90, 0, 12, 'right'],
    [270, 0, 12, 'left'],
    [45, Math.sqrt(72), Math.sqrt(72), 'right'],
  ] as const)(
    'resolves wind from %s° relative to a northbound approach',
    (from, head, cross, side) => {
      const sheet = { ...northbound(), windFromMag: from, windKts: 12 };
      const wind = computeHlz(sheet, null, '').wind!;
      expect(wind.head).toBeCloseTo(head);
      expect(wind.cross).toBeCloseTo(cross);
      expect(wind.from).toBe(side);
    }
  );

  it('reports calm separately from a measured component', () => {
    expect(computeHlz({ ...northbound(), windKts: 0 }, null, '').wind).toBeNull();
  });

  it('keeps wind components consistent when magnetic bearings are rotated onto the grid', () => {
    const sheet = { ...northbound(), approachMag: 350, windFromMag: 35, windKts: 12 };
    const north = { gm: 10, declination: 12, convergence: 2 };
    const withGrid = computeHlz(sheet, north, '');
    expect(withGrid.approachAz).toBe(0);
    expect(withGrid.windFromAz).toBe(45);
    expect(withGrid.wind).toEqual(computeHlz(sheet, null, '').wind);
  });
});
