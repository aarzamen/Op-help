import { describe, expect, it } from 'vitest';
import {
  azimuth,
  eastWest,
  formatMgrs,
  gridConvergence,
  gridDelta,
  magToGrid,
  offsetMgrs,
  pad3,
  parseMgrs,
} from './geo';

describe('parseMgrs', () => {
  it('accepts any spacing and case', () => {
    expect(parseMgrs('11s ku 12345 67890')).toMatchObject({
      zone: 11,
      band: 'S',
      e: 12345,
      n: 67890,
      digits: 5,
    });
  });

  it('scales shorter grids to meters', () => {
    expect(parseMgrs('11SKU12346789')).toMatchObject({ e: 12340, n: 67890, digits: 4 });
    expect(parseMgrs('11SKU')).toMatchObject({ e: 0, n: 0, digits: 0 });
  });

  it('rejects malformed grids', () => {
    expect(parseMgrs('')).toBeNull();
    expect(parseMgrs('11SKU123')).toBeNull(); // odd digit count
    expect(parseMgrs('61SKU1234')).toBeNull(); // no zone 61
    expect(parseMgrs('11SIU1234')).toBeNull(); // I is never a column letter
    expect(parseMgrs('11SAU1234')).toBeNull(); // A is not a column in zone 11
  });
});

describe('formatMgrs', () => {
  it('pretty-prints a compact grid', () => {
    expect(formatMgrs('11sku1234567890')).toBe('11S KU 12345 67890');
    expect(formatMgrs('11SKU12346789')).toBe('11S KU 1234 6789');
  });
});

describe('offsetMgrs / gridDelta', () => {
  const ref = parseMgrs('10S FE 62300 81500')!;

  it('offsets within a square at 8 and 10 digits', () => {
    expect(offsetMgrs(ref, 120, -340, 5)).toBe('10S FE 62420 81160');
    expect(offsetMgrs(ref, 120, -340)).toBe('10S FE 6242 8116');
  });

  it('crosses 100 km row and column boundaries', () => {
    const r = parseMgrs('11S KU 50000 99990')!;
    expect(offsetMgrs(r, 0, 20, 5)).toBe('11S KV 50000 00010');
    expect(offsetMgrs(r, 60000, 0, 5)).toBe('11S LU 10000 99990');
  });

  it('wraps the 20-letter row cycle both ways', () => {
    expect(gridDelta('11S KV 50000 50000', '11S KA 50000 50000')).toEqual({ x: 0, y: 100000 });
    expect(gridDelta('11S KA 50000 50000', '11S KV 50000 50000')).toEqual({ x: 0, y: -100000 });
  });

  it('round-trips with offsetMgrs', () => {
    for (const [dx, dy] of [
      [0, 0],
      [1, 1],
      [-250, 730],
      [4321, -1234],
    ]) {
      const g = offsetMgrs(ref, dx, dy, 5)!;
      expect(gridDelta('10S FE 62300 81500', g)).toEqual({ x: dx, y: dy });
    }
  });

  it('refuses different zones', () => {
    expect(gridDelta('10SFE1111', '11SKU1111')).toBeNull();
  });
});

describe('north reference helpers', () => {
  it('has zero grid convergence on the central meridian and + east of it (north)', () => {
    expect(gridConvergence(32.7, -117)).toBeCloseTo(0, 6); // zone 11 CM
    expect(gridConvergence(32.7, -116)).toBeGreaterThan(0);
    expect(gridConvergence(32.7, -118)).toBeLessThan(0);
    expect(gridConvergence(-32.7, -116)).toBeLessThan(0); // flips south of the equator
  });

  it('converts magnetic to grid with an easterly G-M angle', () => {
    expect(magToGrid(350, 15)).toBe(5);
    expect(pad3(5)).toBe('005');
    expect(pad3(359.6)).toBe('000');
    expect(eastWest(11.24)).toBe('11.2°E');
    expect(eastWest(-3)).toBe('3.0°W');
  });

  it('measures azimuth clockwise from grid north', () => {
    expect(azimuth({ x: 0, y: 0 }, { x: 0, y: 10 })).toBeCloseTo(0);
    expect(azimuth({ x: 0, y: 0 }, { x: 10, y: 0 })).toBeCloseTo(90);
    expect(azimuth({ x: 0, y: 0 }, { x: 0, y: -10 })).toBeCloseTo(180);
    expect(azimuth({ x: 0, y: 0 }, { x: -10, y: 0 })).toBeCloseTo(270);
  });
});
