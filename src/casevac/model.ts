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
    line7Detail: '', // the pilot identifies the smoke color; don't announce it first
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

// ----- validation of plans from storage, a shared link or a file -----

/** ±100 km from the sheet's reference grid covers any CASEVAC chain; beyond it the
 * gridline loops and fit math get absurd (a node at 1e12 m hangs the tab). */
const COORD_MAX = 100_000;
const TEXT_MAX = 4000;
const LIST_MAX = 100;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const num = (v: unknown, d: number, lo = -Infinity, hi = Infinity) =>
  typeof v === 'number' && Number.isFinite(v) ? clamp(v, lo, hi) : d;
const text = (v: unknown, d = '') => (typeof v === 'string' ? v.slice(0, TEXT_MAX) : d);
const vec = (v: unknown, d: Vec): Vec =>
  isVec(v) ? { x: clamp(v.x, -COORD_MAX, COORD_MAX), y: clamp(v.y, -COORD_MAX, COORD_MAX) } : d;
const oneOf = <T>(v: unknown, allowed: readonly T[], d: T): T =>
  allowed.includes(v as T) ? (v as T) : d;
const heading = (v: unknown, d: number) => {
  const n = num(v, d);
  return ((n % 360) + 360) % 360;
};

/**
 * Copy `raw` onto the shape of `base`: the same keys with the same scalar types, anything
 * missing or mistyped taken from `base`. Arrays are left at `base` for the caller to check.
 */
function shaped<T>(base: T, raw: unknown): T {
  if (typeof base === 'string') return text(raw, base) as T;
  if (typeof base === 'number') return num(raw, base) as T;
  if (typeof base === 'boolean') return (typeof raw === 'boolean' ? raw : base) as T;
  if (Array.isArray(base) || !isObj(base)) return base;
  const src = isObj(raw) ? raw : {};
  const out: Record<string, unknown> = {};
  for (const k of Object.keys(base)) out[k] = shaped(base[k], src[k]);
  return out as T;
}

/** Valid entries of a list (bad ones dropped); `fallback` when it isn't a list at all. */
function list<T>(raw: unknown, entry: (e: Record<string, unknown>) => T | null, fallback: T[]) {
  if (!Array.isArray(raw)) return fallback;
  return raw
    .slice(0, LIST_MAX)
    .map((e) => (isObj(e) ? entry(e) : null))
    .filter((e): e is T => e !== null);
}

/** Ids are selection and React keys: give blank or repeated ones a fresh id. */
function uniqueIds<T extends { id: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  return items.map((it) => {
    const id = it.id && !seen.has(it.id) ? it.id : newId();
    seen.add(id);
    return id === it.id ? it : { ...it, id };
  });
}

const strings = (v: unknown, d: string[]) =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string').slice(0, 20) : d;

const OBSTACLE_KIND_IDS = OBSTACLE_KINDS.map((o) => o.kind);
const NODE_KIND_IDS = NODE_KINDS.map((k) => k.kind);
const LEG_MODE_IDS = LEG_MODES.map((m) => m.mode);
const FLOW_AZ = [0, 90, 180, 270] as const;

function marker(e: Record<string, unknown>): Marker | null {
  if (!isVec(e.pos)) return null;
  return { id: text(e.id), pos: vec(e.pos, { x: 0, y: 0 }), label: text(e.label, 'SEC') };
}

function normalizeHlz(raw: unknown, base: HlzSheet): HlzSheet {
  const r = isObj(raw) ? raw : {};
  const h = shaped(base, r);
  return {
    ...h,
    lpSize: oneOf(r.lpSize, [1, 2, 3, 4, 5] as const, base.lpSize),
    lpCount: Math.round(num(r.lpCount, base.lpCount, 1, 8)),
    formation: oneOf(r.formation, ['trail', 'abreast'] as const, base.formation),
    lpSpacing: num(r.lpSpacing, base.lpSpacing, 0, 5000),
    zoneW: num(r.zoneW, base.zoneW, 10, 5000),
    zoneL: num(r.zoneL, base.zoneL, 10, 5000),
    approachMag: heading(r.approachMag, base.approachMag),
    departureMag: heading(r.departureMag, base.departureMag),
    windFromMag: heading(r.windFromMag, base.windFromMag),
    windKts: num(r.windKts, base.windKts, 0, 200),
    markDay: strings(r.markDay, base.markDay),
    markNight: strings(r.markNight, base.markNight),
    obstacles: uniqueIds(
      list(
        r.obstacles,
        (e): Obstacle | null =>
          isVec(e.pos)
            ? {
                id: text(e.id),
                kind: oneOf(e.kind, OBSTACLE_KIND_IDS, 'other'),
                pos: vec(e.pos, { x: 0, y: 0 }),
                heightM: num(e.heightM, 10, 0, 1000),
                note: text(e.note),
              }
            : null,
        base.obstacles
      )
    ),
    security: uniqueIds(list(r.security, marker, base.security)),
    loadPoint: vec(r.loadPoint, base.loadPoint),
    ccpPos: vec(r.ccpPos, base.ccpPos),
  };
}

function normalizeCcp(raw: unknown, base: CcpSheet): CcpSheet {
  const r = isObj(raw) ? raw : {};
  const c = shaped(base, r);
  const flowAz = oneOf(r.flowAz, FLOW_AZ, base.flowAz);
  const given = Array.isArray(r.areas) ? r.areas.filter(isObj) : null;
  // Always exactly the template's areas, one per kind: unknown kinds are dropped and
  // missing ones come back in their default place for this flow direction.
  const areas = ccpLayout(flowAz).map((d) => {
    const a = given?.find((x) => x.kind === d.kind);
    if (!a || !isVec(a.pos)) return d;
    return {
      kind: d.kind,
      enabled: d.kind === 'triage' || typeof a.enabled !== 'boolean' ? d.enabled : a.enabled,
      pos: vec(a.pos, d.pos),
      w: num(a.w, d.w, 4, 500),
      h: num(a.h, d.h, 4, 500),
    };
  });
  return { ...c, flowAz, areas, security: uniqueIds(list(r.security, marker, base.security)) };
}

function normalizeRoute(raw: unknown, base: RouteSheet): RouteSheet {
  const r = isObj(raw) ? raw : {};
  const route = shaped(base, r);
  const nodes = uniqueIds(
    list(
      r.nodes,
      (e): RouteNode | null =>
        isVec(e.pos)
          ? {
              id: text(e.id),
              kind: oneOf(e.kind, NODE_KIND_IDS, 'other'),
              name: text(e.name),
              grid: text(e.grid),
              note: text(e.note),
              pos: vec(e.pos, { x: 0, y: 0 }),
            }
          : null,
      []
    )
  );
  const legs = list(
    r.legs,
    (e): RouteLeg => ({
      mode: oneOf(e.mode, LEG_MODE_IDS, 'ground'),
      distKm: num(e.distKm, 0, 0, 20000),
      timeMin: num(e.timeMin, 0, 0, 10000),
      route: text(e.route),
      net: text(e.net),
      platform: text(e.platform),
    }),
    []
  );
  // legs[i] joins nodes[i] → nodes[i + 1]; if that no longer holds, start from the example.
  const chainOk = nodes.length >= 2 && legs.length === nodes.length - 1;
  return {
    ...route,
    layout: oneOf(r.layout, ['schematic', 'map'] as const, base.layout),
    priorityHours: num(r.priorityHours, base.priorityHours, 0, 72),
    nodes: chainOk ? nodes : base.nodes,
    legs: chainOk ? legs : base.legs,
  };
}

function normalizeNineLine(raw: unknown, base: NineLine): NineLine {
  const r = isObj(raw) ? raw : {};
  const n = shaped(base, r);
  const count = (v: number) => Math.round(clamp(v, 0, 99));
  const counts = <K extends string>(rec: Record<K, number>) =>
    Object.fromEntries(Object.entries(rec).map(([k, v]) => [k, count(v as number)])) as Record<
      K,
      number
    >;
  return {
    ...n,
    line3: counts(n.line3),
    line8: counts(n.line8),
    line5L: count(n.line5L),
    line5A: count(n.line5A),
    line4: oneOf(r.line4, ['A', 'B', 'C', 'D'] as const, base.line4),
    line6War: oneOf(r.line6War, ['N', 'P', 'E', 'X'] as const, base.line6War),
    line7: oneOf(r.line7, ['A', 'B', 'C', 'D', 'E'] as const, base.line7),
    line9War: oneOf(r.line9War, ['', 'N', 'B', 'C'] as const, base.line9War),
    mist: uniqueIds(
      list(
        r.mist,
        (e): MistEntry => ({
          id: text(e.id),
          zap: text(e.zap),
          m: text(e.m),
          i: text(e.i),
          s: text(e.s),
          t: text(e.t),
        }),
        base.mist
      )
    ),
  };
}

/**
 * Check a plan from storage, a shared link or a file field by field against the current
 * shape: wrong types and unknown enum values fall back to the defaults, bad list entries
 * are dropped, coordinates are clamped and ids made unique, so nothing that arrives can
 * crash a sketch or an export. Returns null when `raw` isn't a v1 plan at all.
 */
export function normalizePlan(raw: unknown): CasevacPlan | null {
  if (!isObj(raw) || raw.v !== 1) return null;
  const base = defaultPlan();
  return {
    v: 1,
    unit: text(raw.unit, base.unit),
    preparedBy: text(raw.preparedBy, base.preparedBy),
    banner: text(raw.banner, base.banner),
    hlz: normalizeHlz(raw.hlz, base.hlz),
    ccp: normalizeCcp(raw.ccp, base.ccp),
    route: normalizeRoute(raw.route, base.route),
    para: shaped(base.para, raw.para),
    nineLine: normalizeNineLine(raw.nineLine, base.nineLine),
  };
}

/** Load the stored plan (or the labeled example when there is none). */
export function loadPlan(): CasevacPlan {
  return normalizePlan(readJson<unknown>(CASEVAC_KEY, null)) ?? defaultPlan();
}

export const savePlan = (plan: CasevacPlan) => safeSetItem(CASEVAC_KEY, JSON.stringify(plan));

/** Widest ground an overlay image may cover (the editor caps the field at the same value). */
export const BG_MAX_WIDTH_M = 400_000;

/** A background is only trusted if it is an inline image with sane numbers. */
export function normalizeBackground(raw: unknown): Background | null {
  if (!isObj(raw)) return null;
  const bg = raw as Partial<Background>;
  const ok =
    typeof bg.dataUrl === 'string' &&
    /^data:image\/(png|jpe?g|webp|gif);base64,/.test(bg.dataUrl) &&
    typeof bg.aspect === 'number' &&
    bg.aspect > 0 &&
    bg.aspect < 100 &&
    typeof bg.widthM === 'number' &&
    Number.isFinite(bg.widthM) &&
    bg.widthM > 0 &&
    isVec(bg.offset) &&
    Number.isFinite(bg.opacity);
  if (!ok) return null;
  return {
    dataUrl: bg.dataUrl as string,
    aspect: bg.aspect as number,
    widthM: clamp(bg.widthM as number, 10, BG_MAX_WIDTH_M),
    offset: vec(bg.offset, { x: 0, y: 0 }),
    opacity: clamp(bg.opacity as number, 0, 1),
  };
}

export const loadBackground = (sheet: SheetId): Background | null =>
  normalizeBackground(readJson<unknown>(bgKey(sheet), null));
