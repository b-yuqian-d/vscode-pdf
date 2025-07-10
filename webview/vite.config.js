import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    lib: {
      entry: 'pdfjsViewer.ts',
      fileName: 'pdfjsViewer',
      formats: ['es'],
    },
    outDir: 'out',
  }
})
