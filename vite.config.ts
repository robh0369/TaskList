import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';

// GitHub Pages serves the site from /<repo-name>/. Relative base keeps it working
// under any repo name and locally.
export default defineConfig({
  base: './',
  plugins: [preact()],
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.test.ts'],
  },
} as any);
