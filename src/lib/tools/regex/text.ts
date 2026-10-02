/** The regex tester's text. Each tool keeps its own, in both languages; shared words (copy, sample, …) are in the locales. */
const en = {
  pattern: 'Pattern',
  flags: 'Flags',
  flagNames: { g: 'global', i: 'ignore case', m: 'multiline', s: 'dot matches newline', u: 'unicode' },
  text: 'Test text',
  matches: 'Matches',
  none: 'No matches.',
  one: '1 match.',
  many: '{count} matches.',
  truncated: 'Showing the first {count} matches.',
  listed: 'The first {count} matches are listed; all of them are highlighted above.',
  empty: 'Type a pattern to see what it matches.',
  invalid: 'Invalid pattern: {message}',
  tooSlow: 'This pattern takes too long on this text, so it was stopped. It probably backtracks too much.',
  match: 'Match {n}',
  at: 'at {index}',
  group: 'Group {name}',
  noValue: 'not matched',
  replaceWith: 'Replace with',
  replaceHint: '$1, $<name> and $& insert a group or the whole match.',
  result: 'Result'
};

const nl: typeof en = {
  pattern: 'Patroon',
  flags: 'Flags',
  flagNames: { g: 'globaal', i: 'hoofdletterongevoelig', m: 'meerdere regels', s: 'punt matcht nieuwe regel', u: 'unicode' },
  text: 'Testtekst',
  matches: 'Matches',
  none: 'Geen matches.',
  one: '1 match.',
  many: '{count} matches.',
  truncated: 'De eerste {count} matches worden getoond.',
  listed: 'De eerste {count} matches staan in de lijst; hierboven zijn ze allemaal gemarkeerd.',
  empty: 'Typ een patroon om te zien wat het matcht.',
  invalid: 'Ongeldig patroon: {message}',
  tooSlow: 'Dit patroon duurt te lang op deze tekst en is daarom gestopt. Het doet waarschijnlijk te veel aan backtracking.',
  match: 'Match {n}',
  at: 'op {index}',
  group: 'Groep {name}',
  noValue: 'niet gematcht',
  replaceWith: 'Vervangen door',
  replaceHint: '$1, $<naam> en $& voegen een groep of de hele match in.',
  result: 'Resultaat'
};

export default { en, nl };
