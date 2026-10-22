const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

const two = (n: number) => String(n).padStart(2, '0');

/** Zulu date-time group, e.g. "212319Z OCT 26". */
export function dtgZulu(d = new Date()): string {
  return `${two(d.getUTCDate())}${two(d.getUTCHours())}${two(d.getUTCMinutes())}Z ${MONTHS[d.getUTCMonth()]} ${String(d.getUTCFullYear()).slice(-2)}`;
}

/** 24-hour local and Zulu clock strings, e.g. ["0947L", "1747Z"]. */
export function clockLZ(d = new Date()): [string, string] {
  return [
    `${two(d.getHours())}${two(d.getMinutes())}L`,
    `${two(d.getUTCHours())}${two(d.getUTCMinutes())}Z`,
  ];
}

/** Safe file-name fragment. */
export const fileSlug = (s: string) =>
  s
    .trim()
    .replace(/[^A-Za-z0-9]+/g, '_')
    .replace(/^_|_$/g, '') || 'untitled';
