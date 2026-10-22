import type { ViewId } from '../App';
import { readItem, readJson, readNote } from '../lib/storage';
import { CHECKLISTS, getChecklistItemTexts } from '../lib/checklists';
import { readOrderMeta } from '../lib/orderMeta';
import { pdfSafe } from '../lib/pdfText';
import { dtgZulu, fileSlug } from '../lib/dtg';
import { RUBRIC, RUBRIC_TOTAL, sectionPts } from '../content/rubric';
import type { BriefState } from '../components/GuideWidgets';
import { computeCcp } from '../casevac/ccp';
import { downloadCasevacPdf } from '../casevac/exportSheet';
import { northReferenceForGrid } from '../casevac/geo';
import { computeHlz } from '../casevac/hlz';
import { loadBackground, loadPlan } from '../casevac/model';
import { routeTimeline } from '../casevac/route';
import {
  casevacParagraph,
  ccpLines,
  hlzLines,
  nineLineScript,
  routeLines,
  type Lines,
} from '../casevac/sheetData';

/** A document = title block + sections; each section is a heading plus optional body text. */
interface Doc {
  kicker: string;
  title: string;
  subtitle?: string;
  banner?: string;
  footerLeft: string;
  footerRight: string;
  sections: { heading: string; body?: string; level: 1 | 2 }[];
}

const note = (id: string) => readNote(id).trim();

function orderDoc(): Doc {
  const meta = readOrderMeta();
  const s = (heading: string, id?: string, level: 1 | 2 = 2) => ({
    heading,
    body: id ? note(id) || '[No notes provided]' : undefined,
    level,
  });
  const general = readItem('notes-smeac').trim();
  return {
    kicker: 'OPERATION ORDER',
    title: meta.operation || 'OPORD',
    subtitle: meta.unit || undefined,
    banner: meta.banner || undefined,
    footerLeft: meta.unit || 'OPORD ANALYST',
    footerRight: 'OSMEAC',
    sections: [
      { heading: 'ORIENTATION', body: note('osmeac-o') || '[No notes provided]', level: 1 },
      s('1. SITUATION', undefined, 1),
      s('Task Organization & Battlespace', 'osmeac-s-to'),
      s('Enemy Forces', 'osmeac-s-en'),
      s('Friendly Forces', 'osmeac-s-fr'),
      s('Attachments & Detachments', 'osmeac-s-ad'),
      { heading: '2. MISSION', body: note('osmeac-m') || '[No notes provided]', level: 1 },
      s('3. EXECUTION', undefined, 1),
      s("Commander's Intent", 'osmeac-e-ci'),
      s('Concept of Operations', 'osmeac-e-co'),
      s('Tasks', 'osmeac-e-tk'),
      s('Fire Support Plan', 'osmeac-e-fs'),
      s('Coordinating Instructions', 'osmeac-e-coord'),
      {
        heading: '4. ADMINISTRATION & LOGISTICS',
        body: note('osmeac-a') || '[No notes provided]',
        level: 1,
      },
      { heading: '5. COMMAND & SIGNAL', body: note('osmeac-c') || '[No notes provided]', level: 1 },
      ...(general ? [{ heading: 'GENERAL NOTES', body: general, level: 1 as const }] : []),
    ],
  };
}

function analyzeDoc(): Doc {
  const s = (heading: string, id?: string, level: 1 | 2 = 2) => ({
    heading,
    body: id ? note(id) || '[No notes provided]' : undefined,
    level,
  });
  const general = readItem('notes-mettt').trim();
  return {
    kicker: 'MISSION ANALYSIS',
    title: 'METT-T',
    footerLeft: 'OPORD ANALYST',
    footerRight: 'METT-T',
    sections: [
      { heading: 'MISSION', body: note('mettt-m') || '[No notes provided]', level: 1 },
      s('ENEMY', undefined, 1),
      s('EMLCOA', 'mettt-e-emlcoa'),
      s('TERRAIN & WEATHER', undefined, 1),
      s('KOCOA', 'mettt-t-kocoa'),
      s('Weather', 'mettt-t-wx'),
      s('TROOPS & FIRE SUPPORT', undefined, 1),
      s('Troops', 'mettt-tr'),
      s('Fire Support', 'mettt-fs'),
      { heading: 'TIME AVAILABLE', body: note('mettt-time') || '[No notes provided]', level: 1 },
      ...(general ? [{ heading: 'GENERAL NOTES', body: general, level: 1 as const }] : []),
    ],
  };
}

function toolsDoc(): Doc {
  const scenarios = Array.from(new Set(CHECKLISTS.map((c) => c.scenario)));
  const sections: Doc['sections'] = [];
  scenarios.forEach((scenario) => {
    sections.push({ heading: `PCC / PCI — ${scenario.toUpperCase()}`, level: 1 });
    CHECKLISTS.filter((c) => c.scenario === scenario).forEach((c) => {
      const items = getChecklistItemTexts(c.storageKey);
      sections.push({
        heading: c.label,
        body: items.length ? items.map((i) => `- ${i}`).join('\n') : '[No items]',
        level: 2,
      });
    });
  });
  sections.push({
    heading: 'NOTES',
    body: readItem('notes-tools').trim() || 'No notes provided.',
    level: 1,
  });
  return {
    kicker: 'FIELD REFERENCE',
    title: 'TACTICAL TOOLS',
    footerLeft: 'OPORD ANALYST',
    footerRight: 'TOOLS',
    sections,
  };
}

function guideDoc(): Doc {
  const st = readJson<BriefState>('brief-rubric', { done: {}, owner: {} });
  const covered = RUBRIC.flatMap((sec) => sec.items).reduce(
    (n, i) => n + (st.done[i.id] ? i.pts : 0),
    0
  );
  return {
    kicker: 'BRIEF PREP',
    title: 'TERRAIN MODEL BRIEF — GRADING CHECKLIST',
    subtitle: `${covered} / ${RUBRIC_TOTAL} points rehearsed`,
    footerLeft: 'OPORD ANALYST',
    footerRight: 'EULC CHECKLIST',
    sections: RUBRIC.map((sec) => ({
      heading: `${sec.title} (${sectionPts(sec)} pts)${st.owner[sec.id] ? ` — ${st.owner[sec.id]}` : ''}`,
      body: sec.items
        .map(
          (i) =>
            `[${st.done[i.id] ? 'x' : ' '}] ${i.label} (${i.pts})${i.prompt ? ` — ${i.prompt}` : ''}`
        )
        .join('\n'),
      level: 1,
    })),
  };
}

const linesText = (title: string, lines: Lines) =>
  `${title}\n${lines.map(([k, v]) => `  ${k}: ${v}`).join('\n')}\n`;

function casevacText(): string {
  const plan = loadPlan();
  const hNorth = northReferenceForGrid(plan.hlz.grid);
  const g = computeHlz(plan.hlz, hNorth, plan.ccp.grid);
  const cg = computeCcp(plan.ccp, plan.hlz.grid, northReferenceForGrid(plan.ccp.grid));
  const t = routeTimeline(plan.route);
  return [
    `CASEVAC PLAN — ${dtgZulu()}`,
    '',
    linesText('HLZ', hlzLines(plan, g, hNorth)),
    linesText('CCP', ccpLines(plan, cg)),
    linesText('EVACUATION ROUTE', routeLines(plan, t)),
    '9-LINE (PREPARED)',
    ...nineLineScript(plan).map((l) => `  ${l}`),
    '',
    casevacParagraph(plan, g, t),
  ].join('\n');
}

function docText(d: Doc): string {
  let text = `${d.banner ? `${d.banner}\n` : ''}${d.kicker}\n${d.title}${d.subtitle ? ` — ${d.subtitle}` : ''}\n\n`;
  d.sections.forEach((s) => {
    const indent = s.level === 2 ? '  ' : '';
    text += `${indent}${s.heading}\n`;
    if (s.body !== undefined)
      text += `${s.body
        .split('\n')
        .map((l) => indent + l)
        .join('\n')}\n\n`;
  });
  return text.trimEnd() + '\n';
}

const DOCS: Partial<Record<ViewId, () => Doc>> = {
  order: orderDoc,
  analyze: analyzeDoc,
  tools: toolsDoc,
  guide: guideDoc,
};

/** Plain-text export of the current view (clipboard). */
export function exportText(view: ViewId): string {
  if (view === 'casevac') return casevacText();
  return docText(DOCS[view]!());
}

async function docPdf(d: Doc, fileName: string) {
  // Loaded on first export so the PDF library isn't part of the app's startup download.
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF();
  const margin = 20;
  const pageW = doc.internal.pageSize.width;
  const pageH = doc.internal.pageSize.height;
  const maxW = pageW - margin * 2;
  let y = margin + 4;

  const room = (h: number) => {
    if (y + h > pageH - 26) {
      doc.addPage();
      y = margin + 4;
    }
  };

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(150, 150, 150);
  doc.text(pdfSafe(d.kicker.split('').join(' ')), margin, y);
  y += 8;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(30, 30, 30);
  (doc.splitTextToSize(pdfSafe(d.title), maxW) as string[]).forEach((ln) => {
    doc.text(ln, margin, y);
    y += 7;
  });
  if (d.subtitle) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(90, 90, 90);
    doc.text(pdfSafe(d.subtitle), margin, y);
    y += 6;
  }
  doc.setDrawColor(45, 106, 79);
  doc.setLineWidth(1);
  doc.line(margin, y, pageW - margin, y);
  y += 9;

  d.sections.forEach((s) => {
    room(s.level === 1 ? 18 : 12);
    doc.setFont('helvetica', 'bold');
    if (s.level === 1) {
      doc.setFontSize(12.5);
      doc.setTextColor(30, 30, 30);
      doc.text(pdfSafe(s.heading), margin, y);
      y += 6.5;
    } else {
      doc.setFontSize(10);
      doc.setTextColor(45, 106, 79);
      doc.text(pdfSafe(s.heading), margin + 6, y);
      y += 5.5;
    }
    if (s.body) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(60, 60, 60);
      const x = margin + (s.level === 2 ? 6 : 0);
      (doc.splitTextToSize(pdfSafe(s.body), maxW - (s.level === 2 ? 6 : 0)) as string[]).forEach(
        (ln) => {
          room(5);
          doc.text(ln, x, y);
          y += 5;
        }
      );
      y += 4;
    }
  });

  const pages = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    if (d.banner) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(60, 60, 60);
      doc.text(pdfSafe(d.banner), pageW / 2, 10, { align: 'center' });
      doc.text(pdfSafe(d.banner), pageW / 2, pageH - 6, { align: 'center' });
    }
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.4);
    doc.line(margin, pageH - 18, pageW - margin, pageH - 18);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(pdfSafe(d.footerLeft), margin, pageH - 13);
    const right = `${d.footerRight} · ${i}/${pages}`;
    doc.text(pdfSafe(right), pageW - margin - doc.getTextWidth(pdfSafe(right)), pageH - 13);
  }
  doc.save(fileName);
}

/** PDF export of the current view. */
export async function exportPdf(view: ViewId): Promise<void> {
  if (view === 'casevac') {
    await downloadCasevacPdf(loadPlan(), {
      hlz: loadBackground('hlz'),
      ccp: loadBackground('ccp'),
      route: loadBackground('route'),
    });
    return;
  }
  const d = DOCS[view]!();
  const name =
    view === 'order'
      ? `OPORD_${fileSlug(readOrderMeta().operation || 'notes')}.pdf`
      : `OPORD_Analyst_${view.toUpperCase()}.pdf`;
  await docPdf(d, name);
}
