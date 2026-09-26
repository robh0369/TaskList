import { expect, test } from '@playwright/test';

// A real touch drag (not mouse), the way it happens on a phone.
test('touch-drag a task to another priority lane', async ({ page }) => {
  await page.goto('./');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.getByRole('button', { name: /Alex/ }).click();
  await page.goto('./#/settings');
  await page.getByTestId('import-starter-settings').click();
  await page.goto('./#/tasks');
  await page.getByTestId('filter-category').selectOption({ label: 'Hire out' });

  const handle = page.getByTestId('lane-low').getByTestId('task-row').filter({ hasText: 'Patch woodpecker holes' }).getByTestId('drag-handle');
  await handle.evaluate((el) => el.scrollIntoView({ block: 'center' }));
  const hb = (await handle.boundingBox())!;
  const tb = (await page.getByTestId('lane-med').boundingBox())!;
  const cdp = await page.context().newCDPSession(page);
  const x = hb.x + hb.width / 2;
  const touch = (type: string, y: number) =>
    cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y }] });
  await touch('touchStart', hb.y + hb.height / 2);
  const endY = tb.y + tb.height / 2;
  for (let i = 1; i <= 10; i++) await touch('touchMove', hb.y + hb.height / 2 + ((endY - hb.y - hb.height / 2) * i) / 10);
  await expect(page.locator('.drag-ghost')).toBeVisible();
  await touch('touchEnd', endY);

  await expect(page.getByTestId('lane-med').getByTestId('task-row').filter({ hasText: 'Patch woodpecker holes' })).toBeVisible();
});
