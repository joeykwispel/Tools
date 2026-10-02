import type { Component } from 'svelte';
import type { Localized } from '$lib/types';

export type CategoryId = 'encode' | 'data' | 'xml' | 'text' | 'security' | 'time' | 'css' | 'web' | 'reference' | 'dutch' | 'team';

export interface Category {
  id: CategoryId;
  title: Localized;
}

/** One entry in the registry. */
export interface Tool {
  /** The URL segment of the tool's page: /<slug>/ */
  slug: string;
  category: CategoryId;
  /** A few characters of code shown in the icon box, e.g. "{ }" */
  icon: string;
  title: Localized;
  /** One line for the row */
  description: Localized;
  /** Extra search terms, the same in both languages */
  keywords: string[];
  /** `soon` is listed but has no page yet. */
  status: 'soon' | 'live';
  /** The tool's UI, for a tool that is built. */
  load?: () => Promise<{ default: Component }>;
}
