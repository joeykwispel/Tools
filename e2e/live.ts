import { tools } from '../src/lib/tools/registry';

/** The built tools, straight from the registry: a new tool is covered by the shared tests without touching them. */
export const live = tools.filter((tool) => tool.status === 'live').map(({ slug, title }) => ({ slug, title }));
