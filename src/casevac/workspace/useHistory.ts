import { useCallback, useRef, useState } from 'react';

const LIMIT = 60;
const COALESCE_MS = 800;

export interface SetOptions {
  /** Live update with no undo step (mid-drag). Call `checkpoint()` once before the first. */
  transient?: boolean;
  /** Consecutive edits with the same key inside 800 ms become one undo step (typing). */
  coalesce?: string;
}

interface Stacks<T> {
  present: T;
  past: T[];
  future: T[];
}

/**
 * Undo/redo over whole snapshots. Plans are a few KB, so snapshots are cheaper and far
 * simpler than diffs. One step per gesture: drags checkpoint at the start and update
 * transiently; typing coalesces per field.
 */
export function useHistory<T>(initial: () => T) {
  const [s, setS] = useState<Stacks<T>>(() => ({ present: initial(), past: [], future: [] }));
  const last = useRef<{ key: string; at: number } | null>(null);

  const checkpoint = useCallback(() => {
    last.current = null;
    setS((st) => ({ ...st, past: [...st.past, st.present].slice(-LIMIT), future: [] }));
  }, []);

  const set = useCallback((fn: (prev: T) => T, opts: SetOptions = {}) => {
    const now = Date.now();
    const same =
      !!opts.coalesce && last.current?.key === opts.coalesce && now - last.current.at < COALESCE_MS;
    if (!opts.transient) last.current = opts.coalesce ? { key: opts.coalesce, at: now } : null;
    setS((st) => {
      const next = fn(st.present);
      if (next === st.present) return st;
      if (opts.transient || same) return { ...st, present: next };
      return { present: next, past: [...st.past, st.present].slice(-LIMIT), future: [] };
    });
  }, []);

  const undo = useCallback(() => {
    last.current = null;
    setS((st) =>
      st.past.length
        ? {
            present: st.past[st.past.length - 1],
            past: st.past.slice(0, -1),
            future: [...st.future, st.present],
          }
        : st
    );
  }, []);

  const redo = useCallback(() => {
    last.current = null;
    setS((st) =>
      st.future.length
        ? {
            present: st.future[st.future.length - 1],
            past: [...st.past, st.present],
            future: st.future.slice(0, -1),
          }
        : st
    );
  }, []);

  /** Replace everything (import) and start a fresh history. */
  const reset = useCallback((next: T) => {
    last.current = null;
    setS({ present: next, past: [], future: [] });
  }, []);

  return {
    present: s.present,
    set,
    checkpoint,
    undo,
    redo,
    reset,
    canUndo: s.past.length > 0,
    canRedo: s.future.length > 0,
  };
}
