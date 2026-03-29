import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    manifest: true,
    rollupOptions: {
      input: [resolve(__dirname, 'client-entry.tsx')],
      output: {
        manualChunks: undefined,
        inlineDynamicImports: true,
        format: 'iife',
      },
    },
  },
});
