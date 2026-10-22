import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, Maximize2, Minus, Plus, Redo2, Undo2 } from 'lucide-react';
import { Segmented, useMediaQuery } from '../host';
import { ccpDecor, computeCcp } from '../ccp';
import { CcpLayer } from '../CcpLayer';
import { northReferenceForGrid, parseMgrs, type Vec } from '../geo';
import { computeHlz, fitView, hlzDecor, hlzView, type ViewBox } from '../hlz';
import { HlzLayer } from '../HlzLayer';
import type { Background, CasevacPlan, SheetId } from '../model';
import { UI_PALETTE as P } from '../palette';
import { RouteMapLayer } from '../RouteLayer';
import { SketchCanvas } from '../svg';
import type { Backgrounds } from '../handoff';
import {
  cameraBox,
  clampCamera,
  fitCamera,
  limitZoom,
  worldToScreen,
  zoomAt,
  type Camera,
  type Size,
} from './camera';
import { Inspector } from './Inspector';
import { addItem, deleteItem, duplicateItem, findItem, moveItem, type ItemCtx } from './items';
import { useGestures } from './useGestures';
import type { SetOptions } from './useHistory';

type Panel = 'peek' | 'half' | 'full';
/** An ADD HERE point; `after` is the route stop a new stop is inserted after. */
type Pending = { pos: Vec; after: string | null };
const PANELS: Panel[] = ['peek', 'half', 'full'];

export interface WorkspaceProps {
  plan: CasevacPlan;
  set: (fn: (p: CasevacPlan) => CasevacPlan, opts?: SetOptions) => void;
  checkpoint: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  sheet: SheetId;
  setSheet: (s: SheetId) => void;
  bg: Backgrounds;
  setSheetBg: (s: SheetId, b: Background | null, persist?: boolean) => void;
  onPickImage: (s: SheetId) => void;
  onResetSheet: (s: SheetId) => void;
  onClose: () => void;
}

const SHEETS: { value: SheetId; label: string }[] = [
  { value: 'hlz', label: 'HLZ' },
  { value: 'ccp', label: 'CCP' },
  { value: 'route', label: 'ROUTE' },
];

/** Inputs, selects and textareas keep their own keys. */
const typing = (e: KeyboardEvent) => {
  const t = e.target as HTMLElement | null;
  return !!t && (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable);
};

/**
 * The CASEVAC sketch workspace: a full-viewport environment with its own pan/zoom canvas,
 * selection, an inspector (bottom sheet on phones, side panel on wide screens) and undo.
 * The page underneath is scroll-locked while it is open. See docs/SPEC-casevac-workspace.md.
 */
export default function Workspace(props: WorkspaceProps) {
  const { plan, set, sheet } = props;
  const narrow = useMediaQuery('(max-width: 899px)');
  const canvasRef = useRef<HTMLDivElement>(null);
  const doneRef = useRef<HTMLButtonElement>(null);
  const [size, setSize] = useState<Size>({ w: 0, h: 0 });
  // `touched`: the user panned or zoomed, so edits and resizes no longer re-fit the view.
  const [camState, setCamState] = useState<{
    sheet: SheetId;
    cam: Camera;
    touched: boolean;
  } | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const [panel, setPanel] = useState<Panel>('peek');
  const [snap, setSnap] = useState(false);
  const [bgMode, setBgMode] = useState(false);
  const [frozen, setFrozen] = useState<ViewBox | null>(null);
  const dragging = useRef(false);

  // ----- geometry (same functions the tab and the exports use) -----
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
  const liveView: ViewBox =
    sheet === 'hlz'
      ? hlzView(plan.hlz, hlzGeom)
      : sheet === 'ccp'
        ? ccpGeom.view
        : fitView(
            plan.route.nodes.map((n) => n.pos),
            0.2,
            300
          );
  const view = frozen ?? liveView;
  const ctx: ItemCtx = { u: view.w / 100, hlzGeom, hlzNorth };
  const sheetBg = props.bg[sheet];
  // Image-move mode only means something while the sheet has an image.
  const moving = bgMode && !!sheetBg;

  // ----- camera -----
  const ready = size.w > 0 && size.h > 0;
  // On phones the bottom sheet's peek covers the canvas bottom: fit above it.
  // Phones: keep the fitted sketch clear of the north card (top) and the peeking panel
  // (bottom). The phone fit is width-limited, so the top band costs no scale there.
  const insetTop = narrow ? 96 : 0;
  const insetBottom = narrow ? 118 : 0;
  const fitted = (): Camera => {
    const c = fitCamera(view, { w: size.w, h: Math.max(1, size.h - insetTop - insetBottom) });
    return { ...c, cy: c.cy - ((insetBottom - insetTop) / 2) * c.mpp };
  };
  const cam: Camera =
    camState && camState.sheet === sheet
      ? camState.cam
      : ready
        ? fitted()
        : { cx: 0, cy: 0, mpp: 1 };
  const setCam = (c: Camera) =>
    setCamState({ sheet, cam: clampCamera(c, view, size), touched: true });
  const fit = () => setCamState({ sheet, cam: fitted(), touched: false });
  const zoomBy = (f: number) =>
    setCam(zoomAt(cam, size, limitZoom(cam, view, size, f), size.w / 2, size.h / 2));

  // Pin the fitted view once per sheet (and on resize until the user pans or zooms), so an
  // edit that grows the sketch's bounds doesn't rescale everything under the pointer.
  // (State adjusted during render, React's pattern for reacting to a changed input.)
  const fitKey = ready ? `${sheet}:${size.w}x${size.h}` : null;
  const [fittedFor, setFittedFor] = useState<string | null>(null);
  if (fitKey && fittedFor !== fitKey) {
    setFittedFor(fitKey);
    if (!(camState && camState.sheet === sheet && camState.touched))
      setCamState({ sheet, cam: fitted(), touched: false });
  }

  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) =>
      setSize({ w: e.contentRect.width, h: e.contentRect.height })
    );
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // ----- page scroll lock (iOS-safe: pin the body, restore the offset on close) -----
  useEffect(() => {
    const y = window.scrollY;
    const b = document.body.style;
    const prev = { position: b.position, top: b.top, width: b.width, overflow: b.overflow };
    Object.assign(b, { position: 'fixed', top: `-${y}px`, width: '100%', overflow: 'hidden' });
    document.documentElement.classList.add('ws-open');
    doneRef.current?.focus();
    return () => {
      Object.assign(b, prev);
      document.documentElement.classList.remove('ws-open');
      window.scrollTo(0, y);
    };
  }, []);

  // ----- selection helpers -----
  const item = findItem(plan, sheet, selected, ctx);
  const select = (id: string | null) => {
    setSelected(id);
    setPending(null);
    if (narrow) setPanel(id ? 'half' : 'peek');
    // Keep the selection visible above the bottom sheet on phones.
    const it = id ? findItem(plan, sheet, id, ctx) : null;
    if (narrow && it && ready) {
      const sp = worldToScreen(cam, size, it.pos);
      const clear = size.h * 0.45;
      if (sp.y > clear) setCam({ ...cam, cy: cam.cy - (sp.y - clear * 0.6) * cam.mpp });
    }
  };
  const snapPos = (p: Vec): Vec =>
    snap
      ? { x: Math.round(p.x / 5) * 5, y: Math.round(p.y / 5) * 5 }
      : { x: Math.round(p.x), y: Math.round(p.y) };

  const doDelete = () => {
    if (!item?.canDelete) return;
    set((pl) => deleteItem(pl, sheet, item.id));
    select(null);
  };
  const doDuplicate = () => {
    if (!item?.canDuplicate) return;
    const r = duplicateItem(plan, sheet, item.id);
    if (!r.id) return;
    set(() => r.plan);
    setSelected(r.id);
  };
  const doAdd = (key: string) => {
    if (!pending) return;
    const r = addItem(plan, sheet, key, pending.pos, pending.after);
    set(() => r.plan);
    setPending(null);
    setSelected(r.id);
  };

  // ----- gestures -----
  useGestures({
    el: canvasRef,
    cam,
    setCam,
    size,
    view,
    handlers: {
      hitTest: (t) =>
        moving ? '__bg' : (t?.closest('[data-item]')?.getAttribute('data-item') ?? null),
      canDrag: (id) => (id === '__bg' ? !!sheetBg : !!findItem(plan, sheet, id, ctx)?.canDrag),
      itemPos: (id) =>
        id === '__bg' ? (sheetBg?.offset ?? null) : (findItem(plan, sheet, id, ctx)?.pos ?? null),
      onTap: (id, w) => {
        if (moving) return;
        if (id) return select(id);
        // With a route stop selected, tapping the map adds the next stop after it.
        const after = sheet === 'route' && selected?.startsWith('node:') ? selected : null;
        if (pending || (selected && !after)) return select(null);
        setSelected(null);
        setPending({ pos: snapPos(w), after });
        if (narrow) setPanel('half');
      },
      onDragStart: (id) => {
        dragging.current = true;
        if (id !== '__bg') {
          props.checkpoint();
          setSelected(id);
          setPending(null);
        }
        setFrozen(view);
      },
      onDragMove: (id, pos) => {
        if (id === '__bg') {
          if (sheetBg) props.setSheetBg(sheet, { ...sheetBg, offset: pos }, false);
        } else set((pl) => moveItem(pl, sheet, id, pos, ctx), { transient: true });
      },
      onDragEnd: (id, pos) => {
        dragging.current = false;
        if (id === '__bg' && sheetBg) props.setSheetBg(sheet, { ...sheetBg, offset: pos }, true);
        setFrozen(null);
      },
      snap: snapPos,
    },
  });

  // ----- keyboard -----
  const live = useRef({ item, pending, selected, doDelete, zoomBy, fit, props, set, sheet, ctx });
  useEffect(() => {
    live.current = { item, pending, selected, doDelete, zoomBy, fit, props, set, sheet, ctx };
  });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const L = live.current;
      const mod = e.metaKey || e.ctrlKey;
      if (e.key === 'Escape') {
        e.preventDefault();
        if (L.pending || L.selected) {
          setPending(null);
          setSelected(null);
        } else L.props.onClose();
        return;
      }
      // Undo / redo wait until a drag is finished, or the history would fork mid-move.
      if (mod && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (dragging.current) return;
        if (e.shiftKey) L.props.redo();
        else L.props.undo();
        return;
      }
      if (mod && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        if (!dragging.current) L.props.redo();
        return;
      }
      if (typing(e) || mod) return;
      if ((e.key === 'Delete' || e.key === 'Backspace') && L.item?.canDelete) {
        e.preventDefault();
        L.doDelete();
      } else if (e.key.startsWith('Arrow') && L.item?.canDrag) {
        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;
        const d = {
          ArrowUp: [0, step],
          ArrowDown: [0, -step],
          ArrowLeft: [-step, 0],
          ArrowRight: [step, 0],
        }[e.key];
        if (!d) return;
        const it = L.item;
        L.set(
          (pl) => moveItem(pl, L.sheet, it.id, { x: it.pos.x + d[0], y: it.pos.y + d[1] }, L.ctx),
          {
            coalesce: `nudge:${it.id}`,
          }
        );
      } else if (e.key === '+' || e.key === '=') L.zoomBy(1.4);
      else if (e.key === '-' || e.key === '_') L.zoomBy(1 / 1.4);
      else if (e.key === '0') L.fit();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // ----- bottom-sheet handle (phones) -----
  const handleStart = useRef<number | null>(null);
  const stepPanel = (d: 1 | -1) =>
    setPanel((cur) => PANELS[Math.min(2, Math.max(0, PANELS.indexOf(cur) + d))]);

  const camBox = ready ? cameraBox(cam, size) : view;
  const hlzDecorNow = sheet === 'hlz' ? hlzDecor(plan.hlz, hlzGeom, view) : null;
  const ccpDecorNow = sheet === 'ccp' ? ccpDecor(plan.ccp, ccpGeom, view, plan.hlz.name) : null;
  const selection = item ? { pos: item.pos, r: item.r } : null;
  const gridRef =
    sheet === 'hlz'
      ? parseMgrs(plan.hlz.grid)
      : sheet === 'ccp' && sheetBg
        ? parseMgrs(plan.ccp.grid)
        : null;

  return (
    <div
      className={`ws ${narrow ? 'ws-narrow' : 'ws-wide'} ws-panel-${panel}`}
      role="dialog"
      aria-modal="true"
      aria-label="CASEVAC sketch workspace"
    >
      <header className="ws-bar">
        <button ref={doneRef} type="button" className="ws-done" onClick={props.onClose}>
          <Check size={16} aria-hidden="true" /> DONE
        </button>
        <Segmented<SheetId>
          label="Sketch"
          value={sheet}
          onChange={(s) => {
            setSelected(null);
            setPending(null);
            setBgMode(false);
            setPanel('peek');
            props.setSheet(s);
          }}
          options={SHEETS}
        />
        <div className="ws-bar-actions">
          <button
            type="button"
            className="icon-btn"
            aria-label="Undo"
            title="Undo (Ctrl/⌘ Z)"
            disabled={!props.canUndo}
            onClick={props.undo}
          >
            <Undo2 size={18} />
          </button>
          <button
            type="button"
            className="icon-btn"
            aria-label="Redo"
            title="Redo (Shift Ctrl/⌘ Z)"
            disabled={!props.canRedo}
            onClick={props.redo}
          >
            <Redo2 size={18} />
          </button>
        </div>
      </header>

      <div className="ws-body">
        <div
          ref={canvasRef}
          className={`ws-canvas ${moving ? 'ws-canvas-bg' : ''}`}
          aria-label="Sketch canvas: pinch or scroll to zoom, drag empty ground to pan, tap to select"
        >
          {ready && (
            <SketchCanvas
              view={view}
              camera={camBox}
              P={P}
              gridRef={gridRef}
              north={sheet === 'hlz' ? hlzNorth : ccpNorth}
              background={sheetBg}
              notToScale={sheet !== 'hlz' && !sheetBg}
              showNorth={sheet !== 'route'}
              ariaLabel={`${sheet.toUpperCase()} sketch`}
              selection={selection}
              marker={pending?.pos ?? null}
              decoUnit={cam.mpp * 6}
              className="sketch-interactive"
            >
              {sheet === 'hlz' && hlzDecorNow && (
                <HlzLayer
                  hlz={plan.hlz}
                  g={hlzGeom}
                  view={view}
                  P={P}
                  interactive
                  windAt={hlzDecorNow.wind}
                />
              )}
              {sheet === 'ccp' && ccpDecorNow && (
                <CcpLayer
                  ccp={plan.ccp}
                  g={ccpGeom}
                  view={view}
                  P={P}
                  interactive
                  hlzName={plan.hlz.name}
                />
              )}
              {sheet === 'route' && (
                <RouteMapLayer route={plan.route} view={view} P={P} interactive />
              )}
            </SketchCanvas>
          )}
          <div className="ws-zoom" role="group" aria-label="Zoom" data-overlay>
            <button
              type="button"
              className="icon-btn"
              aria-label="Zoom in"
              onClick={() => zoomBy(1.4)}
            >
              <Plus size={18} />
            </button>
            <button
              type="button"
              className="icon-btn"
              aria-label="Zoom out"
              onClick={() => zoomBy(1 / 1.4)}
            >
              <Minus size={18} />
            </button>
            <button type="button" className="icon-btn" aria-label="Fit sketch" onClick={fit}>
              <Maximize2 size={16} />
            </button>
          </div>
          {sheet === 'route' && plan.route.layout === 'schematic' && (
            <div className="ws-banner" data-overlay>
              The export uses the schematic.{' '}
              <button
                type="button"
                className="chip chip-solid"
                onClick={() => set((pl) => ({ ...pl, route: { ...pl.route, layout: 'map' } }))}
              >
                EXPORT THIS MAP INSTEAD
              </button>
            </div>
          )}
          {moving && (
            <div className="ws-banner" data-overlay>
              Drag anywhere to move the image.
            </div>
          )}
        </div>

        <aside className="ws-panel" aria-label="Inspector">
          {narrow && (
            <button
              type="button"
              className="ws-handle"
              aria-label={`Panel ${panel}. Tap to resize.`}
              onPointerDown={(e) => (handleStart.current = e.clientY)}
              onPointerUp={(e) => {
                const dy = handleStart.current === null ? 0 : e.clientY - handleStart.current;
                handleStart.current = null;
                if (dy < -30) stepPanel(1);
                else if (dy > 30) stepPanel(-1);
                else setPanel((c) => (c === 'peek' ? 'half' : 'peek'));
              }}
            >
              <span />
            </button>
          )}
          <div className="ws-panel-scroll">
            <Inspector
              plan={plan}
              sheet={sheet}
              item={item}
              pending={pending}
              ctx={ctx}
              hlzGeom={hlzGeom}
              hlzNorth={hlzNorth}
              set={set}
              bg={sheetBg}
              setBg={(b) => {
                if (!b) setBgMode(false);
                props.setSheetBg(sheet, b);
              }}
              bgMode={moving}
              setBgMode={setBgMode}
              snap={snap}
              setSnap={setSnap}
              onPickImage={() => props.onPickImage(sheet)}
              onAdd={doAdd}
              onDelete={doDelete}
              onDuplicate={doDuplicate}
              onDeselect={() => select(null)}
              onResetSheet={() => {
                select(null);
                props.onResetSheet(sheet);
              }}
            />
          </div>
        </aside>
      </div>
    </div>
  );
}
