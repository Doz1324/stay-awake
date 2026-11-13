import { test, expect, type Page } from '@playwright/test';

const key = 'stay-awake:v1';
const stored = (page: Page) => page.evaluate((k) => JSON.parse(localStorage.getItem(k)!), key);
async function start(page: Page, mode = 'math', duration = 60) {
  await page.goto('/');
  await expect(page.getByRole('button', { name: /开始唤醒/ })).toBeEnabled();
  await page.getByLabel('任务模式').selectOption(mode);
  if (mode !== 'emergency')
    await page.getByRole('button', { name: `${duration}s`, exact: true }).click();
  await page.getByRole('button', { name: /开始唤醒/ }).click();
  await expect(page.getByRole('heading', { name: 'Wake-up session' })).toBeVisible();
}
test('homepage, light theme, mobile layout and no runtime errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await expect(page.getByRole('button', { name: /开始唤醒/ })).toBeEnabled();
  const startBounds = await page.locator('.start-button').boundingBox();
  expect(startBounds!.y + startBounds!.height).toBeLessThanOrEqual(page.viewportSize()!.height);
  await page.screenshot({ path: 'test-results/home-desktop.png', fullPage: true });
  await page.getByRole('button', { name: '设置与统计' }).click();
  await page.getByRole('button', { name: '浅色', exact: true }).click();
  await expect(page.locator('.app')).toHaveAttribute('data-theme', 'light');
  await page.reload();
  await expect(page.locator('.app')).toHaveAttribute('data-theme', 'light');
  await page.setViewportSize({ width: 390, height: 844 });
  const mobileStart = await page.locator('.start-button').boundingBox();
  expect(mobileStart!.y + mobileStart!.height).toBeLessThanOrEqual(844);
  await page.screenshot({ path: 'test-results/home-mobile.png', fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});
test('Space starts, ESC ends, duration settings do not reset actual use', async ({ page }) => {
  await page.clock.install();
  await page.goto('/');
  await expect(page.getByRole('button', { name: /开始唤醒/ })).toBeEnabled();
  await page.keyboard.press('Space');
  await expect(page.getByRole('heading', { name: 'Wake-up session' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('heading', { name: '本次结束。回到你要做的事。' })).toBeVisible();
  await page.screenshot({ path: 'test-results/result-desktop.png', fullPage: true });
  const before = await stored(page);
  await page.getByRole('button', { name: /返回首页/ }).click();
  await page.getByRole('button', { name: '30s', exact: true }).click();
  await expect.poll(async () => (await stored(page)).settings.duration).toBe(30);
  expect((await stored(page)).records).toEqual(before.records);
  await page.reload();
  await expect(page.getByRole('button', { name: /开始唤醒/ })).toBeEnabled();
});
test('refresh during a session ends it and preserves usage', async ({ page }) => {
  await start(page);
  const active = (await stored(page)).active;
  await page.reload();
  await expect(page.getByRole('button', { name: /开始唤醒/ })).toBeEnabled();
  const state = await stored(page);
  expect(state.active).toBeNull();
  expect(state.records).toHaveLength(1);
  expect(state.records[0].id).toBe(active.id);
});
test('another tab observes the live session without terminating it; closing owner recovers', async ({
  page,
  context,
}) => {
  await start(page);
  const other = await context.newPage();
  await other.goto('/');
  await expect(other.getByRole('button', { name: /另一个页面正在唤醒/ })).toBeDisabled();
  await expect(page.getByRole('heading', { name: 'Wake-up session' })).toBeVisible();
  await page.close();
  await expect(other.getByRole('button', { name: /开始唤醒/ })).toBeEnabled();
  expect((await stored(other)).records).toHaveLength(1);
});
test('simultaneous starts produce exactly one active session', async ({ page, context }) => {
  const other = await context.newPage();
  await Promise.all([page.goto('/'), other.goto('/')]);
  await expect(page.getByRole('button', { name: /开始唤醒/ })).toBeEnabled();
  await expect(other.getByRole('button', { name: /开始唤醒/ })).toBeEnabled();
  await Promise.all([
    page.evaluate(() => (document.querySelector('.start-button') as HTMLButtonElement).click()),
    other.evaluate(() => (document.querySelector('.start-button') as HTMLButtonElement).click()),
  ]);
  await expect
    .poll(
      async () =>
        (await page.locator('.session-page').count()) +
        (await other.locator('.session-page').count()),
    )
    .toBe(1);
  expect((await stored(page)).records).toHaveLength(0);
});
for (const duration of [30, 60, 90])
  test(`${duration}s deadline survives a suspended timer`, async ({ page }) => {
    await page.clock.install();
    await start(page, 'math', duration);
    await page.clock.fastForward((duration + 20) * 1000);
    await expect(page.getByRole('heading', { name: '本次结束。回到你要做的事。' })).toBeVisible();
    const state = await stored(page);
    expect(state.records[0].elapsedMs).toBe(duration * 1000);
    expect(state).not.toHaveProperty('cooldownUntil');
    expect(await page.getByLabel('口算答案').count()).toBe(0);
    expect(await page.getByRole('button', { name: /Retry|Play Again|再来/ }).count()).toBe(0);
  });
test('math accepts Enter and keeps focus', async ({ page }) => {
  await start(page);
  const prompt = await page.locator('.task-prompt').innerText();
  const [left, operator, right] = prompt.split(' ');
  const a = Number(left),
    b = Number(right);
  const answer =
    operator === '+' ? a + b : operator === '−' ? a - b : operator === '×' ? a * b : a / b;
  await page.getByLabel('口算答案').fill(String(answer));
  await page.keyboard.press('Enter');
  await expect.poll(async () => (await stored(page)).active.metrics.math?.correct).toBe(1);
  await expect(page.getByLabel('口算答案')).toHaveValue('');
  await expect(page.getByLabel('口算答案')).toBeFocused();
});
test('reaction rejects early input and supports Space without repeat scoring', async ({ page }) => {
  await page.clock.install();
  await start(page, 'reaction');
  await page.keyboard.press('Space');
  await expect(page.getByRole('status')).toContainText('Too early');
  await page.clock.runFor(350);
  await page.clock.fastForward(4100);
  await expect(page.getByRole('button', { name: '现在点击' })).toBeVisible();
  await page.keyboard.down('Space');
  await page.keyboard.down('Space');
  await page.keyboard.up('Space');
  await expect.poll(async () => (await stored(page)).active.metrics.reaction?.attempts).toBe(2);
  expect((await stored(page)).active.metrics.reaction.correct).toBe(1);
});
test('memory hides digits then adapts length', async ({ page }) => {
  await page.clock.install();
  await start(page, 'memory');
  const target = await page.locator('.memory-string').innerText();
  expect(target).toHaveLength(6);
  await page.clock.fastForward(1100);
  await expect(page.locator('.memory-string')).not.toContainText(target);
  await page.getByLabel('记忆数字').fill(target);
  await page.keyboard.press('Enter');
  await page.clock.runFor(350);
  await expect.poll(async () => (await page.locator('.memory-string').innerText()).length).toBe(7);
  expect((await stored(page)).active.metrics.memory.correct).toBe(1);
});
test('Stroop scores the ink color using keyboard shortcuts', async ({ page }) => {
  await start(page, 'stroop');
  const css = await page.locator('.stroop-word').getAttribute('class');
  const key = css!.includes('color-red')
    ? 'r'
    : css!.includes('color-green')
      ? 'g'
      : css!.includes('color-blue')
        ? 'b'
        : 'y';
  await page.keyboard.press(key);
  await expect.poll(async () => (await stored(page)).active.metrics.stroop?.correct).toBe(1);
});
test('Typing shows mistakes, preserves their count and advances on completion', async ({
  page,
}) => {
  await start(page, 'typing');
  const phrase = await page.locator('.typing-prompt').innerText();
  await page.getByLabel('输入英文词组').fill('#');
  await expect(page.locator('.typing-prompt .incorrect')).toHaveCount(1);
  await page.getByLabel('输入英文词组').fill('');
  await page.getByLabel('输入英文词组').fill(phrase);
  await expect(page.getByLabel('输入英文词组')).toHaveValue('');
  const metric = (await stored(page)).active.metrics.typing;
  expect(metric.attempts).toBe(phrase.length + 1);
  expect(metric.correct).toBe(phrase.length);
  await expect(page.locator('.typing-prompt')).not.toHaveText(phrase);
});
test('Emergency changes task every 18s and ends at 90s', async ({ page }) => {
  await page.clock.install();
  await start(page, 'emergency');
  const before = await stored(page);
  expect(before.active.sequence).toHaveLength(5);
  for (let i = 1; i < 5; i++) {
    await page.clock.fastForward(18_000);
    await expect(page.locator('.session-top')).toContainText(`混合任务 ${i + 1} / 5`);
  }
  await page.clock.fastForward(18_000);
  await expect(page.getByRole('heading', { name: '本次结束。回到你要做的事。' })).toBeVisible();
  expect((await stored(page)).records[0].elapsedMs).toBe(90_000);
});
test('offline cache loads a fresh page while disconnected and retains usage', async ({
  page,
  context,
}) => {
  await page.goto('/');
  await expect(page.locator('.site-footer')).toContainText('离线已就绪');
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('button', { name: /开始唤醒/ })).toBeEnabled();
  await page.getByLabel('任务模式').selectOption('math');
  await page.getByRole('button', { name: /开始唤醒/ }).click();
  await expect(page.getByLabel('口算答案')).toBeVisible();
  await page.keyboard.press('Escape');
  await page.reload();
  await expect(page.getByRole('button', { name: /开始唤醒/ })).toBeEnabled();
  expect((await stored(page)).records).toHaveLength(1);
});
test('corrupted storage fails closed', async ({ page }) => {
  await page.addInitScript((k) => localStorage.setItem(k, '{invalid'), key);
  await page.goto('/');
  await expect(page.getByRole('alert')).toContainText('记录格式异常');
  await expect(page.getByRole('button', { name: /开始唤醒/ })).toBeDisabled();
});
test('storage quota failure prevents starting', async ({ page }) => {
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException('quota', 'QuotaExceededError');
    };
  });
  await page.goto('/');
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page.getByRole('button', { name: /开始唤醒/ })).toBeDisabled();
});
test('LAN fallback serializes starts without Web Locks', async ({ page, context }) => {
  await context.addInitScript(() =>
    Object.defineProperty(navigator, 'locks', { value: undefined }),
  );
  const other = await context.newPage();
  await Promise.all([page.goto('/'), other.goto('/')]);
  await expect(page.getByRole('button', { name: /开始唤醒/ })).toBeEnabled();
  await expect(other.getByRole('button', { name: /开始唤醒/ })).toBeEnabled();
  await Promise.all([
    page.evaluate(() => (document.querySelector('.start-button') as HTMLButtonElement).click()),
    other.evaluate(() => (document.querySelector('.start-button') as HTMLButtonElement).click()),
  ]);
  await expect
    .poll(
      async () =>
        (await page.locator('.session-page').count()) +
        (await other.locator('.session-page').count()),
    )
    .toBe(1);
});
