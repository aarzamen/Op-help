import { useState } from 'react';
import { Copy, ImagePlus, Move, Plus, RotateCcw, Trash2, X } from 'lucide-react';
import { NumberField, Segmented, SelectField, TextField } from '../host';
import { eastWest, len, norm360, pad3, azimuth, type NorthReference, type Vec } from '../geo';
import type { HlzGeom } from '../hlz';
import {
  LEG_MODES,
  LP_SIZES,
  NODE_KINDS,
  OBSTACLE_KINDS,
  type Background,
  type CasevacPlan,
  type LegMode,
  type LpSize,
  type NodeKind,
  type ObstacleKind,
  type SheetId,
} from '../model';
import type { SetOptions } from './useHistory';
import {
  addOptions,
  gridToPos,
  itemGrid,
  moveItem,
  sheetGrid,
  type ItemCtx,
  type SketchItem,
} from './items';

type SetPlan = (fn: (p: CasevacPlan) => CasevacPlan, opts?: SetOptions) => void;

interface GridProps {
  refGrid: string;
  pos: Vec;
  onMove: (p: Vec) => void;
}

/** Exact placement: shows the item's 10-digit grid; typing a grid moves it there. */
const GridField = (props: GridProps) => {
  const current = itemGrid(props.refGrid, props.pos) ?? '';
  // Remount when the item moves so the draft always starts from its real grid.
  return <GridInput key={current} current={current} {...props} />;
};

const GridInput = ({ refGrid, pos, onMove, current }: GridProps & { current: string }) => {
  const [draft, setDraft] = useState(current);
  const [bad, setBad] = useState(false);
  const commit = () => {
    if (draft.trim() === current) return;
    const p = gridToPos(refGrid, draft);
    if (p) onMove(p);
    else setBad(true);
  };
  return (
    <label className="field">
      <span className="field-label">Grid (MGRS)</span>
      <input
        className={`field-input mono ${bad ? 'field-bad' : ''}`}
        value={draft}
        inputMode="text"
        autoCapitalize="characters"
        autoComplete="off"
        spellCheck={false}
        onChange={(e) => {
          setDraft(e.target.value);
          setBad(false);
        }}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
        }}
      />
      <span className="field-hint">
        {bad
          ? "That grid doesn't parse or is more than 20 km away."
          : `${Math.round(len(pos))} m @ ${pad3(norm360(azimuth({ x: 0, y: 0 }, pos)))}° grid from the sheet origin. Type a grid to place it exactly.`}
      </span>
    </label>
  );
};

export interface InspectorProps {
  plan: CasevacPlan;
  sheet: SheetId;
  item: SketchItem | null;
  pending: Vec | null;
  ctx: ItemCtx;
  hlzGeom: HlzGeom;
  hlzNorth: NorthReference | null;
  set: SetPlan;
  bg: Background | null;
  setBg: (b: Background | null) => void;
  bgMode: boolean;
  setBgMode: (on: boolean) => void;
  snap: boolean;
  setSnap: (on: boolean) => void;
  onPickImage: () => void;
  onAdd: (key: string) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onDeselect: () => void;
  onResetSheet: () => void;
}

export function Inspector(p: InspectorProps) {
  const { plan, sheet, item, set } = p;
  const refGrid = sheetGrid(plan, sheet, !!p.bg);
  const move = (pos: Vec) => item && set((pl) => moveItem(pl, sheet, item.id, pos, p.ctx));
  const key = (field: string) => ({ coalesce: `${item?.id ?? sheet}:${field}` });

  if (p.pending) {
    const opts = addOptions(plan, sheet, p.ctx);
    const groups = [...new Set(opts.map((o) => o.group))];
    return (
      <div className="ws-inspector">
        <div className="ws-insp-head">
          <span className="ws-insp-kicker">ADD HERE</span>
          <span className="ws-insp-title">
            {refGrid ? (itemGrid(refGrid, p.pending) ?? 'New item') : 'New item'}
          </span>
          <button type="button" className="icon-btn" aria-label="Cancel" onClick={p.onDeselect}>
            <X size={16} />
          </button>
        </div>
        {groups.map((g) => (
          <div key={g} className="ws-add-group">
            <div className="field-label">{g}</div>
            <div className="ws-add-list">
              {opts
                .filter((o) => o.group === g)
                .map((o) => (
                  <button
                    key={o.key}
                    type="button"
                    className="ws-add"
                    onClick={() => p.onAdd(o.key)}
                  >
                    <Plus size={14} aria-hidden="true" /> {o.label}
                  </button>
                ))}
            </div>
          </div>
        ))}
        {opts.length === 0 && <div className="field-hint">Nothing left to add on this sheet.</div>}
      </div>
    );
  }

  if (!item) return <SheetPanel {...p} />;

  const h = plan.hlz;
  const [kind, k] = item.id.includes(':') ? item.id.split(/:(.*)/s) : [item.id, ''];

  return (
    <div className="ws-inspector">
      <div className="ws-insp-head">
        <span className="ws-insp-kicker">{kindTitle(item)}</span>
        <span className="ws-insp-title">{item.title}</span>
        <button type="button" className="icon-btn" aria-label="Deselect" onClick={p.onDeselect}>
          <X size={16} />
        </button>
      </div>
      <div className="ws-insp-actions">
        {item.canDuplicate && (
          <button type="button" className="chip" onClick={p.onDuplicate}>
            <Copy size={12} /> DUPLICATE
          </button>
        )}
        {item.canDelete && (
          <button type="button" className="chip chip-danger" onClick={p.onDelete}>
            <Trash2 size={12} /> {item.kind === 'area' ? 'HIDE' : 'DELETE'}
          </button>
        )}
      </div>

      {sheet === 'hlz' &&
        kind === 'obs' &&
        (() => {
          const o = h.obstacles.find((x) => x.id === k);
          if (!o) return null;
          const c = p.hlzGeom.checks.find((x) => x.id === o.id);
          const setO = (patch: Partial<typeof o>, field: string) =>
            set(
              (pl) => ({
                ...pl,
                hlz: {
                  ...pl.hlz,
                  obstacles: pl.hlz.obstacles.map((x) => (x.id === o.id ? { ...x, ...patch } : x)),
                },
              }),
              key(field)
            );
          return (
            <>
              <SelectField<ObstacleKind>
                label="Type"
                value={o.kind}
                onChange={(v) => setO({ kind: v }, 'kind')}
                options={OBSTACLE_KINDS.map((x) => ({ value: x.kind, label: x.label }))}
              />
              <NumberField
                label="Height"
                unit="m"
                value={o.heightM}
                min={0}
                onChange={(v) => setO({ heightM: Math.max(0, v) }, 'h')}
              />
              <TextField label="Note" value={o.note} onChange={(v) => setO({ note: v }, 'note')} />
              {c && c.ok !== null && (
                <div className={`finding finding-${c.ok ? 'ok' : 'bad'}`}>
                  {c.ok ? '10:1 ✓' : '10:1 ✗'} on {c.path}: {Math.round(c.along)} m from the nearest
                  LP, needs {c.required} m
                </div>
              )}
              {refGrid && <GridField refGrid={refGrid} pos={o.pos} onMove={move} />}
            </>
          );
        })()}

      {kind === 'sec' &&
        (() => {
          const list = sheet === 'hlz' ? h.security : plan.ccp.security;
          const m = list.find((x) => x.id === k);
          if (!m) return null;
          const setLabel = (v: string) =>
            set((pl) => {
              const next = (sheet === 'hlz' ? pl.hlz.security : pl.ccp.security).map((x) =>
                x.id === m.id ? { ...x, label: v } : x
              );
              return sheet === 'hlz'
                ? { ...pl, hlz: { ...pl.hlz, security: next } }
                : { ...pl, ccp: { ...pl.ccp, security: next } };
            }, key('label'));
          return (
            <>
              <TextField
                label="Label on the sketch"
                value={m.label}
                placeholder="SEC, 1st Sqd, M240…"
                onChange={setLabel}
              />
              {refGrid && <GridField refGrid={refGrid} pos={m.pos} onMove={move} />}
            </>
          );
        })()}

      {(kind === 'load' || kind === 'ccp') && refGrid && (
        <GridField refGrid={refGrid} pos={item.pos} onMove={move} />
      )}
      {kind === 'ccp' && (
        <div className="field-hint">
          Shown here because the CCP sheet has no grid in this zone. Enter the CCP grid on the CCP
          sheet and it is placed by grid instead.
        </div>
      )}

      {(kind === 'appr' || kind === 'dep' || kind === 'zone') && (
        <>
          {kind === 'zone' && (
            <>
              <TextField
                label="HLZ name"
                value={h.name}
                onChange={(v) => set((pl) => ({ ...pl, hlz: { ...pl.hlz, name: v } }), key('name'))}
              />
              <SelectField<LpSize>
                label="Landing point size"
                value={h.lpSize}
                onChange={(v) => set((pl) => ({ ...pl, hlz: { ...pl.hlz, lpSize: v } }))}
                options={LP_SIZES.map((s) => ({
                  value: s.size as LpSize,
                  label: `Size ${s.size} — ${s.m} m · ${s.examples}`,
                }))}
              />
              <div className="field-row">
                <NumberField
                  label="Landing points"
                  value={h.lpCount}
                  min={1}
                  onChange={(v) =>
                    set(
                      (pl) => ({ ...pl, hlz: { ...pl.hlz, lpCount: Math.max(1, Math.min(8, v)) } }),
                      key('n')
                    )
                  }
                />
                <NumberField
                  label="Spacing"
                  unit="m"
                  value={h.lpSpacing}
                  min={0}
                  step={5}
                  onChange={(v) =>
                    set(
                      (pl) => ({ ...pl, hlz: { ...pl.hlz, lpSpacing: Math.max(0, v) } }),
                      key('sp')
                    )
                  }
                />
              </div>
              <Segmented<'trail' | 'abreast'>
                label="Formation"
                value={h.formation}
                onChange={(v) => set((pl) => ({ ...pl, hlz: { ...pl.hlz, formation: v } }))}
                options={[
                  { value: 'trail', label: 'TRAIL' },
                  { value: 'abreast', label: 'ABREAST' },
                ]}
              />
            </>
          )}
          <div className="field-row">
            <NumberField
              label="Approach"
              unit="°M"
              value={h.approachMag}
              step={5}
              onChange={(v) =>
                set((pl) => ({ ...pl, hlz: { ...pl.hlz, approachMag: norm360(v) } }), key('appr'))
              }
            />
            <NumberField
              label="Departure"
              unit="°M"
              value={h.departureMag}
              step={5}
              onChange={(v) =>
                set((pl) => ({ ...pl, hlz: { ...pl.hlz, departureMag: norm360(v) } }), key('dep'))
              }
            />
          </div>
          <div className="field-row">
            <NumberField
              label="Wind from"
              unit="°M"
              value={h.windFromMag}
              step={10}
              onChange={(v) =>
                set((pl) => ({ ...pl, hlz: { ...pl.hlz, windFromMag: norm360(v) } }), key('wind'))
              }
            />
            <NumberField
              label="Wind"
              unit="kt"
              value={h.windKts}
              min={0}
              onChange={(v) =>
                set((pl) => ({ ...pl, hlz: { ...pl.hlz, windKts: Math.max(0, v) } }), key('kts'))
              }
            />
          </div>
          <div className="field-hint">
            Land into the wind. Drag the round handle at the end of either arrow to turn it.
            {p.hlzNorth && ` G-M ${eastWest(p.hlzNorth.gm)}.`}
          </div>
        </>
      )}

      {kind === 'area' &&
        (() => {
          const a = plan.ccp.areas.find((x) => x.kind === k);
          if (!a) return null;
          const setA = (patch: Partial<typeof a>, field: string) =>
            set(
              (pl) => ({
                ...pl,
                ccp: {
                  ...pl.ccp,
                  areas: pl.ccp.areas.map((x) => (x.kind === a.kind ? { ...x, ...patch } : x)),
                },
              }),
              key(field)
            );
          return (
            <div className="field-row">
              <NumberField
                label="Width"
                unit="m"
                value={a.w}
                min={4}
                onChange={(v) => setA({ w: Math.max(4, v) }, 'w')}
              />
              <NumberField
                label="Depth"
                unit="m"
                value={a.h}
                min={4}
                onChange={(v) => setA({ h: Math.max(4, v) }, 'h')}
              />
            </div>
          );
        })()}

      {kind === 'node' &&
        (() => {
          const r = plan.route;
          const i = r.nodes.findIndex((n) => n.id === k);
          if (i < 0) return null;
          const n = r.nodes[i];
          const leg = r.legs[i];
          const setN = (patch: Partial<typeof n>, field: string) =>
            set(
              (pl) => ({
                ...pl,
                route: {
                  ...pl.route,
                  nodes: pl.route.nodes.map((x) => (x.id === n.id ? { ...x, ...patch } : x)),
                },
              }),
              key(field)
            );
          const setLeg = (patch: Partial<NonNullable<typeof leg>>, field: string) =>
            set(
              (pl) => ({
                ...pl,
                route: {
                  ...pl.route,
                  legs: pl.route.legs.map((x, j) => (j === i ? { ...x, ...patch } : x)),
                },
              }),
              key(field)
            );
          return (
            <>
              <TextField label="Name" value={n.name} onChange={(v) => setN({ name: v }, 'name')} />
              <SelectField<NodeKind>
                label="Type"
                value={n.kind}
                onChange={(v) => setN({ kind: v }, 'kind')}
                options={NODE_KINDS.map((x) => ({ value: x.kind, label: x.label }))}
              />
              <TextField
                label="Grid"
                mono
                value={n.grid}
                onChange={(v) => setN({ grid: v }, 'grid')}
              />
              <TextField label="Note" value={n.note} onChange={(v) => setN({ note: v }, 'note')} />
              {leg && (
                <>
                  <div className="ws-sub">
                    LEG TO {(r.nodes[i + 1]?.name || 'NEXT').toUpperCase()}
                  </div>
                  <SelectField<LegMode>
                    label="By"
                    value={leg.mode}
                    onChange={(v) => setLeg({ mode: v }, 'mode')}
                    options={LEG_MODES.map((m) => ({ value: m.mode, label: m.label }))}
                  />
                  <div className="field-row">
                    <NumberField
                      label="Distance"
                      unit="km"
                      value={leg.distKm}
                      min={0}
                      step={0.1}
                      onChange={(v) => setLeg({ distKm: Math.max(0, v) }, 'km')}
                    />
                    <NumberField
                      label="Time"
                      unit="min"
                      value={leg.timeMin}
                      min={0}
                      onChange={(v) => setLeg({ timeMin: Math.max(0, v) }, 'min')}
                    />
                  </div>
                </>
              )}
            </>
          );
        })()}
    </div>
  );
}

const kindTitle = (item: SketchItem) =>
  ({
    obstacle: 'OBSTACLE',
    security: 'SECURITY POSITION',
    load: 'CASUALTY LOADING POINT',
    ccp: 'CCP',
    approach: 'APPROACH · DEPARTURE · WIND',
    departure: 'APPROACH · DEPARTURE · WIND',
    zone: 'LANDING ZONE',
    area: 'CCP AREA',
    node: 'EVACUATION STOP',
  })[item.kind];

const SHEET_HELP: Record<SheetId, string> = {
  hlz: 'Tap an obstacle, security position, the zone or an arrow handle to edit it. Tap empty ground to add something there.',
  ccp: 'Tap an area or security position to edit it. Tap empty ground to add security or bring back a hidden area. The CCP sheet is a layout, not to scale.',
  route:
    'Tap a stop to rename it and set the leg after it. Tap empty ground to add a stop. Load a map screenshot to lay the chain over real ground.',
};

/** Nothing selected: the sheet's own tools. */
function SheetPanel(p: InspectorProps) {
  const { sheet, bg } = p;
  return (
    <div className="ws-inspector">
      <div className="ws-insp-head">
        <span className="ws-insp-kicker">
          {{ hlz: 'HLZ SKETCH', ccp: 'CCP LAYOUT', route: 'ROUTE ON MAP' }[sheet]}
        </span>
        <span className="ws-insp-title">Nothing selected</span>
      </div>
      <p className="ws-help">{SHEET_HELP[sheet]}</p>
      <div className="ws-insp-actions">
        <button
          type="button"
          className={`chip ${p.snap ? 'chip-on' : ''}`}
          aria-pressed={p.snap}
          onClick={() => p.setSnap(!p.snap)}
        >
          SNAP 5 m
        </button>
        <button type="button" className="chip" onClick={p.onPickImage}>
          <ImagePlus size={12} /> {bg ? 'REPLACE IMAGE' : 'MAP / PHOTO'}
        </button>
        <button type="button" className="chip" onClick={p.onResetSheet}>
          <RotateCcw size={12} /> RESET SHEET
        </button>
      </div>
      {bg && (
        <div className="ws-bg">
          <div className="ws-sub">BACKGROUND IMAGE</div>
          <div className="field-row">
            <NumberField
              label="Ground width"
              unit="m"
              value={bg.widthM}
              min={10}
              step={10}
              onChange={(v) => p.setBg({ ...bg, widthM: Math.max(10, v) })}
            />
            <label className="field">
              <span className="field-label">Opacity</span>
              <input
                type="range"
                min={0.15}
                max={1}
                step={0.05}
                value={bg.opacity}
                onChange={(e) => p.setBg({ ...bg, opacity: Number(e.target.value) })}
              />
            </label>
          </div>
          <div className="ws-insp-actions">
            <button
              type="button"
              className={`chip ${p.bgMode ? 'chip-on' : ''}`}
              aria-pressed={p.bgMode}
              onClick={() => p.setBgMode(!p.bgMode)}
            >
              <Move size={12} /> {p.bgMode ? 'DONE MOVING' : 'MOVE IMAGE'}
            </button>
            <button type="button" className="chip chip-danger" onClick={() => p.setBg(null)}>
              <Trash2 size={12} /> REMOVE
            </button>
          </div>
          <div className="field-hint">
            Set the ground width the image covers (measure it on the map), then MOVE IMAGE and drag
            it so known points line up with the grid.
          </div>
        </div>
      )}
    </div>
  );
}
