import type { Vec } from '../geo';
import type { ViewBox } from '../hlz';

/**
 * The workspace camera: a world-space center and a scale in meters per CSS pixel. The SVG
 * viewBox is derived from it and the container size, so zoom and pan never re-compute the
 * sketch geometry.
 */
export interface Camera {
  cx: number;
  cy: number;
  mpp: number;
}

export interface Size {
  w: number;
  h: number;
}

export const MIN_MPP = 0.05;

export function cameraBox(cam: Camera, size: Size): ViewBox {
  const w = size.w * cam.mpp;
  const h = size.h * cam.mpp;
  return { minX: cam.cx - w / 2, minY: cam.cy - h / 2, w, h };
}

export function fitCamera(view: ViewBox, size: Size, margin = 0.06): Camera {
  const sw = Math.max(1, size.w * (1 - margin * 2));
  const sh = Math.max(1, size.h * (1 - margin * 2));
  return {
    cx: view.minX + view.w / 2,
    cy: view.minY + view.h / 2,
    mpp: Math.max(view.w / sw, view.h / sh),
  };
}

/** Keep the paper on screen: center inside the sheet grown by 50 %, zoom within limits. */
export function clampCamera(cam: Camera, view: ViewBox, size: Size): Camera {
  const fit = fitCamera(view, size).mpp;
  const mpp = Math.min(Math.max(cam.mpp, MIN_MPP), fit * 4);
  const padX = view.w * 0.5;
  const padY = view.h * 0.5;
  return {
    mpp,
    cx: Math.min(Math.max(cam.cx, view.minX - padX), view.minX + view.w + padX),
    cy: Math.min(Math.max(cam.cy, view.minY - padY), view.minY + view.h + padY),
  };
}

/** Screen point (px from the container's top-left) → world point. */
export const screenToWorld = (cam: Camera, size: Size, sx: number, sy: number): Vec => ({
  x: cam.cx + (sx - size.w / 2) * cam.mpp,
  y: cam.cy - (sy - size.h / 2) * cam.mpp,
});

/** World point → screen point (px from the container's top-left). */
export const worldToScreen = (cam: Camera, size: Size, p: Vec): Vec => ({
  x: (p.x - cam.cx) / cam.mpp + size.w / 2,
  y: (cam.cy - p.y) / cam.mpp + size.h / 2,
});

/**
 * The part of a zoom `factor` that stays inside the zoom limits, so zooming at a limit
 * stops cleanly instead of panning the view (zoomAt re-centers for the scale it is given).
 */
export function limitZoom(cam: Camera, view: ViewBox, size: Size, factor: number): number {
  const fit = fitCamera(view, size).mpp;
  const mpp = Math.min(Math.max(cam.mpp / factor, MIN_MPP), fit * 4);
  return cam.mpp / mpp;
}

/** Zoom by `factor` (>1 zooms in) keeping the world point under (sx, sy) fixed. */
export function zoomAt(cam: Camera, size: Size, factor: number, sx: number, sy: number): Camera {
  const anchor = screenToWorld(cam, size, sx, sy);
  const mpp = cam.mpp / factor;
  return {
    mpp,
    cx: anchor.x - (sx - size.w / 2) * mpp,
    cy: anchor.y + (sy - size.h / 2) * mpp,
  };
}
