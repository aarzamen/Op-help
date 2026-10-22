import React from 'react';
import { eastWest, pts, type MgrsRef, type NorthReference, type Vec } from './geo';
import type { ViewBox } from './hlz';
import type { Palette } from './palette';
import type { Background } from './model';

/** Sketch text with a paper-colored halo so labels stay legible over imagery and gridlines. */
export const Txt = ({
  at,
  size,
  P,
  children,
  anchor = 'middle',
  weight = 700,
  color,
  mono = true,
  halo = true,
  dy = 0,
}: {
  at: Vec;
  size: number;
  P: Palette;
  children: React.ReactNode;
  anchor?: 'start' | 'middle' | 'end';
  weight?: number;
  color?: string;
  mono?: boolean;
  halo?: boolean;
  dy?: number;
}) => (
  <text
    x={at.x}
    y={-at.y + dy}
    fontSize={size}
    textAnchor={anchor}
    dominantBaseline="middle"
    style={{
      fill: color ?? P.ink,
      fontFamily: mono ? P.mono : P.sans,
      fontWeight: Math.min(weight, P.maxWeight),
      stroke: halo ? P.halo : 'none',
      strokeWidth: halo ? size * (P.lw < 1 ? 0.2 : 0.28) : 0,
      strokeLinejoin: 'round',
      paintOrder: 'stroke',
    }}
  >
    {children}
  </text>
);

/** Line with a solid arrowhead at `to` (drawn as a polygon — no <marker> ids to collide between SVGs). */
export const Arrow = ({
  from,
  to,
  color,
  width,
  head,
  dash,
}: {
  from: Vec;
  to: Vec;
  color: string;
  width: number;
  head: number;
  dash?: string;
}) => {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const L = Math.hypot(dx, dy) || 1;
  const d = { x: dx / L, y: dy / L };
  const n = { x: -d.y, y: d.x };
  const base = { x: to.x - d.x * head, y: to.y - d.y * head };
  const left = { x: base.x + n.x * head * 0.5, y: base.y + n.y * head * 0.5 };
  const right = { x: base.x - n.x * head * 0.5, y: base.y - n.y * head * 0.5 };
  return (
    <g>
      <line
        x1={from.x}
        y1={-from.y}
        x2={base.x}
        y2={-base.y}
        style={{ stroke: color, strokeWidth: width, strokeDasharray: dash, strokeLinecap: 'round' }}
      />
      <polygon points={pts([to, left, right])} style={{ fill: color }} />
    </g>
  );
};

const niceStep = (target: number) => {
  const steps = [5, 10, 20, 25, 50, 100, 200, 250, 500, 1000, 2000, 5000];
  return steps.find((s) => s >= target) ?? 5000;
};

const mod = (v: number, m: number) => ((v % m) + m) % m;

/** Gridlines; with an MGRS reference they are real grid lines labeled like a map (3-digit at 100 m). */
const Gridlines = ({
  view,
  gridRef,
  P,
  u,
  avoid = [],
}: {
  view: ViewBox;
  gridRef?: MgrsRef | null;
  P: Palette;
  u: number;
  /** Badge centers (north arrow, wind rose): edge labels under them are dropped. */
  avoid?: Vec[];
}) => {
  const maxX = view.minX + view.w;
  const maxY = view.minY + view.h;
  const step = gridRef ? (view.w > 2500 ? 1000 : view.w > 160 ? 100 : 10) : niceStep(view.w / 7);
  const e0 = gridRef?.e ?? 0;
  const n0 = gridRef?.n ?? 0;
  const xs: { x: number; label: string }[] = [];
  const ys: { y: number; label: string }[] = [];
  const label = (v: number) =>
    !gridRef
      ? ''
      : step === 1000
        ? String(mod(Math.floor(v / 1000), 100)).padStart(2, '0')
        : step === 100
          ? String(mod(Math.floor(v / 100), 1000)).padStart(3, '0')
          : String(mod(Math.floor(v / 10), 10000)).padStart(4, '0');
  for (let E = Math.ceil((e0 + view.minX) / step) * step; E <= e0 + maxX; E += step)
    xs.push({ x: E - e0, label: label(E) });
  for (let N = Math.ceil((n0 + view.minY) / step) * step; N <= n0 + maxY; N += step)
    ys.push({ y: N - n0, label: label(N) });
  const fs = u * 2.1;
  return (
    <g>
      {xs.map((l) => (
        <line
          key={`x${l.x}`}
          x1={l.x}
          y1={-view.minY}
          x2={l.x}
          y2={-maxY}
          style={{ stroke: P.grid, strokeWidth: u * 0.18 * P.lw }}
        />
      ))}
      {ys.map((l) => (
        <line
          key={`y${l.y}`}
          x1={view.minX}
          y1={-l.y}
          x2={maxX}
          y2={-l.y}
          style={{ stroke: P.grid, strokeWidth: u * 0.18 * P.lw }}
        />
      ))}
      {gridRef &&
        xs
          .filter(
            (l) =>
              !avoid.some(
                (c) => Math.abs(c.x - l.x) < u * 11 && c.y - u * 9.5 < view.minY + u * 3.5
              )
          )
          .map((l) => (
            <Txt
              key={`xl${l.x}`}
              at={{ x: l.x, y: view.minY + u * 1.8 }}
              size={fs}
              P={P}
              color={P.muted}
              weight={600}
            >
              {l.label}
            </Txt>
          ))}
      {gridRef &&
        ys
          // The scale bar owns the bottom-left corner.
          .filter((l) => l.y > view.minY + u * 10)
          .filter(
            (l) =>
              !avoid.some((c) => Math.abs(c.y - l.y) < u * 10 && c.x - u * 9 < view.minX + u * 5.5)
          )
          .map((l) => (
            <Txt
              key={`yl${l.y}`}
              at={{ x: view.minX + u * 1.2, y: l.y }}
              size={fs}
              P={P}
              color={P.muted}
              weight={600}
              anchor="start"
            >
              {l.label}
            </Txt>
          ))}
    </g>
  );
};

/** Grid-north arrow plus magnetic north rotated by the G-M angle (east = clockwise). */
const NorthArrow = ({
  at,
  north,
  P,
  u,
  card = false,
}: {
  at: Vec;
  north?: NorthReference | null;
  P: Palette;
  u: number;
  /** Opaque card behind arrow and labels: the workspace pins it over moving content. */
  card?: boolean;
}) => {
  const len = u * 7;
  const gm = north?.gm ?? 0;
  return (
    <g transform={`translate(${at.x} ${-at.y})`}>
      {card ? (
        <rect
          x={-u * 5.8}
          y={-u * 12}
          width={u * 11.6}
          height={u * 15.4}
          rx={u * 1.2}
          style={{ fill: P.paper, stroke: P.grid, strokeWidth: u * 0.15 * P.lw }}
        />
      ) : (
        <circle
          r={u * 6.2}
          cy={-len * 0.35}
          style={{ fill: P.paper, fillOpacity: 0.85, stroke: P.grid, strokeWidth: u * 0.15 * P.lw }}
        />
      )}
      <line
        x1={0}
        y1={0}
        x2={0}
        y2={-len}
        style={{ stroke: P.ink, strokeWidth: u * 0.45 * P.lw }}
      />
      <polygon
        points={`0,${-len - u * 1.6} ${-u * 0.9},${-len + u * 0.2} ${u * 0.9},${-len + u * 0.2}`}
        style={{ fill: P.ink }}
      />
      <text
        x={0}
        y={-len - u * 2.4}
        fontSize={u * 2}
        textAnchor="middle"
        style={{ fill: P.ink, fontFamily: P.mono, fontWeight: 800 }}
      >
        GN
      </text>
      {north && (
        <g transform={`rotate(${gm})`}>
          <line
            x1={0}
            y1={0}
            x2={0}
            y2={-len * 0.82}
            style={{ stroke: P.danger, strokeWidth: u * 0.35 * P.lw }}
          />
          <polygon
            points={`0,${-len * 0.82 - u * 1.3} ${-u * 0.6},${-len * 0.82 + u * 0.3} ${u * 0.6},${-len * 0.82 + u * 0.3}`}
            style={{ fill: P.danger }}
          />
          <text
            x={u * 0.2}
            y={-len * 0.82 - u * 2.1}
            fontSize={u * 1.7}
            textAnchor="middle"
            style={{ fill: P.danger, fontFamily: P.mono, fontWeight: 800 }}
          >
            MN
          </text>
        </g>
      )}
      <text
        x={0}
        y={u * 2.3}
        fontSize={u * 1.6}
        textAnchor="middle"
        style={{ fill: P.inkSoft, fontFamily: P.mono, fontWeight: 700 }}
      >
        {north ? `G-M ${eastWest(north.gm)}` : 'MN: enter grid'}
      </text>
    </g>
  );
};

const ScaleBar = ({ view, P, u }: { view: ViewBox; P: Palette; u: number }) => {
  const L = niceStep(view.w * 0.2);
  const x0 = view.minX + u * 4;
  const y0 = view.minY + u * 6;
  const h = u * 1.1;
  return (
    <g>
      <rect x={x0} y={-y0} width={L / 2} height={h} style={{ fill: P.ink }} />
      <rect
        x={x0 + L / 2}
        y={-y0}
        width={L / 2}
        height={h}
        style={{ fill: P.paper, stroke: P.ink, strokeWidth: u * 0.2 * P.lw }}
      />
      <Txt at={{ x: x0, y: y0 + u * 1.6 }} size={u * 1.7} P={P} anchor="middle" weight={600}>
        0
      </Txt>
      <Txt at={{ x: x0 + L, y: y0 + u * 1.6 }} size={u * 1.7} P={P} anchor="middle" weight={600}>
        {L >= 1000 ? `${L / 1000} km` : `${L} m`}
      </Txt>
    </g>
  );
};

/**
 * The shared sketch frame: paper, optional background imagery, gridlines, north arrow and
 * scale bar around the sheet's layers. Purely presentational — the workspace owns gestures.
 *
 * `view` is the sheet (it sets the drawing unit the layers use, so labels match the export);
 * `camera`, when given, is the visible area: the viewBox, the paper and the gridlines follow
 * it, and the grid labels, north arrow and scale bar stay a constant size on screen.
 */
export const SketchCanvas = ({
  view,
  camera,
  P,
  gridRef,
  north,
  background,
  notToScale = false,
  showNorth = true,
  northAt,
  badges,
  ariaLabel,
  children,
  svgRef,
  frame,
  selection,
  marker,
  decoUnit,
  className = '',
}: {
  view: ViewBox;
  camera?: ViewBox;
  /** Absolute placement when nested inside an export sheet. */
  frame?: { x: number; y: number; w: number; h: number };
  P: Palette;
  gridRef?: MgrsRef | null;
  north?: NorthReference | null;
  background?: Background | null;
  notToScale?: boolean;
  showNorth?: boolean;
  /** North-arrow anchor; defaults to the top-right corner. Ignored with a camera. */
  northAt?: Vec;
  /** Centers of the badges drawn over the frame edge (grid labels beneath them are dropped). */
  badges?: Vec[];
  ariaLabel: string;
  children: React.ReactNode;
  svgRef?: React.Ref<SVGSVGElement>;
  /** Dashed ring around the selected item (world center + radius). */
  selection?: { pos: Vec; r: number } | null;
  /** Crosshair where an "add here" is pending. */
  marker?: Vec | null;
  /**
   * World size of one drawing unit for the frame decorations (grid labels, north arrow,
   * scale bar) — the workspace passes a screen-pixel-based value so they stay a constant
   * size on screen at any zoom and window width.
   */
  decoUnit?: number;
  className?: string;
}) => {
  const area = camera ?? view;
  const u = decoUnit ?? area.w / 100;
  const maxX = area.minX + area.w;
  const maxY = area.minY + area.h;
  const bgH = background ? background.widthM * background.aspect : 0;
  const ring = view.w / 100;
  // In the workspace the north arrow parks top-left (the zoom buttons own the top-right).
  const camNorth = { x: area.minX + u * 9, y: maxY - u * 9.5 };

  return (
    <svg
      ref={svgRef}
      className={`sketch-svg ${className}`}
      viewBox={`${area.minX} ${-maxY} ${area.w} ${area.h}`}
      {...(frame ? { x: frame.x, y: frame.y, width: frame.w, height: frame.h } : {})}
      role="img"
      aria-label={ariaLabel}
    >
      <rect x={area.minX} y={-maxY} width={area.w} height={area.h} style={{ fill: P.paper }} />
      {background && (
        <image
          href={background.dataUrl}
          x={background.offset.x - background.widthM / 2}
          y={-(background.offset.y + bgH / 2)}
          width={background.widthM}
          height={bgH}
          opacity={background.opacity}
          preserveAspectRatio="none"
        />
      )}
      <Gridlines
        view={area}
        gridRef={notToScale ? null : gridRef}
        P={P}
        u={u}
        avoid={camera ? (showNorth ? [camNorth] : []) : badges}
      />
      {children}
      {selection && (
        <circle
          cx={selection.pos.x}
          cy={-selection.pos.y}
          r={selection.r}
          className="sketch-selection"
          style={{
            fill: 'none',
            stroke: 'var(--sketch-select, #00A3FF)',
            strokeWidth: ring * 0.45,
            strokeDasharray: `${ring * 1.2} ${ring * 0.8}`,
          }}
        />
      )}
      {marker && (
        <g style={{ stroke: 'var(--sketch-select, #00A3FF)', strokeWidth: u * 0.35, fill: 'none' }}>
          <circle cx={marker.x} cy={-marker.y} r={u * 2.2} />
          <line x1={marker.x - u * 3.6} y1={-marker.y} x2={marker.x + u * 3.6} y2={-marker.y} />
          <line x1={marker.x} y1={-marker.y - u * 3.6} x2={marker.x} y2={-marker.y + u * 3.6} />
        </g>
      )}
      {showNorth && (
        <NorthArrow
          at={
            camera
              ? { x: camNorth.x, y: camNorth.y - u * 3 }
              : (northAt ?? { x: maxX - u * 8, y: maxY - u * 13 })
          }
          north={north}
          P={P}
          u={u}
          card={!!camera}
        />
      )}
      {notToScale ? (
        <Txt
          at={{ x: area.minX + u * 3, y: area.minY + u * 3.5 }}
          size={u * 2}
          P={P}
          anchor="start"
          color={P.inkSoft}
        >
          NOT TO SCALE
        </Txt>
      ) : (
        <ScaleBar view={area} P={P} u={u} />
      )}
    </svg>
  );
};
