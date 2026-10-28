/// <reference types="vitest/config" />
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import path from 'path';
import { defineConfig } from 'vite';
import { serviceWorker } from './tools/serviceWorker';

const git = (args: string, fallback: string) => {
  try {
    return execSync(`git ${args}`, { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim();
  } catch {
    return fallback;
  }
};

/** Version, commit, branch and build time, so any copy of the app says which build it is.
 * "+dirty" marks a build made with uncommitted changes. */
const buildStamp = () => {
  const pkg = JSON.parse(readFileSync(path.resolve(__dirname, 'package.json'), 'utf8'));
  const sha = git('rev-parse --short HEAD', 'nogit');
  return {
    version: pkg.version,
    sha: sha + (sha !== 'nogit' && git('status --porcelain', '') ? '+dirty' : ''),
    branch: git('rev-parse --abbrev-ref HEAD', 'unknown'),
    date: new Date().toISOString().slice(0, 16).replace('T', ' ') + 'Z',
  };
};

export default defineConfig(() => {
  return {
    define: { __BUILD__: JSON.stringify(buildStamp()) },
    // Relative asset URLs, so `dist/` works at a domain root or under any subpath
    // (ChatGPT Sites, GitHub Pages, any static host). The app has no client-side routes.
    base: './',
    plugins: [react(), tailwindcss(), serviceWorker()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    test: {
      include: ['src/**/*.test.ts'],
      environment: 'node',
    },
  };
});
