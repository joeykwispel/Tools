import type { Locale } from '$lib/types';
import type { Tool } from './types';

/** Lowercase and without accents, so "kopiëren" is found by "kopieren". */
const normalise = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '');

/** How well one search term fits a tool; 0 when it does not fit at all. */
function score(tool: Tool, term: string, locale: Locale): number {
  const other: Locale = locale === 'en' ? 'nl' : 'en';
  const title = normalise(tool.title[locale]);
  if (title.startsWith(term)) return 100;
  if (normalise(tool.title[other]).startsWith(term)) return 90;
  if (title.split(/[^a-z0-9]+/).some((word) => word.startsWith(term))) return 80;
  if (title.includes(term) || normalise(tool.title[other]).includes(term)) return 60;
  if (tool.slug.includes(term)) return 50;
  const keywords = tool.keywords.map(normalise);
  if (keywords.some((k) => k.startsWith(term))) return 40;
  if (keywords.some((k) => k.includes(term))) return 30;
  if (normalise(tool.description[locale]).includes(term) || normalise(tool.description[other]).includes(term)) return 10;
  return 0;
}

/**
 * The tools that fit `query`, best first. Every word of the query has to fit: in the title, the slug, a keyword or the
 * description, in either language. On an equal score a built tool comes before a planned one, then registry order decides.
 */
export function search(tools: readonly Tool[], query: string, locale: Locale): Tool[] {
  const terms = normalise(query).split(/\s+/).filter(Boolean);
  if (!terms.length) return [];
  return tools
    .map((tool, order) => {
      const scores = terms.map((term) => score(tool, term, locale));
      return { tool, order, total: scores.includes(0) ? 0 : scores.reduce((a, b) => a + b, 0) };
    })
    .filter((hit) => hit.total > 0)
    .sort((a, b) => b.total - a.total || Number(b.tool.status === 'live') - Number(a.tool.status === 'live') || a.order - b.order)
    .map((hit) => hit.tool);
}
