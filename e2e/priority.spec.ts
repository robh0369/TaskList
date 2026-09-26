import { expect, test, type Page } from '@playwright/test';

const shots = process.env.SCREENSHOTS ? 'e2e/screenshots/' : '';
const tab = (page: Page, name: string) => page.getByRole('navigation', { name: 'Main' }).getByRole('button', { name });

test('load starting list, then drag a task between priority lanes', async ({ page }) => {
  await page.goto('./');
  await page.evaluate(() => localStorage.clear());
  await page.goto('./#/settings');
  await page.getByRole('button', { name: /Alex/ }).click();

  // Import the handwritten list.
  await page.goto('./#/settings');
  await page.getByTestId('import-starter-settings').click();
  await expect(page.getByRole('status')).toContainText('Added 29 tasks');
  await expect(page.getByTestId('import-starter-settings')).toHaveCount(0);

  // Board groups by priority; filter to the Hire out category.
  await tab(page, 'Tasks').click();
  await expect(page.getByTestId('lane-high')).toBeVisible();
  await page.getByTestId('filter-category').selectOption({ label: 'Hire out' });
  await expect(page.getByTestId('lane-high').getByTestId('task-row')).toHaveCount(3);
  await expect(page.getByTestId('lane-low').getByTestId('task-row')).toHaveCount(3);
  if (shots) await page.screenshot({ path: `${shots}p1-board.png` });

  // Drag "Fix flashing" from Low up to Medium.
  const handle = page.getByTestId('lane-low').getByTestId('task-row').filter({ hasText: 'Fix flashing' }).getByTestId('drag-handle');
  await handle.evaluate((el) => el.scrollIntoView({ block: 'center' }));
  const hb = (await handle.boundingBox())!;
  const tb = (await page.getByTestId('lane-med').boundingBox())!;
  await page.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2);
  await page.mouse.down();
  await page.mouse.move(hb.x, tb.y + tb.height / 2, { steps: 12 });
  await expect(page.locator('.drag-ghost')).toContainText('Fix flashing');
  await expect(page.getByTestId('lane-med')).toHaveClass(/lane-over/);
  if (shots) await page.screenshot({ path: `${shots}p2-dragging.png` });
  await page.mouse.up();

  await expect(page.getByRole('status')).toContainText('Moved to Medium');
  await expect(page.getByTestId('lane-med').getByTestId('task-row').filter({ hasText: 'Fix flashing' })).toBeVisible();
  await expect(page.getByTestId('lane-low').getByTestId('task-row')).toHaveCount(2);
  await expect(page.locator('.drag-ghost')).toHaveCount(0);

  // Keyboard: ArrowUp promotes to High.
  await page.getByTestId('lane-med').getByTestId('task-row').filter({ hasText: 'Fix flashing' }).getByTestId('drag-handle').focus();
  await page.keyboard.press('ArrowUp');
  await expect(page.getByTestId('lane-high').getByTestId('task-row').filter({ hasText: 'Fix flashing' })).toBeVisible();

  // Keyboard: focus a handle and press ArrowDown to demote.
  await page.getByTestId('lane-high').getByTestId('task-row').filter({ hasText: 'Mop floors' }).getByTestId('drag-handle').focus();
  await page.keyboard.press('ArrowDown');
  await expect(page.getByTestId('lane-med').getByTestId('task-row').filter({ hasText: 'Mop floors' })).toBeVisible();

  // Undated high-priority tasks show on Today.
  await tab(page, 'Today').click();
  await page.getByRole('button', { name: 'Everyone' }).click();
  await expect(page.getByText('High priority · no date')).toBeVisible();
  if (shots) await page.screenshot({ path: `${shots}p3-today.png` });
});
