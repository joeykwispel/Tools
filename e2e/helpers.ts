import type { Page, Route } from '@playwright/test';

/** Opens a page and waits until it reacts to input: a click before that would be lost. */
export async function open(page: Page, path: string) {
  await page.goto(path);
  await page.locator('html[data-hydrated]').waitFor();
}

/** Collects CSP violations and uncaught errors, so a test fails if either happens. */
export function watchErrors(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error' && /Content Security Policy|Refused to/i.test(m.text())) errors.push(m.text());
  });
  return errors;
}

/** Every request the page makes to another origin (the Supabase project is the only one it is allowed to reach). */
export function watchForeignRequests(page: Page, baseURL: string) {
  const foreign: string[] = [];
  page.on('request', (r) => {
    const url = r.url();
    if (!url.startsWith(baseURL) && !url.startsWith('data:') && !url.startsWith('blob:')) foreign.push(url);
  });
  return foreign;
}

export const USER = {
  id: '5f0c6c1e-3a57-4f7e-9d1f-0e4b1f6f2a11',
  aud: 'authenticated',
  role: 'authenticated',
  email: 'ada@example.com',
  app_metadata: { provider: 'google' },
  user_metadata: { full_name: 'Ada Lovelace' },
  created_at: '2026-01-01T00:00:00Z'
};

const base64url = (o: unknown) => Buffer.from(JSON.stringify(o)).toString('base64url');

function session() {
  const exp = Math.floor(Date.now() / 1000) + 3600;
  const token = `${base64url({ alg: 'HS256', typ: 'JWT' })}.${base64url({ sub: USER.id, exp, role: 'authenticated', aud: 'authenticated' })}.sig`;
  return { access_token: token, token_type: 'bearer', expires_in: 3600, expires_at: exp, refresh_token: 'refresh', user: USER };
}

export interface CloudRow {
  slug: string;
  starred: boolean;
  changed_at: string;
}

/**
 * Stands in for Supabase and the Google round trip: authorize -> redirect back with ?code -> PKCE token exchange ->
 * tool_favorites select and upsert. Nothing reaches the real project: anything not answered here is aborted.
 * `cloud` is what the account already has; the returned `upserts` are the rows the page sent, per request.
 */
export async function mockSupabase(page: Page, cloud: CloudRow[] = []) {
  const rows = new Map(cloud.map((r) => [r.slug, r]));
  const upserts: (CloudRow & { user_id: string })[][] = [];
  await page.route('https://*.supabase.co/**', (route) => route.abort());
  await page.route('**/auth/v1/authorize**', (route) => {
    const redirect = new URL(route.request().url()).searchParams.get('redirect_to')!;
    return route.fulfill({ status: 302, headers: { location: `${redirect}?code=test-code` } });
  });
  await page.route('**/auth/v1/token**', (route) => route.fulfill({ json: session() }));
  await page.route('**/auth/v1/user**', (route) => route.fulfill({ json: USER }));
  await page.route('**/auth/v1/logout**', (route) => route.fulfill({ status: 204 }));
  await page.route('**/rest/v1/tool_favorites**', (route: Route) => {
    const request = route.request();
    const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' };
    if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
    if (request.method() === 'GET') return route.fulfill({ json: [...rows.values()], headers: cors });
    const sent = [request.postDataJSON()].flat() as (CloudRow & { user_id: string })[];
    upserts.push(sent);
    // the same rule as the database trigger: the last change wins
    for (const { slug, starred, changed_at } of sent) {
      const old = rows.get(slug);
      if (!old || Date.parse(changed_at) >= Date.parse(old.changed_at)) rows.set(slug, { slug, starred, changed_at });
    }
    return route.fulfill({ status: 201, json: sent.map((r) => rows.get(r.slug)), headers: cors });
  });
  return { upserts, rows };
}
