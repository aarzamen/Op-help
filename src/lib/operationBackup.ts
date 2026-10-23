import { normalizeBackground, normalizePlan } from '../casevac/model';
import {
  PREFERENCE_KEYS,
  isOperationKey,
  type OperationSnapshot,
  type OperationStore,
} from './operationStore';

export const MAX_BACKUP_BYTES = 25 * 1024 * 1024;
const KIND = 'opord-analyst/operations';
export interface OperationBackup {
  kind: typeof KIND;
  version: 1;
  exportedAt: string;
  activeId: string;
  operations: OperationSnapshot[];
  preferences: Record<string, string>;
}
const record = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);
const strings = (value: unknown): value is Record<string, string> =>
  record(value) && Object.values(value).every((v) => typeof v === 'string');
const date = (value: unknown): value is string =>
  typeof value === 'string' && value.length <= 40 && Number.isFinite(Date.parse(value));

/** Compare semantic JSON without losing string contents or depending on object key order. */
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (record(value))
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`)
      .join(',')}}`;
  return JSON.stringify(value);
}

function validateData(key: string, value: string) {
  if (!isOperationKey(key)) throw new Error('The backup contains an unsupported plan field.');
  if (key.startsWith('inline-note-') || key.startsWith('notes-')) return;
  const parsed: unknown = JSON.parse(value);
  if (key === 'casevac-plan') {
    const normalized = normalizePlan(parsed);
    if (!normalized || canonical(normalized) !== canonical(parsed)) {
      throw new Error(
        'A CASEVAC plan has unsupported values. Review its numbers and sketch items before backing up; no saved data was changed.'
      );
    }
    return;
  }
  if (key.startsWith('casevac-bg-')) {
    if (parsed === null) return;
    const normalized = normalizeBackground(parsed);
    if (!normalized || canonical(normalized) !== canonical(parsed))
      throw new Error('A CASEVAC background image is invalid.');
    return;
  }
  if (/^(pcc|pci)-/.test(key)) {
    if (
      !Array.isArray(parsed) ||
      parsed.length > 1000 ||
      !parsed.every(
        (item) =>
          typeof item === 'string' ||
          (record(item) &&
            typeof item.id === 'string' &&
            item.id.length > 0 &&
            item.id.length <= 128 &&
            typeof item.text === 'string')
      )
    )
      throw new Error('A checklist in this backup is invalid.');
    return;
  }
  if (key === 'order-meta') {
    if (
      !strings(parsed) ||
      Object.keys(parsed).some((field) => !['unit', 'operation', 'banner'].includes(field))
    )
      throw new Error('The order header is invalid.');
    return;
  }
  if (key === 'brief-rubric') {
    if (
      !record(parsed) ||
      !record(parsed.done) ||
      !strings(parsed.owner) ||
      Object.values(parsed.done).some((v) => typeof v !== 'boolean')
    )
      throw new Error('The rehearsal tracker is invalid.');
    return;
  }
  if (key === 'tasking-builder') {
    const fields = ['unit', 'role', 'trigger', 'task', 'where', 'purpose', 'priority'];
    if (
      !strings(parsed) ||
      !fields.every((field) => typeof parsed[field] === 'string') ||
      !['ME', 'SE1', 'SE2', 'SE3', 'SE4', 'none'].includes(parsed.role) ||
      !['MHP', 'THP', ''].includes(parsed.priority)
    )
      throw new Error('The tasking draft is invalid.');
  }
}

function validatePreferences(value: unknown): Record<string, string> {
  if (
    !strings(value) ||
    Object.keys(value).some(
      (key) => !PREFERENCE_KEYS.includes(key as (typeof PREFERENCE_KEYS)[number])
    )
  ) {
    throw new Error('The backup contains unsupported preferences.');
  }
  for (const [key, raw] of Object.entries(value)) {
    const parsed: unknown = JSON.parse(raw);
    const valid =
      key === 'blackout-mode'
        ? typeof parsed === 'boolean'
        : key === 'active-view'
          ? ['guide', 'analyze', 'order', 'casevac', 'tools'].includes(parsed as string)
          : ['hlz', 'ccp', 'route', 'nine', 'para'].includes(parsed as string);
    if (!valid) throw new Error('A saved display preference is invalid.');
  }
  return value;
}

/** Validate all content before any imported value can be written to browser storage. */
export function parseBackup(text: string): OperationBackup {
  if (text.length > MAX_BACKUP_BYTES || new TextEncoder().encode(text).length > MAX_BACKUP_BYTES) {
    throw new Error('That backup is too large (maximum 25 MB).');
  }
  try {
    const raw: unknown = JSON.parse(text);
    if (
      !record(raw) ||
      raw.kind !== KIND ||
      raw.version !== 1 ||
      !date(raw.exportedAt) ||
      !Array.isArray(raw.operations) ||
      raw.operations.length < 1 ||
      raw.operations.length > 100
    ) {
      throw new Error('This is not a supported OPORD Analyst backup.');
    }
    const operations = raw.operations.map((item): OperationSnapshot => {
      if (
        !record(item) ||
        typeof item.id !== 'string' ||
        !/^[A-Za-z0-9_-]{1,80}$/.test(item.id) ||
        typeof item.name !== 'string' ||
        !item.name.trim() ||
        item.name.length > 80 ||
        !date(item.createdAt) ||
        !strings(item.data) ||
        Object.keys(item.data).length > 200
      )
        throw new Error('A plan in this backup is invalid.');
      for (const [key, value] of Object.entries(item.data)) validateData(key, value);
      return { id: item.id, name: item.name, createdAt: item.createdAt, data: item.data };
    });
    if (
      new Set(operations.map((item) => item.id)).size !== operations.length ||
      !operations.some((item) => item.id === raw.activeId)
    )
      throw new Error('The backup plan index is invalid.');
    return {
      kind: KIND,
      version: 1,
      exportedAt: raw.exportedAt,
      activeId: raw.activeId as string,
      operations,
      preferences: validatePreferences(raw.preferences),
    };
  } catch (error) {
    if (error instanceof SyntaxError || error instanceof RangeError)
      throw new Error('The backup contains unreadable data. No saved plans were changed.', {
        cause: error,
      });
    throw error;
  }
}

export function serializeBackup(store: OperationStore, all: boolean): string {
  const ids = all ? store.list().map((item) => item.id) : [store.activeId()];
  const backup: OperationBackup = {
    kind: KIND,
    version: 1,
    exportedAt: new Date().toISOString(),
    activeId: store.activeId(),
    operations: ids.map((id) => store.snapshot(id)),
    preferences: store.preferences(),
  };
  const text = JSON.stringify(backup, null, 2);
  // Never advertise a prepared backup that our restore path would refuse.
  parseBackup(text);
  return text;
}
