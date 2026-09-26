import { expect, test, type Page } from '@playwright/test';

const shots = process.env.SCREENSHOTS ? 'e2e/screenshots/' : '';
const snap = async (page: Page, name: string) => {
  if (shots) await page.screenshot({ path: `${shots}${name}.png`, fullPage: false });
};

const tab = (page: Page, name: string) => page.getByRole('navigation', { name: 'Main' }).getByRole('button', { name });

test.beforeEach(async ({ page }) => {
  await page.goto('./');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

test('running list: add, rank, complete, undo, done tab, reports', async ({ page }) => {
  // Pick who this device belongs to.
  await expect(page.getByText("Who's this phone for?")).toBeVisible();
  await snap(page, '0-onboarding');
  await page.getByRole('button', { name: /Alex/ }).click();

  // Home is the ranked list.
  await expect(page.getByRole('heading', { name: /Tasks/ })).toBeVisible();
  await expect(page.getByTestId('lane-high')).toBeVisible();
  await page.getByRole('button', { name: 'Everyone' }).click();
  await snap(page, '1-home');

  // Quick add: no dates, just person / category / priority.
  await page.getByTestId('fab').click();
  await expect(page.getByText('When')).toHaveCount(0);
  await page.getByTestId('task-title').fill('Fix gutter @sam #home !high');
  await expect(page.getByText('Will save as “Fix gutter”')).toBeVisible();
  await snap(page, '2-new-task');
  await page.getByTestId('save-task').click();
  const row = page.getByTestId('lane-high').getByTestId('task-row').filter({ hasText: 'Fix gutter' });
  await expect(row).toContainText('Home Repair');

  // New tasks go to the bottom of their priority (oldest first).
  await expect(page.getByTestId('lane-high').getByTestId('task-row').last()).toContainText('Fix gutter');

  // Complete, undo, complete again → shows in Done.
  await row.getByRole('button', { name: /Complete/ }).click();
  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(page.getByTestId('lane-high').getByTestId('task-row').filter({ hasText: 'Fix gutter' })).toBeVisible();
  await page.getByTestId('lane-high').getByTestId('task-row').filter({ hasText: 'Fix gutter' }).getByRole('button', { name: /Complete/ }).click();
  await expect(page.getByTestId('task-row').filter({ hasText: 'Fix gutter' })).toHaveCount(0);

  await tab(page, 'Done').click();
  await expect(page.getByRole('heading', { name: 'Today' })).toBeVisible();
  const doneRow = page.getByTestId('task-row').filter({ hasText: 'Fix gutter' });
  await expect(doneRow).toBeVisible();
  await snap(page, '3-done');
  // Put it back on the list.
  await doneRow.getByRole('button', { name: /not done/ }).click();
  await tab(page, 'Tasks').click();
  await page.getByRole('button', { name: 'Everyone' }).click();
  await expect(page.getByTestId('task-row').filter({ hasText: 'Fix gutter' })).toBeVisible();

  // Task sheet: subtask and comment.
  await page.getByTestId('task-row').filter({ hasText: 'Clean out fridge' }).locator('.task-body').click();
  await page.getByLabel('New subtask').fill('Toss old condiments');
  await page.getByRole('button', { name: 'Add subtask' }).click();
  await page.getByLabel('Comment', { exact: true }).fill('Bought baking soda');
  await page.getByRole('button', { name: 'Post comment' }).click();
  await expect(page.getByText('Bought baking soda')).toBeVisible();
  await snap(page, '4-task-sheet');
  await page.getByRole('button', { name: 'Close' }).click();

  // Category filter.
  await page.getByTestId('filter-category').selectOption({ label: 'Car' });
  await expect(page.getByTestId('task-row')).toHaveCount(1);
  await page.getByTestId('filter-category').selectOption({ label: 'All categories' });

  // Reports.
  await tab(page, 'Reports').click();
  await expect(page.getByText('Workload split')).toBeVisible();
  await expect(page.getByText('Added vs done per week')).toBeVisible();
  await expect(page.getByText('On time')).toHaveCount(0);
  expect(Number(await page.getByTestId('stat-done').textContent())).toBeGreaterThan(0);
  await snap(page, '5-reports');
  if (shots) await page.locator('.chart-card').nth(1).screenshot({ path: `${shots}6-weekly-chart.png` });

  // Data survives a reload (local cache).
  await page.reload();
  await tab(page, 'Tasks').click();
  await page.getByRole('button', { name: 'Everyone' }).click();
  await expect(page.getByTestId('task-row').filter({ hasText: 'Fix gutter' })).toBeVisible();

  // Dark mode.
  await page.getByRole('button', { name: 'Settings' }).click();
  await page.getByRole('button', { name: 'Dark' }).click();
  await snap(page, '8-settings-dark');
  await page.goto('./#/tasks');
  await snap(page, '9-home-dark');
});
