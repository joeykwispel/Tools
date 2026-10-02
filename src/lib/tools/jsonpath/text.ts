const en = {
  document: 'JSON document',
  query: 'JSONPath',
  examples: 'Examples',
  matches: 'Matches',
  none: 'Nothing in the document matches.',
  one: '1 match.',
  many: '{count} matches.',
  values: 'The values',
  listed: 'The first {count} matches are listed; the values below hold all of them.',
  documentError: 'The document is not valid JSON. Line {line}, column {column}: {message}',
  documentEmpty: 'Paste a JSON document to query.',
  errors: {
    start: 'A JSONPath starts with $, the document itself.',
    end: 'The query stops too early: something is still expected after the last character.',
    unexpected: 'Unexpected {found} at position {position}.',
    string: 'The quote at position {position} is never closed.'
  }
};

const nl: typeof en = {
  document: 'JSON-document',
  query: 'JSONPath',
  examples: 'Voorbeelden',
  matches: 'Matches',
  none: 'Niets in het document komt overeen.',
  one: '1 match.',
  many: '{count} matches.',
  values: 'De waarden',
  listed: 'De eerste {count} matches staan in de lijst; de waarden hieronder bevatten ze allemaal.',
  documentError: 'Het document is geen geldige JSON. Regel {line}, kolom {column}: {message}',
  documentEmpty: 'Plak een JSON-document om in te zoeken.',
  errors: {
    start: 'Een JSONPath begint met $, het document zelf.',
    end: 'De query stopt te vroeg: na het laatste teken wordt nog iets verwacht.',
    unexpected: 'Onverwachte {found} op positie {position}.',
    string: 'Het aanhalingsteken op positie {position} wordt nergens gesloten.'
  }
};

export default { en, nl };
