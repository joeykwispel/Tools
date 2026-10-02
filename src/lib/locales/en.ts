/** Every piece of site text in English. nl.ts must have the same shape (checked by TypeScript and locales.test.ts). */
export default {
  meta: {
    title: 'Tools | developer tools by Joey Oosenbrug',
    description:
      'A dashboard of developer tools that run in your browser: nothing you paste is sent to a server. Encoders, formatters, generators and converters, plus a hand-picked list of the best tools elsewhere. In English and Dutch.',
    imageAlt: 'Tools: developer tools that stay in your browser',
    toolTitle: '{title} | Tools'
  },
  header: {
    home: 'joeyoosenbrug.nl',
    main: 'Main',
    language: 'Switch language',
    toLight: 'Switch to light theme',
    toDark: 'Switch to dark theme',
    menu: 'Menu',
    search: 'Command menu',
    skip: 'Skip to content'
  },
  hero: {
    title: 'Developer tools,',
    titleAccent: 'in your browser.',
    status: 'Coming soon: {count} tools.'
  },
  tools: {
    soon: 'soon',
    back: 'all tools',
    privacy: 'Runs in your browser. Nothing you type here is sent anywhere.'
  },
  favorites: {
    title: 'Favourites',
    add: 'Add {title} to favourites',
    remove: 'Remove {title} from favourites'
  },
  auth: {
    signIn: 'Sign in',
    account: 'Account',
    title: 'Sync your favourites',
    why: 'Sign in to keep your favourite tools on every device. Everything works without an account.',
    google: 'Continue with Google',
    loading: 'Loading…',
    privacy: 'Only your favourites are stored. Nothing you put into a tool is ever sent.',
    signedInAs: 'Signed in as {name}',
    syncing: 'Syncing your favourites…',
    synced: 'Favourites synced across your devices.',
    syncError: 'Could not sync. Your favourites are safe on this device.',
    signOut: 'Sign out',
    cancelled: 'Sign-in was cancelled.',
    failed: 'Sign-in failed. Try again later.'
  },
  regex: {
    pattern: 'Pattern',
    flags: 'Flags',
    flagNames: { g: 'global', i: 'ignore case', m: 'multiline', s: 'dot matches newline', u: 'unicode' },
    text: 'Test text',
    matches: 'Matches',
    none: 'No matches.',
    one: '1 match.',
    many: '{count} matches.',
    truncated: 'Showing the first {count} matches.',
    empty: 'Type a pattern to see what it matches.',
    invalid: 'Invalid pattern: {message}',
    tooSlow: 'This pattern takes too long on this text, so it was stopped. It probably backtracks too much.',
    match: 'Match {n}',
    at: 'at {index}',
    group: 'Group {name}',
    noValue: 'not matched',
    replaceWith: 'Replace with',
    replaceHint: '$1, $<name> and $& insert a group or the whole match.',
    result: 'Result',
    copy: 'Copy',
    copied: 'Copied',
    sample: 'Sample'
  },
  footer: {
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
