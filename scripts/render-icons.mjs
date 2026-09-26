// Renders the SVG app icons to the PNG sizes iOS/Android need.
// Usage: node scripts/render-icons.mjs  (set PW_CHROMIUM to use a specific Chromium binary)
import { chromium } from '@playwright/test';
import fs from 'node:fs';

const dir = new URL('../public/icons/', import.meta.url).pathname;
const browser = await chromium.launch(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {});
const page = await browser.newPage();
const jobs = [
  ['maskable.svg', 'icon-180.png', 180], // iOS rounds corners itself; transparent corners would render black
  ['icon.svg', 'icon-192.png', 192],
  ['icon.svg', 'icon-512.png', 512],
  ['maskable.svg', 'maskable-512.png', 512],
];
for (const [src, out, size] of jobs) {
  await page.setViewportSize({ width: size, height: size });
  const svg = fs.readFileSync(dir + src, 'utf8').replace('<svg ', `<svg width="${size}" height="${size}" `);
  await page.setContent(`<body style="margin:0">${svg}</body>`);
  await page.screenshot({ path: dir + out, omitBackground: true });
}
await browser.close();
