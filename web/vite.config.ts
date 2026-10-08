import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // Relative asset URLs so the same bundle loads from any deployment subpath,
  // a Capacitor asset folder, or an Android WebView file origin.
  base: './',
  plugins: [react()],
  server: {
    port: 3000,
    host: true
  }
});
