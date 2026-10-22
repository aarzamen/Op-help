import { describe, expect, it } from 'vitest';
import {
  MIN_MPP,
  cameraBox,
  clampCamera,
  fitCamera,
  limitZoom,
  screenToWorld,
  worldToScreen,
  zoomAt,
} from './camera';

const view = { minX: -200, minY: -150, w: 400, h: 300 };
const size = { w: 390, h: 700 };

describe('camera', () => {
  it('maps screen ↔ world both ways (y up in world, down on screen)', () => {
    const cam = { cx: 10, cy: 20, mpp: 0.5 };
    const w = screenToWorld(cam, size, 0, 0);
    expect(w).toEqual({ x: 10 - 195 * 0.5, y: 20 + 350 * 0.5 });
    const back = worldToScreen(cam, size, w);
    expect(back.x).toBeCloseTo(0);
    expect(back.y).toBeCloseTo(0);
  });

  it('fits the whole sheet with a margin', () => {
    const cam = fitCamera(view, size);
    const box = cameraBox(cam, size);
    expect(box.minX).toBeLessThanOrEqual(view.minX);
    expect(box.minY).toBeLessThanOrEqual(view.minY);
    expect(box.minX + box.w).toBeGreaterThanOrEqual(view.minX + view.w);
    expect(box.minY + box.h).toBeGreaterThanOrEqual(view.minY + view.h);
    // Width-limited on a portrait phone: the sheet spans 88 % of the screen width.
    expect(view.w / cam.mpp).toBeCloseTo(size.w * 0.88);
  });

  it('zooms about the pointer, keeping that world point fixed', () => {
    const cam = fitCamera(view, size);
    const before = screenToWorld(cam, size, 300, 120);
    const z = zoomAt(cam, size, 2.5, 300, 120);
    const after = screenToWorld(z, size, 300, 120);
    expect(z.mpp).toBeCloseTo(cam.mpp / 2.5);
    expect(after.x).toBeCloseTo(before.x);
    expect(after.y).toBeCloseTo(before.y);
  });

  it('stops zooming cleanly at the limits instead of drifting', () => {
    const fit = fitCamera(view, size);
    const atMax = { ...fit, mpp: MIN_MPP };
    expect(limitZoom(atMax, view, size, 2)).toBeCloseTo(1); // no further in
    const z = zoomAt(atMax, size, limitZoom(atMax, view, size, 2), 50, 60);
    expect(z.cx).toBeCloseTo(atMax.cx);
    expect(z.cy).toBeCloseTo(atMax.cy);
    expect(limitZoom(fit, view, size, 0.001)).toBeCloseTo(0.25); // out to 4x the fit
  });

  it('clamps zoom and keeps the paper reachable', () => {
    const fit = fitCamera(view, size).mpp;
    expect(clampCamera({ cx: 0, cy: 0, mpp: 0.0001 }, view, size).mpp).toBe(MIN_MPP);
    expect(clampCamera({ cx: 0, cy: 0, mpp: 1e6 }, view, size).mpp).toBeCloseTo(fit * 4);
    const far = clampCamera({ cx: 1e6, cy: -1e6, mpp: fit }, view, size);
    expect(far.cx).toBe(view.minX + view.w * 1.5);
    expect(far.cy).toBe(view.minY - view.h * 0.5);
  });
});
