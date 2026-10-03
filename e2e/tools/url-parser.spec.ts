import { expect, test } from '@playwright/test';
import { open } from '../helpers';

test('URL parser takes the sample apart', async ({ page }) => {
  await open(page, '/url-parser/');
  await expect(page.getByRole('status')).toHaveText('A https address with 4 query parameters.');

  const parts = page.getByTestId('url-parser-parts');
  await expect(parts.locator('dt')).toHaveText(['scheme', 'user', 'password', 'host', 'port', 'path', 'query', 'fragment', 'origin']);
  await expect(parts.locator('dd')).toHaveText([
    'https',
    'ada',
    's@cret',
    'shop.example.com',
    '8443',
    '/products/caf%C3%A9%20table',
    'colour=dark+oak&size=120&size=140&utm_source=newsletter',
    'reviews',
    'https://shop.example.com:8443'
  ]);
  await expect(page.getByTestId('url-parser-segments').getByRole('listitem')).toHaveText(['products', 'café table']);
  await expect(page.getByRole('textbox', { name: 'Value of parameter 1' })).toHaveValue('dark oak');
  expect(JSON.parse((await page.getByTestId('url-parser-json').textContent())!)).toEqual({
    colour: 'dark oak',
    size: ['120', '140'],
    utm_source: 'newsletter'
  });
});

test('URL parser rewrites the URL when a parameter is changed, added or removed', async ({ page }) => {
  await open(page, '/url-parser/');
  const input = page.getByRole('textbox', { name: 'URL', exact: true });
  await input.fill('https://example.com/search?q=tea+pot&page=2#top');

  // only the parameter that is changed is written anew: the + in the other one stays
  await page.getByRole('textbox', { name: 'Value of parameter 2' }).fill('3 & 4');
  await expect(input).toHaveValue('https://example.com/search?q=tea+pot&page=3%20%26%204#top');
  await page.getByRole('textbox', { name: 'Name of parameter 1' }).fill('query');
  await expect(input).toHaveValue('https://example.com/search?query=tea+pot&page=3%20%26%204#top');

  await page.getByRole('button', { name: 'Add a parameter' }).click();
  await page.getByRole('textbox', { name: 'Name of parameter 3' }).fill('sort');
  await page.getByRole('textbox', { name: 'Value of parameter 3' }).fill('price');
  await expect(input).toHaveValue('https://example.com/search?query=tea+pot&page=3%20%26%204&sort=price#top');
  await expect(page.getByRole('status')).toHaveText('A https address with 3 query parameters.');

  await page.getByRole('button', { name: 'Remove parameter 2' }).click();
  await page.getByRole('button', { name: 'Remove parameter 1' }).click();
  await expect(input).toHaveValue('https://example.com/search?sort=price#top');
  await expect(page.getByRole('status')).toHaveText('A https address with 1 query parameter.');
  await page.getByRole('button', { name: 'Remove parameter 1' }).click();
  await expect(input).toHaveValue('https://example.com/search#top');
  await expect(page.getByText('There are no query parameters.')).toBeVisible();
  await expect(page.getByTestId('url-parser-json')).toHaveCount(0);
});

test('URL parser reads addresses that are not whole, and says what it can not read', async ({ page }) => {
  await open(page, '/url-parser/');
  const input = page.getByRole('textbox', { name: 'URL', exact: true });
  const parts = page.getByTestId('url-parser-parts');

  await input.fill('münchen.de/bier');
  await expect(page.getByRole('status')).toHaveText('There is no scheme in this, so it is read as https://. A https address with 0 query parameters.');
  await expect(parts).toContainText('xn--mnchen-3ya.de');
  await expect(parts).toContainText('münchen.de');
  await expect(parts).toContainText('443 (not written: the default for https)');
  await expect(page.getByTestId('url-parser-href')).toHaveText('https://xn--mnchen-3ya.de/bier');

  await input.fill('/search?q=1#top');
  await expect(page.getByRole('status')).toHaveText('An address without a host: only the path, the query and the fragment can be read.');
  await expect(parts.locator('dt')).toHaveText(['path', 'query', 'fragment']);

  await input.fill('https://example.com:port/');
  await expect(page.getByRole('status')).toHaveText('This is not a URL that can be read.');
  await expect(parts).toHaveCount(0);
  await input.fill('');
  await expect(page.getByRole('status')).toHaveText('Paste a URL.');
});

test('URL parser speaks Dutch', async ({ page }) => {
  await open(page, '/nl/url-parser/');
  await expect(page.getByRole('status')).toHaveText('Een https-adres met 4 queryparameters.');
  await expect(page.getByTestId('url-parser-parts').locator('dt').first()).toHaveText('schema');
  await page.getByRole('button', { name: 'Parameter 4 verwijderen' }).click();
  await expect(page.getByRole('textbox', { name: 'URL', exact: true })).toHaveValue(/size=140#reviews$/);
});
