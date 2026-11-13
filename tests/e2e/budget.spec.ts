import { test, expect } from '@playwright/test';

const storageKey = 'stay-awake:v1';
test('60 seconds then three supplements reach the rolling limit; refresh cannot reset it', async ({
  page,
}) => {
  await page.clock.install();
  await page.goto('/');
  await page.getByRole('button', { name: /开始唤醒/ }).click();
  await expect(page.getByRole('heading', { name: 'Wake-up session' })).toBeVisible();
  await page.clock.fastForward(60_000);
  await expect(page.getByRole('heading', { name: '本次结束。回到你要做的事。' })).toBeVisible();
  for (const duration of [45, 45, 30]) {
    await page.getByRole('button', { name: new RegExp(`仍然困.*${duration} 秒`) }).click();
    await expect(page.locator('.session-top')).toContainText('补充唤醒');
    await page.clock.fastForward(duration * 1000);
    await expect(page.getByRole('heading', { name: '本次结束。回到你要做的事。' })).toBeVisible();
  }
  await expect(page.getByRole('button', { name: /补充暂不可用/ })).toBeDisabled();
  const state = await page.evaluate((k) => JSON.parse(localStorage.getItem(k)!), storageKey);
  expect(state.records.map((r: { elapsedMs: number }) => r.elapsedMs)).toEqual([
    60_000, 45_000, 45_000, 30_000,
  ]);
  await page.reload();
  await expect(page.getByRole('button', { name: /额度恢复中/ })).toBeDisabled();
  await page.getByLabel('任务模式').selectOption('emergency');
  await expect(page.getByRole('button', { name: /额度恢复中/ })).toBeDisabled();
  await page.clock.fastForward(451_000);
  await expect(page.getByRole('button', { name: /开始唤醒/ })).toBeEnabled();
});

test('upgrades old cooldown data without erasing history', async ({ page }) => {
  await page.addInitScript((k) => {
    if (localStorage.getItem(k)) return;
    const now = Date.now();
    localStorage.setItem(
      k,
      JSON.stringify({
        version: 1,
        settings: { mode: 'random', duration: 60, cooldown: 10, theme: 'light' },
        active: null,
        lastSessionEndTime: now - 10_000,
        cooldownUntil: now + 590_000,
        records: [
          {
            id: 'legacy',
            startedAt: now - 70_000,
            endedAt: now - 10_000,
            elapsedMs: 60_000,
            mode: 'reaction',
            reason: 'complete',
            metrics: {},
          },
        ],
      }),
    );
  }, storageKey);
  await page.goto('/');
  await expect(page.getByRole('button', { name: /仍然困/ })).toBeEnabled();
  await expect(page.locator('.app')).toHaveAttribute('data-theme', 'light');
  await expect(page.getByLabel('任务模式')).toHaveValue('boost');
  const state = await page.evaluate((k) => JSON.parse(localStorage.getItem(k)!), storageKey);
  expect(state.version).toBe(2);
  expect(state.records[0].id).toBe('legacy');
  expect(state).not.toHaveProperty('cooldownUntil');
  await page.getByRole('button', { name: /仍然困/ }).click();
  await expect(page.locator('.session-top')).toContainText('补充唤醒');
});

test('two tabs cannot both spend the last 45 seconds', async ({ page, context }) => {
  await context.addInitScript((k) => {
    if (localStorage.getItem(k)) return;
    const now = Date.now();
    const records = [
      {
        id: 'one',
        startedAt: now - 135_000,
        endedAt: now - 45_000,
        elapsedMs: 90_000,
        mode: 'math',
        reason: 'complete',
        metrics: {},
      },
      {
        id: 'two',
        startedAt: now - 45_000,
        endedAt: now,
        elapsedMs: 45_000,
        mode: 'boost',
        reason: 'complete',
        metrics: {},
      },
    ];
    localStorage.setItem(
      k,
      JSON.stringify({
        version: 2,
        settings: { mode: 'boost', duration: 60, theme: 'dark' },
        active: null,
        lastSessionEndTime: now,
        records,
      }),
    );
  }, storageKey);
  const other = await context.newPage();
  await Promise.all([page.goto('/'), other.goto('/')]);
  await expect(page.getByRole('button', { name: /仍然困/ })).toBeEnabled();
  await expect(other.getByRole('button', { name: /仍然困/ })).toBeEnabled();
  await Promise.all([
    page.locator('.supplement-button').evaluate((button: HTMLButtonElement) => button.click()),
    other.locator('.supplement-button').evaluate((button: HTMLButtonElement) => button.click()),
  ]);
  await expect
    .poll(
      async () =>
        (await page.locator('.session-page').count()) +
        (await other.locator('.session-page').count()),
    )
    .toBe(1);
  const active = await page.evaluate(
    (k) => JSON.parse(localStorage.getItem(k)!).active,
    storageKey,
  );
  expect(active.deadline - active.startedAt).toBe(45_000);
});
