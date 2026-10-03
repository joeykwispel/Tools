import { expect, test } from '@playwright/test';
import { open } from '../helpers';

test('curl → fetch turns the sample into fetch code', async ({ page }) => {
  await open(page, '/curl/');
  await expect(page.getByRole('status')).toHaveText('A POST request with 2 headers.');
  await expect(page.getByTestId('curl-request').locator('dd')).toHaveText(['POST', 'https://api.example.com/v1/orders?expand=lines']);
  await expect(page.getByTestId('curl-headers').locator('dt')).toHaveText(['Authorization', 'Content-Type']);
  await expect(page.getByTestId('curl-body')).toHaveText('{"customer":"ada@example.com","lines":[{"sku":"A-1","quantity":2}]}');

  const code = page.getByTestId('curl-code');
  await expect(code).toHaveText(
    [
      "const response = await fetch('https://api.example.com/v1/orders?expand=lines', {",
      "  method: 'POST',",
      '  headers: {',
      "    Authorization: 'Bearer eyJhbGciOiJIUzI1NiJ9.e30.abc',",
      "    'Content-Type': 'application/json'",
      '  },',
      '  body: JSON.stringify({',
      "    customer: 'ada@example.com',",
      '    lines: [',
      '      {',
      "        sku: 'A-1',",
      '        quantity: 2',
      '      }',
      '    ]',
      '  })',
      '});',
      'const data = await response.json();'
    ].join('\n')
  );
  await page.getByRole('radio', { name: 'text', exact: true }).check();
  await expect(code).toContainText('const data = await response.text();');
  await page.getByRole('radio', { name: 'not at all' }).check();
  await expect(code).not.toContainText('const data');
});

test('curl → fetch runs the code it writes', async ({ page }) => {
  await open(page, '/curl/');
  await page.getByRole('textbox', { name: 'curl command' }).fill(`curl 'http://localhost/echo' -u ada:secret -H 'X-Trace: a"b' -d 'q=tea & cake' -d n=1`);
  await page.getByRole('radio', { name: 'not at all' }).check();
  const code = (await page.getByTestId('curl-code').textContent())!;

  // the code is run here, in the test, with a fetch that only writes down what it is asked
  const calls: unknown[][] = [];
  const AsyncFunction = Object.getPrototypeOf(async () => {}).constructor as new (...args: string[]) => (fetch: (...args: unknown[]) => void) => Promise<void>;
  await new AsyncFunction('fetch', code)((...args) => calls.push(args));
  expect(calls).toEqual([
    [
      'http://localhost/echo',
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${Buffer.from('ada:secret').toString('base64')}`,
          'X-Trace': 'a"b',
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: 'q=tea & cake&n=1'
      }
    ]
  ]);
});

test('curl → fetch says what fetch can not do the same, and what it can not read', async ({ page }) => {
  await open(page, '/curl/');
  const input = page.getByRole('textbox', { name: 'curl command' });

  await input.fill('curl -k -b "id=7" --proxy http://p:8080 example.com/upload -F name=Ada -F doc=@cv.pdf');
  await expect(page.getByTestId('curl-notes').getByRole('listitem')).toHaveText([
    /^-k skips the check of the certificate/,
    /^The address has no scheme/,
    /^curl reads cv\.pdf from disk/,
    /^A page in a browser may not set the Cookie header/,
    'Left out, because fetch has nothing like it: --proxy.'
  ]);
  await expect(page.getByTestId('curl-code')).toContainText("form.append('doc', file); // cv.pdf: a File or Blob");
  await expect(page.getByTestId('curl-body')).toHaveText('name = Ada\ndoc = the file cv.pdf');

  // as a browser copies it for the Windows command prompt
  await input.fill('curl ^"https://example.com/api?a=1^&b=2^" ^\n  -H ^"accept: application/json^"');
  await expect(page.getByRole('status')).toHaveText('A GET request with 1 header.');
  await expect(page.getByTestId('curl-request').locator('dd').last()).toHaveText('https://example.com/api?a=1&b=2');

  await input.fill('wget https://example.com');
  await expect(page.getByRole('status')).toHaveText('This starts with "wget", not with curl.');
  await expect(page.getByTestId('curl-code')).toHaveCount(0);
  await input.fill(`curl 'https://example.com`);
  await expect(page.getByRole('status')).toHaveText('A quote is opened and never closed.');
  await input.fill('curl https://example.com -H');
  await expect(page.getByRole('status')).toHaveText('-H has to be followed by a value.');
  await input.fill('');
  await expect(page.getByRole('status')).toHaveText('Paste a curl command.');
});

test('curl → fetch speaks Dutch', async ({ page }) => {
  await open(page, '/nl/curl/');
  await expect(page.getByRole('status')).toHaveText('Een POST-verzoek met 2 headers.');
  await page.getByRole('textbox', { name: 'curl-commando' }).fill('curl -X POST');
  await expect(page.getByRole('status')).toHaveText('Er staat geen adres in dit commando.');
});
