import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import type { Plugin } from 'vite';

/**
 * Emits `dist/sw.js`: tools/sw.js with the list of every built and public file prepended,
 * so the first online visit caches the whole app and it opens offline afterwards. The
 * version is a hash of that list and of the public files' contents, so any deploy that
 * changes a file installs a fresh cache and drops the old one.
 */
export function serviceWorker(): Plugin {
  let root = '';
  let publicDir = '';
  return {
    name: 'opord-service-worker',
    apply: 'build',
    enforce: 'post',
    configResolved(config) {
      root = config.root;
      publicDir = config.publicDir;
    },
    generateBundle(_options, bundle) {
      // .woff duplicates the .woff2 fonts for old browsers; those fetch it online if ever.
      const built = Object.keys(bundle).filter(
        (f) => !f.endsWith('.map') && !f.endsWith('.woff') && f !== 'sw.js'
      );
      const pub = publicDir ? readdirSync(publicDir) : [];
      const files = [...new Set(['./', ...[...built, ...pub].map((f) => `./${f}`)])].sort();
      const hash = createHash('sha256').update(files.join('\n'));
      for (const f of pub) hash.update(readFileSync(path.join(publicDir, f)));
      const version = hash.digest('hex').slice(0, 12);
      const worker = readFileSync(path.resolve(root, 'tools/sw.js'), 'utf8');
      this.emitFile({
        type: 'asset',
        fileName: 'sw.js',
        source: `const VERSION = '${version}';\nconst PRECACHE = ${JSON.stringify(files, null, 2)};\n\n${worker}`,
      });
    },
  };
}
