import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** Set BASE_PATH=/repo-name when deploying to a GitHub Pages project site instead of tools.joeyoosenbrug.nl. */
const base = process.env.BASE_PATH ?? '';

/**
 * SvelteKit hashes its own inline scripts for the CSP, but not the theme script in app.html.
 * Hash it here, after the %sveltekit.assets% placeholder is filled in, so the policy stays in sync when it changes.
 */
const appHtml = readFileSync(new URL('./src/app.html', import.meta.url), 'utf8');
const themeScript = /<script>([\s\S]*?)<\/script>/.exec(appHtml)?.[1] ?? '';
const themeHash = `sha256-${createHash('sha256').update(themeScript.replaceAll('%sveltekit.assets%', base)).digest('base64')}`;

export default {
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter({ pages: 'dist', assets: 'dist', fallback: '404.html', precompress: false, strict: true }),
    paths: { base, relative: false },
    prerender: { entries: ['*', '/nl/'] },
    // GitHub Pages can't send headers, so prerendered pages get the policy as a <meta> tag.
    csp: {
      mode: 'hash',
      directives: {
        'default-src': ['self'],
        'script-src': ['self', themeHash],
        // Svelte sets inline style attributes (CSS variables, transitions)
        'style-src': ['self', 'unsafe-inline'],
        'img-src': ['self', 'data:'],
        // Vite inlines small font subsets as data: URIs
        'font-src': ['self', 'data:'],
        // The page can only talk to itself and to the Supabase project that sign-in and syncing favourites use
        // (src/lib/cloud/config.ts). No tool sends what it is given there; e2e/site.spec.ts checks that.
        'connect-src': ['self', 'https://onnbzdrtdpyatfhzkghj.supabase.co'],
        'object-src': ['none'],
        'base-uri': ['self'],
        'form-action': ['none']
      }
    }
  }
};
