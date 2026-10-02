import { expect, test } from '@playwright/test';
import { open } from '../helpers';

test('JSON → TypeScript writes interfaces and a Zod schema from an example', async ({ page }) => {
  await open(page, '/json-to-ts/');
  const input = page.getByRole('textbox', { name: 'JSON example' });
  const typescript = page.getByTestId('json-to-ts-typescript');
  const zod = page.getByTestId('json-to-ts-zod');

  await input.fill('{"id":1,"tags":["a"],"owner":{"name":"Ada","email":null}}');
  await expect(typescript).toHaveText(
    'export interface User {\n  id: number;\n  tags: string[];\n  owner: Owner;\n}\n\nexport interface Owner {\n  name: string;\n  email: null;\n}\n'
  );
  await expect(zod).toContainText("import { z } from 'zod';");
  await expect(zod).toContainText('const ownerSchema = z.object({\n  name: z.string(),\n  email: z.null(),\n});');
  await expect(zod).toContainText('export type User = z.infer<typeof userSchema>;');

  await page.getByRole('textbox', { name: 'Name of the type' }).fill('api response');
  await expect(typescript).toContainText('export interface ApiResponse {');
  await expect(zod).toContainText('export const apiResponseSchema = z.object({');
});

test('JSON → TypeScript finds optional fields and unions in a list', async ({ page }) => {
  await open(page, '/json-to-ts/');
  await page.getByRole('textbox', { name: 'Name of the type' }).fill('rows');
  await page.getByRole('textbox', { name: 'JSON example' }).fill('[{"id":1,"note":"x"},{"id":"two"}]');
  await expect(page.getByTestId('json-to-ts-typescript')).toHaveText(
    'export type Rows = Row[];\n\nexport interface Row {\n  id: number | string;\n  note?: string;\n}\n'
  );
  await expect(page.getByTestId('json-to-ts-zod')).toContainText('  id: z.union([z.number(), z.string()]),\n  note: z.string().optional(),\n');
});

test('JSON → TypeScript explains invalid JSON, and speaks Dutch', async ({ page }) => {
  await open(page, '/json-to-ts/');
  await page.getByRole('textbox', { name: 'JSON example' }).fill('{"a": 1,}');
  await expect(page.getByRole('status')).toHaveText('Line 1, column 9: a comma before the closing bracket. JSON does not allow a trailing comma.');
  await expect(page.getByTestId('json-to-ts-typescript')).toHaveCount(0);

  await open(page, '/nl/json-to-ts/');
  await expect(page.getByTestId('json-to-ts-typescript')).toContainText('export interface User {');
  await page.getByRole('textbox', { name: 'JSON-voorbeeld' }).fill('[1,]');
  await expect(page.getByRole('status')).toContainText('Regel 1, kolom 4: een komma vóór het sluitende haakje');
});
