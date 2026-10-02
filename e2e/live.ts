import { tools } from '../src/lib/tools/registry';

/**
 * The tools, straight from the registry, so the tests keep up as tools get built: a new tool is covered by the shared
 * tests without touching them, and no test counts on a particular tool still being "soon".
 */
export const all = tools.map(({ slug, title, status }) => ({ slug, title, status }));
export const live = all.filter((tool) => tool.status === 'live');
export const soon = all.filter((tool) => tool.status === 'soon');
