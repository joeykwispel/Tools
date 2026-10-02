const en = {
  input: 'JSON',
  indent: 'Layout',
  two: '2 spaces',
  four: '4 spaces',
  tab: 'Tabs',
  minify: 'One line',
  sort: 'Sort the keys',
  result: 'Result',
  tree: 'Tree',
  valid: 'Valid JSON.',
  duplicates: 'Valid JSON, but with a key used twice in one object: {keys}. A program only sees the last one.',
  at: 'Line {line}, column {column}: ',
  more: '… and {count} more',
  items: '{count} items',
  item: '1 item',
  keys: '{count} keys',
  key: '1 key',
  errors: {
    empty: 'There is nothing here yet.',
    end: 'the document stops here, but something is still open: a string, an object or an array.',
    char: 'unexpected {found}.',
    trailingComma: 'a comma before the closing bracket. JSON does not allow a trailing comma.',
    singleQuote: 'JSON strings use double quotes ("), not single quotes (\').',
    unquotedKey: 'a key has to be in double quotes: "{found}…".',
    comment: 'JSON has no comments.',
    number: 'this is not a valid number. No leading zeros, and a digit on both sides of the point.',
    escape: 'this is not a valid escape in a string.',
    control: 'a line break or tab inside a string has to be written as \\n or \\t.',
    extra: 'the document has already ended; this is extra.'
  }
};

const nl: typeof en = {
  input: 'JSON',
  indent: 'Opmaak',
  two: '2 spaties',
  four: '4 spaties',
  tab: 'Tabs',
  minify: 'Eén regel',
  sort: 'Sorteer de keys',
  result: 'Resultaat',
  tree: 'Boom',
  valid: 'Geldige JSON.',
  duplicates: 'Geldige JSON, maar met een key die twee keer in één object staat: {keys}. Een programma ziet alleen de laatste.',
  at: 'Regel {line}, kolom {column}: ',
  more: '… en nog {count}',
  items: '{count} items',
  item: '1 item',
  keys: '{count} keys',
  key: '1 key',
  errors: {
    empty: 'Hier staat nog niets.',
    end: 'het document stopt hier, maar er staat nog iets open: een string, een object of een array.',
    char: 'onverwachte {found}.',
    trailingComma: 'een komma vóór het sluitende haakje. JSON staat geen afsluitende komma toe.',
    singleQuote: 'JSON-strings gebruiken dubbele aanhalingstekens ("), geen enkele (\').',
    unquotedKey: 'een key moet tussen dubbele aanhalingstekens: "{found}…".',
    comment: 'JSON kent geen commentaar.',
    number: 'dit is geen geldig getal. Geen voorloopnullen, en een cijfer aan beide kanten van de punt.',
    escape: 'dit is geen geldige escape in een string.',
    control: 'een regeleinde of tab in een string moet als \\n of \\t geschreven worden.',
    extra: 'het document is al afgelopen; dit is te veel.'
  }
};

export default { en, nl };
