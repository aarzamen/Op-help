import { add, mul, norm360, pad3, pts, sub, unit, type Vec } from './geo';
import { hlzEdgeLabels, type HlzGeom, type ViewBox } from './hlz';
import { monoWidth } from './layout';
import type { HlzSheet, Obstacle } from './model';
import type { Palette } from './palette';
import { Arrow, Txt } from './svg';

const ObstacleGlyph = ({ o, u, color }: { o: Obstacle; u: number; color: string }) => {
  const x = o.pos.x;
  const y = -o.pos.y;
  const s = u * 1.6;
  const stroke = { stroke: color, strokeWidth: u * 0.35, fill: 'none' } as const;
  switch (o.kind) {
    case 'trees':
      return (
        <g style={{ fill: color }}>
          <circle cx={x - s * 0.7} cy={y + s * 0.2} r={s * 0.6} />
          <circle cx={x + s * 0.7} cy={y + s * 0.2} r={s * 0.6} />
          <circle cx={x} cy={y - s * 0.5} r={s * 0.7} />
        </g>
      );
    case 'wires':
      return (
        <g style={stroke}>
          <line x1={x - s * 1.6} y1={y} x2={x + s * 1.6} y2={y} />
          <line x1={x - s * 1.6} y1={y - s * 0.8} x2={x - s * 1.6} y2={y + s * 0.8} />
          <line x1={x + s * 1.6} y1={y - s * 0.8} x2={x + s * 1.6} y2={y + s * 0.8} />
        </g>
      );
    case 'tower':
      return (
        <g style={stroke}>
          <polygon
            points={`${x},${y - s * 1.2} ${x - s * 0.9},${y + s * 0.9} ${x + s * 0.9},${y + s * 0.9}`}
          />
          <circle cx={x} cy={y - s * 1.2} r={s * 0.25} style={{ fill: color }} />
        </g>
      );
    case 'building':
      return (
        <rect
          x={x - s}
          y={y - s * 0.8}
          width={s * 2}
          height={s * 1.6}
          style={{ fill: color, fillOpacity: 0.85 }}
        />
      );
    case 'pole':
      return (
        <g style={stroke}>
          <line x1={x} y1={y - s * 1.1} x2={x} y2={y + s * 0.9} />
          <circle cx={x} cy={y - s * 1.1} r={s * 0.35} style={{ fill: color }} />
        </g>
      );
    default:
      return (
        <g style={stroke}>
          <line x1={x - s} y1={y - s} x2={x + s} y2={y + s} />
          <line x1={x - s} y1={y + s} x2={x + s} y2={y - s} />
        </g>
      );
  }
};

/** Everything drawn on the HLZ overhead sketch, in world meters around the HLZ center grid. */
export const HlzLayer = ({
  hlz,
  g,
  view,
  P,
  editable,
  windAt,
}: {
  hlz: HlzSheet;
  g: HlzGeom;
  view: ViewBox;
  P: Palette;
  editable: boolean;
  /** Wind-rose anchor from hlzDecor (kept clear of the corridors and labels). */
  windAt: Vec;
}) => {
  const u = view.w / 100;
  const dragAttr = (id: string) => (editable ? { 'data-drag': id } : {});
  const corridor = (dir: Vec, side: Vec, from: number, to: number, half: number) =>
    pts([
      add(mul(dir, from), mul(side, -half)),
      add(mul(dir, from), mul(side, half)),
      add(mul(dir, to), mul(side, half)),
      add(mul(dir, to), mul(side, -half)),
    ]);
  const half = g.W / 2 + g.D / 4;
  const approachLen = Math.hypot(g.approachFrom.x, g.approachFrom.y);
  const departLen = Math.hypot(g.departureTo.x, g.departureTo.y);
  const topY = Math.max(...g.corners.map((c) => c.y));

  const labels = hlzEdgeLabels(hlz, g, view);

  // Wind rose: the arrow points downwind.
  const windAnchor = windAt;
  const downwind = unit(g.windFromAz + 180);

  // Litter-route label: off the line's midpoint on its upper side, far enough that the text clears it.
  const litterText = `LITTER ${Math.round(g.litterRouteM)} m`;
  const litterSize = u * 1.6;
  const routeDir = sub(g.ccpPos, hlz.loadPoint);
  const routeLen = Math.hypot(routeDir.x, routeDir.y) || 1;
  let normal = { x: -routeDir.y / routeLen, y: routeDir.x / routeLen };
  if (normal.y < 0) normal = mul(normal, -1);
  const litterAt = add(
    add(hlz.loadPoint, mul(routeDir, 0.45)),
    mul(normal, u * 1.6 + Math.abs(normal.x) * (monoWidth(litterText, litterSize) / 2))
  );
  const windHalf = u * 5;

  const lead = g.lps[0];
  const night = hlz.markNight;
  const day = hlz.markDay;

  return (
    <g>
      {/* approach / departure corridors used by the 10:1 check */}
      <polygon
        points={corridor(g.uA, g.uP, -g.L / 2, -approachLen, half)}
        style={{ fill: P.friendly, fillOpacity: 0.05 }}
      />
      <polygon
        points={corridor(
          g.uD,
          unit(g.departureAz + 90),
          Math.max(...g.corners.map((c) => c.x * g.uD.x + c.y * g.uD.y)),
          departLen,
          half
        )}
        style={{ fill: P.departure, fillOpacity: 0.05 }}
      />

      {/* zone */}
      <polygon
        points={pts(g.corners)}
        style={{
          fill: P.zoneFill,
          stroke: P.friendly,
          strokeWidth: u * 0.4,
          strokeDasharray: `${u * 1.6} ${u * 1}`,
        }}
      />

      {/* landing points */}
      {g.lps.map((p, i) => (
        <g key={i}>
          <circle
            cx={p.x}
            cy={-p.y}
            r={g.D / 2}
            style={{ fill: P.paper, fillOpacity: 0.55, stroke: P.friendly, strokeWidth: u * 0.35 }}
          />
          <circle cx={p.x} cy={-p.y} r={u * 0.7} style={{ fill: P.friendly }} />
          <Txt
            at={{ x: p.x, y: p.y - Math.min(g.D / 2 - u * 2.2, u * 4) }}
            size={u * 2.2}
            P={P}
            color={P.friendly}
          >
            {`LP${i + 1}`}
          </Txt>
        </g>
      ))}

      {/* lead-LP markings */}
      {day.includes('Air panel (VS-17)') && (
        <rect
          x={lead.x + u * 1.4}
          y={-lead.y - u * 0.7}
          width={u * 2.4}
          height={u * 1.4}
          style={{ fill: P.danger, stroke: P.ink, strokeWidth: u * 0.15 }}
        />
      )}
      {night.includes('Inverted Y (IR)') && (
        <Txt
          at={{ x: lead.x - u * 2.6, y: lead.y + u * 0.2 }}
          size={u * 2.6}
          P={P}
          color={P.friendly}
        >
          ⅄
        </Txt>
      )}
      {night.includes('IR strobe') && (
        <Txt at={{ x: lead.x, y: lead.y + u * 2.4 }} size={u * 2.2} P={P} color={P.friendly}>
          ✳
        </Txt>
      )}

      {/* approach & departure */}
      <Arrow
        from={g.approachFrom}
        to={g.approachTo}
        color={P.friendly}
        width={u * 0.55}
        head={u * 2.6}
        dash={`${u * 2} ${u * 1.2}`}
      />
      <Txt at={labels.approach.at} size={labels.size} P={P} color={P.friendly}>
        {labels.approach.text}
      </Txt>
      <Arrow
        from={g.departureFrom}
        to={g.departureTo}
        color={P.departure}
        width={u * 0.55}
        head={u * 2.6}
        dash={`${u * 2} ${u * 1.2}`}
      />
      <Txt at={labels.departure.at} size={labels.size} P={P} color={P.departure}>
        {labels.departure.text}
      </Txt>

      {/* zone name */}
      <Txt at={{ x: 0, y: topY + u * 3 }} size={u * 2.6} P={P} weight={800}>
        {hlz.name || 'HLZ'}
      </Txt>

      {/* wind */}
      {hlz.windKts > 0 && (
        <g>
          <circle
            cx={windAnchor.x}
            cy={-windAnchor.y}
            r={u * 6.4}
            style={{ fill: P.paper, fillOpacity: 0.85, stroke: P.grid, strokeWidth: u * 0.15 }}
          />
          <Arrow
            from={sub(windAnchor, mul(downwind, windHalf))}
            to={add(windAnchor, mul(downwind, windHalf))}
            color={P.wind}
            width={u * 0.6}
            head={u * 2}
          />
          <Txt
            at={{ x: windAnchor.x, y: windAnchor.y - u * 8.4 }}
            size={u * 1.8}
            P={P}
            color={P.wind}
          >
            {`WIND ${pad3(norm360(hlz.windFromMag))}°M ${hlz.windKts} KT`}
          </Txt>
        </g>
      )}

      {/* obstacles */}
      {hlz.obstacles.map((o) => {
        const c = g.checks.find((k) => k.id === o.id);
        const bad = c?.ok === false;
        const color = bad ? P.danger : P.obstacle;
        return (
          <g key={o.id} {...dragAttr(`obs:${o.id}`)} className="sketch-drag">
            <circle cx={o.pos.x} cy={-o.pos.y} r={u * 3.4} style={{ fill: 'transparent' }} />
            {bad && (
              <circle
                cx={o.pos.x}
                cy={-o.pos.y}
                r={u * 3.2}
                style={{ fill: 'none', stroke: P.danger, strokeWidth: u * 0.4 }}
              />
            )}
            <ObstacleGlyph o={o} u={u} color={color} />
            <Txt at={{ x: o.pos.x, y: o.pos.y - u * 4.2 }} size={u * 1.8} P={P} color={color}>
              {`${o.kind.toUpperCase()} ${o.heightM}m${c?.ok === false ? ' ✗10:1' : c?.ok ? ' ✓' : ''}`}
            </Txt>
          </g>
        );
      })}

      {/* security */}
      {hlz.security.map((m) => (
        <g key={m.id} {...dragAttr(`sec:${m.id}`)} className="sketch-drag">
          <rect
            x={m.pos.x - u * 2.2}
            y={-m.pos.y - u * 1.4}
            width={u * 4.4}
            height={u * 2.8}
            style={{ fill: P.paper, stroke: P.friendly, strokeWidth: u * 0.35 }}
          />
          <Txt at={m.pos} size={u * 1.5} P={P} color={P.friendly} halo={false}>
            {m.label || 'SEC'}
          </Txt>
        </g>
      ))}

      {/* litter route CCP → casualty loading point */}
      <line
        x1={g.ccpPos.x}
        y1={-g.ccpPos.y}
        x2={hlz.loadPoint.x}
        y2={-hlz.loadPoint.y}
        style={{
          stroke: P.danger,
          strokeWidth: u * 0.4,
          strokeDasharray: `${u * 0.5} ${u * 0.9}`,
          strokeLinecap: 'round',
        }}
      />
      <Txt at={litterAt} size={litterSize} P={P} color={P.danger}>
        {litterText}
      </Txt>

      {/* casualty loading point */}
      <g {...dragAttr('load')} className="sketch-drag">
        <circle
          cx={hlz.loadPoint.x}
          cy={-hlz.loadPoint.y}
          r={u * 2.4}
          style={{ fill: P.paper, stroke: P.danger, strokeWidth: u * 0.35 }}
        />
        <path
          d={`M${hlz.loadPoint.x - u * 0.45},${-hlz.loadPoint.y - u * 1.5}h${u * 0.9}v${u * 1.05}h${u * 1.05}v${u * 0.9}h${-u * 1.05}v${u * 1.05}h${-u * 0.9}v${-u * 1.05}h${-u * 1.05}v${-u * 0.9}h${u * 1.05}z`}
          style={{ fill: P.danger }}
        />
        <Txt
          at={{ x: hlz.loadPoint.x, y: hlz.loadPoint.y - u * 4 }}
          size={u * 1.6}
          P={P}
          color={P.danger}
        >
          CAS LOAD PT
        </Txt>
      </g>

      {/* CCP */}
      <g {...(g.ccpFromGrid ? {} : dragAttr('ccp'))} className={g.ccpFromGrid ? '' : 'sketch-drag'}>
        <rect
          x={g.ccpPos.x - u * 3.6}
          y={-g.ccpPos.y - u * 2}
          width={u * 7.2}
          height={u * 4}
          style={{ fill: P.paper, stroke: P.danger, strokeWidth: u * 0.45 }}
        />
        <Txt at={g.ccpPos} size={u * 2} P={P} color={P.danger} halo={false}>
          CCP
        </Txt>
      </g>
    </g>
  );
};
