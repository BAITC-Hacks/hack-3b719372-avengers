import { defineConfig } from 'vite';

export default defineConfig({
  define: { 'process.env.NODE_ENV': JSON.stringify('production') },
  build: {
    outDir: 'dist-widget',
    lib: { entry: 'src/widget/entry.jsx', name: 'EktChat', formats: ['iife'], fileName: () => 'widget.js' },
  },
});
