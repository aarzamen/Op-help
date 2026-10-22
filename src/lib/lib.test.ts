import { describe, expect, it } from 'vitest';
import { normalizeChecklistItems } from './checklists';
import { pdfSafe } from './pdfText';

describe('normalizeChecklistItems', () => {
  it('migrates legacy string lists to items with ids', () => {
    const items = normalizeChecklistItems(['Water', 'Ammo'], []);
    expect(items.map((i) => i.text)).toEqual(['Water', 'Ammo']);
    expect(new Set(items.map((i) => i.id)).size).toBe(2);
  });

  it('keeps valid items and repairs broken ones', () => {
    const items = normalizeChecklistItems(
      [{ id: 'keep', text: 'NVGs' }, { text: 'no id' }, null, { id: '', text: 7 }],
      []
    );
    expect(items[0]).toEqual({ id: 'keep', text: 'NVGs' });
    expect(items[1].text).toBe('no id');
    expect(items[1].id).toMatch(/^item-/);
    expect(items[2]).toMatchObject({ text: '' });
    expect(items[3].id).toMatch(/^item-/);
    expect(items[3].text).toBe('');
  });

  it('falls back when storage holds something other than a list', () => {
    expect(normalizeChecklistItems({ not: 'a list' }, ['Default']).map((i) => i.text)).toEqual([
      'Default',
    ]);
  });
});

describe('pdfSafe', () => {
  it('maps symbols jsPDF fonts cannot draw', () => {
    expect(pdfSafe('POI → CCP ≤ 10 min ✓')).toBe('POI -> CCP <= 10 min OK');
    expect(pdfSafe('¶4.a “CASEVAC”…')).toBe('para 4.a "CASEVAC"...');
  });

  it('drops emoji and other non-Latin-1 text but keeps dashes and bullets', () => {
    expect(pdfSafe('Ready 🚁 — go • now')).toBe('Ready  — go • now');
  });
});
