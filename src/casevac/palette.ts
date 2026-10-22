/**
 * Sketch colors. The on-screen palette is CSS variables (applied through `style`, which
 * resolves var() everywhere) so blackout mode recolors the sketches for free. Exports are
 * rasterized from a standalone SVG that can't see page CSS, so they use PRINT_PALETTE.
 */
export interface Palette {
  paper: string;
  ink: string;
  inkSoft: string;
  muted: string;
  grid: string;
  gridMajor: string;
  friendly: string;
  zoneFill: string;
  departure: string;
  wind: string;
  obstacle: string;
  danger: string;
  ok: string;
  immediate: string;
  delayed: string;
  minimal: string;
  expectant: string;
  evac: string;
  remains: string;
  enemy: string;
  halo: string;
  sans: string;
  mono: string;
}

export const UI_PALETTE: Palette = {
  paper: 'var(--surface)',
  ink: 'var(--text-primary)',
  inkSoft: 'var(--text-secondary)',
  muted: 'var(--text-tertiary)',
  grid: 'var(--sketch-grid)',
  gridMajor: 'var(--sketch-grid-major)',
  friendly: 'var(--accent-blue)',
  zoneFill: 'var(--sketch-zone-fill)',
  departure: 'var(--accent-green)',
  wind: 'var(--sketch-wind)',
  obstacle: 'var(--sketch-obstacle)',
  danger: 'var(--accent-red)',
  ok: 'var(--accent-green)',
  immediate: 'var(--triage-immediate)',
  delayed: 'var(--triage-delayed)',
  minimal: 'var(--triage-minimal)',
  expectant: 'var(--triage-expectant)',
  evac: 'var(--accent-blue)',
  remains: 'var(--text-secondary)',
  enemy: 'var(--accent-red)',
  halo: 'var(--surface)',
  sans: "'IBM Plex Sans', -apple-system, sans-serif",
  mono: "'JetBrains Mono', ui-monospace, Menlo, monospace",
};

export const PRINT_PALETTE: Palette = {
  paper: '#FFFFFF',
  ink: '#1A1A1A',
  inkSoft: '#4A4A4A',
  muted: '#7A7A7A',
  grid: '#C9D6E2',
  gridMajor: '#8FA6BB',
  friendly: '#0A2540',
  zoneFill: '#0A254012',
  departure: '#2D6A4F',
  wind: '#0077A8',
  obstacle: '#8B3A1E',
  danger: '#D62839',
  ok: '#2D6A4F',
  immediate: '#D62839',
  delayed: '#C9930E',
  minimal: '#2D6A4F',
  expectant: '#1A1A1A',
  evac: '#0A2540',
  remains: '#5A5A5A',
  enemy: '#B23A2E',
  halo: '#FFFFFF',
  sans: "'IBM Plex Sans', 'Helvetica Neue', Arial, sans-serif",
  mono: "'JetBrains Mono', Menlo, Consolas, 'DejaVu Sans Mono', monospace",
};
