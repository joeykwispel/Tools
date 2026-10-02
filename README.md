# Joey Oosenbrug · Tools

[![Developer Tools: runs in your browser, nothing is sent](static/og.png)](https://tools.joeyoosenbrug.nl)

A dashboard of developer tools: the small tools a developer keeps reaching for, built in-house, plus hand-picked links to the best ones elsewhere. In the style of [joeyoosenbrug.nl](https://joeyoosenbrug.nl).

**Live:** [tools.joeyoosenbrug.nl](https://tools.joeyoosenbrug.nl) · [Nederlands](https://tools.joeyoosenbrug.nl/nl/)

## Principles

1. **Nothing leaves the browser.** Every tool runs client-side, and the Content Security Policy has `connect-src 'self'`, so "your token never leaves this tab" is enforced, not promised.
2. **One file per tool, one registry.** Search, cards, routes, tests and translations all follow from the registry.
3. **Useful on day one.** The dashboard is a start page before the last tool is built.

## Status

The site is live and lists every planned tool as coming soon. The list comes from `src/lib/tools/registry.ts`; the tools themselves arrive pack by pack.

## Stack

SvelteKit 2 + Svelte 5, TypeScript (strict), `adapter-static`, Vitest, Playwright + axe, Lighthouse CI, ESLint + Prettier, GitHub Actions → GitHub Pages. Node 24.

The look comes from the portfolio's design kit, copied into `src/lib/jo/`. Change it in the [portfolio](https://github.com/joeykwispel/Portfolio/tree/main/docs/design-kit) first, then copy it here.

## Develop

```sh
npm install
npm run dev          # http://localhost:5173
npm run build        # static site in dist/
npm run preview      # serves dist/ the way GitHub Pages does
```

| Script              | What it does                                                   |
| ------------------- | -------------------------------------------------------------- |
| `npm run lint`      | Prettier + ESLint                                              |
| `npm run check`     | Type check (svelte-check)                                      |
| `npm run test:unit` | Vitest                                                         |
| `npm run test:e2e`  | Playwright + axe on the build, desktop and mobile, both themes |
| `npm run og`        | Regenerates static/og.png (share image and README banner)      |

## Workflow

Feature branch → pull request into `main` → checks (lint, types, unit, end-to-end + accessibility, Lighthouse) → merge → automatic deploy to GitHub Pages. `main` is never pushed to directly.

## License

MIT, see [LICENSE](LICENSE). Third-party material is listed in [static/THIRD-PARTY-NOTICES.txt](static/THIRD-PARTY-NOTICES.txt).
