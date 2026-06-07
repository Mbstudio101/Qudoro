import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vitejs.dev/config
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  server: {
    watch: {
      // The Electron renderer only depends on `src/` and `index.html`. Watching
      // the whole project root caused a flood of full-page reloads — and
      // occasional dev-server restarts that blanked the window — whenever
      // unrelated files were touched (landing-dist/, website/, docs/, build
      // output, .github/, editor settings, or cloud-sync re-stamping mtimes on
      // the Desktop). Ignore everything that isn't renderer source.
      ignored: [
        '**/landing-dist/**',
        '**/website/**',
        '**/docs/**',
        '**/dist/**',
        '**/out/**',
        '**/.github/**',
        '**/.vscode/**',
        '**/supabase/**',
        '**/extensions/**',
        '**/.git/**',
        '**/node_modules/**',
        '**/*.md',
        '**/qudoro-RECOVERED-*.json',
      ],
    },
  },
});
