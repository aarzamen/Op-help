import { newItemId, readJson, safeSetItem } from './host';
import type { Vec } from './geo';

/**
 * CASEVAC plan model. One plan per browser (key `casevac-plan`); background images are
 * stored separately per sheet (`casevac-bg-<sheet>`) so a big screenshot can't block saving
 * the plan itself. All positions are world meters (x = grid east, y = grid north) relative
 * to the sheet's reference grid.
 */

export const CASEVAC_KEY = 'casevac-plan';
export type SheetId = 'hlz' | 'ccp' | 'route';
export const bgKey = (sheet: SheetId) => `casevac-bg-${sheet}`;

export const newId = () => newItemId().replace('item-', '');

// ----- doctrine constants -----

/**
 * Landing point sizes (FM 3-21.38 Pathfinder Ops, ch. 4): the cleared diameter and the
 * minimum center-to-center separation between landing points. Aircraft examples are Army
 * planning guidance; confirm Marine aircraft (UH-1Y, CH-53, MV-22) with the supporting squadron.
 */
export const LP_SIZES = [
  { size: 1, m: 25, examples: 'light observation (OH-58D class)' },
  { size: 2, m: 35, examples: 'utility / light attack (UH-1, AH-1 class)' },
  { size: 3, m: 50, examples: 'UH-60 / AH-64 class' },
  { size: 4, m: 80, examples: 'CH-47 class' },
  { size: 5, m: 100, examples: 'large, mixed, or unknown aircraft' },
] as const;

export type LpSize = 1 | 2 | 3 | 4 | 5;
export const lpDiameter = (size: LpSize) => LP_SIZES[size - 1].m;

/** Evacuation precedence (ATP 4-02.2 / 9-line Line 3). Hours = maximum time to evacuate. */
export const PRECEDENCE = [
  { code: 'A', name: 'URGENT', hours: 1, meaning: 'Save life, limb, or eyesight' },
  { code: 'B', name: 'URGENT-SURGICAL', hours: 1, meaning: 'Needs far-forward surgery to survive' },
  { code: 'C', name: 'PRIORITY', hours: 4, meaning: 'Could deteriorate to urgent' },
  { code: 'D', name: 'ROUTINE', hours: 24, meaning: 'Stable; needs higher care' },
  { code: 'E', name: 'CONVENIENCE', hours: null, meaning: 'Medical convenience, not necessity' },
] as const;

export const DAY_MARKINGS = ['Colored smoke', 'Air panel (VS-17)', 'Ground guide'] as const;
export const NIGHT_MARKINGS = ['IR strobe', 'IR buzzsaw', 'Inverted Y (IR)', 'Chemlights'] as const;

export type ObstacleKind = 'trees' | 'wires' | 'tower' | 'building' | 'pole' | 'other';
export const OBSTACLE_KINDS: { kind: ObstacleKind; label: string; defaultH: number }[] = [
  { kind: 'trees', label: 'Trees', defaultH: 15 },
  { kind: 'wires', label: 'Wires', defaultH: 10 },
  { kind: 'tower', label: 'Tower / antenna', defaultH: 30 },
  { kind: 'building', label: 'Building', defaultH: 8 },
  { kind: 'pole', label: 'Pole / light', defaultH: 9 },
  { kind: 'other', label: 'Other', defaultH: 5 },
];

// ----- sheets -----

export interface Obstacle {
  id: string;
  kind: ObstacleKind;
  pos: Vec;
  heightM: number;
  note: string;
}

export interface Marker {
  id: string;
  pos: Vec;
  label: string;
}

export interface HlzSheet {
  name: string;
  grid: string; // HLZ center
  lpSize: LpSize;
  lpCount: number;
  formation: 'trail' | 'abreast';
  lpSpacing: number; // m, center to center
  autoZone: boolean;
  zoneW: number;
  zoneL: number;
  approachMag: number; // final approach course (direction of flight), °M
  departureMag: number;
  windFromMag: number;
  windKts: number;
  surface: string;
  slope: string;
  markDay: string[];
  markNight: string[];
  controller: string;
  freq: string;
  callSign: string;
  obstacles: Obstacle[];
  security: Marker[];
  loadPoint: Vec;
  ccpPos: Vec; // used when the CCP grid is blank or in another zone
  notes: string;
}

export type CcpAreaKind =
  | 'triage'
  | 'immediate'
  | 'delayed'
  | 'minimal'
  | 'expectant'
  | 'evac'
  | 'loading'
  | 'remains'
  | 'enemy';

export interface CcpArea {
  kind: CcpAreaKind;
  enabled: boolean;
  pos: Vec;
  w: number;
  h: number;
}

export interface CcpSheet {
  name: string;
  grid: string;
  locationDesc: string;
  flowAz: 0 | 90 | 180 | 270; // direction casualties flow, entrance → loading
  areas: CcpArea[];
  security: Marker[];
  markDay: string;
  markNight: string;
  triageOfficer: string;
  treatment: string;
  litterTeams: string;
  rto: string;
  notes: string;
}

export type NodeKind = 'poi' | 'ccp' | 'axp' | 'bas' | 'hlz' | 'r2' | 'r3' | 'other';
export type LegMode = 'litter' | 'ground' | 'ambulance' | 'rotary' | 'tiltrotor' | 'fixed';

export const NODE_KINDS: { kind: NodeKind; badge: string; label: string; surgical?: boolean }[] = [
  { kind: 'poi', badge: 'POI', label: 'Point of injury' },
  { kind: 'ccp', badge: 'CCP', label: 'Casualty collection point' },
  { kind: 'axp', badge: 'AXP', label: 'Ambulance exchange point' },
  { kind: 'bas', badge: 'R1', label: 'BAS — Role 1' },
  { kind: 'hlz', badge: 'HLZ', label: 'Helicopter landing zone' },
  { kind: 'r2', badge: 'R2', label: 'Role 2 — surgical (FRSS / STP)', surgical: true },
  { kind: 'r3', badge: 'R3', label: 'Role 3 — hospital', surgical: true },
  { kind: 'other', badge: '•', label: 'Other' },
];

export const LEG_MODES: { mode: LegMode; label: string }[] = [
  { mode: 'litter', label: 'Litter / foot' },
  { mode: 'ground', label: 'Tactical vehicle' },
  { mode: 'ambulance', label: 'Ground ambulance' },
  { mode: 'rotary', label: 'Rotary wing' },
  { mode: 'tiltrotor', label: 'Tilt-rotor (MV-22)' },
  { mode: 'fixed', label: 'Fixed wing' },
];

export interface RouteNode {
  id: string;
  kind: NodeKind;
  name: string;
  grid: string;
  note: string;
  pos: Vec; // map layout position (used when a background is loaded)
}

export interface RouteLeg {
  mode: LegMode;
  distKm: number;
  timeMin: number;
  route: string;
  net: string;
  platform: string;
}

export interface RouteSheet {
  layout: 'schematic' | 'map';
  nodes: RouteNode[];
  legs: RouteLeg[]; // legs[i] joins nodes[i] → nodes[i + 1]
  paceP: string;
  paceA: string;
  paceC: string;
  paceE: string;
  priorityHours: number; // course baseline may differ from ATP 4-02.2's 4 h
}

export interface MistEntry {
  id: string;
  zap: string;
  m: string;
  i: string;
  s: string;
  t: string;
}

export interface NineLine {
  wartime: boolean;
  line1: string;
  freq: string;
  callSign: string;
  suffix: string;
  line3: Record<'A' | 'B' | 'C' | 'D' | 'E', number>;
  line4: 'A' | 'B' | 'C' | 'D';
  line5L: number;
  line5A: number;
  line6War: 'N' | 'P' | 'E' | 'X';
  line6Peace: string;
  line7: 'A' | 'B' | 'C' | 'D' | 'E';
  line7Detail: string;
  line8: Record<'A' | 'B' | 'C' | 'D' | 'E', number>;
  line9War: '' | 'N' | 'B' | 'C';
  line9Peace: string;
  mist: MistEntry[];
}

/** The graded CASEVAC sub-paragraph (EULC checklist ¶4.a) that the sketches support. */
export interface CasevacParagraph {
  corpsmen: string;
  reporting: string;
  handling: string;
  evacByPart: string;
  mascal: string;
  enemyCas: string;
}

export interface CasevacPlan {
  v: 1;
  unit: string;
  preparedBy: string;
  banner: string;
  hlz: HlzSheet;
  ccp: CcpSheet;
  route: RouteSheet;
  para: CasevacParagraph;
  nineLine: NineLine;
}

export interface Background {
  dataUrl: string;
  aspect: number; // height / width
  widthM: number; // ground width the image covers
  offset: Vec; // image center, world meters
  opacity: number;
}

// ----- CCP template -----

export const CCP_AREA_META: Record<CcpAreaKind, { label: string; sub?: string; tone: string }> = {
  triage: { label: 'TRIAGE POINT', sub: 'one entrance', tone: 'triage' },
  immediate: { label: 'IMMEDIATE', sub: 'T1 · red', tone: 'immediate' },
  delayed: { label: 'DELAYED', sub: 'T2 · yellow', tone: 'delayed' },
  minimal: { label: 'MINIMAL', sub: 'T3 · green', tone: 'minimal' },
  expectant: { label: 'EXPECTANT', sub: 'T4 · screened', tone: 'expectant' },
  evac: { label: 'EVAC STAGING', sub: 'by precedence', tone: 'evac' },
  loading: { label: 'LOADING POINT', sub: 'vehicle / AXP', tone: 'loading' },
  remains: { label: 'KIA / REMAINS', sub: 'out of view', tone: 'remains' },
  enemy: { label: 'EN CASUALTIES', sub: 'guarded', tone: 'enemy' },
};

/** Default one-way-flow CCP layout, in a local frame (u along the flow, v to its right). */
const CCP_TEMPLATE: {
  kind: CcpAreaKind;
  u: number;
  v: number;
  w: number;
  h: number;
  enabled: boolean;
}[] = [
  { kind: 'triage', u: 0, v: 0, w: 14, h: 7, enabled: true },
  { kind: 'immediate', u: 15, v: 0, w: 13, h: 9, enabled: true },
  { kind: 'delayed', u: 15, v: -16, w: 13, h: 9, enabled: true },
  { kind: 'minimal', u: 15, v: 16, w: 13, h: 9, enabled: true },
  { kind: 'expectant', u: 4, v: -27, w: 13, h: 7, enabled: true },
  { kind: 'evac', u: 31, v: 0, w: 38, h: 10, enabled: true },
  { kind: 'loading', u: 46, v: 0, w: 18, h: 7, enabled: true },
  { kind: 'remains', u: -9, v: -24, w: 15, h: 7, enabled: true },
  { kind: 'enemy', u: -9, v: 24, w: 15, h: 7, enabled: true },
];

/** Lay the template out for a flow direction (multiples of 90° keep rectangles axis-aligned). */
export function ccpLayout(flowAz: 0 | 90 | 180 | 270, previous?: CcpArea[]): CcpArea[] {
  const rad = (flowAz * Math.PI) / 180;
  const along = { x: Math.sin(rad), y: Math.cos(rad) };
  const right = { x: Math.cos(rad), y: -Math.sin(rad) };
  const sideways = flowAz === 90 || flowAz === 270;
  return CCP_TEMPLATE.map((t) => ({
    kind: t.kind,
    enabled: previous?.find((p) => p.kind === t.kind)?.enabled ?? t.enabled,
    // Center the layout on the CCP grid: shift along-flow so the middle sits at 0.
    pos: {
      x: Math.round(along.x * (t.u - 18) + right.x * t.v),
      y: Math.round(along.y * (t.u - 18) + right.y * t.v),
    },
    w: sideways ? t.h : t.w,
    h: sideways ? t.w : t.h,
  }));
}

const ccpSecurity = (flowAz: number): Marker[] => {
  const rad = (flowAz * Math.PI) / 180;
  const along = { x: Math.sin(rad), y: Math.cos(rad) };
  const right = { x: Math.cos(rad), y: -Math.sin(rad) };
  const at = (u: number, v: number) => ({
    x: Math.round(along.x * u + right.x * v),
    y: Math.round(along.y * u + right.y * v),
  });
  return [
    { id: newId(), pos: at(-32, -42), label: 'SEC' },
    { id: newId(), pos: at(-32, 42), label: 'SEC' },
    { id: newId(), pos: at(40, -34), label: 'SEC' },
    { id: newId(), pos: at(40, 34), label: 'SEC' },
  ];
};

// ----- defaults (a labeled example on the EULC exercise's MLR Obj 1 — replace with your grids) -----

export function defaultHlz(): HlzSheet {
  return {
    name: 'HLZ HAWK',
    grid: '10S FE 6230 8150',
    lpSize: 5,
    lpCount: 2,
    formation: 'trail',
    lpSpacing: 100,
    autoZone: true,
    zoneW: 150,
    zoneL: 250,
    approachMag: 300,
    departureMag: 300,
    windFromMag: 290,
    windKts: 8,
    surface: 'Graded dirt / dry grass — dust (brownout) risk',
    slope: '< 5%',
    markDay: ['Colored smoke', 'Air panel (VS-17)'],
    markNight: ['IR strobe'],
    controller: 'HLZ control — Co HQ',
    freq: 'ABCC Tac 1',
    callSign: 'GOTHAM',
    // Seeded on the approach / departure axes so the default sheet shows both 10:1 checks.
    obstacles: [
      { id: newId(), kind: 'trees', pos: { x: 165, y: -145 }, heightM: 15, note: 'tree line' },
      { id: newId(), kind: 'wires', pos: { x: -180, y: 60 }, heightM: 10, note: 'power line' },
    ],
    security: [
      // On the flanks, clear of the approach / departure corridors.
      { id: newId(), pos: { x: 100, y: 170 }, label: 'SEC' },
      { id: newId(), pos: { x: 190, y: 40 }, label: 'SEC' },
      { id: newId(), pos: { x: -100, y: -170 }, label: 'SEC' },
      { id: newId(), pos: { x: -190, y: -40 }, label: 'SEC' },
    ],
    loadPoint: { x: 22, y: 100 },
    ccpPos: { x: 180, y: 130 },
    notes: '',
  };
}

export function defaultCcp(): CcpSheet {
  return {
    name: 'CCP 1',
    grid: '10S FE 6248 8163',
    locationDesc: 'Co-located with the COC in a hardened structure; displaces with the COC.',
    flowAz: 0,
    areas: ccpLayout(0),
    security: ccpSecurity(0),
    markDay: 'Air panel (VS-17) at entrance',
    markNight: 'IR chemlight at entrance',
    triageOfficer: 'HM1 (senior corpsman)',
    treatment: '1 corpsman per category area; CLS augment',
    litterTeams: '2 × 4-person teams from the reserve',
    rto: 'Co HQ RTO — casualty tracker',
    notes: '',
  };
}

export function defaultRoute(): RouteSheet {
  const nodes: RouteNode[] = [
    {
      id: newId(),
      kind: 'poi',
      name: 'Point of injury',
      grid: '',
      note: 'Perimeter / work site',
      pos: { x: -300, y: 0 },
    },
    {
      id: newId(),
      kind: 'ccp',
      name: 'CCP 1',
      grid: '10S FE 6248 8163',
      note: 'Co-located w/ COC',
      pos: { x: -150, y: 0 },
    },
    {
      id: newId(),
      kind: 'hlz',
      name: 'HLZ HAWK',
      grid: '10S FE 6230 8150',
      note: 'Adjacent to runway',
      pos: { x: 0, y: 0 },
    },
    {
      id: newId(),
      kind: 'r2',
      name: 'Role 2 (per higher)',
      grid: '',
      note: 'FRSS / STP',
      pos: { x: 150, y: 0 },
    },
    {
      id: newId(),
      kind: 'r3',
      name: 'Role 3 (per higher)',
      grid: '',
      note: 'Theater hospital',
      pos: { x: 300, y: 0 },
    },
  ];
  const legs: RouteLeg[] = [
    {
      mode: 'litter',
      distKm: 0.4,
      timeMin: 10,
      route: 'Inside perimeter',
      net: 'Plt → Co Tac 1',
      platform: '2+ litter bearers',
    },
    {
      mode: 'litter',
      distKm: 0.2,
      timeMin: 5,
      route: 'Litter route CCP → HLZ',
      net: 'ABCC Tac 1',
      platform: 'Litter / vehicle',
    },
    {
      mode: 'rotary',
      distKm: 40,
      timeMin: 20,
      route: 'Per air plan',
      net: 'MLR Ops (9-line)',
      platform: 'HMH (MEDEVAC/CASEVAC)',
    },
    {
      mode: 'rotary',
      distKm: 120,
      timeMin: 45,
      route: 'Per higher',
      net: 'Per higher',
      platform: 'Per higher',
    },
  ];
  return {
    layout: 'schematic',
    nodes,
    legs,
    paceP: 'Rotary wing via 9-line to MLR Ops',
    paceA: 'Dedicated ground evacuation vehicle',
    paceC: 'Any tactical vehicle (MTVR) to LCT medical',
    paceE: 'Any vehicle moving to the rear; litter carry',
    priorityHours: 4,
  };
}

export function defaultNineLine(): NineLine {
  return {
    wartime: true,
    line1: '',
    freq: '',
    callSign: '',
    suffix: '',
    line3: { A: 1, B: 0, C: 1, D: 0, E: 0 },
    line4: 'A',
    line5L: 1,
    line5A: 1,
    line6War: 'P',
    line6Peace: '',
    line7: 'C',
    line7Detail: 'violet',
    line8: { A: 2, B: 0, C: 0, D: 0, E: 0 },
    line9War: '',
    line9Peace: '',
    mist: [{ id: newId(), zap: '', m: '', i: '', s: '', t: '' }],
  };
}

export function defaultPlan(): CasevacPlan {
  return {
    v: 1,
    unit: '',
    preparedBy: '',
    banner: 'UNCLASSIFIED // EXERCISE',
    hlz: defaultHlz(),
    ccp: defaultCcp(),
    route: defaultRoute(),
    para: { corpsmen: '', reporting: '', handling: '', evacByPart: '', mascal: '', enemyCas: '' },
    nineLine: defaultNineLine(),
  };
}

const isObj = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === 'object' && !Array.isArray(v);
const isVec = (v: unknown): v is Vec =>
  isObj(v) && Number.isFinite(v.x as number) && Number.isFinite(v.y as number);
/** Keep an array only if every entry is an object with a numeric `pos` (when `withPos`). */
const arr = <T>(v: unknown, fallback: T[], withPos = true): T[] =>
  Array.isArray(v) && v.every((e) => isObj(e) && (!withPos || isVec(e.pos)))
    ? (v as T[])
    : fallback;

/**
 * Fill any fields a previous version didn't have and drop malformed collections, so a plan
 * from storage, a shared link or a file can't crash the sketches. Returns null when `raw`
 * isn't a v1 plan at all.
 */
export function normalizePlan(raw: unknown): CasevacPlan | null {
  if (!isObj(raw) || raw.v !== 1) return null;
  const base = defaultPlan();
  const s = raw as Partial<CasevacPlan>;
  const hlz = { ...base.hlz, ...(isObj(s.hlz) ? s.hlz : {}) };
  const ccp = { ...base.ccp, ...(isObj(s.ccp) ? s.ccp : {}) };
  const route = { ...base.route, ...(isObj(s.route) ? s.route : {}) };
  const nineLine = { ...base.nineLine, ...(isObj(s.nineLine) ? s.nineLine : {}) };
  hlz.obstacles = arr(hlz.obstacles, base.hlz.obstacles);
  hlz.security = arr(hlz.security, base.hlz.security);
  if (!isVec(hlz.loadPoint)) hlz.loadPoint = base.hlz.loadPoint;
  if (!isVec(hlz.ccpPos)) hlz.ccpPos = base.hlz.ccpPos;
  ccp.areas = arr(ccp.areas, base.ccp.areas);
  ccp.security = arr(ccp.security, base.ccp.security);
  route.nodes = arr(route.nodes, base.route.nodes);
  route.legs = arr(route.legs, base.route.legs, false);
  if (route.nodes.length < 2 || route.legs.length !== route.nodes.length - 1) {
    route.nodes = base.route.nodes;
    route.legs = base.route.legs;
  }
  nineLine.mist = arr(nineLine.mist, base.nineLine.mist, false);
  return {
    ...base,
    ...s,
    v: 1,
    hlz,
    ccp,
    route,
    para: { ...base.para, ...(isObj(s.para) ? s.para : {}) },
    nineLine,
  };
}

/** Load the stored plan (or the labeled example when there is none). */
export function loadPlan(): CasevacPlan {
  return normalizePlan(readJson<unknown>(CASEVAC_KEY, null)) ?? defaultPlan();
}

export const savePlan = (plan: CasevacPlan) => safeSetItem(CASEVAC_KEY, JSON.stringify(plan));

/** A background is only trusted if it is an inline image with sane numbers. */
export function normalizeBackground(raw: unknown): Background | null {
  if (!isObj(raw)) return null;
  const bg = raw as Partial<Background>;
  const ok =
    typeof bg.dataUrl === 'string' &&
    /^data:image\/(png|jpe?g|webp|gif);base64,/.test(bg.dataUrl) &&
    Number.isFinite(bg.aspect) &&
    Number.isFinite(bg.widthM) &&
    isVec(bg.offset) &&
    Number.isFinite(bg.opacity);
  return ok ? (bg as Background) : null;
}

export const loadBackground = (sheet: SheetId): Background | null =>
  normalizeBackground(readJson<unknown>(bgKey(sheet), null));
