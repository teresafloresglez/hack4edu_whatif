import type { Plugin } from 'vite';
import { defineConfig } from 'vitest/config';
import { serviceWorkerSource } from './src/sw-source.ts';

// Genera un service worker con la lista de archivos de la compilación
// para que la app funcione 100 % sin conexión tras la primera visita.
function offlineServiceWorker(): Plugin {
  return {
    name: 'whatif-offline-sw',
    apply: 'build',
    generateBundle(_opts, bundle) {
      const files = Object.keys(bundle).filter((f) => !f.endsWith('.map'));
      const precache = ['./', ...files.map((f) => './' + f), './favicon.svg', './logo-64.png', './logo-192.png', './manifest.webmanifest'];
      const version = Date.now().toString(36);
      const sw = serviceWorkerSource(precache, version);
      this.emitFile({ type: 'asset', fileName: 'sw.js', source: sw });
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [offlineServiceWorker()],
  build: { target: 'es2019', assetsInlineLimit: 0 },
  test: {
    environment: 'happy-dom',
    include: ['tests/**/*.test.ts'],
    testTimeout: 20000,
  },
});
