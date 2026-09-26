import { expect, test, type Page } from '@playwright/test';

const shots = process.env.SCREENSHOTS ? 'e2e/screenshots/' : '';
const tab = (page: Page, name: string) => page.getByRole('navigation', { name: 'Main' }).getByRole('button', { name });
const titles = (page: Page, lane: string) => page.getByTestId(`lane-${lane}`).locator('.task-title').allTextContents();
const hireOut = async (page: Page) => {
  await page.getByRole('button', { name: 'Everyone' }).click();
  await page.getByTestId('filter-category').selectOption({ label: 'Hire out' });
};

test('load starting list, reorder within a section, move between sections, delete', async ({ page }) => {
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
  await hireOut(page);
  await expect(page.getByTestId('lane-high').getByTestId('task-row')).toHaveCount(3);
  await expect(page.getByTestId('lane-low').getByTestId('task-row')).toHaveCount(3);
  if (shots) await page.screenshot({ path: `${shots}p1-board.png` });

  // Reorder within High: drag the last task above the first.
  expect(await titles(page, 'high')).toEqual(['Mop floors', 'Shampoo all carpets', 'Clean all bathrooms, showers & drains']);
  const lastHandle = page.getByTestId('lane-high').getByTestId('task-row').filter({ hasText: 'Clean all bathrooms' }).getByTestId('drag-handle');
  await lastHandle.evaluate((el) => el.scrollIntoView({ block: 'center' }));
  const lb = (await lastHandle.boundingBox())!;
  const firstRow = (await page.getByTestId('lane-high').getByTestId('task-row').first().boundingBox())!;
  await page.mouse.move(lb.x + lb.width / 2, lb.y + lb.height / 2);
  await page.mouse.down();
  await page.mouse.move(lb.x, firstRow.y + 8, { steps: 12 });
  await expect(page.getByTestId('drop-line')).toHaveCount(1);
  await expect(page.getByTestId('lane-high')).not.toHaveClass(/lane-over/);
  if (shots) await page.screenshot({ path: `${shots}p1b-reorder.png` });
  await page.mouse.up();
  await expect(page.getByTestId('drop-line')).toHaveCount(0);
  expect(await titles(page, 'high')).toEqual(['Clean all bathrooms, showers & drains', 'Mop floors', 'Shampoo all carpets']);

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

  // Keyboard: ArrowUp moves one place up within the section.
  await page.getByTestId('lane-high').getByTestId('task-row').filter({ hasText: 'Shampoo all carpets' }).getByTestId('drag-handle').focus();
  await page.keyboard.press('ArrowUp');
  await expect.poll(() => titles(page, 'high')).toEqual(['Clean all bathrooms, showers & drains', 'Shampoo all carpets', 'Mop floors']);

  // ArrowDown on the last High task crosses into the top of Medium.
  await page.getByTestId('lane-high').getByTestId('task-row').filter({ hasText: 'Mop floors' }).getByTestId('drag-handle').focus();
  await page.keyboard.press('ArrowDown');
  await expect.poll(async () => (await titles(page, 'med'))[0]).toBe('Mop floors');

  // The order sticks after a reload (saved, not just on screen).
  await page.reload();
  await tab(page, 'Tasks').click();
  await hireOut(page);
  expect(await titles(page, 'high')).toEqual(['Clean all bathrooms, showers & drains', 'Shampoo all carpets']);
  expect((await titles(page, 'med'))[0]).toBe('Mop floors');

  // Drag onto the trash zone to delete, then undo.
  const victim = page.getByTestId('lane-low').getByTestId('task-row').filter({ hasText: 'Front door wood repair' });
  const vh = victim.getByTestId('drag-handle');
  await vh.evaluate((el) => el.scrollIntoView({ block: 'center' }));
  const vb = (await vh.boundingBox())!;
  await page.mouse.move(vb.x + vb.width / 2, vb.y + vb.height / 2);
  await page.mouse.down();
  await expect(page.getByTestId('trash-zone')).toBeVisible();
  const vp = page.viewportSize()!;
  await page.mouse.move(vp.width / 2, vp.height - 40, { steps: 12 });
  await expect(page.getByTestId('trash-zone')).toHaveClass(/is-over/);
  if (shots) await page.screenshot({ path: `${shots}p4-trash.png` });
  await page.mouse.up();
  await expect(page.getByRole('status')).toContainText('Task deleted');
  await expect(page.getByTestId('trash-zone')).toHaveCount(0);
  await expect(page.getByTestId('task-row').filter({ hasText: 'Front door wood repair' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(page.getByTestId('task-row').filter({ hasText: 'Front door wood repair' })).toBeVisible();
});
