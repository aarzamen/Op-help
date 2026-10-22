import { describe, expect, it } from 'vitest';
import { defaultRoute } from './model';
import { fmtMin, routeTimeline } from './route';

describe('routeTimeline', () => {
  it('accumulates time and distance and finds the first surgical stop', () => {
    const r = defaultRoute(); // POI → CCP → HLZ → Role 2 → Role 3; 10 + 5 + 20 + 45 min
    const t = routeTimeline(r);
    expect(t.cum).toEqual([0, 10, 15, 35, 80]);
    expect(t.firstSurgical).toBe(3);
    expect(t.toSurgicalMin).toBe(35);
    expect(t.urgentOk).toBe(true);
  });

  it('flags a chain that misses the 1-hour standard', () => {
    const r = defaultRoute();
    r.legs[2] = { ...r.legs[2], timeMin: 50 };
    const t = routeTimeline(r);
    expect(t.toSurgicalMin).toBe(65);
    expect(t.urgentOk).toBe(false);
  });

  it('has no verdict without a surgical stop and ignores negative legs', () => {
    const r = defaultRoute();
    r.nodes = r.nodes.slice(0, 3);
    r.legs = [{ ...r.legs[0], timeMin: -30 }, r.legs[1]];
    const t = routeTimeline(r);
    expect(t.cum).toEqual([0, 0, 5]);
    expect(t.toSurgicalMin).toBeNull();
    expect(t.urgentOk).toBeNull();
  });

  it('formats minutes', () => {
    expect(fmtMin(45)).toBe('45 min');
    expect(fmtMin(65)).toBe('1 h 05 min');
  });
});
