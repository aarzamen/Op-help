import { afterEach, beforeEach, expect, it, vi } from 'vitest';

let data: Map<string, string>;
let onWrite: (key: string) => void;
beforeEach(() => {
  vi.resetModules();
  data = new Map();
  onWrite = () => {};
  const events = new EventTarget();
  vi.stubGlobal(
    'window',
    Object.assign(events, {
      localStorage: {
        get length() {
          return data.size;
        },
        key: (i: number) => [...data.keys()][i] ?? null,
        getItem: (key: string) => data.get(key) ?? null,
        setItem: (key: string, value: string) => {
          data.set(key, value);
          onWrite(key);
        },
        removeItem: (key: string) => {
          data.delete(key);
        },
      },
    })
  );
  vi.stubGlobal('navigator', {
    locks: { request: async (_name: string, action: () => unknown) => action() },
  });
});
afterEach(() => vi.unstubAllGlobals());

it('keeps read, write and remove in the same operation namespace', async () => {
  const { operations, safeSetItem, readItem, removeItem } = await import('./storage');
  await operations.initialize();
  safeSetItem('notes-tools', 'original');
  const created = await operations.create('Second');
  expect(data.get('notes-tools')).toBe('original');
  // A new document picks the persisted selection, while this document stays pinned.
  vi.resetModules();
  const next = await import('./storage');
  expect(next.operations.activeId()).toBe(created.id);
  expect(next.readItem('notes-tools')).toBe('');
  expect(next.safeSetItem('notes-tools', 'second')).toBe(true);
  expect(next.readItem('notes-tools')).toBe('second');
  expect(readItem('notes-tools')).toBe('original');
  next.removeItem('notes-tools');
  expect(next.readItem('notes-tools')).toBe('');
  expect(data.get('notes-tools')).toBe('original');
  expect(removeItem('notes-tools')).toBe(true);
});

it('removes a stale physical write if reset occurs between key resolution and persistence', async () => {
  const { operations, safeSetItem } = await import('./storage');
  await operations.initialize();
  operations.activeId();
  onWrite = (key) => {
    if (key !== 'notes-tools') return;
    onWrite = () => {};
    const index = JSON.parse(data.get('operations')!);
    index.items[0].generation = 'reset-elsewhere';
    data.set('operations', JSON.stringify(index));
  };
  expect(safeSetItem('notes-tools', 'stale text')).toBe(false);
  expect(data.has('notes-tools')).toBe(false);
});
