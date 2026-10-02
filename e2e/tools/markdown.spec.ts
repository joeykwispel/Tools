import { expect, test } from '@playwright/test';
import { open, watchForeignRequests } from '../helpers';

test('Markdown preview shows the rendered text, its outline and the HTML', async ({ page }) => {
  await open(page, '/markdown/');
  const input = page.getByRole('textbox', { name: 'Markdown', exact: true });
  const preview = page.getByTestId('markdown-preview');

  await input.fill('# Title\n\nSome **bold** text and a [link](https://example.com).\n\n## Section\n\n- [x] done\n\n| a | b |\n|---|---|\n| 1 | 2 |\n');
  await expect(preview.getByRole('heading', { level: 1, name: 'Title' })).toBeVisible();
  await expect(preview.locator('strong')).toHaveText('bold');
  await expect(preview.getByRole('checkbox')).toBeChecked();
  await expect(preview.getByRole('cell', { name: '2' })).toBeVisible();
  // a link opens in a new tab and tells the other site nothing
  const link = preview.getByRole('link', { name: 'link' });
  await expect(link).toHaveAttribute('target', '_blank');
  await expect(link).toHaveAttribute('rel', 'noopener noreferrer');

  await expect(page.getByTestId('markdown-outline').locator('li')).toHaveText(['h1 Title', 'h2 Section']);
  await expect(page.getByTestId('markdown-html')).toContainText('<h1>Title</h1>');
  await expect(page.getByTestId('markdown-html')).toContainText('<strong>bold</strong>');
});

test('Markdown preview removes unsafe HTML and does not load images from other sites', async ({ page, baseURL }) => {
  const foreign = watchForeignRequests(page, baseURL!);
  const dialogs: string[] = [];
  page.on('dialog', (dialog) => {
    dialogs.push(dialog.message());
    void dialog.dismiss();
  });
  await open(page, '/markdown/');
  await page
    .getByRole('textbox', { name: 'Markdown', exact: true })
    .fill(
      'safe <b>bold</b>\n\n<script>alert(1)</script>\n\n<img src="https://example.com/x.png" onerror="alert(2)">\n\n<a href="javascript:alert(3)">click</a>\n\n![alt](https://example.com/y.png)'
    );
  const preview = page.getByTestId('markdown-preview');
  await expect(preview.locator('b')).toHaveText('bold');
  await expect(preview.locator('script')).toHaveCount(0);
  await expect(preview.locator('[onerror]')).toHaveCount(0);
  await expect(preview.locator('a[href^="javascript"]')).toHaveCount(0);
  await expect(preview.locator('img')).toHaveCount(0);
  await expect(preview.locator('.image-note')).toHaveText(['[image: https://example.com/x.png]', '[image: alt]']);
  const html = await page.getByTestId('markdown-html').textContent();
  expect(html).not.toMatch(/<script|onerror|javascript:/);

  await page.waitForLoadState('networkidle');
  expect(dialogs).toEqual([]);
  // not even an attempt: the images were taken out before the preview was shown
  expect(foreign).toEqual([]);
});

test('Markdown preview speaks Dutch', async ({ page }) => {
  await open(page, '/nl/markdown/');
  await page.getByRole('button', { name: 'Wissen' }).click();
  await expect(page.getByTestId('markdown-preview')).toHaveText('Schrijf wat Markdown om het hier te zien.');
  await page.getByRole('textbox', { name: 'Markdown', exact: true }).fill('*schuin*');
  await expect(page.getByTestId('markdown-preview').locator('em')).toHaveText('schuin');
});
