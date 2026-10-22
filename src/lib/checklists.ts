import { readItem } from './storage';

/**
 * Single source of truth for every PCC/PCI checklist's storage key. Referenced both by
 * the CHECKLISTS export registry below and by the storageKey prop on each
 * <EditableChecklist> in the TOOLS tab JSX, so a rename can't silently desync the two
 * (it becomes a compile error instead of every checklist exporting "[No items]").
 */
export const CHECKLIST_KEYS = {
  convoyGear: 'pcc-convoy-gear',
  convoyPeople: 'pci-convoy-people',
  missionGear: 'pcc-mission-gear',
  missionPeople: 'pci-mission-people',
  genericGear: 'pcc-generic-gear',
  genericPeople: 'pci-generic-people',
} as const;

/**
 * Registry of every PCC/PCI checklist, grouped by scenario, so the exporters can include
 * user-edited checklist items without duplicating the scenario/label strings that also live
 * in the TOOLS tab JSX.
 */
export const CHECKLISTS: { storageKey: string; label: string; scenario: string }[] = [
  { storageKey: CHECKLIST_KEYS.convoyGear, label: 'Gear (PCC)', scenario: 'Convoy' },
  { storageKey: CHECKLIST_KEYS.convoyPeople, label: 'People (PCI)', scenario: 'Convoy' },
  { storageKey: CHECKLIST_KEYS.missionGear, label: 'Gear (PCC)', scenario: 'Executing a Mission' },
  {
    storageKey: CHECKLIST_KEYS.missionPeople,
    label: 'People (PCI)',
    scenario: 'Executing a Mission',
  },
  {
    storageKey: CHECKLIST_KEYS.genericGear,
    label: 'Gear (PCC)',
    scenario: 'Generic / Any Tasking',
  },
  {
    storageKey: CHECKLIST_KEYS.genericPeople,
    label: 'People (PCI)',
    scenario: 'Generic / Any Tasking',
  },
];

export interface ChecklistItem {
  id: string;
  text: string;
}

/** Reads a checklist's item text, tolerating both the legacy string[] and current {id,text}[] shapes. */
export function getChecklistItemTexts(storageKey: string): string[] {
  try {
    const raw = readItem(storageKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((entry) => (typeof entry === 'string' ? entry : (entry?.text ?? '')))
      .filter((text): text is string => Boolean(text));
  } catch (e) {
    console.error('Failed to read checklist', storageKey, e);
    return [];
  }
}

export function newChecklistItemId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `item-${crypto.randomUUID()}`;
  }
  // Fallback for contexts where crypto.randomUUID is unavailable (e.g. some file:// hosts).
  return `item-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/**
 * Migrate legacy string[] checklist storage to {id,text}[] and validate deserialized
 * objects at runtime (a TS assertion alone wouldn't catch a corrupted/hand-edited entry
 * missing `id` — which would break delete/edit: handleDelete(undefined) would remove
 * every valid item instead of one, and items sharing `undefined` ids would co-edit).
 * Idempotent.
 */
export function normalizeChecklistItems(parsed: unknown, fallback: string[]): ChecklistItem[] {
  const source: unknown[] = Array.isArray(parsed) ? parsed : fallback;
  return source.map((entry) => {
    if (typeof entry === 'string') {
      return { id: newChecklistItemId(), text: entry };
    }
    const candidate = entry as Partial<ChecklistItem> | null | undefined;
    return {
      id: typeof candidate?.id === 'string' && candidate.id ? candidate.id : newChecklistItemId(),
      text: typeof candidate?.text === 'string' ? candidate.text : '',
    };
  });
}
