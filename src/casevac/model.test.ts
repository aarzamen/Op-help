import { describe, expect, it } from 'vitest';
import { defaultPlan, normalizeBackground, normalizePlan } from './model';

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

  it('replaces malformed collections instead of crashing the sketches', () => {
    const p = normalizePlan({
      v: 1,
      hlz: { obstacles: [{ id: 'x', pos: 'here' }], security: 'none', loadPoint: { x: 'a' } },
      route: { nodes: [{ id: 'n', pos: { x: 0, y: 0 } }], legs: [] },
    })!;
    const d = defaultPlan();
    expect(p.hlz.obstacles).toHaveLength(d.hlz.obstacles.length);
    expect(p.hlz.security).toHaveLength(d.hlz.security.length);
    expect(p.hlz.loadPoint).toEqual(d.hlz.loadPoint);
    expect(p.route.nodes).toHaveLength(d.route.nodes.length);
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
    expect(normalizeBackground({ ...ok, offset: null })).toBeNull();
  });
});
