import { expect, it } from 'vitest';
import { OperationStore, OPERATIONS_KEY, STAGING_KEY } from './operationStore';

function setup() {
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
  const store = () => new OperationStore(storage, { newId: () => `id-${++id}` });
  return { data, storage, store };
}

it('wipes legacy data, all plan generations, preferences and abandoned imports', async () => {
  const { data, store } = setup();
  const stale = store();
  expect(stale.activeId()).toBe('default');
  await stale.create('Other plan');
  data.set('inline-note-osmeac-o', 'legacy operational text');
  data.set('casevac-bg-hlz', 'legacy image');
  data.set('op:orphan:old:notes-tools', 'old generation');
  data.set('blackout-mode', 'true');
  data.set('active-view', '"order"');
  data.set(STAGING_KEY, 'unreadable interrupted import');
  data.set('unrelated-preference', 'keep me');
  await store().wipe();
  expect([...data.keys()].sort()).toEqual([OPERATIONS_KEY, 'unrelated-preference'].sort());
  expect(
    store()
      .list()
      .map((plan) => plan.name)
  ).toEqual(['Default operation']);
  expect(store().snapshot('default').data).toEqual({});
  expect(() => stale.scopedKey('notes-tools')).toThrow(/reset/);
});

it('can wipe even when the old plans index cannot be parsed', async () => {
  const { data, store } = setup();
  data.set(OPERATIONS_KEY, 'broken index');
  data.set('notes-tools', 'sensitive notes');
  await store().wipe();
  expect(data.has('notes-tools')).toBe(false);
  expect(store().list()).toHaveLength(1);
});

it('preserves data if the stale-tab barrier cannot be saved', async () => {
  const { data, storage, store } = setup();
  data.set('notes-tools', 'preserve');
  storage.setItem = () => {
    throw new Error('Storage blocked');
  };
  await expect(store().wipe()).rejects.toThrow();
  expect(data.get('notes-tools')).toBe('preserve');
});

it('reports a removal failure rather than claiming that the data is wiped', async () => {
  const { data, storage, store } = setup();
  data.set('notes-tools', 'not yet erased');
  storage.removeItem = () => {
    throw new Error('Storage blocked');
  };
  await expect(store().wipe()).rejects.toThrow();
  expect(data.get('notes-tools')).toBe('not yet erased');
});
