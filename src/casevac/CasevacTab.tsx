import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { FileDown, FileUp, Link2, PencilRuler, Save } from 'lucide-react';
import { Callout, notify, safeSetItem, Segmented, useLocalStorage, useMediaQuery } from './host';
import { ccpDecor, computeCcp } from './ccp';
import { CcpLayer } from './CcpLayer';
import { downloadCasevacPdf, downloadSheetPng } from './exportSheet';
import { CcpForm, HlzForm, NineLineForm, ParaForm, RouteForm, type Update } from './forms';
import { northReferenceForGrid, parseMgrs } from './geo';
import {
  clearIncoming,
  decodePayload,
  incomingPayload,
  planFile,
  planLink,
  readPlanFile,
  shareFile,
  shareLink,
  type Backgrounds,
} from './handoff';
import { computeHlz, fitView, hlzDecor, hlzFindings, hlzView, type ViewBox } from './hlz';
import { HlzLayer } from './HlzLayer';
import { readImageFile } from './image';
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
} from './model';
import { UI_PALETTE } from './palette';
import { fmtMin, routeTimeline } from './route';
import { RouteMapLayer, RouteSchematic } from './RouteLayer';
import { SketchCanvas } from './svg';
import { useHistory } from './workspace/useHistory';
import Workspace from './workspace/Workspace';

type Sub = 'hlz' | 'ccp' | 'route' | 'nine' | 'para';

const SHEET_TITLE: Record<SheetId, string> = {
  hlz: 'HLZ overhead sketch',
  ccp: 'CCP layout sketch',
  route: 'evacuation route',
};

const P = UI_PALETTE;

/**
 * The CASEVAC tab: static sketch previews (tap → workspace), the data-entry forms, exports,
 * and moving a plan to another device. Sketch editing happens in the workspace overlay.
 */
export default function CasevacTab() {
  const history = useHistory<CasevacPlan>(loadPlan);
  const plan = history.present;
  const [sub, setSub] = useLocalStorage<Sub>('casevac-sub', 'hlz');
  const [bg, setBg] = useState<Backgrounds>(() => ({
    hlz: loadBackground('hlz'),
    ccp: loadBackground('ccp'),
    route: loadBackground('route'),
  }));
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [incoming, setIncoming] = useState<string | null>(() => incomingPayload());
  const fileRef = useRef<HTMLInputElement>(null);
  const planFileRef = useRef<HTMLInputElement>(null);
  const pickFor = useRef<SheetId>('hlz');
  const narrow = useMediaQuery('(max-width: 640px)');

  useEffect(() => {
    savePlan(plan);
  }, [plan]);

  const update: Update = (fn) => history.set(fn, { coalesce: 'form' });

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

  const viewFor = (s: SheetId): ViewBox =>
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

  // ----- background images -----
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
  const pickImage = (s: SheetId) => {
    pickFor.current = s;
    fileRef.current?.click();
  };
  const onPickImage = async (file: File | undefined) => {
    const s = pickFor.current;
    if (!file) return;
    const view = viewFor(s);
    try {
      const { dataUrl, aspect } = await readImageFile(file);
      setSheetBg(s, {
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

  const resetSheet = (s: SheetId) => {
    if (
      !window.confirm(`Reset the ${SHEET_TITLE[s]} to the example layout? (UNDO brings it back.)`)
    )
      return;
    if (s === 'hlz') history.set((p) => ({ ...p, hlz: defaultHlz() }));
    if (s === 'ccp') history.set((p) => ({ ...p, ccp: defaultCcp() }));
    if (s === 'route') history.set((p) => ({ ...p, route: defaultRoute() }));
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

  // ----- handoff -----
  const sendLink = async () => {
    const url = await planLink(plan);
    const r = await shareLink(url, `CASEVAC plan — ${plan.hlz.name || 'HLZ'}`);
    if (r === 'copied') notify('Link copied — open it on the other device. Images stay here.');
    else if (r === 'shared')
      notify('Link sent. Images stay on this device — use SAVE FILE for them.');
    else if (r === 'failed') notify('Could not share or copy the link', 'error');
  };
  const saveFile = async () => {
    const r = await shareFile(planFile(plan, bg));
    if (r === 'downloaded') notify('Plan file saved (with images)');
    else if (r === 'shared') notify('Plan file sent (with images)');
  };
  const openFile = async (file: File | undefined) => {
    if (!file) return;
    const got = await readPlanFile(file);
    if (!got) return notify("That file isn't a CASEVAC plan from this app", 'error');
    if (!window.confirm('Replace the CASEVAC plan on this device with the one in this file?'))
      return;
    history.reset(got.plan);
    (Object.keys(got.backgrounds) as SheetId[]).forEach((s) => setSheetBg(s, got.backgrounds[s]));
    notify('Plan loaded from file');
  };
  const acceptIncoming = async () => {
    if (!incoming) return;
    const got = await decodePayload(incoming);
    clearIncoming();
    setIncoming(null);
    if (!got) return notify("That link doesn't contain a readable plan", 'error');
    if (!window.confirm('Replace the CASEVAC plan on this device with the one from the link?'))
      return;
    history.reset(got);
    notify('Plan loaded from the link');
  };

  // ----- static preview (tap to edit) -----
  const preview = () => {
    if (!sheet) return null;
    const view = viewFor(sheet);
    const sheetBg = bg[sheet];
    if (sheet === 'hlz') {
      const decor = hlzDecor(plan.hlz, hlzGeom, view);
      return (
        <SketchCanvas
          view={view}
          P={P}
          gridRef={parseMgrs(plan.hlz.grid)}
          north={hlzNorth}
          northAt={decor.north}
          badges={decor.centers}
          background={sheetBg}
          ariaLabel={`HLZ overhead sketch for ${plan.hlz.name}`}
        >
          <HlzLayer hlz={plan.hlz} g={hlzGeom} view={view} P={P} windAt={decor.wind} />
        </SketchCanvas>
      );
    }
    if (sheet === 'ccp') {
      const decor = ccpDecor(plan.ccp, ccpGeom, view, plan.hlz.name);
      return (
        <SketchCanvas
          view={view}
          P={P}
          gridRef={sheetBg ? parseMgrs(plan.ccp.grid) : null}
          north={ccpNorth}
          northAt={decor.north}
          badges={decor.centers}
          notToScale={!sheetBg}
          background={sheetBg}
          ariaLabel={`CCP layout sketch for ${plan.ccp.name}`}
        >
          <CcpLayer ccp={plan.ccp} g={ccpGeom} view={view} P={P} hlzName={plan.hlz.name} />
        </SketchCanvas>
      );
    }
    if (plan.route.layout === 'schematic')
      return <RouteSchematic route={plan.route} t={timeline} P={P} vertical={narrow} />;
    return (
      <SketchCanvas
        view={view}
        P={P}
        background={sheetBg}
        notToScale={!sheetBg}
        showNorth={false}
        ariaLabel="Evacuation route on map"
      >
        <RouteMapLayer route={plan.route} view={view} P={P} />
      </SketchCanvas>
    );
  };

  return (
    <div className="casevac">
      {incoming && (
        <div className="incoming" role="alert">
          <strong>A CASEVAC plan came with this link.</strong> Load it to replace the plan on this
          device, or ignore it.
          <div className="chip-row">
            <button type="button" className="chip chip-solid" onClick={() => void acceptIncoming()}>
              LOAD IT
            </button>
            <button
              type="button"
              className="chip"
              onClick={() => {
                clearIncoming();
                setIncoming(null);
              }}
            >
              IGNORE
            </button>
          </div>
        </div>
      )}

      <Segmented<Sub>
        label="CASEVAC sheets"
        value={sub}
        onChange={setSub}
        options={[
          { value: 'hlz', label: 'HLZ' },
          { value: 'ccp', label: 'CCP' },
          { value: 'route', label: 'ROUTE' },
          { value: 'nine', label: '9-LINE' },
          { value: 'para', label: '¶4a' },
        ]}
      />

      {sheet ? (
        <div className="casevac-grid">
          <div className="casevac-sketch">
            <div className="sketch-toolbar">
              <button type="button" className="chip chip-solid" onClick={() => setEditing(true)}>
                <PencilRuler size={13} /> EDIT SKETCH
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
                className="chip"
                disabled={busy}
                onClick={() =>
                  run(() => downloadCasevacPdf(plan, bg), 'CASEVAC packet saved as PDF')
                }
              >
                <FileDown size={12} /> {busy ? 'WORKING…' : 'PACKET PDF'}
              </button>
            </div>

            <button
              type="button"
              className={`sketch-frame sketch-preview ${sheet === 'route' && plan.route.layout === 'schematic' ? 'sketch-frame-route' : ''}`}
              onClick={() => setEditing(true)}
              aria-label={`Edit the ${SHEET_TITLE[sheet]}`}
            >
              {preview()}
              <span className="sketch-edit-pill" aria-hidden="true">
                <PencilRuler size={13} /> TAP TO EDIT
              </span>
            </button>

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

            <div className="handoff">
              <div className="handoff-title">MOVE TO ANOTHER DEVICE</div>
              <div className="chip-row">
                <button type="button" className="chip" onClick={() => void sendLink()}>
                  <Link2 size={12} /> SEND LINK
                </button>
                <button type="button" className="chip" onClick={() => void saveFile()}>
                  <Save size={12} /> SAVE FILE
                </button>
                <button type="button" className="chip" onClick={() => planFileRef.current?.click()}>
                  <FileUp size={12} /> OPEN FILE
                </button>
              </div>
              <div className="field-hint">
                Start on a phone, finish on an iPad or computer. The link carries the plan in the
                part of the address that never reaches a server; images travel only in the file.
              </div>
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
        headings and names with yours. Saved in this browser only — use PACKET PDF or SAVE FILE to
        keep a copy.
      </Callout>

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
      <input
        ref={planFileRef}
        type="file"
        accept="application/json,.json"
        hidden
        onChange={(e) => {
          void openFile(e.target.files?.[0]);
          e.target.value = '';
        }}
      />

      {editing &&
        createPortal(
          <Workspace
            plan={plan}
            set={history.set}
            checkpoint={history.checkpoint}
            undo={history.undo}
            redo={history.redo}
            canUndo={history.canUndo}
            canRedo={history.canRedo}
            sheet={sheet ?? 'hlz'}
            setSheet={(s) => setSub(s)}
            bg={bg}
            setSheetBg={setSheetBg}
            onPickImage={pickImage}
            onResetSheet={resetSheet}
            onClose={() => setEditing(false)}
          />,
          document.body
        )}
    </div>
  );
}
