// Renders the app icons from scripts/icon-source.jpg (a clipboard checklist)
// centered on a white square. Usage: node scripts/render-icons.mjs
// (set PW_CHROMIUM to use a specific Chromium binary)
import { chromium } from '@playwright/test';
import fs from 'node:fs';

const dir = new URL('../public/icons/', import.meta.url).pathname;
const src = 'data:image/jpeg;base64,' + fs.readFileSync(new URL('./icon-source.jpg', import.meta.url)).toString('base64');

// [file, size, artwork height as a share of the icon]
// Regular icons fill more; maskable icons keep the art inside Android's 80% safe circle.
const jobs = [
  ['icon-180.png', 180, 0.78],
  ['icon-192.png', 192, 0.78],
  ['icon-512.png', 512, 0.78],
  ['maskable-512.png', 512, 0.6],
  ['favicon-64.png', 64, 0.86],
];

const browser = await chromium.launch(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {});
const page = await browser.newPage();
for (const [out, size, share] of jobs) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(
    `<body style="margin:0;width:${size}px;height:${size}px;background:#fff;display:grid;place-items:center">` +
      `<img src="${src}" style="height:${Math.round(size * share)}px;width:auto;display:block"></body>`,
  );
  await page.waitForFunction(() => document.images[0].complete);
  await page.screenshot({ path: dir + out });
}
await browser.close();
