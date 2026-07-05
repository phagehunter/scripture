import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base: './' makes every asset reference relative, so the built site works
// when served from a GitHub Pages subdirectory (https://<user>.github.io/<repo>/)
// with zero further configuration. Routing is entirely state-driven (single view,
// no router), so no HashRouter is needed.
export default defineConfig({
  base: './',
  plugins: [react()],
});
