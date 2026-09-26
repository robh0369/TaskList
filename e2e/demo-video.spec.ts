import { expect, test } from '@playwright/test';

const shots = process.env.SCREENSHOTS ? 'e2e/screenshots/' : '';

test('Settings > Demo Video opens and plays the highlight video', async ({ page }) => {
  await page.goto('./');
  await page.evaluate(() => localStorage.clear());
  await page.goto('./#/settings');
  await page.getByRole('button', { name: /Alex/ }).first().click();
  await page.goto('./#/settings');

  const card = page.getByTestId('demo-video');
  await expect(card).toContainText('Demo Video');
  if (shots) await page.screenshot({ path: `${shots}d1-settings.png` });

  await card.click();
  const dialog = page.getByRole('dialog', { name: 'Demo Video' });
  await expect(dialog).toBeVisible();
  const video = dialog.locator('video');
  // The video file is served where the player points.
  const src = await video.evaluate((v: HTMLVideoElement) => v.currentSrc || v.src);
  const res = await page.request.get(src);
  expect(res.status()).toBe(200);
  expect(res.headers()['content-type']).toContain('video/mp4');
  // Phones decode H.264; Playwright's open-source Chromium can't, so only check playback where it can.
  if (await video.evaluate((v: HTMLVideoElement) => v.canPlayType('video/mp4; codecs="avc1.640028"'))) {
    await expect.poll(() => video.evaluate((v: HTMLVideoElement) => Math.round(v.duration))).toBe(45);
  }
  if (shots) await page.screenshot({ path: `${shots}d2-player.png` });

  await page.getByRole('button', { name: 'Close video' }).click();
  await expect(dialog).toHaveCount(0);
});
