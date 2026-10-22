import { describe, expect, it } from 'vitest';
import { northReferenceForGrid } from './geo';
import { computeHlz, hlzFindings, hlzView } from './hlz';
import { computeCcp } from './ccp';
import {
  CCP_AREA_META,
  defaultPlan,
  lpDiameter,
  normalizeBackground,
  normalizePlan,
} from './model';
import { routeTimeline } from './route';
import { casevacParagraph, ccpLines, hlzLines, nineLineScript, routeLines } from './sheetData';

describe('normalizePlan', () => {
  it('rejects anything that is not a v1 plan', () => {
    for (const raw of [null, undefined, 42, 'plan', [], { v: 2 }, { hlz: {} }]) {
      expect(normalizePlan(raw)).toBeNull();
    }
  });

  it('fills a bare v1 plan with the labeled defaults', () => {
    const p = normalizePlan({ v: 1 })!;
    const d = defaultPlan();
    expect(p.hlz.name).toBe(d.hlz.name);
    expect(p.hlz.obstacles).toHaveLength(d.hlz.obstacles.length);
    expect(p.route.legs).toHaveLength(p.route.nodes.length - 1);
  });

  it('keeps valid user data', () => {
    const d = defaultPlan();
    d.hlz.name = 'HLZ CROW';
    d.hlz.obstacles = [
      { id: 'a', kind: 'tower', pos: { x: 1, y: 2 }, heightM: 30, note: 'cell tower' },
    ];
    const p = normalizePlan(JSON.parse(JSON.stringify(d)))!;
    expect(p.hlz.name).toBe('HLZ CROW');
    expect(p.hlz.obstacles).toEqual(d.hlz.obstacles);
  });

  it('drops bad entries, keeps good ones, and defaults what is not a list', () => {
    const p = normalizePlan({
      v: 1,
      hlz: {
        obstacles: [
          { id: 'x', pos: 'here' },
          { id: 'ok', kind: 'tower', pos: { x: 5, y: 5 } },
        ],
        security: 'none',
        loadPoint: { x: 'a' },
      },
      route: { nodes: [{ id: 'n', pos: { x: 0, y: 0 } }], legs: [] },
    })!;
    const d = defaultPlan();
    expect(p.hlz.obstacles.map((o) => o.id)).toEqual(['ok']);
    expect(p.hlz.obstacles[0]).toMatchObject({ kind: 'tower', heightM: 10, note: '' });
    expect(p.hlz.security).toHaveLength(d.hlz.security.length);
    expect(p.hlz.loadPoint).toEqual(d.hlz.loadPoint);
    // A broken chain (1 stop, 0 legs) falls back to the example route.
    expect(p.route.nodes).toHaveLength(d.route.nodes.length);
    expect(p.route.legs).toHaveLength(p.route.nodes.length - 1);
  });

  it('neutralizes the inputs that used to crash or hang the tab', () => {
    const p = normalizePlan({
      v: 1,
      hlz: {
        lpSize: 9,
        grid: 42,
        markDay: 'smoke',
        obstacles: [{ id: 'a', pos: { x: 1e12, y: -1e12 }, heightM: 'tall' }],
      },
      ccp: {
        grid: { evil: true },
        flowAz: 45,
        areas: [
          { kind: 'bogus', enabled: true, pos: { x: 0, y: 0 }, w: 10, h: 10 },
          { kind: 'triage', enabled: false, pos: { x: 3, y: 4 }, w: -5, h: 1e9 },
        ],
      },
      route: {
        layout: 'globe',
        nodes: [
          { id: 'same', kind: 'spaceport', pos: { x: 0, y: 0 } },
          { id: 'same', kind: 'r2', pos: { x: 1e12, y: 0 } },
        ],
        legs: [{ mode: 'teleport', distKm: -3, timeMin: 'soon' }],
      },
      nineLine: { line4: 'Z', line3: { A: -4, B: 2.6 }, mist: [{ id: 1, m: 2 }] },
    })!;
    const d = defaultPlan();
    expect(p.hlz.lpSize).toBe(d.hlz.lpSize);
    expect(p.hlz.grid).toBe(d.hlz.grid);
    expect(p.hlz.markDay).toEqual(d.hlz.markDay);
    expect(p.hlz.obstacles[0]).toMatchObject({ kind: 'other', heightM: 10 });
    expect(Math.abs(p.hlz.obstacles[0].pos.x)).toBeLessThanOrEqual(100_000);
    expect(p.ccp.grid).toBe(d.ccp.grid);
    expect(p.ccp.flowAz).toBe(d.ccp.flowAz);
    expect(p.ccp.areas.map((a) => a.kind)).toEqual(d.ccp.areas.map((a) => a.kind));
    const triage = p.ccp.areas.find((a) => a.kind === 'triage')!;
    expect(triage).toMatchObject({ enabled: true, pos: { x: 3, y: 4 }, w: 4, h: 500 });
    expect(p.route.layout).toBe(d.route.layout);
    expect(p.route.nodes.map((n) => n.kind)).toEqual(['other', 'r2']);
    expect(new Set(p.route.nodes.map((n) => n.id)).size).toBe(2);
    expect(p.route.nodes[1].pos.x).toBe(100_000);
    expect(p.route.legs[0]).toMatchObject({ mode: 'ground', distKm: 0, timeMin: 0 });
    expect(p.nineLine.line4).toBe(d.nineLine.line4);
    expect(p.nineLine.line3).toMatchObject({ A: 0, B: 3, C: d.nineLine.line3.C });
    expect(p.nineLine.mist[0]).toMatchObject({ m: '', i: '' });
    expect(typeof p.nineLine.mist[0].id).toBe('string');
  });

  it('never yields a plan that the sketch and text builders choke on (fuzz)', () => {
    let seed = 7;
    const rand = () => (seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31;
    const junk = [null, 'x', '', 1e12, -1, 0, 9, true, {}, [], [{}], { x: 1, y: 'y' }];
    const mutate = (v: unknown): unknown => {
      if (rand() < 0.15) return junk[Math.floor(rand() * junk.length)];
      if (Array.isArray(v)) return v.map(mutate);
      if (v && typeof v === 'object')
        return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, mutate(x)]));
      return v;
    };
    for (let i = 0; i < 300; i++) {
      const raw = { ...(mutate(JSON.parse(JSON.stringify(defaultPlan()))) as object), v: 1 };
      const p = normalizePlan(raw)!;
      const north = northReferenceForGrid(p.hlz.grid);
      const g = computeHlz(p.hlz, north, p.ccp.grid);
      const cg = computeCcp(p.ccp, p.hlz.grid, northReferenceForGrid(p.ccp.grid));
      const t = routeTimeline(p.route);
      expect(() => {
        hlzFindings(p.hlz, g);
        hlzView(p.hlz, g);
        hlzLines(p, g, north);
        ccpLines(p, cg);
        routeLines(p, t);
        nineLineScript(p);
        casevacParagraph(p, g, t);
        for (const a of p.ccp.areas) expect(CCP_AREA_META[a.kind].label).toBeTruthy();
        expect(lpDiameter(p.hlz.lpSize)).toBeGreaterThan(0);
        for (const o of p.hlz.obstacles) expect(typeof o.kind).toBe('string');
      }).not.toThrow();
    }
  });
});

describe('normalizeBackground', () => {
  const ok = {
    dataUrl: 'data:image/jpeg;base64,AAAA',
    aspect: 1.5,
    widthM: 400,
    offset: { x: 0, y: 0 },
    opacity: 0.6,
  };

  it('accepts an inline image with sane numbers', () => {
    expect(normalizeBackground(ok)).toEqual(ok);
    expect(normalizeBackground({ ...ok, opacity: 7, offset: { x: 1e12, y: 0 } })).toMatchObject({
      opacity: 1,
      offset: { x: 100_000, y: 0 },
    });
  });

  it('rejects remote, script and non-image URLs and bad numbers', () => {
    for (const dataUrl of [
      'https://example.com/map.png',
      'javascript:alert(1)',
      'data:text/html;base64,PHNjcmlwdD4=',
      'data:image/svg+xml;base64,PHN2Zz4=',
    ]) {
      expect(normalizeBackground({ ...ok, dataUrl })).toBeNull();
    }
    expect(normalizeBackground({ ...ok, widthM: 'wide' })).toBeNull();
    expect(normalizeBackground({ ...ok, widthM: -1 })).toBeNull();
    expect(normalizeBackground({ ...ok, aspect: 0 })).toBeNull();
    expect(normalizeBackground({ ...ok, offset: null })).toBeNull();
  });
});
