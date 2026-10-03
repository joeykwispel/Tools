import { expect, test } from '@playwright/test';
import { open } from '../helpers';

test('Cubic-bezier editor reads an easing, starts from a preset and writes the CSS', async ({ page }) => {
  await open(page, '/bezier/');
  const css = page.getByTestId('bezier-css');
  await expect(css).toHaveText('cubic-bezier(0.22, 1, 0.36, 1)');
  await expect(page.getByRole('combobox', { name: 'Start from' })).toHaveValue('easeOutQuint');
  await expect(page.getByTestId('bezier-transition')).toHaveText('transition: transform 800ms cubic-bezier(0.22, 1, 0.36, 1);');

  const input = page.getByRole('textbox', { name: 'Easing' });
  await input.fill('ease-in-out');
  await expect(css).toHaveText('ease-in-out');
  await expect(page.getByRole('spinbutton', { name: /time \(x1\)/ })).toHaveValue('0.42');
  await expect(page.getByTestId('bezier-path')).toHaveAttribute('d', 'M20 260 C146 260, 194 110, 320 110');

  await page.getByRole('combobox', { name: 'Start from' }).selectOption('easeOutBack');
  await expect(input).toHaveValue('cubic-bezier(0.34, 1.56, 0.64, 1)');
  await expect(page.getByText('This curve goes beyond the start or the end')).toBeVisible();

  await page.getByRole('spinbutton', { name: /progress \(y2\)/ }).fill('0.9');
  await expect(css).toHaveText('cubic-bezier(0.34, 1.56, 0.64, 0.9)');
  await expect(page.getByRole('combobox', { name: 'Start from' })).toHaveValue('');

  await input.fill('cubic-bezier(1.5, 0, 0.5, 1)');
  await expect(page.getByRole('status')).toHaveText('Both time values (x1 and x2) have to lie from 0 to 1.');
  // the last curve that could be read stays
  await expect(css).toHaveText('cubic-bezier(0.34, 1.56, 0.64, 0.9)');
});

test('Cubic-bezier editor moves a handle by dragging, and plays the curve', async ({ page }) => {
  await open(page, '/bezier/');
  await page.getByRole('textbox', { name: 'Easing' }).fill('linear');
  const handle = page.getByTestId('bezier-handle-1');
  // on a phone the drawing is below the fold, and the mouse only reaches what is on screen
  await page.locator('figure svg').scrollIntoViewIfNeeded();
  const box = (await page.locator('figure svg').boundingBox())!;
  const from = (await handle.boundingBox())!;
  // drag the first handle to time 0.5, progress 1: the middle of the top of the square
  const scale = box.width / 340;
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + (20 + 0.5 * 300) * scale, box.y + (20 + 0.6 * 150) * scale, { steps: 5 });
  await page.mouse.up();
  await expect(page.getByTestId('bezier-css')).toHaveText(/^cubic-bezier\(0\.(49|5|51), (0\.99|1|1\.01), 1, 1\)$/);

  const play = page.getByRole('button', { name: 'Play' });
  await play.click();
  await expect(page.getByRole('button', { name: 'Back' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.tracks')).toHaveClass(/moved/);
});

test('Cubic-bezier editor speaks Dutch', async ({ page }) => {
  await open(page, '/nl/bezier/');
  await page.getByRole('textbox', { name: 'Easing' }).fill('steps(3)');
  await expect(page.getByRole('status')).toHaveText('Dit is geen easing die te lezen is.');
});
