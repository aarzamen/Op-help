import React from 'react';
import { dtgZulu } from './host';
import type { CasevacPlan } from './model';
import { PRINT_PALETTE as P } from './palette';
import type { Lines } from './sheetData';

/** Print-sheet chrome shared by the CASEVAC exports: the 1600×1000 frame and the data column. */

export const SHEET_W = 1600;
export const SHEET_H = 1000;
const W = SHEET_W;
const H = SHEET_H;

/** Greedy word wrap by character budget (good enough for proportional text at a known size). */
function wrap(text: string, maxChars: number): string[] {
  const out: string[] = [];
  for (const para of text.split('\n')) {
    let line = '';
    for (const word of para.split(/\s+/)) {
      if (!word) continue;
      if ((line ? line.length + 1 : 0) + word.length > maxChars && line) {
        out.push(line);
        line = word;
      } else {
        line = line ? `${line} ${word}` : word;
      }
    }
    out.push(line);
  }
  return out;
}

/** Lay label/value pairs out top-down at font size `fs`; returns the rows and the bottom edge. */
function layoutColumn(lines: Lines, y: number, w: number, fs: number) {
  const maxChars = Math.floor(w / (fs * 0.53));
  const lh = fs * 1.32;
  const items: { label: string; wrapped: string[]; top: number }[] = [];
  let cy = y;
  for (const [label, value] of lines) {
    const wrapped = wrap(value, maxChars);
    items.push({ label, wrapped, top: cy });
    cy += fs * 0.95 + wrapped.length * lh + fs * 0.6;
  }
  return { items, lh, bottom: cy };
}

const COLUMN_SIZES = [17, 15.5, 14, 12.5, 11];

/** Label/value block laid out in a column, shrinking the type until it fits. */
export const DataColumn = ({
  lines,
  x,
  y,
  w,
  maxY,
}: {
  lines: Lines;
  x: number;
  y: number;
  w: number;
  maxY: number;
}) => {
  const fs =
    COLUMN_SIZES.find((size) => layoutColumn(lines, y, w, size).bottom <= maxY) ??
    COLUMN_SIZES[COLUMN_SIZES.length - 1];
  const { items, lh } = layoutColumn(lines, y, w, fs);
  return (
    <g>
      {items.map((it) => (
        <g key={it.label + it.top}>
          <text
            x={x}
            y={it.top + fs * 0.8}
            fontSize={fs * 0.72}
            style={{ fill: P.muted, fontFamily: P.mono, fontWeight: 800, letterSpacing: 1 }}
          >
            {it.label}
          </text>
          {it.wrapped.map((ln, i) => (
            <text
              key={i}
              x={x}
              y={it.top + fs * 0.95 + (i + 1) * lh - fs * 0.25}
              fontSize={fs}
              style={{ fill: P.ink, fontFamily: P.sans, fontWeight: 400 }}
            >
              {ln}
            </text>
          ))}
        </g>
      ))}
    </g>
  );
};

export const Frame = ({
  plan,
  title,
  subtitle,
  children,
}: {
  plan: CasevacPlan;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
    <rect width={W} height={H} style={{ fill: '#FFFFFF' }} />
    {plan.banner && (
      <text
        x={W / 2}
        y={30}
        fontSize={16}
        textAnchor="middle"
        style={{ fill: P.ink, fontFamily: P.mono, fontWeight: 800, letterSpacing: 2 }}
      >
        {plan.banner}
      </text>
    )}
    <text x={40} y={74} fontSize={32} style={{ fill: P.ink, fontFamily: P.mono, fontWeight: 800 }}>
      {title}
    </text>
    <text
      x={40}
      y={100}
      fontSize={17}
      style={{ fill: P.inkSoft, fontFamily: P.sans, fontWeight: 400 }}
    >
      {subtitle}
    </text>
    <line x1={40} y1={112} x2={W - 40} y2={112} style={{ stroke: P.ink, strokeWidth: 2 }} />
    {children}
    <line
      x1={40}
      y1={H - 34}
      x2={W - 40}
      y2={H - 34}
      style={{ stroke: P.grid, strokeWidth: 1.5 }}
    />
    <text
      x={40}
      y={H - 13}
      fontSize={13}
      style={{ fill: P.muted, fontFamily: P.mono, fontWeight: 700 }}
    >
      {`OPORD ANALYST · CASEVAC PLAN${plan.unit ? ` · ${plan.unit}` : ''}${plan.preparedBy ? ` · prepared by ${plan.preparedBy}` : ''}`}
    </text>
    <text
      x={W - 40}
      y={H - 13}
      fontSize={13}
      textAnchor="end"
      style={{ fill: P.muted, fontFamily: P.mono, fontWeight: 700 }}
    >
      {`${dtgZulu()} · planning aid — verify grids, headings & LP sizes with aviation and SOP`}
    </text>
    {plan.banner && (
      <text
        x={W / 2}
        y={H - 46}
        fontSize={14}
        textAnchor="middle"
        style={{ fill: P.ink, fontFamily: P.mono, fontWeight: 800, letterSpacing: 2 }}
      >
        {plan.banner}
      </text>
    )}
  </svg>
);
