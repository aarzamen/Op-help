/** Storage names are a compatibility contract. Default keeps the original namespace. */
export const OPERATIONS_KEY = 'operations';
export const STAGING_KEY = 'operations-staging';
export const PREFERENCE_KEYS = ['blackout-mode', 'active-view', 'casevac-sub'] as const;
export type KeyValueStore = Pick<Storage, 'length' | 'key' | 'getItem' | 'setItem' | 'removeItem'>;
export interface OperationMeta {
  id: string;
  name: string;
  createdAt: string;
  generation: string;
}
export interface OperationSnapshot {
  id: string;
  name: string;
  createdAt: string;
  data: Record<string, string>;
}
interface Index {
  v: 1;
  activeId: string;
  items: OperationMeta[];
}
export interface StoreOptions {
  newId?: () => string;
  now?: () => string;
  withLock?: <T>(action: () => T) => Promise<T>;
}

const validId = (value: unknown): value is string =>
  typeof value === 'string' && /^[A-Za-z0-9_-]{1,80}$/.test(value);
const validName = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0 && value.length <= 80;
const validDate = (value: unknown): value is string =>
  typeof value === 'string' && value.length <= 40 && Number.isFinite(Date.parse(value));
const record = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);

export function isOperationKey(key: string): boolean {
  return (
    /^inline-note-[A-Za-z0-9_-]+$/.test(key) ||
    /^(pcc|pci)-[A-Za-z0-9_-]+$/.test(key) ||
    [
      'notes-smeac',
      'notes-mettt',
      'notes-tools',
      'order-meta',
      'brief-rubric',
      'tasking-builder',
      'casevac-plan',
      'casevac-bg-hlz',
      'casevac-bg-ccp',
      'casevac-bg-route',
    ].includes(key)
  );
}

/** Pure storage model. Mutations run under one origin-wide lock supplied by the browser. */
export class OperationStore {
  private selected: { id: string; generation: string } | null = null;
  private newId: () => string;
  private now: () => string;
  private withLock: <T>(action: () => T) => Promise<T>;

  constructor(
    private storage: KeyValueStore,
    options: StoreOptions = {}
  ) {
    this.newId = options.newId ?? (() => crypto.randomUUID());
    this.now = options.now ?? (() => new Date().toISOString());
    this.withLock = options.withLock ?? (async (action) => action());
  }

  private keys(): string[] {
    return Array.from({ length: this.storage.length }, (_, i) => this.storage.key(i)).filter(
      (key): key is string => key !== null
    );
  }

  private readIndex(): Index {
    const raw = this.storage.getItem(OPERATIONS_KEY);
    if (raw === null)
      return {
        v: 1,
        activeId: 'default',
        items: [
          {
            id: 'default',
            name: 'Default operation',
            createdAt: this.now(),
            generation: 'legacy',
          },
        ],
      };
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new Error('The plans index is unreadable; stored data was left unchanged.');
    }
    if (
      !record(parsed) ||
      parsed.v !== 1 ||
      !Array.isArray(parsed.items) ||
      parsed.items.length < 1 ||
      parsed.items.length > 100 ||
      !parsed.items.every(
        (item) =>
          record(item) &&
          validId(item.id) &&
          validId(item.generation) &&
          validName(item.name) &&
          validDate(item.createdAt)
      ) ||
      new Set(parsed.items.map((item) => item.id)).size !== parsed.items.length ||
      !parsed.items.some((item) => item.id === 'default') ||
      !parsed.items.some((item) => item.id === parsed.activeId) ||
      parsed.items.some((item) => item.id !== 'default' && item.generation === 'legacy')
    ) {
      throw new Error('The plans index is invalid; stored data was left unchanged.');
    }
    return parsed as unknown as Index;
  }

  private saveIndex(index: Index) {
    this.storage.setItem(OPERATIONS_KEY, JSON.stringify(index));
  }
  private find(index: Index, id: string): OperationMeta {
    const operation = index.items.find((item) => item.id === id);
    if (!operation) throw new Error('This plan was removed in another tab. Reload before editing.');
    return operation;
  }
  private prefix(meta: OperationMeta): string {
    return meta.id === 'default' && meta.generation === 'legacy'
      ? ''
      : `op:${meta.id}:${meta.generation}:`;
  }
  private dataKeys(meta: OperationMeta): string[] {
    const prefix = this.prefix(meta);
    return this.keys().filter((key) => (prefix ? key.startsWith(prefix) : isOperationKey(key)));
  }
  private freshId(index: Index): string {
    for (let n = 0; n < 20; n++) {
      const id = this.newId();
      if (
        validId(id) &&
        id !== 'default' &&
        id !== 'legacy' &&
        !index.items.some((item) => item.id === id) &&
        !this.keys().some((key) => key.startsWith(`op:${id}:`))
      )
        return id;
    }
    throw new Error('Could not allocate a new plan. Try again.');
  }

  /** Recover only our fresh-ID staging area; never infer deletion targets from file data. */
  private recover() {
    const raw = this.storage.getItem(STAGING_KEY);
    if (raw === null) return;
    let journal: unknown;
    try {
      journal = JSON.parse(raw);
    } catch {
      throw new Error('An interrupted import needs recovery; stored plans were left unchanged.');
    }
    if (
      !record(journal) ||
      journal.v !== 1 ||
      !Array.isArray(journal.ids) ||
      journal.ids.length > 100 ||
      !journal.ids.every((id) => validId(id) && id !== 'default') ||
      !record(journal.preferences) ||
      Object.entries(journal.preferences).some(
        ([key, value]) =>
          !PREFERENCE_KEYS.includes(key as (typeof PREFERENCE_KEYS)[number]) ||
          (value !== null && (typeof value !== 'string' || value.length > 1000))
      )
    ) {
      throw new Error('Interrupted-import metadata is invalid; stored plans were left unchanged.');
    }
    const index = this.readIndex();
    const committed = journal.ids.filter((id) => index.items.some((item) => item.id === id));
    if (committed.length && committed.length !== journal.ids.length) {
      throw new Error(
        'Interrupted-import metadata conflicts with saved plans; no data was removed.'
      );
    }
    if (!committed.length) {
      for (const id of journal.ids)
        for (const key of this.keys()) {
          if (key.startsWith(`op:${id}:`)) this.storage.removeItem(key);
        }
      for (const [key, value] of Object.entries(journal.preferences)) {
        if (value === null) this.storage.removeItem(key);
        else this.storage.setItem(key, value as string);
      }
    }
    this.storage.removeItem(STAGING_KEY);
  }

  initialize(): Promise<void> {
    return this.withLock(() => {
      this.recover();
      if (this.storage.getItem(OPERATIONS_KEY) === null) this.saveIndex(this.readIndex());
      else this.readIndex();
    });
  }
  list(): OperationMeta[] {
    return this.readIndex().items;
  }
  activeId(): string {
    if (!this.selected) {
      const index = this.readIndex();
      const meta = this.find(index, index.activeId);
      this.selected = { id: meta.id, generation: meta.generation };
    }
    return this.selected.id;
  }
  scopedKey(key: string): string {
    if (!isOperationKey(key)) return key;
    const id = this.activeId();
    const meta = this.find(this.readIndex(), id);
    if (meta.generation !== this.selected!.generation) {
      throw new Error('This plan was reset in another tab. Reload before editing.');
    }
    return this.prefix(meta) + key;
  }
  private mutate<T>(action: (index: Index) => T): Promise<T> {
    return this.withLock(() => {
      this.recover();
      return action(this.readIndex());
    });
  }
  create(name: string): Promise<OperationMeta> {
    this.activeId();
    return this.mutate((index) => {
      if (!validName(name)) throw new Error('Give the plan a name of 1–80 characters.');
      if (index.items.length >= 100)
        throw new Error('Back up and delete a plan before adding more.');
      const id = this.freshId(index);
      const meta = { id, name: name.trim(), createdAt: this.now(), generation: this.newId() };
      if (!validId(meta.generation) || meta.generation === 'legacy')
        throw new Error('Could not allocate a plan generation.');
      this.saveIndex({ ...index, activeId: id, items: [...index.items, meta] });
      return meta;
    });
  }
  select(id: string): Promise<void> {
    this.activeId();
    return this.mutate((index) => {
      this.find(index, id);
      this.saveIndex({ ...index, activeId: id });
    });
  }
  rename(id: string, name: string): Promise<void> {
    return this.mutate((index) => {
      this.find(index, id);
      if (!validName(name)) throw new Error('Give the plan a name of 1–80 characters.');
      this.saveIndex({
        ...index,
        items: index.items.map((item) => (item.id === id ? { ...item, name: name.trim() } : item)),
      });
    });
  }
  remove(id: string): Promise<void> {
    return this.mutate((index) => {
      if (id === 'default') throw new Error('Default operation can be reset, but not deleted.');
      const meta = this.find(index, id);
      this.saveIndex({
        ...index,
        activeId: index.activeId === id ? 'default' : index.activeId,
        items: index.items.filter((item) => item.id !== id),
      });
      for (const key of this.dataKeys(meta)) this.storage.removeItem(key);
    });
  }
  reset(id: string): Promise<void> {
    return this.mutate((index) => {
      const meta = this.find(index, id);
      const generation = this.newId();
      if (!validId(generation) || generation === meta.generation || generation === 'legacy')
        throw new Error('Could not reset the plan safely.');
      this.saveIndex({
        ...index,
        items: index.items.map((item) => (item.id === id ? { ...item, generation } : item)),
      });
      for (const key of this.dataKeys(meta)) this.storage.removeItem(key);
    });
  }
  /** Explicit user-requested wipe. Corrupt metadata must not prevent erasing local data. */
  wipe(): Promise<void> {
    return this.withLock(() => {
      const previous = this.storage.getItem(OPERATIONS_KEY) ?? '';
      let generation = '';
      for (let attempt = 0; attempt < 20; attempt++) {
        const candidate = this.newId();
        if (
          validId(candidate) &&
          candidate !== 'legacy' &&
          !previous.includes(JSON.stringify(candidate))
        ) {
          generation = candidate;
          break;
        }
      }
      if (!generation) throw new Error('Could not invalidate old editing tabs. Nothing was wiped.');
      // Commit a fresh generation first: stale tabs cannot recreate erased operational data.
      this.saveIndex({
        v: 1,
        activeId: 'default',
        items: [{ id: 'default', name: 'Default operation', createdAt: this.now(), generation }],
      });
      for (const key of this.keys()) {
        if (
          isOperationKey(key) ||
          key.startsWith('op:') ||
          key === STAGING_KEY ||
          PREFERENCE_KEYS.includes(key as (typeof PREFERENCE_KEYS)[number])
        ) {
          this.storage.removeItem(key);
          if (this.storage.getItem(key) !== null)
            throw new Error(
              'Some saved data could not be wiped. Keep this page open and try again.'
            );
        }
      }
    });
  }
  snapshot(id: string): OperationSnapshot {
    const meta = this.find(this.readIndex(), id);
    const prefix = this.prefix(meta);
    const data: Record<string, string> = {};
    for (const key of this.dataKeys(meta)) {
      const logical = key.slice(prefix.length);
      const value = this.storage.getItem(key);
      if (isOperationKey(logical) && value !== null) data[logical] = value;
    }
    return { id: meta.id, name: meta.name, createdAt: meta.createdAt, data };
  }
  preferences(): Record<string, string> {
    return Object.fromEntries(
      PREFERENCE_KEYS.flatMap((key) => {
        const value = this.storage.getItem(key);
        return value === null ? [] : [[key, value]];
      })
    );
  }
  /** Input has already passed operationBackup validation. Imports always create copies. */
  importSnapshots(
    snapshots: OperationSnapshot[],
    preferences: Record<string, string> = {},
    activeSourceId?: string
  ): Promise<OperationMeta[]> {
    this.activeId();
    return this.mutate((index) => {
      if (!snapshots.length || index.items.length + snapshots.length > 100)
        throw new Error('The backup contains too many plans.');
      if (
        snapshots.some(
          (snapshot) =>
            !validName(snapshot.name) ||
            !validDate(snapshot.createdAt) ||
            Object.entries(snapshot.data).some(
              ([key, value]) => !isOperationKey(key) || typeof value !== 'string'
            )
        ) ||
        Object.entries(preferences).some(
          ([key, value]) =>
            !PREFERENCE_KEYS.includes(key as (typeof PREFERENCE_KEYS)[number]) ||
            typeof value !== 'string'
        )
      ) {
        throw new Error('The backup contains unsupported data.');
      }
      const allocated: Index = { ...index, items: [...index.items] };
      const added = snapshots.map((snapshot) => {
        const id = this.freshId(allocated);
        let name = snapshot.name;
        for (let copy = 1; allocated.items.some((item) => item.name === name); copy++) {
          const suffix = copy === 1 ? ' (restored)' : ` (restored ${copy})`;
          name = snapshot.name.slice(0, 80 - suffix.length) + suffix;
        }
        const meta = {
          id,
          name,
          createdAt: snapshot.createdAt,
          generation: this.newId(),
        };
        if (!validId(meta.generation) || meta.generation === 'legacy')
          throw new Error('Could not allocate a plan generation.');
        allocated.items.push(meta);
        return meta;
      });
      const before = Object.fromEntries(
        Object.keys(preferences).map((key) => [key, this.storage.getItem(key)])
      );
      this.storage.setItem(
        STAGING_KEY,
        JSON.stringify({ v: 1, ids: added.map((meta) => meta.id), preferences: before })
      );
      try {
        snapshots.forEach((snapshot, i) => {
          for (const [key, value] of Object.entries(snapshot.data)) {
            if (!isOperationKey(key))
              throw new Error('The backup contains an unsupported storage key.');
            this.storage.setItem(this.prefix(added[i]) + key, value);
          }
        });
        for (const [key, value] of Object.entries(preferences)) {
          if (!PREFERENCE_KEYS.includes(key as (typeof PREFERENCE_KEYS)[number]))
            throw new Error('Unsupported preference.');
          this.storage.setItem(key, value);
        }
        const selected = Math.max(
          0,
          snapshots.findIndex((snapshot) => snapshot.id === activeSourceId)
        );
        this.saveIndex({ ...allocated, activeId: added[selected].id });
      } catch (error) {
        this.recover();
        throw error;
      }
      // If cleanup is interrupted, recovery sees all IDs in the committed index and keeps them.
      try {
        this.storage.removeItem(STAGING_KEY);
      } catch {
        /* Committed; recover on next start. */
      }
      return added;
    });
  }
}
