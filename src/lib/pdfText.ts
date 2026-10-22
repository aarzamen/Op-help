/**
 * jsPDF's built-in fonts only cover WinAnsi; anything else prints as garbage. Map the
 * symbols this app (and users typing on phones) commonly produce onto safe equivalents.
 */
const MAP: [RegExp, string][] = [
  [/[→⟶➔]/g, '->'],
  [/[←⟵]/g, '<-'],
  [/↔/g, '<->'],
  [/[✓✔]/g, 'OK'],
  [/[✗✘]/g, 'X'],
  [/≤/g, '<='],
  [/≥/g, '>='],
  [/[≈~]/g, '~'],
  [/⅄/g, 'inv-Y'],
  [/[✳✴]/g, '*'],
  [/[“”]/g, '"'],
  [/[‘’]/g, "'"],
  [/…/g, '...'],
  [/¶/g, 'para '],
  [/[⊕⊖⚡▲▸▶◈⚙✎]/g, ''],
];

export function pdfSafe(s: string): string {
  let out = s;
  for (const [re, rep] of MAP) out = out.replace(re, rep);
  // Drop anything else outside Latin-1 (emoji etc.) rather than printing mojibake.
  return out.replace(/[^\n\t -ÿ–—•]/g, '');
}
