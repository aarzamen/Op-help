import { afterEach, describe, expect, it, vi } from 'vitest';
import { decodePayload, planLink } from './handoff';
import { computeHlz } from './hlz';
import {
  BG_MAX_WIDTH_M,
  defaultHlz,
  defaultPlan,
  normalizeBackground,
  type HlzSheet,
} from './model';
import { fmtMin, routeTimeline } from './route';
import { nineLineScript } from './sheetData';

/** Defects found by the October 2026 wrap review; each test pins the fix. */

const north0 = { declination: 0, convergence: 0, gm: 0 };
const tower = (id: string, x: number, y: number, heightM = 30) => ({
  id,
  kind: 'tower' as const,
  pos: { x, y },
  heightM,
  note: '',
});

describe('10:1 corridors follow the whole zone, not one landing point', () => {
  it('abreast: an obstacle in front of the third LP is checked; one outside the corridor is not', () => {
    const hlz: HlzSheet = {
      ...defaultHlz(),
      formation: 'abreast',
      lpSize: 3,
      lpCount: 3,
      lpSpacing: 50,
      approachMag: 0,
      departureMag: 0,
      obstacles: [tower('in', 70, -120), tower('out', -140, -120)],
    };
    const g = computeHlz(hlz, north0, '');
    expect(g.checks[0]).toMatchObject({ path: 'approach', required: 300, ok: false });
    expect(g.checks[1]).toMatchObject({ path: null, ok: null });
  });

  it('trail with a 90° departure: obstacles beside every LP are on the departure path', () => {
    const hlz: HlzSheet = {
      ...defaultHlz(),
      formation: 'trail',
      lpSize: 3,
      lpCount: 3,
      lpSpacing: 100,
      approachMag: 0,
      departureMag: 90,
      obstacles: [tower('lp2', 100, 0), tower('lp3', 100, -100)],
    };
    const g = computeHlz(hlz, north0, '');
    expect(g.checks.map((c) => c.path)).toEqual(['departure', 'departure']);
    expect(g.halfD).toBeGreaterThan(g.halfA); // the drawn corridor widens to match
  });
});

describe('route timing', () => {
  it('rounds the total before splitting hours and minutes', () => {
    expect(fmtMin(119.6)).toBe('2 h 00 min');
    expect(fmtMin(59.6)).toBe('1 h 00 min');
  });

  it('judges the 1-hour standard on the whole minutes it shows', () => {
    const r = defaultPlan().route; // POI → CCP → HLZ → Role 2: 10 + 5 + 20 min
    r.legs[2] = { ...r.legs[2], timeMin: 45.4 }; // 60.4 min, shown as "1 h 00 min"
    expect(routeTimeline(r).urgentOk).toBe(true);
    r.legs[2] = { ...r.legs[2], timeMin: 45.6 }; // 60.6 min, shown as "1 h 01 min"
    expect(routeTimeline(r).urgentOk).toBe(false);
  });
});

describe('9-line script', () => {
  it('numbers MIST cards without gaps when a blank card comes first', () => {
    const plan = defaultPlan();
    plan.nineLine.mist = [
      { id: 'a', zap: '', m: '', i: '', s: '', t: '' },
      { id: 'b', zap: 'B1234', m: 'IED', i: 'Leg', s: 'Alert', t: 'TQ' },
    ];
    const mist = nineLineScript(plan).filter((l) => l.startsWith('MIST'));
    expect(mist).toEqual(['MIST 1 (B1234) — M: IED · I: Leg · S: Alert · T: TQ']);
  });

  it("doesn't announce a smoke color by default or a detail when marking is NONE", () => {
    const plan = defaultPlan();
    const line7 = () => nineLineScript(plan).find((l) => l.startsWith('LINE 7'));
    expect(line7()).not.toMatch(/violet/i);
    plan.nineLine.line7 = 'D';
    plan.nineLine.line7Detail = 'violet';
    expect(line7()).toBe('LINE 7 — MARKING: DELTA (NONE)');
  });
});

describe('validation limits', () => {
  it('keeps a wide overlay image (clamped) instead of dropping it on reload', () => {
    const bg = {
      dataUrl: 'data:image/png;base64,AAAA',
      aspect: 1,
      widthM: 250_000,
      offset: { x: 0, y: 0 },
      opacity: 0.5,
    };
    expect(normalizeBackground(bg)?.widthM).toBe(250_000);
    expect(normalizeBackground({ ...bg, widthM: 1e9 })?.widthM).toBe(BG_MAX_WIDTH_M);
  });
});

describe('share link', () => {
  afterEach(() => vi.unstubAllGlobals());

  it("falls back to an uncompressed link where 'deflate-raw' isn't supported", async () => {
    vi.stubGlobal('window', { location: { href: 'https://example.test/app/' } });
    vi.stubGlobal(
      'CompressionStream',
      class {
        constructor() {
          throw new TypeError('Unsupported compression format');
        }
      }
    );
    const plan = defaultPlan();
    plan.hlz.name = 'HLZ CROW';
    const url = await planLink(plan);
    expect(url).toMatch(/#cv=j/);
    expect((await decodePayload(new URL(url).hash.slice('#cv='.length)))?.hlz.name).toBe(
      'HLZ CROW'
    );
  });
});
