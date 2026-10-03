import { expect, test } from '@playwright/test';
import { open } from '../helpers';

const IPHONE =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/140.0.7339.101 Mobile/15E148 Safari/604.1';

test('User-agent parser starts with the string of this browser', async ({ page }) => {
  await open(page, '/user-agent/');
  const input = page.getByRole('textbox', { name: 'User-agent string' });
  const own = await page.evaluate(() => navigator.userAgent);
  await expect(input).toHaveValue(own);
  // the tests run in Chrome, on a desktop or as a Pixel
  await expect(page.getByTestId('user-agent-result')).toContainText('Blink');

  // after clearing it stays empty, until it is asked for again
  await page.getByRole('button', { name: 'Clear' }).click();
  await expect(input).toHaveValue('');
  await expect(page.getByRole('status')).toHaveText('Paste a user-agent string, or use the one of this browser.');
  await expect(page.getByTestId('user-agent-result')).toHaveCount(0);
  await page.getByRole('button', { name: 'Mine' }).click();
  await expect(input).toHaveValue(own);
});

test('User-agent parser reads the browser, engine, system and device', async ({ page }) => {
  await open(page, '/user-agent/');
  const input = page.getByRole('textbox', { name: 'User-agent string' });
  const result = page.getByTestId('user-agent-result');

  await input.fill(IPHONE);
  await expect(page.getByRole('status')).toHaveText('Read as: Chrome, iOS.');
  await expect(result.locator('dt')).toHaveText(['browser', 'engine', 'system', 'device']);
  await expect(result.locator('dd')).toHaveText(['Chrome 140.0.7339.101', 'WebKit 605.1.15', 'iOS 18.5', 'phone, iPhone']);
  await expect(page.getByTestId('user-agent-notes')).toContainText('every browser runs on WebKit');

  await page.getByRole('combobox', { name: 'Try one' }).selectOption('Chrome, Windows');
  await expect(result.locator('dd')).toHaveText(['Chrome 140.0.0.0', 'Blink 140.0.0.0', 'Windows 10 or 11', 'desktop']);
  await expect(page.getByTestId('user-agent-notes')).toContainText('Windows 10 and Windows 11 both say "Windows NT 10.0".');

  await page.getByRole('combobox', { name: 'Try one' }).selectOption('Instagram, iPhone');
  await expect(result.locator('dt')).toHaveText(['opened in', 'engine', 'system', 'device']);
  await expect(page.getByRole('status')).toHaveText('Read as: Instagram, iOS.');
});

test('User-agent parser knows crawlers and programs, and what it can not read', async ({ page }) => {
  await open(page, '/user-agent/');
  const input = page.getByRole('textbox', { name: 'User-agent string' });
  const result = page.getByTestId('user-agent-result');

  await page.getByRole('combobox', { name: 'Try one' }).selectOption('Googlebot');
  await expect(result.locator('dt').first()).toHaveText('crawler');
  await expect(result.locator('dd').first()).toHaveText('Googlebot 2.1');
  await expect(page.getByTestId('user-agent-notes')).toContainText('not a person behind a browser');

  await input.fill('curl/8.9.1');
  await expect(result.locator('dt')).toHaveText(['program']);
  await expect(result.locator('dd')).toHaveText(['curl 8.9.1']);
  await input.fill('NewCrawler/1.0 (+https://example.com)');
  await expect(result.locator('dd')).toHaveText(['one that does not say which']);

  await input.fill('hello world');
  await expect(page.getByRole('status')).toHaveText('Nothing in this is recognised as a browser, a system or a crawler.');
  await expect(result).toHaveCount(0);
});

test('User-agent parser speaks Dutch', async ({ page }) => {
  await open(page, '/nl/user-agent/');
  await page.getByRole('textbox', { name: 'User-agent-string' }).fill(IPHONE);
  await expect(page.getByRole('status')).toHaveText('Gelezen als: Chrome, iOS.');
  await expect(page.getByTestId('user-agent-result').locator('dd').last()).toHaveText('telefoon, iPhone');
});
