import { useState } from 'react';

// --- Toast / storage helpers ---

export type ToastType = 'success' | 'error';

/** Fire a transient toast from anywhere in the tree (App renders it). */
export function notify(msg: string, type: ToastType = 'success') {
  window.dispatchEvent(new CustomEvent('app-toast', { detail: { msg, type } }));
}

/** localStorage.setItem that never throws mid-keystroke (e.g. QuotaExceededError). */
export function safeSetItem(key: string, value: string): boolean {
  try {
    window.localStorage.setItem(key, value);
    return true;
  } catch (e) {
    console.error('localStorage write failed', e);
    notify('Storage full — changes may not be saved', 'error');
    return false;
  }
}

/** localStorage.getItem that never throws (private mode / blocked storage) and never returns null. */
export function readItem(key: string): string {
  try {
    return window.localStorage.getItem(key) ?? '';
  } catch {
    return '';
  }
}

/** Parse a JSON value from storage, falling back on a missing or corrupted entry. */
export function readJson<T>(key: string, fallback: T): T {
  const raw = readItem(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch (e) {
    console.error('Corrupt JSON in storage', key, e);
    return fallback;
  }
}

/** Storage key for a per-section notes field (convention: `inline-note-<id>`). */
export const noteKey = (id: string) => `inline-note-${id}`;

export const readNote = (id: string) => readItem(noteKey(id));

/** Fired after a note's stored value changes outside its own textarea. */
export const NOTE_CHANGED_EVENT = 'note-changed';

/**
 * Append a line to a notes field in storage, then tell any mounted InlineNotes to reload.
 * Writing storage first means the append also lands when the target field's tab isn't
 * mounted (e.g. "insert into ORDER ¶4" from the CASEVAC tab) — it reads storage on mount.
 */
export function appendNote(id: string, text: string): boolean {
  const prev = readNote(id);
  const next = prev ? `${prev}\n${text}` : text;
  const ok = safeSetItem(noteKey(id), next);
  if (ok) window.dispatchEvent(new CustomEvent(NOTE_CHANGED_EVENT, { detail: { id } }));
  return ok;
}

export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((val: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => readJson(key, initialValue));

  const setValue = (value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      // Route through safeSetItem so a QuotaExceededError surfaces a toast instead of
      // silently dropping the write (same hardening as InlineNotes/NotesBlock).
      safeSetItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.log(error);
    }
  };

  return [storedValue, setValue];
}

/** Copy text to the clipboard with a toast either way. */
export function copyText(text: string, okMsg = 'COPIED TO CLIPBOARD') {
  if (!navigator.clipboard) {
    notify('Clipboard unavailable — needs a secure (https) context', 'error');
    return;
  }
  navigator.clipboard
    .writeText(text)
    .then(() => notify(okMsg, 'success'))
    .catch((err) => {
      console.error('Failed to copy', err);
      notify('Copy failed — check clipboard permissions', 'error');
    });
}
