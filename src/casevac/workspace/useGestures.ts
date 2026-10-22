import { useEffect, useRef } from 'react';
import type { Vec } from '../geo';
import { clampCamera, screenToWorld, zoomAt, type Camera, type Size } from './camera';
import type { ViewBox } from '../hlz';

/**
 * Pointer state machine for the workspace canvas: tap / drag item / pan / pinch / wheel.
 * Lives in refs (no re-render per pointer event); the only React state it touches is the
 * camera and whatever the callbacks do.
 */
export interface GestureHandlers {
  /** The item under a pointer-down target, or null for empty paper. */
  hitTest: (target: Element | null) => string | null;
  canDrag: (id: string) => boolean;
  itemPos: (id: string) => Vec | null;
  onTap: (id: string | null, world: Vec) => void;
  onDragStart: (id: string) => void;
  onDragMove: (id: string, pos: Vec) => void;
  onDragEnd: (id: string, pos: Vec) => void;
  snap: (p: Vec) => Vec;
}

interface Pt {
  x: number;
  y: number;
}

type Mode =
  | { kind: 'idle' }
  | { kind: 'pending'; id: string | null; start: Pt; t: number; touch: boolean }
  | { kind: 'drag'; id: string; off: Vec; last: Vec }
  | { kind: 'pan'; start: Pt; cam0: Camera }
  | { kind: 'pinch'; dist0: number; mid0: Pt; cam0: Camera };

const dist = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y);
const mid = (a: Pt, b: Pt): Pt => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

export function useGestures(opts: {
  el: React.RefObject<HTMLElement | null>;
  cam: Camera;
  setCam: (c: Camera) => void;
  size: Size;
  view: ViewBox;
  handlers: GestureHandlers;
}) {
  // Latest values for the native listeners without re-binding them every render.
  const live = useRef(opts);
  useEffect(() => {
    live.current = opts;
  });
  const pointers = useRef(new Map<number, Pt>());
  const mode = useRef<Mode>({ kind: 'idle' });

  useEffect(() => {
    const el = opts.el.current;
    if (!el) return;

    const local = (e: PointerEvent | WheelEvent): Pt => {
      const r = el.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    };
    const setCam = (c: Camera) => {
      const { view, size } = live.current;
      live.current.setCam(clampCamera(c, view, size));
    };
    const world = (p: Pt) => screenToWorld(live.current.cam, live.current.size, p.x, p.y);

    const startPinch = () => {
      const [a, b] = [...pointers.current.values()];
      mode.current = {
        kind: 'pinch',
        dist0: Math.max(1, dist(a, b)),
        mid0: mid(a, b),
        cam0: live.current.cam,
      };
    };
    const startPan = (p: Pt) => {
      mode.current = { kind: 'pan', start: p, cam0: live.current.cam };
    };
    const endDrag = () => {
      const m = mode.current;
      if (m.kind === 'drag') live.current.handlers.onDragEnd(m.id, m.last);
    };

    const down = (e: PointerEvent) => {
      if (e.pointerType === 'mouse' && e.button !== 0 && e.button !== 1) return;
      try {
        el.setPointerCapture(e.pointerId);
      } catch {
        /* synthetic or already-released pointer: moves still arrive while over the canvas */
      }
      const p = local(e);
      pointers.current.set(e.pointerId, p);
      if (pointers.current.size === 2) {
        endDrag();
        startPinch();
        return;
      }
      if (pointers.current.size > 2) return;
      if (e.button === 1) return startPan(p);
      const id = live.current.handlers.hitTest(e.target as Element);
      mode.current = {
        kind: 'pending',
        id,
        start: p,
        t: performance.now(),
        touch: e.pointerType !== 'mouse',
      };
    };

    const move = (e: PointerEvent) => {
      if (!pointers.current.has(e.pointerId)) return;
      const p = local(e);
      pointers.current.set(e.pointerId, p);
      const m = mode.current;
      const { handlers, size } = live.current;
      if (m.kind === 'pinch') {
        const [a, b] = [...pointers.current.values()];
        if (!a || !b) return;
        const c = mid(a, b);
        const z = zoomAt(m.cam0, size, dist(a, b) / m.dist0, m.mid0.x, m.mid0.y);
        setCam({ ...z, cx: z.cx - (c.x - m.mid0.x) * z.mpp, cy: z.cy + (c.y - m.mid0.y) * z.mpp });
        return;
      }
      if (m.kind === 'pending') {
        if (dist(p, m.start) < (m.touch ? 8 : 4)) return;
        if (m.id && handlers.canDrag(m.id)) {
          const at = handlers.itemPos(m.id);
          const w = world(m.start);
          if (at) {
            mode.current = {
              kind: 'drag',
              id: m.id,
              off: { x: w.x - at.x, y: w.y - at.y },
              last: at,
            };
            handlers.onDragStart(m.id);
          } else startPan(m.start);
        } else startPan(m.start);
      }
      const m2 = mode.current;
      if (m2.kind === 'drag') {
        const w = world(p);
        const pos = handlers.snap({ x: w.x - m2.off.x, y: w.y - m2.off.y });
        if (pos.x !== m2.last.x || pos.y !== m2.last.y) {
          m2.last = pos;
          handlers.onDragMove(m2.id, pos);
        }
      } else if (m2.kind === 'pan') {
        const { mpp } = m2.cam0;
        setCam({
          ...m2.cam0,
          cx: m2.cam0.cx - (p.x - m2.start.x) * mpp,
          cy: m2.cam0.cy + (p.y - m2.start.y) * mpp,
        });
      }
    };

    const up = (e: PointerEvent) => {
      if (!pointers.current.has(e.pointerId)) return;
      const p = local(e);
      pointers.current.delete(e.pointerId);
      const m = mode.current;
      if (m.kind === 'pinch') {
        const rest = [...pointers.current.values()];
        if (rest.length === 1) startPan(rest[0]);
        else mode.current = { kind: 'idle' };
        return;
      }
      if (e.type === 'pointerup' && m.kind === 'pending' && performance.now() - m.t < 700) {
        live.current.handlers.onTap(m.id, world(p));
      }
      endDrag();
      if (pointers.current.size === 0) mode.current = { kind: 'idle' };
    };

    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      const p = local(e);
      const { cam, size } = live.current;
      // Trackpad pinch arrives as ctrl+wheel with small deltas; mouse wheels as larger steps.
      const k = e.ctrlKey ? 0.01 : 0.0015;
      const factor = Math.exp(-e.deltaY * k);
      if (!e.ctrlKey && (Math.abs(e.deltaX) > Math.abs(e.deltaY) || e.shiftKey)) {
        setCam({ ...cam, cx: cam.cx + (e.deltaX || e.deltaY) * cam.mpp });
        return;
      }
      setCam(zoomAt(cam, size, factor, p.x, p.y));
    };

    // iOS Safari fires its own pinch-zoom gestures on top of pointer events; cancel them.
    const gesture = (e: Event) => e.preventDefault();

    el.addEventListener('pointerdown', down);
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    el.addEventListener('wheel', wheel, { passive: false });
    el.addEventListener('gesturestart', gesture);
    el.addEventListener('gesturechange', gesture);
    return () => {
      el.removeEventListener('pointerdown', down);
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up);
      el.removeEventListener('pointercancel', up);
      el.removeEventListener('wheel', wheel);
      el.removeEventListener('gesturestart', gesture);
      el.removeEventListener('gesturechange', gesture);
    };
  }, [opts.el]);
}
