import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { categories, tools, toolsIn } from './registry';

describe('registry', () => {
  it('has unique slugs that work as a URL segment', () => {
    const slugs = tools.map((t) => t.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const slug of slugs) expect(slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    // /nl/ is the Dutch home page
    expect(slugs).not.toContain('nl');
  });

  it('has a title and a line in English and Dutch for every tool', () => {
    for (const t of tools) {
      for (const text of [t.title.en, t.title.nl, t.description.en, t.description.nl, t.icon]) expect(text.trim(), t.slug).not.toBe('');
      expect(t.icon.length, t.slug).toBeLessThanOrEqual(4);
    }
  });

  it('puts every tool in a known category, and leaves no category empty', () => {
    const ids = categories.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const t of tools) expect(ids, t.slug).toContain(t.category);
    for (const c of categories) expect(toolsIn(c.id).length, c.id).toBeGreaterThan(0);
  });

  it('has the same files for every built tool: the UI, its text, the logic, and tests for both', () => {
    const built = tools.filter((t) => t.status === 'live');
    expect(built.length).toBeGreaterThan(0);
    for (const t of built) {
      expect(t.load, t.slug).toBeTypeOf('function');
      for (const file of ['Tool.svelte', 'text.ts', 'logic.ts', 'logic.test.ts'])
        expect(existsSync(`src/lib/tools/${t.slug}/${file}`), `${t.slug}/${file}`).toBe(true);
      expect(existsSync(`e2e/tools/${t.slug}.spec.ts`), `e2e/tools/${t.slug}.spec.ts`).toBe(true);
    }
    for (const t of tools.filter((t) => t.status === 'soon')) expect(t.load, t.slug).toBeUndefined();
  });
});
