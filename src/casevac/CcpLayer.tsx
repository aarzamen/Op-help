import { type Vec } from './geo';
import { ccpFlowLabels, rectEdge, type CcpGeom } from './ccp';
import { monoWidth } from './layout';
import type { ViewBox } from './hlz';
import { CCP_AREA_META, type CcpArea, type CcpAreaKind, type CcpSheet } from './model';
import type { Palette } from './palette';
import { Arrow, Txt } from './svg';

const toneColor = (P: Palette, kind: CcpAreaKind) =>
  ({
    triage: P.friendly,
    immediate: P.immediate,
    delayed: P.delayed,
    minimal: P.minimal,
    expectant: P.expectant,
    evac: P.evac,
    loading: P.evac,
    remains: P.remains,
    enemy: P.enemy,
  })[kind];

/** Casualty flow arrows: one way, entrance → categories → evac staging → loading. */
const FLOWS: [CcpAreaKind, CcpAreaKind, boolean][] = [
  ['triage', 'immediate', false],
  ['triage', 'delayed', false],
  ['triage', 'minimal', false],
  ['triage', 'expectant', true],
  ['triage', 'remains', true],
  ['immediate', 'evac', false],
  ['delayed', 'evac', false],
  ['minimal', 'evac', true],
  ['evac', 'loading', false],
];

const Area = ({ a, P, u, editable }: { a: CcpArea; P: Palette; u: number; editable: boolean }) => {
  const meta = CCP_AREA_META[a.kind];
  const color = toneColor(P, a.kind);
  const fs = Math.min(u * 2.1, (a.w / Math.max(6, meta.label.length)) * 1.45);
  const lanes = a.kind === 'evac' ? ['URG / URG-S', 'PRIORITY', 'ROUTINE'] : null;
  const horizontal = a.w >= a.h;
  return (
    <g {...(editable ? { 'data-drag': `area:${a.kind}` } : {})} className="sketch-drag">
      <rect
        x={a.pos.x - a.w / 2}
        y={-a.pos.y - a.h / 2}
        width={a.w}
        height={a.h}
        rx={u * 0.6}
        style={{
          fill: color,
          fillOpacity: a.kind === 'expectant' ? 0.22 : 0.14,
          stroke: color,
          strokeWidth: u * 0.4,
          strokeDasharray:
            a.kind === 'remains' || a.kind === 'enemy' ? `${u * 1.2} ${u * 0.8}` : undefined,
        }}
      />
      {lanes &&
        lanes.map((lane, i) => {
          const frac = (i + 0.5) / lanes.length;
          const at: Vec = horizontal
            ? { x: a.pos.x - a.w / 2 + a.w * frac, y: a.pos.y - a.h * 0.22 }
            : { x: a.pos.x, y: a.pos.y + a.h / 2 - a.h * frac - a.h * 0.06 };
          const sep = i > 0;
          return (
            <g key={lane}>
              {sep &&
                (horizontal ? (
                  <line
                    x1={a.pos.x - a.w / 2 + (a.w * i) / lanes.length}
                    x2={a.pos.x - a.w / 2 + (a.w * i) / lanes.length}
                    y1={-a.pos.y + a.h * 0.02}
                    y2={-a.pos.y + a.h / 2}
                    style={{
                      stroke: color,
                      strokeWidth: u * 0.2,
                      strokeDasharray: `${u * 0.6} ${u * 0.5}`,
                    }}
                  />
                ) : (
                  <line
                    y1={-(a.pos.y + a.h / 2 - (a.h * i) / lanes.length)}
                    y2={-(a.pos.y + a.h / 2 - (a.h * i) / lanes.length)}
                    x1={a.pos.x - a.w / 2}
                    x2={a.pos.x + a.w / 2}
                    style={{
                      stroke: color,
                      strokeWidth: u * 0.2,
                      strokeDasharray: `${u * 0.6} ${u * 0.5}`,
                    }}
                  />
                ))}
              <Txt at={at} size={u * 1.35} P={P} color={color} halo={false}>
                {lane}
              </Txt>
            </g>
          );
        })}
      {!lanes && (
        <Txt
          at={{ x: a.pos.x, y: a.pos.y + u * 0.9 }}
          size={fs}
          P={P}
          color={color}
          weight={800}
          halo={false}
        >
          {meta.label}
        </Txt>
      )}
      {!lanes && meta.sub && (
        <Txt
          at={{ x: a.pos.x, y: a.pos.y - u * 1.6 }}
          size={Math.min(u * 1.4, fs * 0.8, (a.w * 0.9) / (monoWidth(meta.sub, 1) || 1))}
          P={P}
          color={P.inkSoft}
          weight={600}
          halo={false}
        >
          {meta.sub}
        </Txt>
      )}
      {lanes && (
        <Txt
          at={
            horizontal
              ? { x: a.pos.x, y: a.pos.y + a.h * 0.24 }
              : { x: a.pos.x, y: a.pos.y + a.h / 2 + u * 1.6 }
          }
          size={Math.min(u * 1.6, (a.w * 0.9) / monoWidth(meta.label, 1))}
          P={P}
          color={color}
          weight={800}
          halo={!horizontal}
        >
          {meta.label}
        </Txt>
      )}
    </g>
  );
};

export const CcpLayer = ({
  ccp,
  g,
  view,
  P,
  editable,
  hlzName,
}: {
  ccp: CcpSheet;
  g: CcpGeom;
  view: ViewBox;
  P: Palette;
  editable: boolean;
  hlzName: string;
}) => {
  const u = view.w / 100;
  const triage = g.byKind.triage;
  const labels = ccpFlowLabels(g, view, hlzName);
  return (
    <g>
      {FLOWS.map(([fromK, toK, dashed]) => {
        const a = g.byKind[fromK];
        const b = g.byKind[toK];
        if (!a || !b) return null;
        const from = rectEdge(a.pos, a.w, a.h, b.pos);
        const to = rectEdge(b.pos, b.w, b.h, a.pos);
        return (
          <Arrow
            key={`${fromK}-${toK}`}
            from={from}
            to={to}
            color={P.inkSoft}
            width={u * (dashed ? 0.25 : 0.35)}
            head={u * 1.6}
            dash={dashed ? `${u * 0.8} ${u * 0.7}` : undefined}
          />
        );
      })}

      {ccp.areas
        .filter((a) => a.enabled)
        .map((a) => (
          <Area key={a.kind} a={a} P={P} u={u} editable={editable} />
        ))}

      {triage && (
        <>
          <Arrow
            from={g.poiFrom}
            to={rectEdge(triage.pos, triage.w, triage.h, g.poiFrom)}
            color={P.danger}
            width={u * 0.5}
            head={u * 2}
          />
          <Txt at={labels.poi.at} size={labels.size} P={P} color={P.danger}>
            {labels.poi.text}
          </Txt>
        </>
      )}

      <Arrow
        from={g.exitFrom}
        to={g.exitTo}
        color={P.friendly}
        width={u * 0.5}
        head={u * 2}
        dash={`${u * 1.2} ${u * 0.8}`}
      />
      <Txt at={labels.exit.at} size={labels.size} P={P} color={P.friendly}>
        {labels.exit.text}
      </Txt>

      {ccp.security.map((m) => (
        <g key={m.id} {...(editable ? { 'data-drag': `sec:${m.id}` } : {})} className="sketch-drag">
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
    </g>
  );
};
