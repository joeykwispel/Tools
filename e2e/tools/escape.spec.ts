import { expect, test } from '@playwright/test';
import { open } from '../helpers';

test('String escape escapes a text for JSON, JavaScript, a regex and a shell', async ({ page }) => {
  await open(page, '/escape/');
  const input = page.getByRole('textbox', { name: 'Text', exact: true });
  const output = page.getByTestId('escape-output');

  await input.fill(`it's "5.00"`);
  await expect(output).toHaveText(`"it's \\"5.00\\""`);
  await page.getByRole('checkbox', { name: 'Put the quotes around it' }).uncheck();
  await expect(output).toHaveText(`it's \\"5.00\\"`);

  await page.getByRole('radio', { name: 'JavaScript' }).check();
  await expect(output).toHaveText(`it\\'s "5.00"`);
  await page.getByRole('radio', { name: 'Regex' }).check();
  await expect(output).toHaveText(`it's "5\\.00"`);
  await expect(page.getByRole('checkbox', { name: 'Put the quotes around it' })).toHaveCount(0);
  await page.getByRole('radio', { name: 'Shell' }).check();
  await expect(output).toHaveText(`'it'\\''s "5.00"'`);

  // switching direction carries the result over
  await page.getByRole('radio', { name: 'Unescape' }).check();
  await expect(page.getByRole('textbox', { name: 'Escaped text' })).toHaveValue(`'it'\\''s "5.00"'`);
  await expect(output).toHaveText(`it's "5.00"`);
});

test('String escape can leave only ASCII, and says where an escape is broken', async ({ page }) => {
  await open(page, '/escape/');
  await page.getByRole('textbox', { name: 'Text', exact: true }).fill('zoë');
  await page.getByRole('checkbox', { name: /outside ASCII/ }).check();
  await expect(page.getByTestId('escape-output')).toHaveText('"zo\\' + 'u00eb"');

  await page.getByRole('radio', { name: 'Unescape' }).check();
  await expect(page.getByTestId('escape-output')).toHaveText('zoë');
  const escaped = page.getByRole('textbox', { name: 'Escaped text' });
  await escaped.fill('line one\\nline two\\');
  await expect(page.getByRole('status')).toHaveText('The escape at position 19 is not complete or not valid.');
  await expect(page.getByTestId('escape-output')).toHaveText('');
  await escaped.fill('tab\\there');
  await expect(page.getByTestId('escape-output')).toHaveText('tab\there');

  await page.getByRole('radio', { name: 'Shell' }).check();
  await escaped.fill("it's open");
  await expect(page.getByRole('status')).toHaveText('The quote at position 3 is never closed.');
});

test('String escape speaks Dutch', async ({ page }) => {
  await open(page, '/nl/escape/');
  await page.getByRole('textbox', { name: 'Tekst', exact: true }).fill('a"b');
  await expect(page.getByTestId('escape-output')).toHaveText('"a\\"b"');
  await page.getByRole('radio', { name: 'Unescapen' }).check();
  await page.getByRole('textbox', { name: 'Ge-escapete tekst' }).fill('a\\');
  await expect(page.getByRole('status')).toHaveText('De escape op positie 2 is niet compleet of niet geldig.');
});
