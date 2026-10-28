import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { describe, expect, it } from 'vitest';

const scope = 'https://opord.example/';
const script = readFileSync(new URL('../../tools/sw.js', import.meta.url), 'utf8');

/** Model the browser Cache API's Vary matching while running the actual worker handler. */
function offlineWorker() {
  let onFetch: (event: { request: Request; respondWith: (r: Promise<Response>) => void }) => void;
  const stored = new Map(
    ['assets/app.js', 'assets/app.css', 'private.txt'].map((file) => [
      new URL(file, scope).href,
      {
        request: new Request(new URL(file, scope)),
        response: new Response(file, { headers: { Vary: 'Origin' } }),
      },
    ])
  );
  runInNewContext(
    `const VERSION = 'test'; const PRECACHE = ['./', './assets/app.js', './assets/app.css'];\n${script}`,
    {
      URL,
      Response,
      self: {
        registration: { scope },
        location: { origin: new URL(scope).origin },
        addEventListener(name: string, handler: typeof onFetch) {
          if (name === 'fetch') onFetch = handler;
        },
      },
      caches: {
        async match(request: Request, options?: { ignoreVary?: boolean }) {
          const entry = stored.get(request.url);
          if (!entry) return undefined;
          if (
            !options?.ignoreVary &&
            request.headers.get('Origin') !== entry.request.headers.get('Origin')
          )
            return undefined;
          return entry.response.clone();
        },
      },
      fetch: async () => {
        throw new TypeError('Network is offline');
      },
    }
  );
  return (file: string) => {
    let response: Promise<Response>;
    onFetch({
      request: new Request(new URL(file, scope), { headers: { Origin: new URL(scope).origin } }),
      respondWith(value) {
        response = value;
      },
    });
    return response!;
  };
}

describe('offline service worker on hosts that send Vary: Origin', () => {
  it('serves precached module and stylesheet responses to browser CORS requests', async () => {
    const fetchOffline = offlineWorker();
    for (const file of ['assets/app.js', 'assets/app.css']) {
      expect(await (await fetchOffline(file)).text()).toBe(file);
    }
  });

  it('preserves Vary matching for responses outside the explicit precache', async () => {
    await expect(offlineWorker()('private.txt')).rejects.toThrow('Network is offline');
  });
});
