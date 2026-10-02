const en = {
  target: 'Escape for',
  targets: { json: 'JSON', js: 'JavaScript', regex: 'Regex', shell: 'Shell' },
  mode: 'Direction',
  escape: 'Escape',
  unescape: 'Unescape',
  text: 'Text',
  escaped: 'Escaped text',
  quotes: 'Put the quotes around it',
  ascii: 'Also escape everything outside ASCII',
  result: 'Result',
  badEscape: 'The escape at position {at} is not complete or not valid.',
  badQuote: 'The quote at position {at} is never closed.',
  hints: {
    json: 'The contents of a JSON string: " and \\ are escaped, line breaks become \\n.',
    js: 'A single-quoted JavaScript string.',
    regex: 'Every character that means something in a pattern gets a backslash, so the pattern matches the text literally.',
    shell: 'Single quotes for a POSIX shell (bash, zsh, sh): nothing inside them is expanded.'
  }
};

const nl: typeof en = {
  target: 'Escapen voor',
  targets: { json: 'JSON', js: 'JavaScript', regex: 'Regex', shell: 'Shell' },
  mode: 'Richting',
  escape: 'Escapen',
  unescape: 'Unescapen',
  text: 'Tekst',
  escaped: 'Ge-escapete tekst',
  quotes: 'Zet de aanhalingstekens eromheen',
  ascii: 'Escape ook alles buiten ASCII',
  result: 'Resultaat',
  badEscape: 'De escape op positie {at} is niet compleet of niet geldig.',
  badQuote: 'Het aanhalingsteken op positie {at} wordt nergens gesloten.',
  hints: {
    json: 'De inhoud van een JSON-string: " en \\ worden ge-escaped, regeleinden worden \\n.',
    js: 'Een JavaScript-string tussen enkele aanhalingstekens.',
    regex: 'Elk teken dat iets betekent in een patroon krijgt een backslash, zodat het patroon de tekst letterlijk matcht.',
    shell: 'Enkele aanhalingstekens voor een POSIX-shell (bash, zsh, sh): daarbinnen wordt niets uitgebreid.'
  }
};

export default { en, nl };
