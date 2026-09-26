// Renders the 45-second highlight video: captures promo/stage.html frame by
// frame in Chromium, then encodes H.264 + the music track with ffmpeg-static.
//   npm run promo            full render -> public/demo/ (shown in Settings > Demo Video)
//   npm run promo -- --stills   one frame per scene -> promo/frames/
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from '@playwright/test';
import ffmpeg from 'ffmpeg-static';

const here = dirname(fileURLToPath(import.meta.url));
const FPS = 30;
const DURATION = 45;
const W = 1080;
const H = 1920;
const MUSIC = join(here, 'music.m4a');
const OUT_DIR = join(here, '..', 'public', 'demo');
const OUT = join(OUT_DIR, 'tasklist-demo.mp4');

// Scene cuts snapped to accents in the track (~116 BPM, 8-beat phrases).
const CUTS = [0, 4.06, 10.81, 16.35, 23.72, 28.37, 32.0, 36.65, 40.53, 45];

const stills = process.argv.includes('--stills');

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
const page = await browser.newPage({ viewport: { width: W, height: H } });
await page.goto(pathToFileURL(join(here, 'stage.html')).href);
await page.evaluate(async (cuts) => {
  window.CUTS = cuts;
  await document.fonts.ready;
  await Promise.all([...document.images].map((img) => img.decode().catch(() => {})));
}, CUTS);

const frameAt = async (t, type = 'jpeg') => {
  await page.evaluate((s) => window.renderAt(s), t);
  return page.screenshot(type === 'jpeg' ? { type, quality: 92 } : { type });
};

if (stills) {
  const dir = join(here, 'frames');
  mkdirSync(dir, { recursive: true });
  const { writeFileSync } = await import('node:fs');
  const times = process.argv.slice(3).map(Number).filter((n) => !Number.isNaN(n));
  const list = times.length ? times : CUTS.slice(0, -1).map((c, i) => (c + CUTS[i + 1]) / 2);
  for (const t of list) writeFileSync(join(dir, `t${t.toFixed(2)}.png`), await frameAt(t, 'png'));
  console.log(`wrote ${list.length} stills to ${dir}`);
} else {
  mkdirSync(OUT_DIR, { recursive: true });
  const enc = spawn(ffmpeg, [
    '-y', '-loglevel', 'error',
    '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-',
    '-i', MUSIC,
    '-map', '0:v', '-map', '1:a',
    // The track ends on its own; pad to the full length and soften the last beat.
    '-af', `apad,afade=t=out:st=${DURATION - 1}:d=1`,
    '-t', String(DURATION),
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '192k',
    '-movflags', '+faststart',
    OUT,
  ], { stdio: ['pipe', 'inherit', 'inherit'] });
  const done = new Promise((res, rej) => enc.on('close', (c) => (c ? rej(new Error(`ffmpeg exited ${c}`)) : res())));

  const total = FPS * DURATION;
  for (let i = 0; i < total; i++) {
    const buf = await frameAt(i / FPS);
    if (!enc.stdin.write(buf)) await new Promise((r) => enc.stdin.once('drain', r));
    if (i % 150 === 0) console.log(`frame ${i}/${total}`);
  }
  enc.stdin.end();
  await done;

  const { writeFileSync } = await import('node:fs');
  // Poster: the intro logo, also used as the Settings thumbnail.
  await page.evaluate((s) => window.renderAt(s), 2.5);
  writeFileSync(join(OUT_DIR, 'poster.jpg'), await page.screenshot({ type: 'jpeg', quality: 80 }));
  console.log(`wrote ${OUT}`);
}
await browser.close();
