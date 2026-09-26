import { expect, test, type Page } from '@playwright/test';

const shots = process.env.SCREENSHOTS ? 'e2e/screenshots/' : '';
const snap = async (page: Page, name: string) => {
  if (shots) await page.screenshot({ path: `${shots}${name}.png`, fullPage: false });
};

const tab = (page: Page, name: string) => page.getByRole('navigation', { name: 'Main' }).getByRole('button', { name });

test.beforeEach(async ({ page }) => {
  await page.goto('./');
  await page.evaluate(() => localStorage.clear());
  await page.goto('./#/today');
});

test('first run → add, complete, recurring, comments, reports', async ({ page }) => {
  // Pick who this device belongs to.
  await expect(page.getByText("Who's this phone for?")).toBeVisible();
  await snap(page, '0-onboarding');
  await page.getByRole('button', { name: /Alex/ }).click();

  // Today shows seeded tasks.
  await expect(page.getByRole('heading', { name: /Today/ })).toBeVisible();
  await expect(page.getByTestId('task-row').first()).toBeVisible();
  await snap(page, '1-today');

  // Quick-add with shorthand.
  await page.getByTestId('fab').click();
  await page.getByTestId('task-title').fill('Water plants tomorrow @sam #yard every 3 days');
  await expect(page.getByText('Will save as “Water plants”')).toBeVisible();
  await snap(page, '2-new-task');
  await page.getByTestId('save-task').click();
  await page.getByRole('button', { name: 'Everyone' }).click();
  const row = page.getByTestId('task-row').filter({ hasText: 'Water plants' });
  await expect(row).toContainText('Tomorrow');
  await expect(row).toContainText('Yard');
  await expect(row).not.toContainText('🌿');

  // Completing a recurring task rolls it forward instead of removing it.
  await row.getByRole('button', { name: /Complete/ }).click();
  await expect(page.getByRole('status')).toContainText('next due');
  await expect(page.getByTestId('task-row').filter({ hasText: 'Water plants' })).toBeVisible();

  // One-off task completes, and undo brings it back.
  const bill = page.getByTestId('task-row').filter({ hasText: 'Pay electric bill' });
  await bill.getByRole('button', { name: /Complete/ }).click();
  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(page.getByTestId('task-row').filter({ hasText: 'Pay electric bill' }).getByRole('button', { name: /Complete/ })).toBeVisible();

  // Open task sheet, add a comment and a subtask.
  await page.getByTestId('task-row').filter({ hasText: 'Clean out fridge' }).locator('.task-body').click();
  await page.getByLabel('New subtask').fill('Toss old condiments');
  await page.getByRole('button', { name: 'Add subtask' }).click();
  await page.getByLabel('Comment', { exact: true }).fill('Bought baking soda');
  await page.getByRole('button', { name: 'Post comment' }).click();
  await expect(page.getByText('Bought baking soda')).toBeVisible();
  await snap(page, '3-task-sheet');
  await page.getByRole('button', { name: 'Close' }).click();

  // Reports render with data.
  await tab(page, 'Reports').click();
  await expect(page.getByText('Workload split')).toBeVisible();
  await expect(page.getByText('Completed per week')).toBeVisible();
  await expect(page.getByText('By category')).toBeVisible();
  expect(Number(await page.getByTestId('stat-done').textContent())).toBeGreaterThan(0);
  await snap(page, '5-reports');
  if (shots) await page.locator('.chart-card').nth(1).screenshot({ path: `${shots}6-weekly-chart.png` });
  if (shots) await page.locator('.chart-card').nth(2).screenshot({ path: `${shots}6b-category-chart.png` });

  // Tasks view filters.
  await tab(page, 'Tasks').click();
  await expect(page.getByTestId('lane-high')).toBeVisible();
  await snap(page, '7-tasks');
  await page.getByTestId('filter-category').selectOption({ label: 'Car' });
  await expect(page.getByTestId('task-row')).toHaveCount(1);

  // Data survives a reload (local cache).
  await page.reload();
  await tab(page, 'Today').click();
  await page.getByRole('button', { name: 'Everyone' }).click();
  await expect(page.getByTestId('task-row').filter({ hasText: 'Water plants' })).toBeVisible();

  // Settings + dark mode.
  await page.getByRole('button', { name: 'Settings' }).click();
  await page.getByRole('button', { name: 'Dark' }).click();
  await snap(page, '8-settings-dark');
  await page.goto('./#/today');
  await snap(page, '9-today-dark');
  await page.goto('./#/reports');
  await snap(page, '10-reports-dark');
});
