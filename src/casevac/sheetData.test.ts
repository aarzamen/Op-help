import { describe, expect, it } from 'vitest';
import { computeHlz } from './hlz';
import { defaultPlan } from './model';
import { routeTimeline } from './route';
import { casevacParagraph, grid8, nineLineScript, routeLines } from './sheetData';

describe('9-line read-aloud script', () => {
  it('uses precedence/status brevity, equipment, wartime security and CBRN fields', () => {
    const plan = defaultPlan();
    Object.assign(plan.nineLine, {
      callSign: 'medic',
      line1: '10S FE 62301 81509',
      freq: '30.5',
      suffix: '01',
      line3: { A: 2, B: 1, C: 0, D: 0, E: 0 },
      line4: 'D',
      line5L: 3,
      line5A: 0,
      line6War: 'X',
      line7: 'A',
      line7Detail: '',
      line8: { A: 2, B: 0, C: 1, D: 0, E: 0 },
      line9War: 'C',
    });
    const text = nineLineScript(plan).join('\n');
    expect(text).toContain('MEDIC: I HAVE A MEDEVAC REQUEST, OVER.');
    expect(text).toContain('LINE 1 — PICKUP SITE GRID: 10S FE 6230 8150');
    expect(text).toContain('30.5 / MEDIC 01');
    expect(text).toContain('2 ALPHA (URGENT), BREAK, 1 BRAVO (URGENT-SURGICAL)');
    expect(text).toContain('DELTA (VENTILATOR)');
    expect(text).toContain('3 LIMA (LITTER)');
    expect(text).not.toContain('0 ALPHA');
    expect(text).toContain('X-RAY (ENEMY IN AREA — ARMED ESCORT REQUIRED)');
    expect(text).toContain('ALPHA (PANELS)');
    expect(text).toContain('1 CHARLIE (NON-US MILITARY)');
    expect(text).toContain('LINE 9 — CBRN CONTAMINATION: CHARLIE (CHEMICAL)');
  });

  it('substitutes peacetime lines and uses HLZ radio/grid fallbacks', () => {
    const plan = defaultPlan();
    Object.assign(plan.nineLine, {
      wartime: false,
      line6Peace: 'Fractures',
      line9Peace: 'Level field',
    });
    const text = nineLineScript(plan).join('\n');
    expect(text).toContain(plan.hlz.callSign.toUpperCase());
    expect(text).toContain(plan.hlz.freq);
    expect(text).toContain(grid8(plan.hlz.grid));
    expect(text).toContain('LINE 6 — WOUNDS / INJURIES / ILLNESS: Fractures');
    expect(text).toContain('LINE 9 — TERRAIN AT PICKUP SITE: Level field');
    expect(text).not.toContain('SECURITY AT PICKUP');
    expect(text).not.toContain('CBRN CONTAMINATION');
  });

  it('omits an unused MIST card and preserves a populated patient handoff', () => {
    const plan = defaultPlan();
    expect(nineLineScript(plan).some((line) => line.startsWith('MIST'))).toBe(false);
    plan.nineLine.mist[0] = {
      id: 'patient-1',
      zap: 'EXAMPLE',
      m: 'Fall',
      i: 'Leg injury',
      s: 'Alert',
      t: 'Splinted',
    };
    expect(nineLineScript(plan).at(-1)).toBe(
      'MIST 1 (EXAMPLE) — M: Fall · I: Leg injury · S: Alert · T: Splinted'
    );
  });
});

describe('briefing text', () => {
  it('keeps all seven graded CASEVAC parts and the entered PACE/handling instructions', () => {
    const plan = defaultPlan();
    plan.para = {
      corpsmen: 'Team assignment',
      reporting: 'Report to RTO',
      handling: 'Triage then move',
      evacByPart: 'Cover each phase',
      mascal: 'Request augmentation',
      enemyCas: 'Treat, segregate, guard',
    };
    const text = casevacParagraph(plan, computeHlz(plan.hlz, null, ''), routeTimeline(plan.route));
    expect([...text.matchAll(/^\((\d)\)/gm)].map((match) => match[1])).toEqual([
      '1',
      '2',
      '3',
      '4',
      '5',
      '6',
      '7',
    ]);
    for (const instruction of Object.values(plan.para)) expect(text).toContain(instruction);
    for (const key of ['paceP', 'paceA', 'paceC', 'paceE'] as const)
      expect(text).toContain(plan.route[key]);
    expect(text).toContain('Urgent / Urgent-surgical ≤ 1 h; Priority ≤ 4 h; Routine ≤ 24 h');
    expect(text).toContain('POI → surgical care ≈ 35 min.');
  });

  it('reports a missed surgical timeline and handles a route with no surgical stop', () => {
    const plan = defaultPlan();
    plan.route.legs[2].timeMin = 50;
    expect(
      Object.fromEntries(routeLines(plan, routeTimeline(plan.route)))['POI → SURGICAL']
    ).toContain('EXCEEDS the 1-hour');
    plan.route.nodes = plan.route.nodes.slice(0, 3);
    plan.route.legs = plan.route.legs.slice(0, 2);
    expect(Object.fromEntries(routeLines(plan, routeTimeline(plan.route)))['POI → SURGICAL']).toBe(
      'add a Role 2 or Role 3 node'
    );
  });

  it('retains an invalid or less precise grid rather than inventing precision', () => {
    expect(grid8('  location pending  ')).toBe('location pending');
    expect(grid8('10S FE 623 815')).toBe('10S FE 623 815');
    expect(grid8('10S FE 62301 81509')).toBe('10S FE 6230 8150');
  });
});
