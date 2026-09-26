import { expect, test } from '@playwright/test';

// A real touch drag (not mouse), the way it happens on a phone.
test('touch-drag: reorder within a section and move to another', async ({ page }) => {
  await page.goto('./');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.getByRole('button', { name: /Alex/ }).click();
  await page.goto('./#/settings');
  await page.getByTestId('import-starter-settings').click();
  await page.goto('./#/tasks');
  await page.getByRole('button', { name: 'Everyone' }).click();
  await page.getByTestId('filter-category').selectOption({ label: 'Hire out' });

  const cdp = await page.context().newCDPSession(page);
  const drag = async (x: number, fromY: number, toY: number) => {
    const touch = (type: string, y: number) =>
      cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y }] });
    await touch('touchStart', fromY);
    for (let i = 1; i <= 10; i++) await touch('touchMove', fromY + ((toY - fromY) * i) / 10);
    await expect(page.locator('.drag-ghost')).toBeVisible();
    await touch('touchEnd', toY);
  };
  const lowTitles = () => page.getByTestId('lane-low').locator('.task-title').allTextContents();

  // Reorder within Low: move "Fix flashing" (last) above "Patch woodpecker holes" (first).
  expect(await lowTitles()).toEqual(['Patch woodpecker holes', 'Front door wood repair', 'Fix flashing']);
  const last = page.getByTestId('lane-low').getByTestId('task-row').filter({ hasText: 'Fix flashing' }).getByTestId('drag-handle');
  await last.evaluate((el) => el.scrollIntoView({ block: 'center' }));
  const lb = (await last.boundingBox())!;
  const first = (await page.getByTestId('lane-low').getByTestId('task-row').first().boundingBox())!;
  await drag(lb.x + lb.width / 2, lb.y + lb.height / 2, first.y + 8);
  await expect.poll(lowTitles).toEqual(['Fix flashing', 'Patch woodpecker holes', 'Front door wood repair']);

  const handle = page.getByTestId('lane-low').getByTestId('task-row').filter({ hasText: 'Patch woodpecker holes' }).getByTestId('drag-handle');
  await handle.evaluate((el) => el.scrollIntoView({ block: 'center' }));
  const hb = (await handle.boundingBox())!;
  const tb = (await page.getByTestId('lane-med').boundingBox())!;
  await drag(hb.x + hb.width / 2, hb.y + hb.height / 2, tb.y + tb.height / 2);

  await expect(page.getByTestId('lane-med').getByTestId('task-row').filter({ hasText: 'Patch woodpecker holes' })).toBeVisible();
});
