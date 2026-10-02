/** Every piece of site text in English. nl.ts must have the same shape (checked by TypeScript and locales.test.ts). */
export default {
  meta: {
    title: 'Tools | developer tools by Joey Oosenbrug',
    description:
      'A dashboard of developer tools that run in your browser: nothing you paste is sent to a server. Encoders, formatters, generators and converters, plus a hand-picked list of the best tools elsewhere. In English and Dutch.',
    imageAlt: 'Tools: developer tools that stay in your browser'
  },
  header: {
    home: 'joeyoosenbrug.nl',
    main: 'Main',
    language: 'Switch language',
    toLight: 'Switch to light theme',
    toDark: 'Switch to dark theme',
    menu: 'Menu',
    search: 'Command menu',
    skip: 'Skip to content',
    tools: 'Tools',
    how: 'How it works'
  },
  hero: {
    title: 'Developer tools,',
    titleAccent: 'in your browser.',
    intro: 'One page to open every working day: the small tools a developer keeps reaching for, and the best ones elsewhere, one click away.',
    status: 'The tools are being built. They land here pack by pack.'
  },
  how: {
    title: 'How it works',
    intro: 'Three rules every tool here follows.',
    steps: [
      {
        title: 'Nothing leaves the browser',
        body: 'Every tool runs on your own machine. The page is not allowed to send data to another server, so a token or password you paste stays in this tab.'
      },
      {
        title: 'One page per tool',
        body: 'Each tool gets its own address, so you can bookmark the one you use and share it with a colleague.'
      },
      {
        title: 'No account, no tracking',
        body: 'Favourites and your own links are kept in this browser. There is nothing to sign up for and no cookie banner to click away.'
      }
    ]
  },
  footer: {
    tagline: 'Developer tools that stay in your browser.',
    madeBy: 'Made by',
    source: 'Source',
    newTab: '(opens in a new tab)'
  },
  error: {
    notFound: 'tool not found',
    line: 'This tool does not exist (yet), or it got refactored away.',
    home: 'back to the tools'
  }
};
