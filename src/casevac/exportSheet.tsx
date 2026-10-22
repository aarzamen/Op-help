import React from 'react';
import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';
import { jsPDF } from 'jspdf';
import monoBoldUrl from '@fontsource/jetbrains-mono/files/jetbrains-mono-latin-700-normal.woff2?url';
import monoHeavyUrl from '@fontsource/jetbrains-mono/files/jetbrains-mono-latin-800-normal.woff2?url';
import sansUrl from '@fontsource/ibm-plex-sans/files/ibm-plex-sans-latin-400-normal.woff2?url';
import sansBoldUrl from '@fontsource/ibm-plex-sans/files/ibm-plex-sans-latin-700-normal.woff2?url';
import { fileSlug } from '../lib/dtg';
import { pdfSafe } from '../lib/pdfText';
import { ccpDecor, computeCcp } from './ccp';
import { CcpLayer } from './CcpLayer';
import { northReferenceForGrid, parseMgrs } from './geo';
import { computeHlz, fitView, hlzDecor, hlzView } from './hlz';
import { HlzLayer } from './HlzLayer';
import type { Background, CasevacPlan, SheetId } from './model';
import { PRINT_PALETTE as P } from './palette';
import { routeTimeline, schematicGeom } from './route';
import { RouteMapLayer, RouteSchematic } from './RouteLayer';
import { casevacParagraph, ccpLines, hlzLines, nineLineScript, routeLines } from './sheetData';
import { DataColumn, Frame, SHEET_H as H, SHEET_W as W } from './SheetFrame';
import { SketchCanvas } from './svg';

export type Backgrounds = Record<SheetId, Background | null>;

/** Build one landscape sheet (map + title + data block) as a React element in the print palette. */
function sheetElement(plan: CasevacPlan, sheet: SheetId, bg: Backgrounds): React.ReactElement {
  const hlzNorth = northReferenceForGrid(plan.hlz.grid);
  if (sheet === 'hlz') {
    const g = computeHlz(plan.hlz, hlzNorth, plan.ccp.grid);
    const view = hlzView(plan.hlz, g);
    const decor = hlzDecor(plan.hlz, g, view);
    return (
      <Frame
        plan={plan}
        title={`${plan.hlz.name || 'HLZ'} — OVERHEAD SKETCH`}
        subtitle="Helicopter landing zone · grid north up · directions °M unless noted"
      >
        <SketchCanvas
          frame={{ x: 40, y: 126, w: 806, h: 806 }}
          view={view}
          P={P}
          gridRef={parseMgrs(plan.hlz.grid)}
          north={hlzNorth}
          northAt={decor.north}
          badges={decor.centers}
          background={bg.hlz}
          ariaLabel="HLZ sketch"
        >
          <HlzLayer hlz={plan.hlz} g={g} view={view} P={P} editable={false} windAt={decor.wind} />
        </SketchCanvas>
        <DataColumn lines={hlzLines(plan, g, hlzNorth)} x={900} y={132} w={660} maxY={H - 60} />
      </Frame>
    );
  }
  if (sheet === 'ccp') {
    const ccpNorth = northReferenceForGrid(plan.ccp.grid);
    const cg = computeCcp(plan.ccp, plan.hlz.grid, ccpNorth);
    const ccpDecorNow = ccpDecor(plan.ccp, cg, cg.view, plan.hlz.name);
    return (
      <Frame
        plan={plan}
        title={`${plan.ccp.name || 'CCP'} — LAYOUT SKETCH`}
        subtitle="Casualty collection point · one-way flow · triage categories labeled"
      >
        <SketchCanvas
          frame={{ x: 40, y: 126, w: 806, h: 806 }}
          view={cg.view}
          P={P}
          gridRef={bg.ccp ? parseMgrs(plan.ccp.grid) : null}
          north={ccpNorth}
          northAt={ccpDecorNow.north}
          badges={ccpDecorNow.centers}
          background={bg.ccp}
          notToScale={!bg.ccp}
          ariaLabel="CCP sketch"
        >
          <CcpLayer
            ccp={plan.ccp}
            g={cg}
            view={cg.view}
            P={P}
            editable={false}
            hlzName={plan.hlz.name}
          />
        </SketchCanvas>
        <DataColumn lines={ccpLines(plan, cg)} x={900} y={132} w={660} maxY={H - 60} />
      </Frame>
    );
  }
  const t = routeTimeline(plan.route);
  const lines = routeLines(plan, t);
  if (plan.route.layout === 'map') {
    const view = fitView(
      plan.route.nodes.map((n) => n.pos),
      0.2,
      300
    );
    return (
      <Frame
        plan={plan}
        title="EVACUATION ROUTE — MAP SKETCH"
        subtitle={
          bg.route
            ? 'Evacuation chain over imagery · times and distances by leg'
            : 'Evacuation chain · not to scale · times and distances by leg'
        }
      >
        <SketchCanvas
          frame={{ x: 40, y: 126, w: 806, h: 806 }}
          view={view}
          P={P}
          background={bg.route}
          notToScale={!bg.route}
          showNorth={false}
          ariaLabel="Evacuation route on map"
        >
          <RouteMapLayer route={plan.route} view={view} P={P} editable={false} />
        </SketchCanvas>
        <DataColumn lines={lines} x={900} y={132} w={660} maxY={H - 60} />
      </Frame>
    );
  }
  const legs = lines.slice(0, plan.route.legs.length);
  const rest = lines.slice(plan.route.legs.length);
  // The schematic is top-aligned in its frame; start the data right below what it actually fills.
  const box = { x: 40, y: 128, w: W - 80, h: 430 };
  const sv = schematicGeom(plan.route.nodes.length, false).view;
  const dataY = box.y + sv.h * Math.min(box.w / sv.w, box.h / sv.h) + 40;
  return (
    <Frame
      plan={plan}
      title="EVACUATION ROUTE — TIME / DISTANCE"
      subtitle="Forward → rear by echelon of care · position is order, not geography"
    >
      <RouteSchematic route={plan.route} t={t} P={P} vertical={false} frame={box} />
      <DataColumn lines={legs} x={40} y={dataY} w={740} maxY={H - 60} />
      <DataColumn lines={rest} x={820} y={dataY} w={740} maxY={H - 60} />
    </Frame>
  );
}

function renderToMarkup(el: React.ReactElement): string {
  const host = document.createElement('div');
  const root = createRoot(host);
  flushSync(() => root.render(el));
  const html = host.innerHTML;
  root.unmount();
  return html;
}

let fontCssCache: string | null = null;

async function toBase64(buf: ArrayBuffer): Promise<string> {
  const bytes = new Uint8Array(buf);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000)
    bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

/** Embed the app's self-hosted fonts so exports match the screen (falls back to system fonts). */
async function fontCss(): Promise<string> {
  if (fontCssCache !== null) return fontCssCache;
  try {
    const faces: [string, string, number][] = [
      [monoBoldUrl, 'JetBrains Mono', 700],
      [monoHeavyUrl, 'JetBrains Mono', 800],
      [sansUrl, 'IBM Plex Sans', 400],
      [sansBoldUrl, 'IBM Plex Sans', 700],
    ];
    const css = await Promise.all(
      faces.map(async ([url, family, weight]) => {
        const b64 = await toBase64(await (await fetch(url)).arrayBuffer());
        return `@font-face{font-family:'${family}';font-weight:${weight};src:url(data:font/woff2;base64,${b64}) format('woff2');}`;
      })
    );
    fontCssCache = css.join('');
  } catch (e) {
    console.warn('Font embedding failed; exports use system fonts', e);
    fontCssCache = '';
  }
  return fontCssCache;
}

async function svgToPng(markup: string, scale = 2): Promise<string> {
  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error('Sketch render failed'));
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(markup)}`;
  });
  const canvas = document.createElement('canvas');
  canvas.width = W * scale;
  canvas.height = H * scale;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas unavailable');
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/png');
}

/** Render a sheet to a PNG data URL. */
export async function sheetPng(
  plan: CasevacPlan,
  sheet: SheetId,
  bg: Backgrounds
): Promise<string> {
  const css = await fontCss();
  const markup = renderToMarkup(sheetElement(plan, sheet, bg)).replace(
    /^<svg([^>]*)>/,
    `<svg$1><defs><style>${css}</style></defs>`
  );
  return svgToPng(markup);
}

export function downloadDataUrl(dataUrl: string, filename: string) {
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

const SHEET_FILE: Record<SheetId, (p: CasevacPlan) => string> = {
  hlz: (p) => `${fileSlug(p.hlz.name || 'HLZ')}_sketch.png`,
  ccp: (p) => `${fileSlug(p.ccp.name || 'CCP')}_sketch.png`,
  route: () => 'CASEVAC_route.png',
};

export async function downloadSheetPng(plan: CasevacPlan, sheet: SheetId, bg: Backgrounds) {
  downloadDataUrl(await sheetPng(plan, sheet, bg), SHEET_FILE[sheet](plan));
}

/** The full CASEVAC packet: HLZ, CCP and route sheets, the 9-line card, and the ¶4.a text. */
export async function downloadCasevacPdf(plan: CasevacPlan, bg: Backgrounds) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'letter' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const imgW = pageW - 32;
  const imgH = (imgW * H) / W;

  const sheets: SheetId[] = ['hlz', 'ccp', 'route'];
  for (let i = 0; i < sheets.length; i++) {
    if (i > 0) doc.addPage();
    // 'FAST' deflates the pixels; jsPDF's default ('NONE') embeds them raw — ~19 MB per sheet.
    doc.addImage(
      await sheetPng(plan, sheets[i], bg),
      'PNG',
      16,
      (pageH - imgH) / 2,
      imgW,
      imgH,
      undefined,
      'FAST'
    );
  }

  const textPage = (title: string, body: string[], mono: boolean) => {
    doc.addPage();
    let y = 40;
    if (plan.banner) {
      doc.setFont('courier', 'bold');
      doc.setFontSize(10);
      doc.text(pdfSafe(plan.banner), pageW / 2, 24, { align: 'center' });
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text(pdfSafe(title), 40, y + 10);
    y += 34;
    doc.setFont(mono ? 'courier' : 'helvetica', 'normal');
    doc.setFontSize(mono ? 11 : 10.5);
    const lh = mono ? 15 : 14;
    body.forEach((para) => {
      (doc.splitTextToSize(pdfSafe(para), pageW - 80) as string[]).forEach((ln) => {
        if (y > pageH - 40) {
          doc.addPage();
          y = 40;
        }
        doc.text(ln, 40, y);
        y += lh;
      });
      y += mono ? 4 : 6;
    });
  };

  textPage(
    '9-LINE MEDEVAC REQUEST — PREPARED',
    [
      ...nineLineScript(plan),
      '',
      'Transmit lines 1-5 on initial contact; lines 6-9 may follow while the aircraft is en route.',
      'Say "break" between categories. Encrypt per SOP. No names or SSNs on the net.',
    ],
    true
  );

  const north = northReferenceForGrid(plan.hlz.grid);
  const g = computeHlz(plan.hlz, north, plan.ccp.grid);
  textPage(
    'CASEVAC PLAN — ORDER PARAGRAPH 4.a',
    casevacParagraph(plan, g, routeTimeline(plan.route)).split('\n'),
    false
  );

  doc.save(`CASEVAC_${fileSlug(plan.hlz.name || 'plan')}.pdf`);
}
