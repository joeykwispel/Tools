import { describe, expect, it } from 'vitest';
import { infer, pascal, singular, toTypeScript, toZod } from './logic';

const ts = (json: string, root?: string) => toTypeScript(infer(JSON.parse(json)), root);
const zod = (json: string, root?: string) => toZod(infer(JSON.parse(json)), root);

describe('toTypeScript', () => {
  it('writes an interface with the primitive types', () => {
    expect(ts('{"name":"Ada","age":36,"admin":true,"manager":null}')).toBe(
      'export interface Root {\n  name: string;\n  age: number;\n  admin: boolean;\n  manager: null;\n}\n'
    );
  });

  it('gives nested objects their own interface, named after their key, root first', () => {
    expect(ts('{"user":{"address":{"city":"Druten"}}}')).toBe(
      'export interface Root {\n  user: User;\n}\n\nexport interface User {\n  address: Address;\n}\n\nexport interface Address {\n  city: string;\n}\n'
    );
  });

  it('names the items of a list in the singular', () => {
    expect(ts('{"users":[{"id":1}],"categories":[{"slug":"a"}]}')).toBe(
      'export interface Root {\n  users: User[];\n  categories: Category[];\n}\n\nexport interface Category {\n  slug: string;\n}\n\nexport interface User {\n  id: number;\n}\n'
    );
  });

  it('makes a field optional when not every item has it, and joins the types it finds', () => {
    expect(ts('[{"id":1,"tag":"a"},{"id":"x"},{"id":2,"tag":null}]', 'rows')).toBe(
      'export type Rows = Row[];\n\nexport interface Row {\n  id: number | string;\n  tag?: string | null;\n}\n'
    );
  });

  it('never gives a list and its items the same name', () => {
    expect(ts('[{"id":1}]', 'Row')).toBe('export type Row = RowItem[];\n\nexport interface RowItem {\n  id: number;\n}\n');
    expect(ts('[{"id":1}]', 'data')).toBe('export type Data = DataItem[];\n\nexport interface DataItem {\n  id: number;\n}\n');
  });

  it('writes unions of arrays in brackets, and unknown for an empty array', () => {
    expect(ts('{"mixed":[1,"a",true],"empty":[],"nested":[[1],[2]]}')).toBe(
      'export interface Root {\n  mixed: (number | string | boolean)[];\n  empty: unknown[];\n  nested: number[][];\n}\n'
    );
  });

  it('quotes keys that are not identifiers', () => {
    expect(ts('{"content-type":"x","1st":1,"ok_key":2,"$ref":3}')).toBe(
      'export interface Root {\n  "content-type": string;\n  "1st": number;\n  ok_key: number;\n  $ref: number;\n}\n'
    );
  });

  it('uses one interface for the same shape, and different names for different shapes with the same key', () => {
    const same = ts('{"from":{"x":1,"y":2},"to":{"x":3,"y":4}}');
    expect(same).toContain('from: From;\n  to: From;');
    expect(same.match(/export interface/g)).toHaveLength(2);

    const different = ts('{"a":{"item":{"x":1}},"b":{"item":{"y":"z"}}}');
    expect(different).toContain('export interface Item {\n  x: number;\n}');
    expect(different).toContain('export interface Item2 {\n  y: string;\n}');
  });

  it('handles a root that is not an object, and takes the name it is given', () => {
    expect(ts('[1,2,3]', 'scores')).toBe('export type Scores = number[];\n');
    expect(ts('"text"')).toBe('export type Root = string;\n');
    expect(ts('{"a":1}', 'api response')).toBe('export interface ApiResponse {\n  a: number;\n}\n');
  });
});

describe('toZod', () => {
  it('writes a schema and the type inferred from it', () => {
    expect(zod('{"name":"Ada","age":36,"admin":true}')).toBe(
      "import { z } from 'zod';\n\nexport const rootSchema = z.object({\n  name: z.string(),\n  age: z.number(),\n  admin: z.boolean(),\n});\n\nexport type Root = z.infer<typeof rootSchema>;\n"
    );
  });

  it('declares the parts before the whole', () => {
    const out = zod('{"user":{"address":{"city":"Druten"}},"tags":["a"]}');
    expect(out.indexOf('const addressSchema')).toBeLessThan(out.indexOf('const userSchema'));
    expect(out.indexOf('const userSchema')).toBeLessThan(out.indexOf('export const rootSchema'));
    expect(out).toContain('  user: userSchema,\n  tags: z.array(z.string()),\n');
  });

  it('writes optional, nullable and union fields', () => {
    const out = zod('[{"id":1,"tag":"a","v":1},{"id":"x","v":null},{"id":2,"tag":null,"v":2}]', 'rows');
    expect(out).toContain('id: z.union([z.number(), z.string()]),');
    expect(out).toContain('tag: z.string().nullable().optional(),');
    expect(out).toContain('v: z.number().nullable(),');
    expect(out).toContain('export const rowsSchema = z.array(rowSchema);');
    expect(out).toContain('export type Rows = z.infer<typeof rowsSchema>;');
  });

  it('uses z.unknown() and z.null() where nothing more is known', () => {
    expect(zod('{"empty":[],"nothing":null}')).toContain('  empty: z.array(z.unknown()),\n  nothing: z.null(),\n');
  });
});

describe('names', () => {
  it('makes a type name from any key', () => {
    expect(pascal('user_profiles')).toBe('UserProfiles');
    expect(pascal('userID')).toBe('UserId');
    expect(pascal('content-type')).toBe('ContentType');
    expect(pascal('1st place')).toBe('_1StPlace');
    expect(pascal('___')).toBe('Item');
  });

  it('takes a plural back to one', () => {
    expect(singular('users')).toBe('user');
    expect(singular('categories')).toBe('category');
    expect(singular('address')).toBe('address');
    expect(singular('status')).toBe('status');
    expect(singular('data')).toBe('data');
  });
});
