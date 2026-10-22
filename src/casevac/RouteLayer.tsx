import { NODE_KINDS, LEG_MODES, type LegMode, type RouteSheet } from './model';
import type { Palette } from './palette';
import { fmtMin, isSurgical, schematicGeom, type RouteTimeline } from './route';
import type { ViewBox } from './hlz';
import { monoWidth } from './layout';
import { Arrow, Txt } from './svg';

const badge = (kind: string) => NODE_KINDS.find((k) => k.kind === kind)?.badge ?? '•';
const modeLabel = (m: LegMode) => (LEG_MODES.find((x) => x.mode === m)?.label ?? m).toUpperCase();
const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

const legStyle = (P: Palette, mode: LegMode) =>
  mode === 'litter'
    ? { color: P.ink, dash: '1.5 4' }
    : mode === 'rotary' || mode === 'tiltrotor' || mode === 'fixed'
      ? { color: P.friendly, dash: '8 5' }
      : { color: P.ink, dash: undefined };

const nodeColor = (P: Palette, kind: string) =>
  isSurgical(kind)
    ? P.danger
    : kind === 'hlz'
      ? P.friendly
      : kind === 'ccp' || kind === 'bas'
        ? P.danger
        : P.ink;

/** Wrap a short name onto at most two lines. */
const twoLines = (s: string, n: number): [string, string] => {
  if (s.length <= n) return [s, ''];
  const cut = s.lastIndexOf(' ', n);
  const i = cut > 4 ? cut : n;
  return [s.slice(0, i).trim(), clip(s.slice(i).trim(), n)];
};

/**
 * Node-link schematic of the evacuation chain (forward → rear). Position encodes echelon
 * order, not geography. Vertical on phones, horizontal on wide screens and in exports.
 */
export const RouteSchematic = ({
  route,
  t,
  P,
  vertical,
  frame,
}: {
  route: RouteSheet;
  t: RouteTimeline;
  P: Palette;
  vertical: boolean;
  /** Absolute placement when nested inside an export sheet. */
  frame?: { x: number; y: number; w: number; h: number };
}) => {
  const n = route.nodes.length;
  const { S, boxW, boxH, view } = schematicGeom(n, vertical);
  const at = (i: number) => (vertical ? { x: 0, y: i * S } : { x: i * S, y: 0 });
  const fs = vertical ? 11 : 10.5;
  // Horizontal leg labels must fit between two boxes; shrink any that would run into them.
  const gap = S - boxW - 8;
  const fit = (text: string, size: number) =>
    vertical ? size : Math.min(size, gap / (monoWidth(text, 1) || 1));
  const surgical = t.firstSurgical;

  return (
    <svg
      className="route-svg"
      viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`}
      {...(frame
        ? {
            x: frame.x,
            y: frame.y,
            width: frame.w,
            height: frame.h,
            preserveAspectRatio: 'xMidYMin meet',
          }
        : { style: { aspectRatio: `${view.w} / ${view.h}` } })}
      role="img"
      aria-label="Evacuation route schematic"
    >
      <rect x={view.x} y={view.y} width={view.w} height={view.h} style={{ fill: P.paper }} />

      {route.legs.map((leg, i) => {
        const a = at(i);
        const b = at(i + 1);
        const st = legStyle(P, leg.mode);
        const from = vertical
          ? { x: a.x, y: -(a.y + boxH / 2 + 3) }
          : { x: a.x + boxW / 2 + 3, y: 0 };
        const to = vertical
          ? { x: b.x, y: -(b.y - boxH / 2 - 3) }
          : { x: b.x - boxW / 2 - 3, y: 0 };
        const mid = vertical ? { x: 10, y: (a.y + b.y) / 2 } : { x: (a.x + b.x) / 2, y: 0 };
        const mode = modeLabel(leg.mode);
        const dist = `${leg.distKm || 0} km · ${leg.timeMin || 0} min`;
        const plat = clip(leg.platform || leg.route || '', vertical ? 26 : 24);
        // Arrow/Txt take world coords (y up); this schematic is drawn in screen space, so negate y.
        return (
          <g key={i}>
            <Arrow
              from={from}
              to={to}
              color={st.color}
              width={2.2 * P.lw}
              head={9 * P.head}
              dash={st.dash}
            />
            <Txt
              at={{ x: mid.x, y: -(mid.y - (vertical ? 14 : 13)) }}
              size={fit(mode, fs * 0.82)}
              P={P}
              color={st.color}
              anchor={vertical ? 'start' : 'middle'}
            >
              {mode}
            </Txt>
            <Txt
              at={{ x: mid.x, y: -(mid.y + (vertical ? 1 : 14)) }}
              size={fit(dist, fs)}
              P={P}
              anchor={vertical ? 'start' : 'middle'}
              weight={800}
            >
              {dist}
            </Txt>
            <Txt
              at={{ x: mid.x, y: -(mid.y + (vertical ? 15 : 28)) }}
              size={fit(plat, fs * 0.72)}
              P={P}
              color={P.inkSoft}
              anchor={vertical ? 'start' : 'middle'}
              weight={600}
            >
              {plat}
            </Txt>
          </g>
        );
      })}

      {route.nodes.map((node, i) => {
        const p = at(i);
        const color = nodeColor(P, node.kind);
        const [l1, l2] = twoLines(node.name || '—', vertical ? 20 : 15);
        return (
          <g key={node.id}>
            <rect
              x={p.x - boxW / 2}
              y={p.y - boxH / 2}
              width={boxW}
              height={boxH}
              rx={5}
              style={{ fill: P.paper, stroke: color, strokeWidth: 2 * P.lw }}
            />
            <rect
              x={p.x - boxW / 2}
              y={p.y - boxH / 2}
              width={30}
              height={15}
              rx={3}
              style={{ fill: color }}
            />
            <text
              x={p.x - boxW / 2 + 15}
              y={p.y - boxH / 2 + 11}
              fontSize={9}
              textAnchor="middle"
              style={{ fill: P.paper, fontFamily: P.mono, fontWeight: 800 }}
            >
              {badge(node.kind)}
            </text>
            <Txt
              at={{ x: p.x + 8, y: -(p.y - boxH / 2 + 8) }}
              size={fs * 0.72}
              P={P}
              color={P.muted}
              halo={false}
              anchor="middle"
            >
              {`T+${fmtMin(t.cum[i] ?? 0)}`}
            </Txt>
            <Txt
              at={{ x: p.x, y: -(p.y + (l2 ? -3 : 3)) }}
              size={fs}
              P={P}
              halo={false}
              weight={800}
              mono={false}
            >
              {l1}
            </Txt>
            {l2 && (
              <Txt
                at={{ x: p.x, y: -(p.y + 9) }}
                size={fs}
                P={P}
                halo={false}
                weight={800}
                mono={false}
              >
                {l2}
              </Txt>
            )}
            {node.grid && (
              <Txt
                at={{ x: p.x, y: -(p.y + boxH / 2 - 6) }}
                size={fs * 0.74}
                P={P}
                halo={false}
                color={P.inkSoft}
                weight={600}
              >
                {clip(node.grid, vertical ? 24 : 18)}
              </Txt>
            )}
          </g>
        );
      })}

      {surgical > 0 && (
        <g>
          {(() => {
            const a = at(0);
            const b = at(surgical);
            const color = t.urgentOk ? P.ok : P.danger;
            const label = `POI→SURGICAL ${fmtMin(t.toSurgicalMin ?? 0)} ${t.urgentOk ? '✓' : '✗'} 1-HR STANDARD`;
            if (vertical) {
              const x = boxW / 2 + 92;
              return (
                <>
                  <line
                    x1={x}
                    y1={a.y}
                    x2={x}
                    y2={b.y}
                    style={{ stroke: color, strokeWidth: 3 * P.lw }}
                  />
                  <line
                    x1={x - 6}
                    y1={a.y}
                    x2={x}
                    y2={a.y}
                    style={{ stroke: color, strokeWidth: 3 * P.lw }}
                  />
                  <line
                    x1={x - 6}
                    y1={b.y}
                    x2={x}
                    y2={b.y}
                    style={{ stroke: color, strokeWidth: 3 * P.lw }}
                  />
                  <Txt
                    at={{ x: 0, y: -((n - 1) * S + boxH / 2 + 24) }}
                    size={fs * 0.9}
                    P={P}
                    color={color}
                    weight={800}
                  >
                    {label}
                  </Txt>
                </>
              );
            }
            const y = boxH / 2 + 30;
            return (
              <>
                <line
                  x1={a.x}
                  y1={y}
                  x2={b.x}
                  y2={y}
                  style={{ stroke: color, strokeWidth: 3 * P.lw }}
                />
                <line
                  x1={a.x}
                  y1={y - 6}
                  x2={a.x}
                  y2={y}
                  style={{ stroke: color, strokeWidth: 3 * P.lw }}
                />
                <line
                  x1={b.x}
                  y1={y - 6}
                  x2={b.x}
                  y2={y}
                  style={{ stroke: color, strokeWidth: 3 * P.lw }}
                />
                <Txt
                  at={{ x: (a.x + b.x) / 2, y: -(y + 16) }}
                  size={fs}
                  P={P}
                  color={color}
                  weight={800}
                >
                  {label}
                </Txt>
              </>
            );
          })()}
        </g>
      )}
    </svg>
  );
};

/** Map-mode route over imagery: nodes are draggable markers, legs are straight lines. */
export const RouteMapLayer = ({
  route,
  view,
  P,
  interactive = false,
}: {
  route: RouteSheet;
  view: ViewBox;
  P: Palette;
  /** Workspace mode: tag nodes for selection. */
  interactive?: boolean;
}) => {
  const u = view.w / 100;
  return (
    <g>
      {route.legs.map((leg, i) => {
        const a = route.nodes[i]?.pos;
        const b = route.nodes[i + 1]?.pos;
        if (!a || !b) return null;
        const st = legStyle(P, leg.mode);
        const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
        return (
          <g key={i}>
            <Arrow
              from={a}
              to={b}
              color={st.color}
              width={u * 0.5 * P.lw}
              head={u * 2.2 * P.head}
              dash={st.dash ? `${u * 1.6} ${u * 1}` : undefined}
            />
            <Txt at={{ x: mid.x, y: mid.y + u * 2 }} size={u * 1.7} P={P} color={st.color}>
              {`${leg.timeMin || 0} min`}
            </Txt>
          </g>
        );
      })}
      {route.nodes.map((node, i) => {
        const color = nodeColor(P, node.kind);
        return (
          <g
            key={node.id}
            {...(interactive ? { 'data-item': `node:${node.id}` } : {})}
            className="sketch-drag"
          >
            <circle
              cx={node.pos.x}
              cy={-node.pos.y}
              r={u * 3}
              style={{ fill: P.paper, stroke: color, strokeWidth: u * 0.5 * P.lw }}
            />
            <Txt at={node.pos} size={u * 1.6} P={P} color={color} halo={false}>
              {badge(node.kind)}
            </Txt>
            {/* Names alternate below / above the chain so neighbors don't collide. */}
            <Txt
              at={{ x: node.pos.x, y: node.pos.y + (i % 2 ? u * 4.9 : -u * 4.6) }}
              size={u * 1.8}
              P={P}
              color={P.ink}
            >
              {clip(node.name, 22)}
            </Txt>
          </g>
        );
      })}
    </g>
  );
};
