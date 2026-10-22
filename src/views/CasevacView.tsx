import { useEffect, useMemo, useRef, useState } from 'react';
import { FileDown, ImagePlus, Move, RotateCcw, Trash2 } from 'lucide-react';
import { Callout } from '../components/ui';
import { NumberField, Segmented } from '../components/form';
import { notify, safeSetItem, useLocalStorage } from '../lib/storage';
import { useMediaQuery } from '../lib/useMediaQuery';
import { ccpDecor, computeCcp } from '../casevac/ccp';
import { CcpLayer } from '../casevac/CcpLayer';
import { downloadCasevacPdf, downloadSheetPng, type Backgrounds } from '../casevac/exportSheet';
import { CcpForm, HlzForm, NineLineForm, ParaForm, RouteForm, type Update } from '../casevac/forms';
import { northReferenceForGrid, parseMgrs, type Vec } from '../casevac/geo';
import { computeHlz, fitView, hlzDecor, hlzFindings, hlzView, type ViewBox } from '../casevac/hlz';
import { HlzLayer } from '../casevac/HlzLayer';
import { readImageFile } from '../casevac/image';
import {
  bgKey,
  defaultCcp,
  defaultHlz,
  defaultRoute,
  loadBackground,
  loadPlan,
  savePlan,
  type Background,
  type CasevacPlan,
  type SheetId,
} from '../casevac/model';
import { UI_PALETTE } from '../casevac/palette';
import { fmtMin, routeTimeline } from '../casevac/route';
import { RouteMapLayer, RouteSchematic } from '../casevac/RouteLayer';
import { SketchCanvas, type DragEvt } from '../casevac/svg';

type Sub = 'hlz' | 'ccp' | 'route' | 'nine' | 'para';

const SHEET_TITLE: Record<SheetId, string> = {
  hlz: 'HLZ overhead sketch',
  ccp: 'CCP layout sketch',
  route: 'evacuation route',
};

/** Move one dragged sketch item to `pos` (world meters). */
function moveItem(p: CasevacPlan, sheet: SheetId, id: string, pos: Vec): CasevacPlan {
  const [kind, key] = id.split(':');
  if (sheet === 'hlz') {
    const h = p.hlz;
    if (kind === 'obs')
      return {
        ...p,
        hlz: { ...h, obstacles: h.obstacles.map((o) => (o.id === key ? { ...o, pos } : o)) },
      };
    if (kind === 'sec')
      return {
        ...p,
        hlz: { ...h, security: h.security.map((m) => (m.id === key ? { ...m, pos } : m)) },
      };
    if (kind === 'load') return { ...p, hlz: { ...h, loadPoint: pos } };
    if (kind === 'ccp') return { ...p, hlz: { ...h, ccpPos: pos } };
  }
  if (sheet === 'ccp') {
    const c = p.ccp;
    if (kind === 'area')
      return {
        ...p,
        ccp: { ...c, areas: c.areas.map((a) => (a.kind === key ? { ...a, pos } : a)) },
      };
    if (kind === 'sec')
      return {
        ...p,
        ccp: { ...c, security: c.security.map((m) => (m.id === key ? { ...m, pos } : m)) },
      };
  }
  if (sheet === 'route' && kind === 'node') {
    return {
      ...p,
      route: { ...p.route, nodes: p.route.nodes.map((n) => (n.id === key ? { ...n, pos } : n)) },
    };
  }
  return p;
}

function itemPos(p: CasevacPlan, sheet: SheetId, id: string): Vec | null {
  const [kind, key] = id.split(':');
  if (sheet === 'hlz') {
    if (kind === 'obs') return p.hlz.obstacles.find((o) => o.id === key)?.pos ?? null;
    if (kind === 'sec') return p.hlz.security.find((m) => m.id === key)?.pos ?? null;
    if (kind === 'load') return p.hlz.loadPoint;
    if (kind === 'ccp') return p.hlz.ccpPos;
  }
  if (sheet === 'ccp') {
    if (kind === 'area') return p.ccp.areas.find((a) => a.kind === key)?.pos ?? null;
    if (kind === 'sec') return p.ccp.security.find((m) => m.id === key)?.pos ?? null;
  }
  if (sheet === 'route' && kind === 'node')
    return p.route.nodes.find((n) => n.id === key)?.pos ?? null;
  return null;
}

export default function CasevacView() {
  const [plan, setPlan] = useState<CasevacPlan>(() => loadPlan());
  const [sub, setSub] = useLocalStorage<Sub>('casevac-sub', 'hlz');
  const [bg, setBg] = useState<Backgrounds>(() => ({
    hlz: loadBackground('hlz'),
    ccp: loadBackground('ccp'),
    route: loadBackground('route'),
  }));
  const [dragOn, setDragOn] = useState(true);
  const [bgAdjust, setBgAdjust] = useState(false);
  const [frozen, setFrozen] = useState<ViewBox | null>(null);
  const [busy, setBusy] = useState(false);
  const dragging = useRef(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const narrow = useMediaQuery('(max-width: 640px)');

  // Persist on every change except mid-drag (the drag's final 'end' update saves).
  useEffect(() => {
    if (!dragging.current) savePlan(plan);
  }, [plan]);

  const update: Update = (fn) => setPlan((prev) => fn(prev));

  const hlzNorth = useMemo(() => northReferenceForGrid(plan.hlz.grid), [plan.hlz.grid]);
  const ccpNorth = useMemo(() => northReferenceForGrid(plan.ccp.grid), [plan.ccp.grid]);
  const hlzGeom = useMemo(
    () => computeHlz(plan.hlz, hlzNorth, plan.ccp.grid),
    [plan.hlz, hlzNorth, plan.ccp.grid]
  );
  const ccpGeom = useMemo(
    () => computeCcp(plan.ccp, plan.hlz.grid, ccpNorth),
    [plan.ccp, plan.hlz.grid, ccpNorth]
  );
  const timeline = useMemo(() => routeTimeline(plan.route), [plan.route]);
  const findings = useMemo(() => hlzFindings(plan.hlz, hlzGeom), [plan.hlz, hlzGeom]);

  const baseView = (s: SheetId): ViewBox =>
    s === 'hlz'
      ? hlzView(plan.hlz, hlzGeom)
      : s === 'ccp'
        ? ccpGeom.view
        : fitView(
            plan.route.nodes.map((n) => n.pos),
            0.2,
            300
          );

  const sheet: SheetId | null = sub === 'hlz' || sub === 'ccp' || sub === 'route' ? sub : null;
  const view = sheet ? (frozen ?? baseView(sheet)) : null;
  const sheetBg = sheet ? bg[sheet] : null;

  const persistBg = (s: SheetId, value: Background | null) => {
    if (!value) {
      try {
        localStorage.removeItem(bgKey(s));
      } catch {
        /* storage unavailable */
      }
      return;
    }
    if (!safeSetItem(bgKey(s), JSON.stringify(value)))
      notify('Image kept for this session only — too large to save', 'error');
  };

  const setSheetBg = (s: SheetId, value: Background | null, persist = true) => {
    setBg((prev) => ({ ...prev, [s]: value }));
    if (persist) persistBg(s, value);
  };

  const onDrag = (e: DragEvt) => {
    if (!sheet) return;
    if (e.phase === 'start') {
      dragging.current = true;
      setFrozen(baseView(sheet));
      return;
    }
    if (e.id === '__bg') {
      if (sheetBg) setSheetBg(sheet, { ...sheetBg, offset: e.pos }, e.phase === 'end');
    } else {
      update((p) => moveItem(p, sheet, e.id, e.pos));
    }
    if (e.phase === 'end') {
      dragging.current = false;
      setFrozen(null);
    }
  };

  const getPos = (id: string) =>
    sheet ? (id === '__bg' ? (sheetBg?.offset ?? null) : itemPos(plan, sheet, id)) : null;

  const onPickImage = async (file: File | undefined) => {
    if (!file || !sheet || !view) return;
    try {
      const { dataUrl, aspect } = await readImageFile(file);
      setSheetBg(sheet, {
        dataUrl,
        aspect,
        widthM: Math.round(view.w),
        offset: { x: Math.round(view.minX + view.w / 2), y: Math.round(view.minY + view.h / 2) },
        opacity: 0.9,
      });
      notify('Image placed — set its ground width, then MOVE IMAGE to line it up');
    } catch (err) {
      console.error(err);
      notify('Could not read that image', 'error');
    }
  };

  const resetSheet = () => {
    if (
      !sheet ||
      !window.confirm(
        `Reset the ${SHEET_TITLE[sheet]} to the example layout? This can't be undone.`
      )
    )
      return;
    if (sheet === 'hlz') update((p) => ({ ...p, hlz: defaultHlz() }));
    if (sheet === 'ccp') update((p) => ({ ...p, ccp: defaultCcp() }));
    if (sheet === 'route') update((p) => ({ ...p, route: defaultRoute() }));
  };

  const run = async (job: () => Promise<void>, ok: string) => {
    setBusy(true);
    try {
      await job();
      notify(ok);
    } catch (err) {
      console.error(err);
      notify('Export failed — try again or open the app in Safari/Chrome directly', 'error');
    } finally {
      setBusy(false);
    }
  };

  const P = UI_PALETTE;

  const sketch = () => {
    if (!sheet || !view) return null;
    const hlzDecorNow = hlzDecor(plan.hlz, hlzGeom, view);
    const ccpDecorNow = ccpDecor(plan.ccp, ccpGeom, view, plan.hlz.name);
    const common = {
      view,
      P,
      background: sheetBg,
      bgAdjust,
      editable: dragOn && !bgAdjust,
      getPos,
      onDrag,
    };
    if (sheet === 'hlz') {
      return (
        <SketchCanvas
          {...common}
          gridRef={parseMgrs(plan.hlz.grid)}
          north={hlzNorth}
          northAt={hlzDecorNow.north}
          badges={hlzDecorNow.centers}
          ariaLabel={`HLZ overhead sketch for ${plan.hlz.name}`}
        >
          <HlzLayer
            hlz={plan.hlz}
            g={hlzGeom}
            view={view}
            P={P}
            editable={common.editable}
            windAt={hlzDecorNow.wind}
          />
        </SketchCanvas>
      );
    }
    if (sheet === 'ccp') {
      return (
        <SketchCanvas
          {...common}
          gridRef={sheetBg ? parseMgrs(plan.ccp.grid) : null}
          north={ccpNorth}
          northAt={ccpDecorNow.north}
          badges={ccpDecorNow.centers}
          notToScale={!sheetBg}
          ariaLabel={`CCP layout sketch for ${plan.ccp.name}`}
        >
          <CcpLayer
            ccp={plan.ccp}
            g={ccpGeom}
            view={view}
            P={P}
            editable={common.editable}
            hlzName={plan.hlz.name}
          />
        </SketchCanvas>
      );
    }
    if (plan.route.layout === 'schematic') {
      return <RouteSchematic route={plan.route} t={timeline} P={P} vertical={narrow} />;
    }
    return (
      <SketchCanvas
        {...common}
        notToScale={!sheetBg}
        showNorth={false}
        ariaLabel="Evacuation route on map"
      >
        <RouteMapLayer route={plan.route} view={view} P={P} editable={common.editable} />
      </SketchCanvas>
    );
  };

  const canDrag = sheet !== 'route' || plan.route.layout === 'map';

  return (
    <div className="casevac">
      <Segmented<Sub>
        label="CASEVAC sheets"
        value={sub}
        onChange={(v) => {
          setSub(v);
          setBgAdjust(false);
        }}
        options={[
          { value: 'hlz', label: 'HLZ' },
          { value: 'ccp', label: 'CCP' },
          { value: 'route', label: 'ROUTE' },
          { value: 'nine', label: '9-LINE' },
          { value: 'para', label: '¶4a' },
        ]}
      />

      {sheet && view ? (
        <div className="casevac-grid">
          <div className="casevac-sketch">
            <div className="sketch-toolbar">
              {canDrag && (
                <button
                  type="button"
                  className={`chip ${dragOn ? 'chip-on' : ''}`}
                  aria-pressed={dragOn}
                  onClick={() => setDragOn((d) => !d)}
                  title="Drag markers on the sketch"
                >
                  <Move size={12} /> DRAG
                </button>
              )}
              {canDrag && (
                <button
                  type="button"
                  className="chip"
                  onClick={() => fileRef.current?.click()}
                  title="Load a map screenshot or a photo of your terrain model"
                >
                  <ImagePlus size={12} /> IMAGE
                </button>
              )}
              <button type="button" className="chip" onClick={resetSheet}>
                <RotateCcw size={12} /> RESET
              </button>
              <button
                type="button"
                className="chip"
                disabled={busy}
                onClick={() => run(() => downloadSheetPng(plan, sheet, bg), 'Sketch saved as PNG')}
              >
                <FileDown size={12} /> PNG
              </button>
              <button
                type="button"
                className="chip chip-solid"
                disabled={busy}
                onClick={() =>
                  run(() => downloadCasevacPdf(plan, bg), 'CASEVAC packet saved as PDF')
                }
              >
                <FileDown size={12} /> {busy ? 'WORKING…' : 'PACKET PDF'}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => {
                  void onPickImage(e.target.files?.[0]);
                  e.target.value = '';
                }}
              />
            </div>

            {sheetBg && canDrag && (
              <div className="bg-panel">
                <NumberField
                  label="Image ground width"
                  unit="m"
                  value={sheetBg.widthM}
                  min={10}
                  step={10}
                  onChange={(v) => setSheetBg(sheet, { ...sheetBg, widthM: Math.max(10, v) })}
                />
                <label className="field">
                  <span className="field-label">Opacity</span>
                  <input
                    type="range"
                    min={0.15}
                    max={1}
                    step={0.05}
                    value={sheetBg.opacity}
                    onChange={(e) =>
                      setSheetBg(sheet, { ...sheetBg, opacity: Number(e.target.value) })
                    }
                  />
                </label>
                <div className="chip-row">
                  <button
                    type="button"
                    className={`chip ${bgAdjust ? 'chip-on' : ''}`}
                    aria-pressed={bgAdjust}
                    onClick={() => setBgAdjust((b) => !b)}
                  >
                    <Move size={12} /> MOVE IMAGE
                  </button>
                  <button
                    type="button"
                    className="chip"
                    onClick={() => {
                      setBgAdjust(false);
                      setSheetBg(sheet, null);
                    }}
                  >
                    <Trash2 size={12} /> REMOVE IMAGE
                  </button>
                </div>
              </div>
            )}

            <div
              className={`sketch-frame ${sheet === 'route' && plan.route.layout === 'schematic' ? 'sketch-frame-route' : ''}`}
            >
              {sketch()}
            </div>

            {sheet === 'hlz' && findings.length > 0 && (
              <ul className="findings" aria-label="HLZ checks">
                {findings.map((f) => (
                  <li key={f.text} className={`finding finding-${f.level}`}>
                    {f.text}
                  </li>
                ))}
              </ul>
            )}
            {sheet === 'route' && (
              <ul className="findings" aria-label="Route checks">
                <li
                  className={`finding finding-${timeline.urgentOk === null ? 'warn' : timeline.urgentOk ? 'ok' : 'bad'}`}
                >
                  {timeline.toSurgicalMin === null
                    ? 'Add a Role 2 or Role 3 node to check the 1-hour standard'
                    : `POI → surgical care ${fmtMin(timeline.toSurgicalMin)} — ${timeline.urgentOk ? 'meets' : 'misses'} the 1-hour Urgent / Urgent-Surgical standard`}
                </li>
              </ul>
            )}
            <div className="field-hint sketch-hint">
              {canDrag
                ? 'Drag markers to place them. Tap IMAGE to sketch over a map screenshot or a photo of your terrain model.'
                : 'Schematic: order of care, not geography. Switch to ON MAP / IMAGE to draw the route over imagery.'}
            </div>
          </div>

          <div className="casevac-forms">
            {sheet === 'hlz' && (
              <HlzForm plan={plan} update={update} g={hlzGeom} north={hlzNorth} />
            )}
            {sheet === 'ccp' && <CcpForm plan={plan} update={update} />}
            {sheet === 'route' && <RouteForm plan={plan} update={update} t={timeline} />}
          </div>
        </div>
      ) : sub === 'nine' ? (
        <NineLineForm plan={plan} update={update} />
      ) : (
        <ParaForm plan={plan} update={update} g={hlzGeom} t={timeline} />
      )}

      <Callout kind="note" title="Example data">
        Pre-filled with an example built on the course exercise's MLR Obj 1. Replace the grids,
        headings and names with yours. Saved in this browser only — use PACKET PDF to keep a copy.
      </Callout>
    </div>
  );
}
