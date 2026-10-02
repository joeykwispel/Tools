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
});
