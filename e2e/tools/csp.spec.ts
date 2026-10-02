import { expect, test } from '@playwright/test';
import { open } from '../helpers';

test('CSP builder explains a policy and writes it as a header and a tag', async ({ page }) => {
  await open(page, '/csp/');
  const explained = page.getByTestId('csp-explained');
  await expect(explained.getByRole('heading', { name: 'default-src' })).toBeVisible();
  await expect(page.getByRole('status')).toHaveText('Nothing to remark on this policy.');

  const policy = page.getByRole('textbox', { name: 'Policy', exact: true });
  await policy.fill("default-src 'self'; script-src 'self' https://*.example.com 'nonce-abc123'; img-src data: https:; frame-ancestors 'none'");
  await expect(explained.getByRole('listitem').filter({ hasText: "'self'" }).first()).toContainText('this site itself: same scheme, host and port');
  await expect(explained).toContainText('https://*.example.com this address and every subdomain under it');
  await expect(explained).toContainText('tags that carry this nonce');
  await expect(explained).toContainText('anything over https:');
  await expect(explained).toContainText('Which sites may show this page in a frame.');

  await expect(page.getByTestId('csp-header')).toHaveText(
    "Content-Security-Policy: default-src 'self'; script-src 'self' https://*.example.com 'nonce-abc123'; img-src data: https:; frame-ancestors 'none'"
  );
  // frame-ancestors does not work in a tag: left out, and said so
  await expect(page.getByTestId('csp-meta')).toHaveText(
    `<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' https://*.example.com 'nonce-abc123'; img-src data: https:">`
  );
  await expect(page.getByText('Left out, because a browser ignores it in a tag: frame-ancestors.')).toBeVisible();

  await page.getByRole('checkbox', { name: 'Only report, block nothing' }).check();
  await expect(page.getByTestId('csp-header')).toContainText('Content-Security-Policy-Report-Only: default-src');
});

test('CSP builder points at what makes a policy weak', async ({ page }) => {
  await open(page, '/csp/');
  const policy = page.getByRole('textbox', { name: 'Policy', exact: true });
  const findings = page.getByTestId('csp-findings');

  await policy.fill("script-src self 'unsafe-inline' https:");
  await expect(page.getByRole('status')).toHaveText('6 remarks on this policy.');
  await expect(findings.getByRole('listitem').first()).toContainText('risk');
  await expect(findings).toContainText("script-src: self is read as a server named “self”. Keywords, nonces and hashes need single quotes: 'self'.");
  await expect(findings).toContainText("script-src allows 'unsafe-inline'");
  await expect(findings).toContainText('script-src allows https:: scripts from any server.');
  await expect(findings).toContainText("Add object-src 'none'.");
  await expect(findings).toContainText('base-uri is missing');
  await expect(findings).toContainText('frame-ancestors is missing');

  // a pasted header, of the kind that only reports
  await policy.fill("Content-Security-Policy-Report-Only: default-src 'none'; base-uri 'none'; frame-ancestors 'none'");
  await expect(page.getByRole('status')).toHaveText('1 remark on this policy.');
  await expect(findings).toContainText('it reports what it would block and blocks nothing');
  await expect(page.getByTestId('csp-header')).toContainText('Content-Security-Policy-Report-Only:');

  await policy.fill('');
  await expect(page.getByRole('status')).toHaveText('Type or paste a policy.');
  await expect(findings).toHaveCount(0);
  await expect(page.getByTestId('csp-header')).toHaveCount(0);
});

test('CSP builder builds a policy from a start, by adding and removing directives', async ({ page }) => {
  await open(page, '/csp/');
  const policy = page.getByRole('textbox', { name: 'Policy', exact: true });

  await page.getByRole('button', { name: 'Everything closed' }).click();
  await expect(policy).toHaveValue("default-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'");
  await expect(page.getByRole('button', { name: 'Everything closed' })).toHaveAttribute('aria-pressed', 'true');

  await page.getByRole('combobox', { name: 'Add a directive' }).selectOption('img-src');
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  await expect(policy).toHaveValue("default-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'; img-src 'self' data:");
  // what is in the policy can not be added again
  await expect(page.getByRole('combobox', { name: 'Add a directive' }).locator('option[value="img-src"]')).toHaveCount(0);

  await page.getByRole('button', { name: 'Remove form-action' }).click();
  await expect(policy).toHaveValue("default-src 'none'; base-uri 'none'; frame-ancestors 'none'; img-src 'self' data:");

  await page.getByRole('button', { name: 'Strict, with a nonce' }).click();
  await expect(policy).toHaveValue("script-src 'nonce-CHANGEME' 'strict-dynamic'; object-src 'none'; base-uri 'none'; frame-ancestors 'self'");
  await expect(page.getByText('Replace CHANGEME by a new random value in every response.')).toBeVisible();
});

test('CSP builder speaks Dutch', async ({ page }) => {
  await open(page, '/nl/csp/');
  await expect(page.getByRole('status')).toHaveText('Niets op te merken over deze policy.');
  await page.getByRole('textbox', { name: 'Policy', exact: true }).fill("script-src 'unsafe-eval'");
  await expect(page.getByRole('status')).toHaveText('4 opmerkingen over deze policy.');
  await expect(page.getByTestId('csp-findings')).toContainText("script-src staat 'unsafe-eval' toe");
  await expect(page.getByTestId('csp-explained')).toContainText('tekst die als code wordt uitgevoerd');
});
