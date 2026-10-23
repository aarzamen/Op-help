import { eastWest, offsetMgrs, pad3, parseMgrs, type NorthReference } from './geo';
import type { CcpGeom } from './ccp';
import type { HlzGeom } from './hlz';
import { CCP_AREA_META, LEG_MODES, NODE_KINDS, type CasevacPlan } from './model';
import { fmtMin, type RouteTimeline } from './route';

export type Lines = [label: string, value: string][];

/** Normalize a grid to 8-digit MGRS (the 9-line standard), or return the input untouched. */
export const grid8 = (g: string) => {
  const ref = parseMgrs(g);
  return ref && ref.digits >= 4 ? (offsetMgrs(ref, 0, 0, 4) ?? g) : g.trim();
};

const dirName = (az: number) =>
  ({ 0: 'north', 90: 'east', 180: 'south', 270: 'west' })[az] ?? `${az}°`;
const legLabel = (m: string) => LEG_MODES.find((x) => x.mode === m)?.label ?? m;
const nodeBadge = (k: string) => NODE_KINDS.find((x) => x.kind === k)?.badge ?? k;

export function hlzLines(plan: CasevacPlan, g: HlzGeom, north: NorthReference | null): Lines {
  const h = plan.hlz;
  const lines: Lines = [
    ['HLZ', `${h.name || '—'} · ${grid8(h.grid) || 'no grid'}`],
    [
      'LANDING POINTS',
      `${g.lps.length} × Size ${h.lpSize} (${g.D} m) · ${h.formation} · ${Math.max(g.D, h.lpSpacing)} m apart`,
    ],
    ['ZONE', `${Math.round(g.W)} × ${Math.round(g.L)} m`],
    ['FINAL APPROACH', `${pad3(h.approachMag)}°M${north ? ` (grid ${pad3(g.approachAz)}°)` : ''}`],
    ['DEPARTURE', `${pad3(h.departureMag)}°M${north ? ` (grid ${pad3(g.departureAz)}°)` : ''}`],
    [
      'WIND',
      h.windKts > 0 && g.wind
        ? `from ${pad3(h.windFromMag)}°M @ ${h.windKts} kt — ${g.wind.head >= 0 ? `headwind ${g.wind.head.toFixed(0)}` : `TAILWIND ${Math.abs(g.wind.head).toFixed(0)}`} / crosswind ${g.wind.cross.toFixed(0)} kt`
        : 'calm / not reported',
    ],
    ['SURFACE / SLOPE', [h.surface, h.slope].filter(Boolean).join(' · ') || '—'],
    ['MARKING', `Day: ${h.markDay.join(', ') || '—'} · Night: ${h.markNight.join(', ') || '—'}`],
    ['CONTROL', [h.controller, h.freq, h.callSign].filter(Boolean).join(' · ') || '—'],
  ];
  if (h.obstacles.length) {
    lines.push([
      'OBSTACLES',
      h.obstacles
        .map((o) => {
          const c = g.checks.find((k) => k.id === o.id);
          const base = `${o.kind} ${o.heightM} m${o.note ? ` (${o.note})` : ''}`;
          if (!c || c.ok === null) return `${base} — clear of approach/departure`;
          return `${base} — ${c.path} ${Math.round(c.along)} m, needs ${c.required} m ${c.ok ? '✓' : '✗'}`;
        })
        .join('; '),
    ]);
  }
  lines.push([
    'CCP / LITTER',
    `${plan.ccp.name || 'CCP'} ${g.ccpFromGrid ? 'by grid' : '(sketch position)'} · litter route ${Math.round(g.litterRouteM)} m to load point`,
  ]);
  lines.push([
    'G-M ANGLE',
    north
      ? `${eastWest(north.gm)} (WMM decl ${eastWest(north.declination)}, grid convergence ${eastWest(north.convergence)})`
      : 'enter a valid MGRS grid to compute',
  ]);
  if (h.notes.trim()) lines.push(['NOTES', h.notes.trim()]);
  return lines;
}

export function ccpLines(plan: CasevacPlan, cg: CcpGeom): Lines {
  const c = plan.ccp;
  const areas = c.areas
    .filter((a) => a.enabled)
    .map((a) => CCP_AREA_META[a.kind].label.toLowerCase());
  const lines: Lines = [
    ['CCP', `${c.name || '—'} · ${grid8(c.grid) || 'no grid'}`],
    ['LOCATION', c.locationDesc || '—'],
    [
      'FLOW',
      `one way — single entrance at triage, exit at the loading point (flows ${dirName(c.flowAz)})`,
    ],
    ['AREAS', areas.join(' · ') || '—'],
    ['TRIAGE OFFICER', c.triageOfficer || '—'],
    ['TREATMENT', c.treatment || '—'],
    ['LITTER TEAMS', c.litterTeams || '—'],
    ['TRACKER / RTO', c.rto || '—'],
    ['MARKING', `Day: ${c.markDay || '—'} · Night: ${c.markNight || '—'}`],
    [
      'TO HLZ',
      cg.hlz
        ? `${plan.hlz.name || 'HLZ'} ${Math.round(cg.hlz.distM)} m @ ${pad3(cg.hlz.azGrid)}° grid${cg.hlz.azMag !== null ? ` / ${pad3(cg.hlz.azMag)}°M` : ''}`
        : 'enter CCP and HLZ grids to compute',
    ],
  ];
  if (c.notes.trim()) lines.push(['NOTES', c.notes.trim()]);
  return lines;
}

export function routeLines(plan: CasevacPlan, t: RouteTimeline): Lines {
  const r = plan.route;
  const lines: Lines = r.legs.map((leg, i) => {
    const a = r.nodes[i];
    const b = r.nodes[i + 1];
    return [
      `${nodeBadge(a?.kind ?? '')} → ${nodeBadge(b?.kind ?? '')}`,
      `${a?.name ?? ''} → ${b?.name ?? ''}: ${legLabel(leg.mode)}, ${leg.distKm} km, ${leg.timeMin} min${leg.platform ? ` · ${leg.platform}` : ''}${leg.net ? ` · ${leg.net}` : ''} (T+${fmtMin(t.cum[i + 1] ?? 0)})`,
    ];
  });
  lines.push([
    'POI → SURGICAL',
    t.toSurgicalMin === null
      ? 'add a Role 2 or Role 3 node'
      : `${fmtMin(t.toSurgicalMin)} — ${t.urgentOk ? 'meets' : 'EXCEEDS'} the 1-hour Urgent / Urgent-Surgical standard`,
  ]);
  lines.push([
    'PRECEDENCE',
    `Urgent ≤ 1 h · Urgent-surgical ≤ 1 h · Priority ≤ ${r.priorityHours} h · Routine ≤ 24 h · Convenience`,
  ]);
  lines.push([
    'PACE',
    `P: ${r.paceP || '—'} · A: ${r.paceA || '—'} · C: ${r.paceC || '—'} · E: ${r.paceE || '—'}`,
  ]);
  return lines;
}

const PHON: Record<string, string> = {
  A: 'ALPHA',
  B: 'BRAVO',
  C: 'CHARLIE',
  D: 'DELTA',
  E: 'ECHO',
  L: 'LIMA',
  N: 'NOVEMBER',
  P: 'PAPA',
  X: 'X-RAY',
};

const LINE3 = {
  A: 'URGENT',
  B: 'URGENT-SURGICAL',
  C: 'PRIORITY',
  D: 'ROUTINE',
  E: 'CONVENIENCE',
} as const;
const LINE4 = { A: 'NONE', B: 'HOIST', C: 'EXTRACTION EQUIPMENT', D: 'VENTILATOR' } as const;
const LINE5 = { L: 'LITTER', A: 'AMBULATORY' } as const;
const LINE6 = {
  N: 'NO ENEMY IN AREA',
  P: 'POSSIBLE ENEMY',
  E: 'ENEMY IN AREA — APPROACH WITH CAUTION',
  X: 'ENEMY IN AREA — ARMED ESCORT REQUIRED',
} as const;
const LINE7 = {
  A: 'PANELS',
  B: 'PYROTECHNIC SIGNAL',
  C: 'SMOKE SIGNAL',
  D: 'NONE',
  E: 'OTHER',
} as const;
const LINE8 = {
  A: 'US MILITARY',
  B: 'US CIVILIAN',
  C: 'NON-US MILITARY',
  D: 'NON-US CIVILIAN',
  E: 'ENEMY PRISONER',
} as const;
const LINE9 = { N: 'NUCLEAR', B: 'BIOLOGICAL', C: 'CHEMICAL' } as const;

/** "2 ALPHA (URGENT), BREAK, 1 CHARLIE (PRIORITY)" — counts by brevity letter, zero counts omitted. */
const counted = (rec: Record<string, number>, names: Record<string, string>) =>
  Object.entries(rec)
    .filter(([, n]) => n > 0)
    .map(([k, n]) => `${n} ${PHON[k]} (${names[k]})`)
    .join(', BREAK, ');

/** 9-line MEDEVAC request as a read-aloud script (JTS TCCC skill card, 14 May 2023 format). */
export function nineLineScript(plan: CasevacPlan): string[] {
  const n = plan.nineLine;
  const line1 = grid8(n.line1 || plan.hlz.grid) || '________';
  const out = [
    `"${(n.callSign || plan.hlz.callSign || '[CALL SIGN]').toUpperCase()}: I HAVE A MEDEVAC REQUEST, OVER."`,
    `LINE 1 — PICKUP SITE GRID: ${line1}`,
    `LINE 2 — FREQ / CALL SIGN: ${n.freq || plan.hlz.freq || '____'} / ${(n.callSign || plan.hlz.callSign || '____').toUpperCase()}${n.suffix ? ` ${n.suffix}` : ''}`,
    `LINE 3 — PATIENTS BY PRECEDENCE: ${counted(n.line3, LINE3) || 'NONE ENTERED'}`,
    `LINE 4 — SPECIAL EQUIPMENT: ${PHON[n.line4]} (${LINE4[n.line4]})`,
    `LINE 5 — PATIENTS BY TYPE: ${counted({ L: n.line5L, A: n.line5A }, LINE5) || 'NONE ENTERED'}`,
    n.wartime
      ? `LINE 6 — SECURITY AT PICKUP SITE: ${PHON[n.line6War]} (${LINE6[n.line6War]})`
      : `LINE 6 — WOUNDS / INJURIES / ILLNESS: ${n.line6Peace || '____'}`,
    `LINE 7 — MARKING: ${PHON[n.line7]} (${LINE7[n.line7]}${n.line7Detail && n.line7 !== 'D' ? ` — ${n.line7Detail}` : ''})`,
    `LINE 8 — NATIONALITY / STATUS: ${counted(n.line8, LINE8) || 'NONE ENTERED'}`,
    n.wartime
      ? `LINE 9 — CBRN CONTAMINATION: ${n.line9War ? `${PHON[n.line9War]} (${LINE9[n.line9War]})` : 'NONE — omit line'}`
      : `LINE 9 — TERRAIN AT PICKUP SITE: ${n.line9Peace || '____'}`,
    'OVER.',
  ];
  // Number only the cards read aloud, so a blank card doesn't leave a gap ("MIST 2" alone).
  n.mist
    .filter((m) => m.m || m.i || m.s || m.t || m.zap)
    .forEach((m, i) => {
      out.push(
        `MIST ${i + 1}${m.zap ? ` (${m.zap})` : ''} — M: ${m.m || '—'} · I: ${m.i || '—'} · S: ${m.s || '—'} · T: ${m.t || '—'}`
      );
    });
  return out;
}

/** The graded CASEVAC sub-paragraph (EULC checklist ¶4.a (1)–(7)), composed from the plan. */
export function casevacParagraph(plan: CasevacPlan, g: HlzGeom, t: RouteTimeline): string {
  const h = plan.hlz;
  const c = plan.ccp;
  const p = plan.para;
  const chain = plan.route.legs
    .map(
      (leg, i) =>
        `${plan.route.nodes[i + 1]?.name ?? ''} +${leg.timeMin} min (${legLabel(leg.mode).toLowerCase()})`
    )
    .join(' → ');
  const lines = [
    'a. Casualty Evacuation Plan.',
    `(1) CCPs & HLZs. ${c.name} ${grid8(c.grid)}${c.locationDesc ? ` — ${c.locationDesc}` : ''} ${h.name} ${grid8(h.grid)}: ${g.lps.length} × Size ${h.lpSize} LP, final approach ${pad3(h.approachMag)}°M; marked by ${[...h.markDay, ...h.markNight].join(' / ') || 'TBD'}. Litter route CCP → HLZ ≈ ${Math.round(g.litterRouteM)} m.`,
    `(2) Corpsmen. ${p.corpsmen || '[by part]'}`,
    `(3) Reporting. ${p.reporting || '[who tells who what]'}`,
    `(4) Handling. ${p.handling || '[who does what]'} Triage officer: ${c.triageOfficer || 'TBD'}; litter teams: ${c.litterTeams || 'TBD'}.`,
    `(5) Evacuation. (a) Priority of evacuation or mission by part: ${p.evacByPart || '[by part]'} (b) Timeline by echelon of care: POI → ${chain || '[route]'}. Urgent / Urgent-surgical ≤ 1 h; Priority ≤ ${plan.route.priorityHours} h; Routine ≤ 24 h. PACE — P: ${plan.route.paceP}; A: ${plan.route.paceA}; C: ${plan.route.paceC}; E: ${plan.route.paceE}.${t.toSurgicalMin !== null ? ` POI → surgical care ≈ ${fmtMin(t.toSurgicalMin)}.` : ''}`,
    `(6) MASCAL. ${p.mascal || '[mass casualty plan]'}`,
    `(7) Enemy casualties. ${p.enemyCas || '[treat per the Geneva Conventions; segregate and guard; report]'}`,
  ];
  return lines.join('\n');
}
