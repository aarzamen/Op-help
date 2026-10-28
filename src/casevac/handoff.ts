import {
  normalizeBackground,
  normalizePlan,
  type Background,
  type CasevacPlan,
  type SheetId,
} from './model';
import { fileSlug } from './host';

/**
 * Move a plan between devices without a server.
 *
 * Link: `#cv=<payload>` on the app's own URL. The fragment never leaves the browser, so the
 * plan isn't sent to any host. Payload = `z` + base64url(deflate-raw(JSON)) where the
 * browser has CompressionStream, else `j` + base64url(JSON). Images are left out (size).
 *
 * File: JSON with the plan and its background images, for AirDrop / email / Files.
 */

const KEY = 'cv=';
const FILE_KIND = 'opord-analyst/casevac';

const toB64url = (bytes: Uint8Array) => {
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

const fromB64url = (s: string) => {
  const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/'));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
};

const canCompress = () =>
  typeof CompressionStream !== 'undefined' && typeof DecompressionStream !== 'undefined';

/** A plan without images is a few KB of JSON; anything far bigger isn't one of ours. */
const MAX_PAYLOAD = 256 * 1024;
const MAX_PLAN_BYTES = 1024 * 1024;

async function pipe(bytes: Uint8Array, stream: CompressionStream | DecompressionStream) {
  const out = new Blob([bytes as BlobPart]).stream().pipeThrough(stream);
  return new Uint8Array(await new Response(out).arrayBuffer());
}

/** Inflate, giving up past `max` bytes so a crafted link can't balloon in memory. */
async function inflateLimited(bytes: Uint8Array, max: number): Promise<Uint8Array | null> {
  const reader = new Blob([bytes as BlobPart])
    .stream()
    .pipeThrough(new DecompressionStream('deflate-raw'))
    .getReader();
  const parts: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.length;
    if (total > max) {
      await reader.cancel();
      return null;
    }
    parts.push(value);
  }
  const out = new Uint8Array(total);
  let at = 0;
  for (const p of parts) {
    out.set(p, at);
    at += p.length;
  }
  return out;
}

/** A link that opens this app with the plan attached (images excluded). */
export async function planLink(plan: CasevacPlan): Promise<string> {
  const json = new TextEncoder().encode(JSON.stringify(plan));
  let payload = `j${toB64url(json)}`;
  if (canCompress()) {
    try {
      payload = `z${toB64url(await pipe(json, new CompressionStream('deflate-raw')))}`;
    } catch {
      // Older engines have CompressionStream but not 'deflate-raw': send it uncompressed.
    }
  }
  const url = new URL(window.location.href);
  url.hash = KEY + payload;
  return url.toString();
}

/** The plan payload in the current address, if any. */
export function incomingPayload(): string | null {
  const h = window.location.hash.replace(/^#/, '');
  return h.startsWith(KEY) ? h.slice(KEY.length) : null;
}

/** Drop the payload from the address bar (keeps history clean and the plan off screenshots). */
export function clearIncoming() {
  window.history.replaceState(null, '', window.location.pathname + window.location.search);
}

export async function decodePayload(payload: string): Promise<CasevacPlan | null> {
  try {
    if (payload.length > MAX_PAYLOAD) return null;
    const kind = payload[0];
    const bytes = fromB64url(payload.slice(1));
    let text: string;
    if (kind === 'z') {
      if (!canCompress()) return null;
      const raw = await inflateLimited(bytes, MAX_PLAN_BYTES);
      if (!raw) return null;
      text = new TextDecoder().decode(raw);
    } else if (kind === 'j') text = new TextDecoder().decode(bytes);
    else return null;
    return normalizePlan(JSON.parse(text));
  } catch {
    return null;
  }
}

export type Backgrounds = Record<SheetId, Background | null>;

export function planFile(plan: CasevacPlan, bg: Backgrounds): File {
  const body = {
    kind: FILE_KIND,
    version: 1,
    exported: new Date().toISOString(),
    plan,
    backgrounds: bg,
  };
  const name = `CASEVAC_${fileSlug(plan.hlz.name || 'plan')}.json`;
  return new File([JSON.stringify(body)], name, { type: 'application/json' });
}

export async function readPlanFile(
  file: File
): Promise<{ plan: CasevacPlan; backgrounds: Backgrounds } | null> {
  if (file.size > 25 * 1024 * 1024) return null;
  try {
    const raw = JSON.parse(await file.text());
    if (raw?.kind !== FILE_KIND) return null;
    const plan = normalizePlan(raw.plan);
    if (!plan) return null;
    const b = raw.backgrounds ?? {};
    return {
      plan,
      backgrounds: {
        hlz: normalizeBackground(b.hlz),
        ccp: normalizeBackground(b.ccp),
        route: normalizeBackground(b.route),
      },
    };
  } catch {
    return null;
  }
}

export type ShareResult = 'shared' | 'copied' | 'downloaded' | 'cancelled' | 'failed';

/** Share sheet where there is one (AirDrop, Messages), else copy the link. */
export async function shareLink(url: string, title: string): Promise<ShareResult> {
  if (navigator.share) {
    try {
      await navigator.share({ title, url });
      return 'shared';
    } catch (e) {
      if ((e as Error).name === 'AbortError') return 'cancelled';
    }
  }
  try {
    await navigator.clipboard.writeText(url);
    return 'copied';
  } catch {
    return 'failed';
  }
}

/** Share a file where the browser can (iOS → AirDrop / Files), else download it. */
export async function shareFile(file: File): Promise<ShareResult> {
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: file.name });
      return 'shared';
    } catch (e) {
      if ((e as Error).name === 'AbortError') return 'cancelled';
    }
  }
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = file.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return 'downloaded';
}
