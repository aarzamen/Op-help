import { describe, expect, it } from 'vitest';
import { decodePayload } from './handoff';
import { defaultPlan } from './model';

const b64url = (bytes: Uint8Array) =>
  Buffer.from(bytes).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

async function deflateRaw(bytes: Uint8Array) {
  const out = new Blob([bytes as BlobPart])
    .stream()
    .pipeThrough(new CompressionStream('deflate-raw'));
  return new Uint8Array(await new Response(out).arrayBuffer());
}

describe('decodePayload', () => {
  const plan = defaultPlan();
  plan.hlz.name = 'HLZ CROW';
  const json = new TextEncoder().encode(JSON.stringify(plan));

  it('reads an uncompressed (j) payload', async () => {
    const got = await decodePayload(`j${b64url(json)}`);
    expect(got?.hlz.name).toBe('HLZ CROW');
    expect(got?.route.nodes.map((n) => n.id)).toEqual(plan.route.nodes.map((n) => n.id));
  });

  it('reads a compressed (z) payload', async () => {
    const got = await decodePayload(`z${b64url(await deflateRaw(json))}`);
    expect(got?.hlz.name).toBe('HLZ CROW');
  });

  it('returns null for junk instead of throwing', async () => {
    for (const p of [
      '',
      'x123',
      'j!!!',
      `j${b64url(new TextEncoder().encode('{"v":9}'))}`,
      'zAAAA',
    ]) {
      expect(await decodePayload(p)).toBeNull();
    }
  });
});
