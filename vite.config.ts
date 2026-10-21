import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  const rawAppUrl = process.env.APP_URL || '';
  // Convert -dev- internal URL to -pre- public shared URL
  const publicSharedUrl = rawAppUrl.replace('-dev-', '-pre-');

  return {
    base: './',
    define: {
      'import.meta.env.VITE_APP_URL': JSON.stringify(rawAppUrl),
      'import.meta.env.VITE_SHARED_APP_URL': JSON.stringify(publicSharedUrl),
    },
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
