import { afterEach, describe, expect, it, vi } from 'vitest';
import { defaultPlan, loadPlan } from '../casevac/model';
import { OperationStore } from './operationStore';
import { parseBackup, serializeBackup } from './operationBackup';

function fixture() {
  const data = new Map<string, string>();
  let id = 0;
  const storage = {
    get length() {
      return data.size;
    },
    key: (i: number) => [...data.keys()][i] ?? null,
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, value);
    },
    removeItem: (key: string) => {
      data.delete(key);
    },
  };
  const store = new OperationStore(storage, { newId: () => `id-${++id}` });
  return { data, store, storage };
}

afterEach(() => vi.unstubAllGlobals());

describe('operation JSON backups', () => {
  it('round-trips every data category and restores copies without changing existing plans', async () => {
    const { data, store } = fixture();
    await store.initialize();
    const plan = defaultPlan();
    const values = {
      'inline-note-osmeac-o': 'Orientation → text',
      'notes-smeac': 'Order notes',
      'notes-mettt': 'Analysis',
      'notes-tools': 'Tools',
      'pcc-convoy-gear': JSON.stringify([{ id: 'kit', text: 'Water' }]),
      'pci-mission-people': JSON.stringify(['Legacy checklist']),
      'order-meta': JSON.stringify({ unit: 'Unit', operation: 'Example', banner: 'EXERCISE' }),
      'brief-rubric': JSON.stringify({ done: { item: true }, owner: { orient: 'A' } }),
      'tasking-builder': JSON.stringify({
        unit: 'Unit',
        role: 'ME',
        trigger: 'Upon arrival',
        task: 'secure',
        where: 'the area',
        purpose: 'support',
        priority: 'MHP',
      }),
      'casevac-plan': JSON.stringify(plan),
      'casevac-bg-hlz': JSON.stringify({
        dataUrl: 'data:image/png;base64,AA==',
        aspect: 1,
        widthM: 100,
        offset: { x: 0, y: 0 },
        opacity: 0.5,
      }),
    };
    for (const [key, value] of Object.entries(values)) data.set(key, value);
    data.set('blackout-mode', 'true');
    data.set('active-view', '"order"');
    data.set('unrelated-secret', 'never export');
    const text = serializeBackup(store, true);
    expect(text).not.toContain('unrelated-secret');
    const backup = parseBackup(text);
    expect(backup.operations[0].data).toEqual(values);
    expect(backup.preferences).toEqual({ 'blackout-mode': 'true', 'active-view': '"order"' });
    const imported = await store.importSnapshots(
      backup.operations,
      backup.preferences,
      backup.activeId
    );
    const again = await store.importSnapshots(backup.operations);
    expect(imported[0].id).not.toBe('default');
    expect(again[0].id).not.toBe(imported[0].id);
    expect(store.snapshot(imported[0].id).data).toEqual(values);
    expect(store.snapshot('default').data).toEqual(values);
  });

  it('exports only the current plan when all is false', async () => {
    const { store } = fixture();
    await store.create('Another plan');
    const backup = parseBackup(serializeBackup(store, false));
    expect(backup.operations.map((p) => p.id)).toEqual(['default']);
  });

  it('rejects corrupt records, arbitrary keys and unsafe field types before restore', () => {
    const { store } = fixture();
    const base = JSON.parse(serializeBackup(store, false));
    const badData = [
      { 'blackout-mode': 'true' },
      { 'op:attacker:key': 'value' },
      { unrelated: 'value' },
      { 'order-meta': '{"unit":{}}' },
      { 'brief-rubric': '{"done":{},"owner":{"orient":{}}}' },
      { 'tasking-builder': '{}' },
      { 'pcc-convoy-gear': '[{"text":{}}]' },
      { 'casevac-plan': '{"v":999}' },
      { 'casevac-bg-hlz': '{"dataUrl":"https://outside.example/image"}' },
    ];
    for (const data of badData) {
      const bad = structuredClone(base);
      bad.operations[0].data = data;
      expect(() => parseBackup(JSON.stringify(bad)), JSON.stringify(data)).toThrow();
    }
    expect(() => parseBackup('{')).toThrow();
    expect(() => parseBackup(JSON.stringify({ ...base, version: 999 }))).toThrow();
    expect(() =>
      parseBackup(JSON.stringify({ ...base, preferences: { 'active-view': '"unknown"' } }))
    ).toThrow();
  });

  it('preserves long CASEVAC text through backup, restore and the next page load', async () => {
    const { data, store, storage } = fixture();
    const plan = defaultPlan();
    plan.hlz.name = 'x'.repeat(5000);
    plan.para.reporting = 'Detailed reporting instructions '.repeat(200);
    const saved = JSON.stringify(plan);
    data.set('casevac-plan', saved);
    const backup = parseBackup(serializeBackup(store, false));
    const [restored] = await store.importSnapshots(backup.operations);
    expect(store.snapshot(restored.id).data['casevac-plan']).toBe(saved);
    vi.stubGlobal('window', { localStorage: storage });
    expect(loadPlan()).toEqual(plan);
  });

  it('refuses to prepare an unrestorable backup and leaves the original data unchanged', () => {
    const { data, store } = fixture();
    const plan = defaultPlan();
    plan.nineLine.line5L = 100;
    const saved = JSON.stringify(plan);
    data.set('casevac-plan', saved);
    expect(() => serializeBackup(store, false)).toThrow(/CASEVAC/);
    expect(data.get('casevac-plan')).toBe(saved);
  });

  it('rejects oversized files and duplicate source identities', () => {
    expect(() => parseBackup(' '.repeat(25 * 1024 * 1024 + 1))).toThrow(/large/);
    const { store } = fixture();
    const backup = JSON.parse(serializeBackup(store, false));
    backup.operations.push(backup.operations[0]);
    expect(() => parseBackup(JSON.stringify(backup))).toThrow();
  });
});
