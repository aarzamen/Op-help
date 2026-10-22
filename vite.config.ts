/// <reference types="vitest/config" />
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';
import { serviceWorker } from './tools/serviceWorker';

export default defineConfig(() => {
  return {
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
