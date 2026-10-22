import { ArrowDown, ArrowUp, ClipboardCopy, Plus, Trash2 } from 'lucide-react';
import { Block, Callout, Info } from '../components/ui';
import {
  CheckGroup,
  FieldRow,
  NumberField,
  Segmented,
  SelectField,
  TextField,
} from '../components/form';
import { appendNote, copyText, notify } from '../lib/storage';
import { eastWest, mul, pad3, parseMgrs, type NorthReference } from './geo';
import type { HlzGeom } from './hlz';
import {
  CCP_AREA_META,
  DAY_MARKINGS,
  LEG_MODES,
  LP_SIZES,
  NIGHT_MARKINGS,
  NODE_KINDS,
  OBSTACLE_KINDS,
  PRECEDENCE,
  ccpLayout,
  lpDiameter,
  newId,
  type CasevacPlan,
  type CcpAreaKind,
  type CcpSheet,
  type HlzSheet,
  type LegMode,
  type LpSize,
  type NineLine,
  type NodeKind,
  type ObstacleKind,
  type RouteSheet,
} from './model';
import { fmtMin, type RouteTimeline } from './route';
import { casevacParagraph, grid8, nineLineScript } from './sheetData';

export type Update = (fn: (p: CasevacPlan) => CasevacPlan) => void;

const GridHint = ({ grid, north }: { grid: string; north: NorthReference | null }) => {
  if (!grid.trim())
    return (
      <div className="field-hint">
        MGRS, e.g. 11S KU 1234 5678 — sets grid labels and magnetic north.
      </div>
    );
  if (!parseMgrs(grid))
    return (
      <div className="field-hint field-hint-bad">
        Not a valid MGRS grid (zone + band, 100 km square, even digits).
      </div>
    );
  return (
    <div className="field-hint field-hint-ok">
      {grid8(grid)}
      {north &&
        ` · G-M ${eastWest(north.gm)} (WMM decl ${eastWest(north.declination)}, conv ${eastWest(north.convergence)})`}
    </div>
  );
};

// ===================== HLZ =====================

export const HlzForm = ({
  plan,
  update,
  g,
  north,
}: {
  plan: CasevacPlan;
  update: Update;
  g: HlzGeom;
  north: NorthReference | null;
}) => {
  const h = plan.hlz;
  const set = (patch: Partial<HlzSheet>) => update((p) => ({ ...p, hlz: { ...p.hlz, ...patch } }));
  const addObstacle = (kind: ObstacleKind) => {
    const meta = OBSTACLE_KINDS.find((k) => k.kind === kind)!;
    const pos = mul(g.uA, -(g.L / 2 + 40 + 10 * meta.defaultH * 0.6));
    set({
      obstacles: [
        ...h.obstacles,
        {
          id: newId(),
          kind,
          pos: { x: Math.round(pos.x), y: Math.round(pos.y) },
          heightM: meta.defaultH,
          note: '',
        },
      ],
    });
    notify(`${meta.label} added on the approach — drag it into place`);
  };

  return (
    <>
      <Block
        theme="blue"
        letter="LZ"
        name="ZONE & LANDING POINTS"
        desc="Name, grid, LP size, formation"
        defaultOpen
      >
        <FieldRow>
          <TextField
            label="HLZ name"
            value={h.name}
            onChange={(v) => set({ name: v })}
            placeholder="HLZ HAWK"
          />
          <TextField
            label="Center grid (MGRS)"
            value={h.grid}
            onChange={(v) => set({ grid: v })}
            mono
            placeholder="11S KU 1234 5678"
          />
        </FieldRow>
        <GridHint grid={h.grid} north={north} />
        <SelectField<LpSize>
          label="Landing point size"
          value={h.lpSize}
          onChange={(v) => set({ lpSize: v, lpSpacing: Math.max(lpDiameter(v), h.lpSpacing) })}
          options={LP_SIZES.map((s) => ({
            value: s.size as LpSize,
            label: `Size ${s.size} — ${s.m} m · ${s.examples}`,
          }))}
        />
        <FieldRow>
          <NumberField
            label="Landing points"
            value={h.lpCount}
            min={1}
            max={6}
            onChange={(v) => set({ lpCount: Math.max(1, Math.min(6, Math.round(v))) })}
          />
          <NumberField
            label="Spacing (center–center)"
            unit="m"
            value={h.lpSpacing}
            min={lpDiameter(h.lpSize)}
            step={5}
            onChange={(v) => set({ lpSpacing: v })}
          />
        </FieldRow>
        <div className="field">
          <div className="field-label">Formation</div>
          <Segmented
            label="Formation"
            value={h.formation}
            onChange={(v) => set({ formation: v })}
            options={[
              { value: 'trail', label: 'TRAIL' },
              { value: 'abreast', label: 'ABREAST' },
            ]}
          />
        </div>
        <div className="field">
          <div className="field-label">Zone size</div>
          <Segmented
            label="Zone size"
            value={h.autoZone ? 'auto' : 'manual'}
            onChange={(v) =>
              set({ autoZone: v === 'auto', zoneW: Math.round(g.W), zoneL: Math.round(g.L) })
            }
            options={[
              { value: 'auto', label: 'FIT LPs' },
              { value: 'manual', label: 'MANUAL' },
            ]}
          />
        </div>
        {!h.autoZone && (
          <FieldRow>
            <NumberField
              label="Zone width"
              unit="m"
              value={h.zoneW}
              min={10}
              step={5}
              onChange={(v) => set({ zoneW: v })}
            />
            <NumberField
              label="Zone length (along approach)"
              unit="m"
              value={h.zoneL}
              min={10}
              step={5}
              onChange={(v) => set({ zoneL: v })}
            />
          </FieldRow>
        )}
        <Info>
          LP size is both the cleared diameter and the minimum spacing between landing point centers
          (FM 3-21.38). Use <em>Size 5 (100 m)</em> for mixed or unknown aircraft and confirm Marine
          aircraft with the supporting squadron.
        </Info>
      </Block>

      <Block
        theme="green"
        letter="↗"
        name="APPROACH, DEPARTURE & WIND"
        desc="Enter °M — drawn against grid north"
      >
        <FieldRow>
          <NumberField
            label="Final approach"
            unit="°M"
            value={h.approachMag}
            min={0}
            max={359}
            onChange={(v) => set({ approachMag: ((v % 360) + 360) % 360 })}
          />
          <NumberField
            label="Departure"
            unit="°M"
            value={h.departureMag}
            min={0}
            max={359}
            onChange={(v) => set({ departureMag: ((v % 360) + 360) % 360 })}
          />
        </FieldRow>
        <FieldRow>
          <NumberField
            label="Wind from"
            unit="°M"
            value={h.windFromMag}
            min={0}
            max={359}
            onChange={(v) => set({ windFromMag: ((v % 360) + 360) % 360 })}
          />
          <NumberField
            label="Wind speed"
            unit="kt"
            value={h.windKts}
            min={0}
            max={80}
            onChange={(v) => set({ windKts: Math.max(0, v) })}
          />
        </FieldRow>
        <div className="chip-row">
          <button
            type="button"
            className="chip"
            onClick={() => set({ approachMag: h.windFromMag, departureMag: h.windFromMag })}
          >
            LAND INTO THE WIND
          </button>
          <button
            type="button"
            className="chip"
            onClick={() => set({ departureMag: h.approachMag })}
          >
            DEPART STRAIGHT AHEAD
          </button>
        </div>
        <Info>
          Headings are the direction of flight. Aircraft land and take off into the wind, so the
          final approach normally points the way the wind comes <em>from</em>.{' '}
          {north
            ? `Drawn on grid north: approach ${pad3(h.approachMag)}°M = ${pad3(g.approachAz)}° grid (G-M ${eastWest(north.gm)}).`
            : 'Enter a valid grid so magnetic headings can be converted to grid.'}
        </Info>
      </Block>

      <Block
        theme="red"
        letter="▲"
        name="OBSTACLES"
        desc={`${h.obstacles.length} plotted · 10:1 approach / departure check`}
      >
        {h.obstacles.map((o) => {
          const c = g.checks.find((k) => k.id === o.id);
          return (
            <div key={o.id} className="list-card">
              <FieldRow>
                <SelectField<ObstacleKind>
                  label="Type"
                  value={o.kind}
                  onChange={(v) =>
                    set({
                      obstacles: h.obstacles.map((x) => (x.id === o.id ? { ...x, kind: v } : x)),
                    })
                  }
                  options={OBSTACLE_KINDS.map((k) => ({ value: k.kind, label: k.label }))}
                />
                <NumberField
                  label="Height"
                  unit="m"
                  value={o.heightM}
                  min={0}
                  onChange={(v) =>
                    set({
                      obstacles: h.obstacles.map((x) =>
                        x.id === o.id ? { ...x, heightM: Math.max(0, v) } : x
                      ),
                    })
                  }
                />
              </FieldRow>
              <TextField
                label="Note"
                value={o.note}
                onChange={(v) =>
                  set({
                    obstacles: h.obstacles.map((x) => (x.id === o.id ? { ...x, note: v } : x)),
                  })
                }
              />
              <div className="list-card-foot">
                <span
                  className={`status ${c?.ok === false ? 'status-bad' : c?.ok ? 'status-ok' : ''}`}
                >
                  {c?.ok === null || !c
                    ? 'Clear of approach / departure'
                    : `${c.path}: ${Math.round(c.along)} m from LP, needs ${c.required} m ${c.ok ? '✓' : '✗'}`}
                </span>
                <button
                  type="button"
                  className="icon-btn icon-btn-danger"
                  aria-label="Delete obstacle"
                  onClick={() => set({ obstacles: h.obstacles.filter((x) => x.id !== o.id) })}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          );
        })}
        <div className="chip-row">
          {OBSTACLE_KINDS.map((k) => (
            <button key={k.kind} type="button" className="chip" onClick={() => addObstacle(k.kind)}>
              <Plus size={11} /> {k.label.toUpperCase()}
            </button>
          ))}
        </div>
        <Info>
          Drag obstacles on the sketch. On the approach or departure path every 1 m of obstacle
          height needs 10 m of distance to the landing point (the 10:1 rule) — 15 m trees mean ≥ 150
          m. Red means the plan breaks the rule.
        </Info>
      </Block>

      <Block
        theme="amber"
        letter="◎"
        name="MARKING, SURFACE & CONTROL"
        desc="Panels, smoke, IR · ground · who runs the zone"
      >
        <CheckGroup
          label="Day marking"
          options={DAY_MARKINGS}
          values={h.markDay}
          onChange={(v) => set({ markDay: v })}
        />
        <CheckGroup
          label="Night marking"
          options={NIGHT_MARKINGS}
          values={h.markNight}
          onChange={(v) => set({ markNight: v })}
        />
        <FieldRow>
          <TextField
            label="Surface"
            value={h.surface}
            onChange={(v) => set({ surface: v })}
            placeholder="grass / dirt / sand (brownout)"
          />
          <TextField
            label="Ground slope"
            value={h.slope}
            onChange={(v) => set({ slope: v })}
            placeholder="< 5%"
          />
        </FieldRow>
        <TextField
          label="HLZ controller"
          value={h.controller}
          onChange={(v) => set({ controller: v })}
        />
        <FieldRow>
          <TextField
            label="Frequency / net"
            value={h.freq}
            onChange={(v) => set({ freq: v })}
            mono
          />
          <TextField
            label="Call sign"
            value={h.callSign}
            onChange={(v) => set({ callSign: v })}
            mono
          />
        </FieldRow>
        <Info>
          Mark the lead landing point. Pop smoke only when the aircraft asks, and let the pilot
          identify the color — don't announce it first. Confirm slope and surface limits with the
          aircrew; dust and sand mean brownout.
        </Info>
      </Block>

      <Block
        theme="purple"
        letter="SEC"
        name="SECURITY, LOAD POINT & CCP"
        desc="Positions, casualty loading, litter route"
      >
        <div className="chip-row">
          <button
            type="button"
            className="chip"
            onClick={() => {
              const k = h.security.length;
              const ang = (k * 90 + 45) * (Math.PI / 180);
              const r = Math.max(g.L, g.W) * 0.75;
              set({
                security: [
                  ...h.security,
                  {
                    id: newId(),
                    label: 'SEC',
                    pos: { x: Math.round(Math.sin(ang) * r), y: Math.round(Math.cos(ang) * r) },
                  },
                ],
              });
            }}
          >
            <Plus size={11} /> SECURITY POSITION
          </button>
          {h.security.length > 0 && (
            <button
              type="button"
              className="chip"
              onClick={() => set({ security: h.security.slice(0, -1) })}
            >
              <Trash2 size={11} /> REMOVE LAST
            </button>
          )}
        </div>
        <Info>
          {g.ccpFromGrid
            ? `The CCP is placed from its grid on the CCP tab (${Math.round(g.litterRouteM)} m litter route to the load point).`
            : 'Enter the CCP grid on the CCP tab to place it exactly — until then, drag the CCP box.'}{' '}
          Drag the casualty load point to where litter teams wait: outside the landing point,
          approached from where the aircrew directs, never from upslope.
        </Info>
        <TextField
          label="HLZ notes"
          value={h.notes}
          onChange={(v) => set({ notes: v })}
          multiline
          placeholder="Hazards, alternate HLZ, brief items…"
        />
      </Block>
    </>
  );
};

// ===================== CCP =====================

const OPTIONAL_AREAS: CcpAreaKind[] = [
  'expectant',
  'remains',
  'enemy',
  'loading',
  'minimal',
  'delayed',
];

export const CcpForm = ({ plan, update }: { plan: CasevacPlan; update: Update }) => {
  const c = plan.ccp;
  const set = (patch: Partial<CcpSheet>) => update((p) => ({ ...p, ccp: { ...p.ccp, ...patch } }));
  return (
    <>
      <Block
        theme="red"
        letter="CCP"
        name="CASUALTY COLLECTION POINT"
        desc="Name, grid, location, flow"
        defaultOpen
      >
        <FieldRow>
          <TextField label="CCP name" value={c.name} onChange={(v) => set({ name: v })} />
          <TextField
            label="Grid (MGRS)"
            value={c.grid}
            onChange={(v) => set({ grid: v })}
            mono
            placeholder="11S KU 1234 5678"
          />
        </FieldRow>
        <GridHint grid={c.grid} north={null} />
        <TextField
          label="Location / description"
          value={c.locationDesc}
          onChange={(v) => set({ locationDesc: v })}
          multiline
        />
        <div className="field">
          <div className="field-label">Casualties flow toward</div>
          <Segmented
            label="Flow direction"
            value={String(c.flowAz)}
            onChange={(v) => {
              const flowAz = Number(v) as 0 | 90 | 180 | 270;
              set({ flowAz, areas: ccpLayout(flowAz, c.areas) });
            }}
            options={[
              { value: '0', label: 'N' },
              { value: '90', label: 'E' },
              { value: '180', label: 'S' },
              { value: '270', label: 'W' },
            ]}
          />
        </div>
        <Callout kind="note" title="Choosing the site">
          Close to where casualties will happen but out of direct fire · cover and concealment,
          including from drones · on the lines of drift and near the evacuation route · reachable by
          foot and vehicle · room to grow for a MASCAL · one way in, one way out.
        </Callout>
      </Block>

      <Block
        theme="amber"
        letter="▦"
        name="AREAS"
        desc="Toggle optional areas · drag on the sketch"
      >
        <div className="check-row">
          {OPTIONAL_AREAS.map((k) => {
            const area = c.areas.find((a) => a.kind === k);
            const on = !!area?.enabled;
            return (
              <button
                key={k}
                type="button"
                className={`toggle-chip ${on ? 'on' : ''}`}
                aria-pressed={on}
                onClick={() =>
                  set({ areas: c.areas.map((a) => (a.kind === k ? { ...a, enabled: !on } : a)) })
                }
              >
                {CCP_AREA_META[k].label}
              </button>
            );
          })}
        </div>
        <Info>
          Triage at the single entrance; casualties move one way through their category to
          evacuation staging, grouped by precedence. Keep expectant casualties and remains screened
          and out of sight of the others; segregate and guard enemy casualties.
        </Info>
        <button type="button" className="chip" onClick={() => set({ areas: ccpLayout(c.flowAz) })}>
          RESET LAYOUT
        </button>
      </Block>

      <Block
        theme="blue"
        letter="HM"
        name="STAFF & MARKING"
        desc="Who triages, treats, carries, tracks"
      >
        <TextField
          label="Triage officer"
          value={c.triageOfficer}
          onChange={(v) => set({ triageOfficer: v })}
        />
        <TextField
          label="Treatment teams"
          value={c.treatment}
          onChange={(v) => set({ treatment: v })}
        />
        <TextField
          label="Litter teams"
          value={c.litterTeams}
          onChange={(v) => set({ litterTeams: v })}
        />
        <TextField label="Casualty tracker / RTO" value={c.rto} onChange={(v) => set({ rto: v })} />
        <FieldRow>
          <TextField label="Day marking" value={c.markDay} onChange={(v) => set({ markDay: v })} />
          <TextField
            label="Night marking"
            value={c.markNight}
            onChange={(v) => set({ markNight: v })}
          />
        </FieldRow>
      </Block>

      <Block
        theme="purple"
        letter="SEC"
        name="SECURITY & NOTES"
        desc={`${c.security.length} security positions`}
      >
        <div className="chip-row">
          <button
            type="button"
            className="chip"
            onClick={() =>
              set({
                security: [...c.security, { id: newId(), label: 'SEC', pos: { x: 0, y: -36 } }],
              })
            }
          >
            <Plus size={11} /> SECURITY POSITION
          </button>
          {c.security.length > 0 && (
            <button
              type="button"
              className="chip"
              onClick={() => set({ security: c.security.slice(0, -1) })}
            >
              <Trash2 size={11} /> REMOVE LAST
            </button>
          )}
        </div>
        <TextField
          label="CCP notes"
          value={c.notes}
          onChange={(v) => set({ notes: v })}
          multiline
        />
      </Block>
    </>
  );
};

// ===================== ROUTE =====================

export const RouteForm = ({
  plan,
  update,
  t,
}: {
  plan: CasevacPlan;
  update: Update;
  t: RouteTimeline;
}) => {
  const r = plan.route;
  const set = (patch: Partial<RouteSheet>) =>
    update((p) => ({ ...p, route: { ...p.route, ...patch } }));
  const setNode = (i: number, patch: Partial<RouteSheet['nodes'][number]>) =>
    set({ nodes: r.nodes.map((n, k) => (k === i ? { ...n, ...patch } : n)) });
  const setLeg = (i: number, patch: Partial<RouteSheet['legs'][number]>) =>
    set({ legs: r.legs.map((l, k) => (k === i ? { ...l, ...patch } : l)) });
  const insertAfter = (i: number) => {
    const at = r.nodes[i];
    const nodes = [...r.nodes];
    nodes.splice(i + 1, 0, {
      id: newId(),
      kind: 'other',
      name: 'New node',
      grid: '',
      note: '',
      pos: { x: at.pos.x + 60, y: at.pos.y },
    });
    const legs = [...r.legs];
    legs.splice(i, 0, { mode: 'ground', distKm: 1, timeMin: 5, route: '', net: '', platform: '' });
    set({ nodes, legs });
  };
  const remove = (i: number) => {
    if (r.nodes.length <= 2) return notify('Keep at least two nodes', 'error');
    const nodes = r.nodes.filter((_, k) => k !== i);
    const legs = [...r.legs];
    legs.splice(Math.min(i, legs.length - 1), 1);
    set({ nodes, legs });
  };
  const move = (i: number, d: -1 | 1) => {
    const j = i + d;
    if (j < 0 || j >= r.nodes.length) return;
    const nodes = [...r.nodes];
    [nodes[i], nodes[j]] = [nodes[j], nodes[i]];
    set({ nodes });
  };

  return (
    <>
      <Block
        theme="blue"
        letter="⇢"
        name="EVACUATION CHAIN"
        desc={`${r.nodes.length} nodes · POI → surgical ${t.toSurgicalMin === null ? '—' : fmtMin(t.toSurgicalMin)}`}
        defaultOpen
      >
        <div className="field">
          <div className="field-label">Sketch</div>
          <Segmented
            label="Route layout"
            value={r.layout}
            onChange={(v) => set({ layout: v })}
            options={[
              { value: 'schematic', label: 'SCHEMATIC' },
              { value: 'map', label: 'ON MAP / IMAGE' },
            ]}
          />
        </div>
        {r.nodes.map((n, i) => (
          <div key={n.id}>
            <div className="list-card">
              <FieldRow>
                <SelectField<NodeKind>
                  label={`Node ${i + 1} · T+${fmtMin(t.cum[i] ?? 0)}`}
                  value={n.kind}
                  onChange={(v) => setNode(i, { kind: v })}
                  options={NODE_KINDS.map((k) => ({
                    value: k.kind,
                    label: `${k.badge} — ${k.label}`,
                  }))}
                />
                <TextField label="Name" value={n.name} onChange={(v) => setNode(i, { name: v })} />
              </FieldRow>
              <FieldRow>
                <TextField
                  label="Grid"
                  value={n.grid}
                  onChange={(v) => setNode(i, { grid: v })}
                  mono
                />
                <TextField label="Note" value={n.note} onChange={(v) => setNode(i, { note: v })} />
              </FieldRow>
              <div className="list-card-foot">
                <span className="chip-row">
                  <button
                    type="button"
                    className="icon-btn"
                    aria-label="Move up"
                    onClick={() => move(i, -1)}
                  >
                    <ArrowUp size={14} />
                  </button>
                  <button
                    type="button"
                    className="icon-btn"
                    aria-label="Move down"
                    onClick={() => move(i, 1)}
                  >
                    <ArrowDown size={14} />
                  </button>
                  <button type="button" className="chip" onClick={() => insertAfter(i)}>
                    <Plus size={11} /> NODE AFTER
                  </button>
                </span>
                <button
                  type="button"
                  className="icon-btn icon-btn-danger"
                  aria-label="Delete node"
                  onClick={() => remove(i)}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
            {i < r.legs.length && (
              <div className="leg-card">
                <FieldRow>
                  <SelectField<LegMode>
                    label="Leg mode"
                    value={r.legs[i].mode}
                    onChange={(v) => setLeg(i, { mode: v })}
                    options={LEG_MODES.map((m) => ({ value: m.mode, label: m.label }))}
                  />
                  <TextField
                    label="Platform"
                    value={r.legs[i].platform}
                    onChange={(v) => setLeg(i, { platform: v })}
                  />
                </FieldRow>
                <FieldRow>
                  <NumberField
                    label="Distance"
                    unit="km"
                    step={0.1}
                    value={r.legs[i].distKm}
                    min={0}
                    onChange={(v) => setLeg(i, { distKm: Math.max(0, v) })}
                  />
                  <NumberField
                    label="Time"
                    unit="min"
                    value={r.legs[i].timeMin}
                    min={0}
                    onChange={(v) => setLeg(i, { timeMin: Math.max(0, v) })}
                  />
                </FieldRow>
                <FieldRow>
                  <TextField
                    label="Route"
                    value={r.legs[i].route}
                    onChange={(v) => setLeg(i, { route: v })}
                  />
                  <TextField
                    label="Net"
                    value={r.legs[i].net}
                    onChange={(v) => setLeg(i, { net: v })}
                  />
                </FieldRow>
              </div>
            )}
          </div>
        ))}
        <Info>
          Time each leg the way the instructors teach time — measured, not guessed (a litter carry
          over rough ground is slow). The POI → surgical total is what the 1-hour Urgent /
          Urgent-Surgical standard is judged against.
        </Info>
      </Block>

      <Block
        theme="green"
        letter="P"
        name="PACE & PRECEDENCE"
        desc="Primary · Alternate · Contingency · Emergency"
      >
        <TextField label="P — Primary" value={r.paceP} onChange={(v) => set({ paceP: v })} />
        <TextField label="A — Alternate" value={r.paceA} onChange={(v) => set({ paceA: v })} />
        <TextField label="C — Contingency" value={r.paceC} onChange={(v) => set({ paceC: v })} />
        <TextField label="E — Emergency" value={r.paceE} onChange={(v) => set({ paceE: v })} />
        <table className="ref-table">
          <thead>
            <tr>
              <th>Line 3</th>
              <th>Precedence</th>
              <th>Evacuate within</th>
            </tr>
          </thead>
          <tbody>
            {PRECEDENCE.map((p) => (
              <tr key={p.code}>
                <td className="mono">{p.code}</td>
                <td>
                  <strong>{p.name}</strong> — {p.meaning}
                </td>
                <td className="mono">
                  {p.code === 'C' ? `${r.priorityHours} h` : p.hours ? `${p.hours} h` : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <NumberField
          label="Priority standard used in this order"
          unit="h"
          value={r.priorityHours}
          min={1}
          max={24}
          onChange={(v) => set({ priorityHours: Math.max(1, v) })}
        />
        <Callout kind="note" title="Use your higher's numbers">
          ATP 4-02.2 sets Priority at 4 h. The course's example LCT order used 3 h for Priority —
          whatever higher's order says goes in yours.
        </Callout>
        <Callout kind="note" title="Three different questions">
          <strong>Triage</strong> (Immediate, Delayed, Minimal, Expectant) is{' '}
          <em>who gets treated first</em>. <strong>Precedence</strong> (Urgent → Convenience) is{' '}
          <em>how fast they leave</em>. <strong>Role of care</strong> (1–4) is{' '}
          <em>where they go</em>. A stable Delayed casualty can still be an Urgent evacuation if
          they'll lose a limb without a surgeon inside the hour.
        </Callout>
      </Block>
    </>
  );
};

// ===================== 9-LINE =====================

const LETTERS5 = ['A', 'B', 'C', 'D', 'E'] as const;

export const NineLineForm = ({ plan, update }: { plan: CasevacPlan; update: Update }) => {
  const n = plan.nineLine;
  const set = (patch: Partial<NineLine>) =>
    update((p) => ({ ...p, nineLine: { ...p.nineLine, ...patch } }));
  const script = nineLineScript(plan);
  return (
    <>
      <Block
        theme="red"
        letter="9"
        name="9-LINE MEDEVAC"
        desc="Fill it out before you key the handset"
        defaultOpen
      >
        <div className="field">
          <div className="field-label">Format</div>
          <Segmented
            label="Wartime or peacetime"
            value={n.wartime ? 'war' : 'peace'}
            onChange={(v) => set({ wartime: v === 'war' })}
            options={[
              { value: 'war', label: 'WARTIME' },
              { value: 'peace', label: 'PEACETIME / TRAINING' },
            ]}
          />
        </div>
        <TextField
          label="Line 1 — pickup site grid (8-digit)"
          value={n.line1}
          onChange={(v) => set({ line1: v })}
          mono
          placeholder={grid8(plan.hlz.grid) || '11S KU 1234 5678'}
          hint="Blank = the HLZ grid"
        />
        <FieldRow>
          <TextField
            label="Line 2 — frequency"
            value={n.freq}
            onChange={(v) => set({ freq: v })}
            mono
            placeholder={plan.hlz.freq}
          />
          <TextField
            label="Call sign"
            value={n.callSign}
            onChange={(v) => set({ callSign: v })}
            mono
            placeholder={plan.hlz.callSign}
          />
        </FieldRow>
        <div className="field">
          <div className="field-label">Line 3 — patients by precedence</div>
          <div className="mini-grid">
            {LETTERS5.map((k, i) => (
              <NumberField
                key={k}
                label={`${k} ${['URGENT', 'URG-SURG', 'PRIORITY', 'ROUTINE', 'CONV'][i]}`}
                value={n.line3[k]}
                min={0}
                onChange={(v) => set({ line3: { ...n.line3, [k]: Math.max(0, Math.round(v)) } })}
              />
            ))}
          </div>
        </div>
        <SelectField<NineLine['line4']>
          label="Line 4 — special equipment"
          value={n.line4}
          onChange={(v) => set({ line4: v })}
          options={[
            { value: 'A', label: 'A — None' },
            { value: 'B', label: 'B — Hoist' },
            { value: 'C', label: 'C — Extraction equipment' },
            { value: 'D', label: 'D — Ventilator' },
          ]}
        />
        <FieldRow>
          <NumberField
            label="Line 5 — L (litter)"
            value={n.line5L}
            min={0}
            onChange={(v) => set({ line5L: Math.max(0, Math.round(v)) })}
          />
          <NumberField
            label="A (ambulatory)"
            value={n.line5A}
            min={0}
            onChange={(v) => set({ line5A: Math.max(0, Math.round(v)) })}
          />
        </FieldRow>
        {n.wartime ? (
          <SelectField<NineLine['line6War']>
            label="Line 6 — security at pickup site"
            value={n.line6War}
            onChange={(v) => set({ line6War: v })}
            options={[
              { value: 'N', label: 'N — No enemy troops in area' },
              { value: 'P', label: 'P — Possible enemy troops' },
              { value: 'E', label: 'E — Enemy in area, approach with caution' },
              { value: 'X', label: 'X — Enemy in area, armed escort required' },
            ]}
          />
        ) : (
          <TextField
            label="Line 6 — number & type of wound / injury / illness"
            value={n.line6Peace}
            onChange={(v) => set({ line6Peace: v })}
          />
        )}
        <FieldRow>
          <SelectField<NineLine['line7']>
            label="Line 7 — marking"
            value={n.line7}
            onChange={(v) => set({ line7: v })}
            options={[
              { value: 'A', label: 'A — Panels' },
              { value: 'B', label: 'B — Pyrotechnic' },
              { value: 'C', label: 'C — Smoke' },
              { value: 'D', label: 'D — None' },
              { value: 'E', label: 'E — Other (IR strobe…)' },
            ]}
          />
          <TextField
            label="Detail"
            value={n.line7Detail}
            onChange={(v) => set({ line7Detail: v })}
            placeholder="smoke color, IR strobe"
          />
        </FieldRow>
        <div className="field">
          <div className="field-label">Line 8 — nationality / status</div>
          <div className="mini-grid">
            {LETTERS5.map((k) => (
              <NumberField
                key={k}
                label={`${k} ${['US MIL', 'US CIV', 'NON-US MIL', 'NON-US CIV', 'EPW'][LETTERS5.indexOf(k)]}`}
                value={n.line8[k]}
                min={0}
                onChange={(v) => set({ line8: { ...n.line8, [k]: Math.max(0, Math.round(v)) } })}
              />
            ))}
          </div>
        </div>
        {n.wartime ? (
          <SelectField<NineLine['line9War']>
            label="Line 9 — CBRN contamination"
            value={n.line9War}
            onChange={(v) => set({ line9War: v })}
            options={[
              { value: '', label: 'None (omit line)' },
              { value: 'N', label: 'N — Nuclear' },
              { value: 'B', label: 'B — Biological' },
              { value: 'C', label: 'C — Chemical' },
            ]}
          />
        ) : (
          <TextField
            label="Line 9 — terrain at the pickup site"
            value={n.line9Peace}
            onChange={(v) => set({ line9Peace: v })}
          />
        )}
      </Block>

      <Block
        theme="blue"
        letter="MIST"
        name="MIST REPORTS"
        desc="One per casualty, after the 9-line"
      >
        {n.mist.map((m, i) => (
          <div key={m.id} className="list-card">
            <FieldRow>
              <TextField
                label={`Casualty ${i + 1} — roster / zap #`}
                value={m.zap}
                onChange={(v) =>
                  set({ mist: n.mist.map((x) => (x.id === m.id ? { ...x, zap: v } : x)) })
                }
              />
              <TextField
                label="M — mechanism & time"
                value={m.m}
                onChange={(v) =>
                  set({ mist: n.mist.map((x) => (x.id === m.id ? { ...x, m: v } : x)) })
                }
              />
            </FieldRow>
            <TextField
              label="I — injuries"
              value={m.i}
              onChange={(v) =>
                set({ mist: n.mist.map((x) => (x.id === m.id ? { ...x, i: v } : x)) })
              }
            />
            <TextField
              label="S — signs & symptoms"
              value={m.s}
              onChange={(v) =>
                set({ mist: n.mist.map((x) => (x.id === m.id ? { ...x, s: v } : x)) })
              }
            />
            <TextField
              label="T — treatment given"
              value={m.t}
              onChange={(v) =>
                set({ mist: n.mist.map((x) => (x.id === m.id ? { ...x, t: v } : x)) })
              }
            />
            {n.mist.length > 1 && (
              <div className="list-card-foot">
                <span />
                <button
                  type="button"
                  className="icon-btn icon-btn-danger"
                  aria-label="Remove casualty"
                  onClick={() => set({ mist: n.mist.filter((x) => x.id !== m.id) })}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            )}
          </div>
        ))}
        <button
          type="button"
          className="chip"
          onClick={() =>
            set({ mist: [...n.mist, { id: newId(), zap: '', m: '', i: '', s: '', t: '' }] })
          }
        >
          <Plus size={11} /> CASUALTY
        </button>
      </Block>

      <div className="script-card">
        <div className="script-head">
          <span>READ-ALOUD SCRIPT</span>
          <button
            type="button"
            className="chip"
            onClick={() => copyText(script.join('\n'), '9-LINE COPIED')}
          >
            <ClipboardCopy size={11} /> COPY
          </button>
        </div>
        <pre className="script">{script.join('\n')}</pre>
        <div className="field-hint">
          Lines 1–5 get the aircraft moving — send them first; 6–9 can follow en route. Say "break"
          between categories. Write it down before you key the handset. No names or SSNs on the net
          (JTS TCCC skill card, May 2023).
        </div>
      </div>
    </>
  );
};

// ===================== ¶4.a =====================

export const ParaForm = ({
  plan,
  update,
  g,
  t,
}: {
  plan: CasevacPlan;
  update: Update;
  g: HlzGeom;
  t: RouteTimeline;
}) => {
  const p = plan.para;
  const set = (patch: Partial<CasevacPlan['para']>) =>
    update((x) => ({ ...x, para: { ...x.para, ...patch } }));
  const text = casevacParagraph(plan, g, t);
  return (
    <>
      <Block
        theme="amber"
        letter="4a"
        name="CASEVAC PARAGRAPH"
        desc="Graded items (1)–(7) of Admin & Logistics"
        defaultOpen
      >
        <Info>
          The grading sheet checks seven things under ¶4.a. Locations, the route timeline and PACE
          come from the sketches — fill in the rest here, then send it to the ORDER tab.
        </Info>
        <TextField
          label="(2) Corpsmen — location by part"
          value={p.corpsmen}
          onChange={(v) => set({ corpsmen: v })}
          multiline
          placeholder="Part 1: 1 HM per platoon (lead, flank, rear); HM1 with Co HQ. Part 2: 1 HM per sector; HM1 at the CCP…"
        />
        <TextField
          label="(3) Reporting — who tells who what"
          value={p.reporting}
          onChange={(v) => set({ reporting: v })}
          multiline
          placeholder="Team leader → squad leader → Plt HQ → Co HQ using (# by wound type)/HERO; Co HQ sends the 9-line…"
        />
        <TextField
          label="(4) Handling — who does what"
          value={p.handling}
          onChange={(v) => set({ handling: v })}
          multiline
          placeholder="TCCC; nearest corpsman stabilizes; team leader directs movement to the CCP; two bearers minimum per litter…"
        />
        <TextField
          label="(5a) Priority of evacuation or mission — by part"
          value={p.evacByPart}
          onChange={(v) => set({ evacByPart: v })}
          multiline
          placeholder="Part 1 (movement): mission — casualties ride with the convoy to the objective. Parts 2–3: evacuate per precedence…"
        />
        <TextField
          label="(6) MASCAL"
          value={p.mascal}
          onChange={(v) => set({ mascal: v })}
          multiline
          placeholder="COC declares MASCAL; non-essential work stops; all corpsmen to the CCP; HM1 triages; request support from higher…"
        />
        <TextField
          label="(7) Enemy casualties"
          value={p.enemyCas}
          onChange={(v) => set({ enemyCas: v })}
          multiline
          placeholder="Treat per the Geneva Conventions; segregate at a guarded EN CCP; report to Co HQ…"
        />
      </Block>
      <Block
        theme="slate"
        letter="i"
        name="SHEET TITLE BLOCK"
        desc="Unit, preparer, banner on every export"
      >
        <FieldRow>
          <TextField
            label="Unit"
            value={plan.unit}
            onChange={(v) => update((x) => ({ ...x, unit: v }))}
          />
          <TextField
            label="Prepared by"
            value={plan.preparedBy}
            onChange={(v) => update((x) => ({ ...x, preparedBy: v }))}
          />
        </FieldRow>
        <TextField
          label="Banner"
          value={plan.banner}
          onChange={(v) => update((x) => ({ ...x, banner: v }))}
          mono
          hint="Printed top and bottom of each sheet, e.g. UNCLASSIFIED // EXERCISE"
        />
      </Block>
      <div className="script-card">
        <div className="script-head">
          <span>¶4.a PREVIEW</span>
          <span className="chip-row">
            <button type="button" className="chip" onClick={() => copyText(text, '¶4.a COPIED')}>
              <ClipboardCopy size={11} /> COPY
            </button>
            <button
              type="button"
              className="chip chip-solid"
              onClick={() => {
                if (appendNote('osmeac-a', text))
                  notify('Added to ORDER ¶4 Admin & Logistics notes');
              }}
            >
              INSERT INTO ORDER ¶4
            </button>
          </span>
        </div>
        <pre className="script script-prose">{text}</pre>
      </div>
    </>
  );
};
