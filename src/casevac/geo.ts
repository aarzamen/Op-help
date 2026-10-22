import * as mgrs from 'mgrs';
import geomagnetism from 'geomagnetism';

/**
 * Grid math for the CASEVAC sketches. Sketch world units are meters on the UTM grid:
 * x = grid east, y = grid north, origin at the sheet's reference grid. Offsets are applied
 * to the MGRS easting/northing directly (exact inside one grid zone, which is always true
 * at HLZ/CCP scale), so labels and gridlines match a 1:25k/1:50k map.
 */

const ROW_LETTERS = 'ABCDEFGHJKLMNPQRSTUV'; // 20-letter 100 km row cycle (no I/O)
const colLetters = (zone: number) => ['ABCDEFGH', 'JKLMNPQR', 'STUVWXYZ'][(zone - 1) % 3];

export interface MgrsRef {
  zone: number;
  band: string;
  colIdx: number; // index into the zone's 100 km column letter set
  rowIdx: number; // index into ROW_LETTERS
  e: number; // meters east within the 100 km square
  n: number; // meters north within the 100 km square
  digits: number; // digits per axis as entered (1–5)
}

const MGRS_RE = /^(\d{1,2})([C-HJ-NP-X])([A-HJ-NP-Z])([A-HJ-NP-V])(\d{0,10})$/;

/** Parse "11S KU 12345 67890" (any spacing/case, 0–10 digits). Null if it isn't a valid MGRS string. */
export function parseMgrs(input: string): MgrsRef | null {
  const s = (input || '').toUpperCase().replace(/[^0-9A-Z]/g, '');
  const m = s.match(MGRS_RE);
  if (!m) return null;
  const zone = Number(m[1]);
  if (zone < 1 || zone > 60) return null;
  const digits = m[5];
  if (digits.length % 2) return null;
  const half = digits.length / 2;
  const colIdx = colLetters(zone).indexOf(m[3]);
  const rowIdx = ROW_LETTERS.indexOf(m[4]);
  if (colIdx < 0 || rowIdx < 0) return null;
  const scale = 10 ** (5 - half);
  return {
    zone,
    band: m[2],
    colIdx,
    rowIdx,
    e: half ? Number(digits.slice(0, half)) * scale : 0,
    n: half ? Number(digits.slice(half)) * scale : 0,
    digits: half,
  };
}

/** Pretty-print a compact MGRS string ("11SKU1234567890" → "11S KU 12345 67890"). */
export function formatMgrs(compact: string): string {
  const s = (compact || '').toUpperCase().replace(/[^0-9A-Z]/g, '');
  const m = s.match(/^(\d{1,2}[C-HJ-NP-X])([A-HJ-NP-Z]{2})(\d*)$/);
  if (!m) return compact;
  const d = m[3];
  const half = Math.floor(d.length / 2);
  return [m[1], m[2], d.slice(0, half), d.slice(half)].filter(Boolean).join(' ');
}

/**
 * MGRS of a point offset (dE, dN) meters from `ref`, at `digits` per axis
 * (4 = 8-digit / 10 m, the 9-line standard; 5 = 10-digit / 1 m).
 * `withZone` prefixes the grid zone designator. Null if the offset leaves the zone's columns.
 */
export function offsetMgrs(
  ref: MgrsRef,
  dE: number,
  dN: number,
  digits = 4,
  withZone = true
): string | null {
  const E = ref.e + dE;
  const N = ref.n + dN;
  const colStep = Math.floor(E / 100000);
  const rowStep = Math.floor(N / 100000);
  const colIdx = ref.colIdx + colStep;
  const cols = colLetters(ref.zone);
  if (colIdx < 0 || colIdx >= cols.length) return null;
  const rowIdx = (((ref.rowIdx + rowStep) % 20) + 20) % 20;
  const eIn = E - colStep * 100000;
  const nIn = N - rowStep * 100000;
  const div = 10 ** (5 - digits);
  const pad = (v: number) => String(Math.floor(v / div)).padStart(digits, '0');
  const body = `${cols[colIdx]}${ROW_LETTERS[rowIdx]} ${pad(eIn)} ${pad(nIn)}`;
  return withZone ? `${ref.zone}${ref.band} ${body}` : body;
}

/** Grid offset in meters (x east, y north) from grid `a` to grid `b`; null if unparseable or different zones. */
export function gridDelta(a: string, b: string): { x: number; y: number } | null {
  const A = parseMgrs(a);
  const B = parseMgrs(b);
  if (!A || !B || A.zone !== B.zone) return null;
  let dRow = B.rowIdx - A.rowIdx;
  if (dRow > 10) dRow -= 20;
  else if (dRow < -10) dRow += 20;
  return { x: (B.colIdx - A.colIdx) * 100000 + (B.e - A.e), y: dRow * 100000 + (B.n - A.n) };
}

/** Lat/lon (degrees) of an MGRS grid, or null if unparseable. */
export function mgrsToLatLon(input: string): { lat: number; lon: number } | null {
  if (!parseMgrs(input)) return null;
  try {
    const [lon, lat] = mgrs.toPoint((input || '').toUpperCase().replace(/[^0-9A-Z]/g, ''));
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
    return { lat, lon };
  } catch {
    return null;
  }
}

/** UTM grid convergence γ (deg, + when grid north is east of true north). */
export function gridConvergence(lat: number, lon: number): number {
  const zone = Math.floor((lon + 180) / 6) + 1;
  const centralMeridian = -183 + 6 * zone;
  const rad = Math.PI / 180;
  return Math.atan(Math.tan((lon - centralMeridian) * rad) * Math.sin(lat * rad)) / rad;
}

export interface NorthReference {
  declination: number; // true → magnetic, east +
  convergence: number; // true → grid, east +
  gm: number; // grid → magnetic (the map-margin G-M angle), east +
}

/** WMM declination + grid convergence for a location (null on failure). */
export function northReference(lat: number, lon: number): NorthReference | null {
  try {
    const declination = geomagnetism.model().point([lat, lon]).decl;
    const convergence = gridConvergence(lat, lon);
    return { declination, convergence, gm: declination - convergence };
  } catch (e) {
    console.error('Declination calc failed', e);
    return null;
  }
}

export function northReferenceForGrid(grid: string): NorthReference | null {
  const ll = mgrsToLatLon(grid);
  return ll ? northReference(ll.lat, ll.lon) : null;
}

export const norm360 = (deg: number) => ((deg % 360) + 360) % 360;

/** Magnetic azimuth → grid azimuth using the G-M angle (east +). */
export const magToGrid = (magAz: number, gm: number) => norm360(magAz + gm);

/** Signed angle label, e.g. 12.7 → "12.7°E". */
export const eastWest = (deg: number, places = 1) =>
  `${Math.abs(deg).toFixed(places)}°${deg >= 0 ? 'E' : 'W'}`;

export const pad3 = (deg: number) => String(Math.round(norm360(deg)) % 360).padStart(3, '0');

// ----- plane geometry (world meters: x east, y north) -----

export interface Vec {
  x: number;
  y: number;
}

/** Unit vector for an azimuth measured clockwise from grid north. */
export const unit = (azDeg: number): Vec => {
  const r = (azDeg * Math.PI) / 180;
  return { x: Math.sin(r), y: Math.cos(r) };
};

export const add = (a: Vec, b: Vec): Vec => ({ x: a.x + b.x, y: a.y + b.y });
export const sub = (a: Vec, b: Vec): Vec => ({ x: a.x - b.x, y: a.y - b.y });
export const mul = (a: Vec, k: number): Vec => ({ x: a.x * k, y: a.y * k });
export const dot = (a: Vec, b: Vec) => a.x * b.x + a.y * b.y;
export const len = (a: Vec) => Math.hypot(a.x, a.y);

/** Azimuth (deg, clockwise from grid north) from a to b. */
export const azimuth = (a: Vec, b: Vec) =>
  norm360((Math.atan2(b.x - a.x, b.y - a.y) * 180) / Math.PI);

/** World points (x east, y north) → an SVG `points` attribute (SVG user space is y-down). */
export const pts = (ps: Vec[]) => ps.map((p) => `${p.x},${-p.y}`).join(' ');
