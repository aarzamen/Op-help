import { describe, expect, it } from 'vitest';
import {
  OperationStore,
  OPERATIONS_KEY,
  STAGING_KEY,
  isOperationKey,
  type KeyValueStore,
} from './operationStore';

class MemoryStorage implements KeyValueStore {
  data = new Map<string, string>();
  failKey = '';
  get length() {
    return this.data.size;
  }
  key(i: number) {
    return [...this.data.keys()][i] ?? null;
  }
  getItem(k: string) {
    return this.data.get(k) ?? null;
  }
  setItem(k: string, v: string) {
    if (k === this.failKey) throw new Error('Quota exceeded');
    this.data.set(k, v);
  }
  removeItem(k: string) {
    this.data.delete(k);
  }
}

function setup() {
  const storage = new MemoryStorage();
  let id = 0;
  const store = () =>
    new OperationStore(storage, {
      newId: () => `plan-${++id}`,
      now: () => '2026-10-22T12:00:00.000Z',
    });
  return { storage, store };
}

describe('operations and legacy data', () => {
  it('indexes Default operation once without renaming, copying or changing existing data', async () => {
    const { storage, store } = setup();
    storage.setItem('inline-note-osmeac-o', 'original notes');
    storage.setItem('casevac-bg-hlz', 'large image');
    const first = store();
    await first.initialize();
    const originalIndex = storage.getItem(OPERATIONS_KEY);
    await first.initialize();
    expect(first.list().map((p) => p.name)).toEqual(['Default operation']);
    expect(first.scopedKey('inline-note-osmeac-o')).toBe('inline-note-osmeac-o');
    expect(storage.getItem('inline-note-osmeac-o')).toBe('original notes');
    expect(storage.getItem('casevac-bg-hlz')).toBe('large image');
    expect(storage.length).toBe(3);
    expect(storage.getItem(OPERATIONS_KEY)).toBe(originalIndex);
  });

  it('isolates plan data while keeping preferences global', async () => {
    const { storage, store } = setup();
    storage.setItem('notes-smeac', 'default order');
    const page = store();
    const created = await page.create('Second operation');
    const secondPage = store();
    expect(secondPage.activeId()).toBe(created.id);
    expect(secondPage.scopedKey('notes-smeac')).toBe(
      `op:${created.id}:${created.generation}:notes-smeac`
    );
    storage.setItem(secondPage.scopedKey('notes-smeac'), 'second order');
    expect(storage.getItem('notes-smeac')).toBe('default order');
    for (const key of ['blackout-mode', 'active-view', 'casevac-sub']) {
      expect(secondPage.scopedKey(key)).toBe(key);
    }
  });

  it('pins open tabs to their operation despite selection in another tab', async () => {
    const { storage, store } = setup();
    const oldTab = store();
    expect(oldTab.activeId()).toBe('default');
    const created = await oldTab.create('New plan');
    const id = created.id;
    expect(oldTab.scopedKey('notes-tools')).toBe('notes-tools');
    const newTab = store();
    expect(newTab.activeId()).toBe(id);
    await newTab.select('default');
    expect(newTab.scopedKey('notes-tools')).toBe(`op:${id}:${created.generation}:notes-tools`);
    storage.setItem(newTab.scopedKey('notes-tools'), 'still the second plan');
    expect(store().activeId()).toBe('default');
  });

  it('renames without touching data and resets only the specified operation', async () => {
    const { storage, store } = setup();
    const page = store();
    const other = await page.create('Other');
    storage.setItem('notes-tools', 'legacy');
    storage.setItem(`op:${other.id}:${other.generation}:notes-tools`, 'other');
    storage.setItem('blackout-mode', 'true');
    await page.rename(other.id, 'Renamed');
    expect(page.list().find((p) => p.id === other.id)?.name).toBe('Renamed');
    await page.reset(other.id);
    expect(storage.getItem(`op:${other.id}:${other.generation}:notes-tools`)).toBeNull();
    expect(storage.getItem('notes-tools')).toBe('legacy');
    expect(storage.getItem('blackout-mode')).toBe('true');
  });

  it('deletion prevents stale tabs from recreating a removed plan', async () => {
    const { storage, store } = setup();
    const page = store();
    const created = await page.create('To delete');
    const id = created.id;
    const staleTab = store();
    expect(staleTab.activeId()).toBe(id);
    storage.setItem(`op:${id}:${created.generation}:notes-tools`, 'delete me');
    await page.remove(id);
    expect(() => staleTab.scopedKey('notes-tools')).toThrow(/removed/);
    expect(storage.getItem(`op:${id}:${created.generation}:notes-tools`)).toBeNull();
    expect(page.list()).toHaveLength(1);
  });

  it('leaves data intact when index writes fail and rejects corrupt metadata', async () => {
    const { storage, store } = setup();
    storage.setItem('notes-smeac', 'keep');
    storage.failKey = OPERATIONS_KEY;
    await expect(store().create('Cannot save')).rejects.toThrow();
    expect(storage.getItem('notes-smeac')).toBe('keep');
    storage.failKey = '';
    storage.setItem(OPERATIONS_KEY, '{"v":999}');
    await expect(store().initialize()).rejects.toThrow(/index/);
    expect(storage.getItem(OPERATIONS_KEY)).toBe('{"v":999}');
    expect(storage.getItem('notes-smeac')).toBe('keep');
  });

  it('recognizes every existing plan key without including unrelated storage', () => {
    for (const key of [
      'inline-note-new-field',
      'notes-smeac',
      'pcc-convoy-gear',
      'pci-mission-people',
      'order-meta',
      'brief-rubric',
      'tasking-builder',
      'casevac-plan',
      'casevac-bg-hlz',
      'casevac-bg-ccp',
      'casevac-bg-route',
    ]) {
      expect(isOperationKey(key), key).toBe(true);
    }
    for (const key of [
      'blackout-mode',
      'casevac-sub',
      'active-view',
      'unrelated',
      OPERATIONS_KEY,
    ]) {
      expect(isOperationKey(key), key).toBe(false);
    }
  });

  it('invalidates stale tabs on reset without reusing the old physical namespace', async () => {
    const { storage, store } = setup();
    const oldTab = store();
    const oldKey = oldTab.scopedKey('notes-tools');
    storage.setItem(oldKey, 'old notes');
    await store().reset('default');
    expect(() => oldTab.scopedKey('notes-tools')).toThrow(/reset/);
    expect(store().scopedKey('notes-tools')).not.toBe(oldKey);
    expect(storage.getItem(oldKey)).toBeNull();
  });

  it('serializes index changes using the supplied origin-wide lock', async () => {
    const storage = new MemoryStorage();
    let serial = Promise.resolve();
    let nextId = 0;
    const withLock = <T>(action: () => T): Promise<T> => {
      const result = serial.then(action);
      serial = result.then(
        () => undefined,
        () => undefined
      );
      return result;
    };
    const options = { newId: () => `id-${++nextId}`, withLock };
    const a = new OperationStore(storage, options);
    const b = new OperationStore(storage, options);
    await Promise.all([a.create('Alpha'), b.create('Bravo')]);
    expect(a.list().map((p) => p.name)).toEqual(['Default operation', 'Alpha', 'Bravo']);
  });

  it('rolls back staged data and preferences when the final index cannot be written', async () => {
    const { storage, store } = setup();
    const page = store();
    await page.initialize();
    storage.setItem('notes-tools', 'keep original');
    storage.setItem('blackout-mode', 'false');
    const originalIndex = storage.getItem(OPERATIONS_KEY);
    storage.failKey = OPERATIONS_KEY;
    await expect(
      page.importSnapshots(
        [
          {
            id: 'source',
            name: 'Imported',
            createdAt: '2026-10-22T12:00:00Z',
            data: { 'notes-tools': 'incoming' },
          },
        ],
        { 'blackout-mode': 'true' }
      )
    ).rejects.toThrow();
    expect(storage.getItem(OPERATIONS_KEY)).toBe(originalIndex);
    expect(storage.getItem('notes-tools')).toBe('keep original');
    expect(storage.getItem('blackout-mode')).toBe('false');
    expect([...storage.data.keys()].some((k) => k.startsWith('op:'))).toBe(false);
    expect(storage.getItem(STAGING_KEY)).toBeNull();
  });

  it('recovers abandoned import payloads and preferences before initializing', async () => {
    const { storage, store } = setup();
    storage.setItem('notes-tools', 'keep original');
    storage.setItem('op:abandoned:g1:notes-tools', 'partial import');
    storage.setItem('blackout-mode', 'true');
    storage.setItem(
      STAGING_KEY,
      JSON.stringify({ v: 1, ids: ['abandoned'], preferences: { 'blackout-mode': 'false' } })
    );
    await store().initialize();
    expect(storage.getItem('op:abandoned:g1:notes-tools')).toBeNull();
    expect(storage.getItem('notes-tools')).toBe('keep original');
    expect(storage.getItem('blackout-mode')).toBe('false');
    expect(storage.getItem(STAGING_KEY)).toBeNull();
  });

  it('does not report a committed import as failed if journal cleanup is interrupted', async () => {
    const { storage, store } = setup();
    const remove = storage.removeItem.bind(storage);
    let interrupt = true;
    storage.removeItem = (key) => {
      if (key === STAGING_KEY && interrupt) {
        interrupt = false;
        throw new Error('Interrupted');
      }
      remove(key);
    };
    const imported = await store().importSnapshots([
      {
        id: 'source',
        name: 'Imported',
        createdAt: '2026-10-22T12:00:00Z',
        data: { 'notes-tools': 'incoming' },
      },
    ]);
    expect(imported).toHaveLength(1);
    await store().initialize();
    expect(store().snapshot(imported[0].id).data['notes-tools']).toBe('incoming');
    expect(storage.getItem(STAGING_KEY)).toBeNull();
  });

  it('rejects unsupported import fields before writing recovery metadata', async () => {
    const { storage, store } = setup();
    await expect(
      store().importSnapshots([
        {
          id: 'source',
          name: 'Imported',
          createdAt: '2026-10-22T12:00:00Z',
          data: { unrelated: 'do not write' },
        },
      ])
    ).rejects.toThrow();
    expect(storage.getItem(STAGING_KEY)).toBeNull();
    await expect(
      store().importSnapshots(
        [{ id: 'source', name: 'Imported', createdAt: '2026-10-22T12:00:00Z', data: {} }],
        { unrelated: 'do not write' }
      )
    ).rejects.toThrow();
    expect(storage.getItem(STAGING_KEY)).toBeNull();
    expect(storage.getItem('unrelated')).toBeNull();
  });

  it('gives restored copies distinguishable names without changing their data', async () => {
    const { store } = setup();
    const page = store();
    const snapshot = page.snapshot('default');
    const first = await page.importSnapshots([snapshot]);
    const second = await page.importSnapshots([snapshot]);
    expect(new Set(page.list().map((plan) => plan.name)).size).toBe(3);
    expect(first[0].name).toContain('restored');
    expect(second[0].name).not.toBe(first[0].name);
    expect(page.snapshot(first[0].id).data).toEqual(snapshot.data);
  });

  it('leaves all existing state unchanged when any import write runs out of space', async () => {
    for (const failAt of [1, 2, 3, 4]) {
      const { storage, store } = setup();
      const page = store();
      await page.initialize();
      storage.setItem('notes-tools', 'keep');
      storage.setItem('blackout-mode', 'false');
      const original = new Map(storage.data);
      const set = storage.setItem.bind(storage);
      let writes = 0;
      storage.setItem = (key, value) => {
        if (++writes === failAt) throw new Error('Quota exceeded');
        set(key, value);
      };
      await expect(page.importSnapshots([{ id: 'source', name: 'Import', createdAt: '2026-10-22T12:00:00Z', data: { 'notes-tools': 'new' } }], { 'blackout-mode': 'true' })).rejects.toThrow();
      expect(storage.data, `write ${failAt}`).toEqual(original);
    }
  });
});
