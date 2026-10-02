import { error } from '@sveltejs/kit';
import { liveTool, tools } from '$lib/tools/registry';
import type { EntryGenerator, PageLoad } from './$types';

/** One page per built tool, in both languages. */
export const entries: EntryGenerator = () => tools.filter((tool) => tool.status === 'live').flatMap(({ slug }) => [{ slug }, { lang: 'nl', slug }]);

export const load: PageLoad = async ({ params }) => {
  const tool = liveTool(params.slug);
  if (!tool?.load) error(404, 'Not found');
  // loaded here and not in the page, so the prerendered HTML already holds the tool
  return { tool, component: (await tool.load()).default };
};
