const en = {
  before: 'Original',
  after: 'Changed',
  compareAs: 'Compare as',
  text: 'Text',
  json: 'JSON (key order and layout do not count)',
  ignoreWhitespace: 'Ignore differences in spaces',
  ignoreCase: 'Ignore upper and lower case',
  showAll: 'Show unchanged lines too',
  result: 'Differences',
  same: 'No differences.',
  summary: '{added} added, {removed} removed.',
  skipped: '{count} unchanged lines',
  skippedOne: '1 unchanged line',
  added: 'added',
  removed: 'removed',
  lineBefore: 'Line in the original',
  lineAfter: 'Line in the changed text',
  change: 'Change',
  line: 'Line',
  invalidJson: 'The {side} is not valid JSON. Line {line}, column {column}: {message}',
  sides: { before: 'original', after: 'changed text' }
};

const nl: typeof en = {
  before: 'Origineel',
  after: 'Gewijzigd',
  compareAs: 'Vergelijk als',
  text: 'Tekst',
  json: 'JSON (volgorde van keys en opmaak tellen niet mee)',
  ignoreWhitespace: 'Negeer verschillen in spaties',
  ignoreCase: 'Negeer hoofdletters en kleine letters',
  showAll: 'Toon ook ongewijzigde regels',
  result: 'Verschillen',
  same: 'Geen verschillen.',
  summary: '{added} toegevoegd, {removed} verwijderd.',
  skipped: '{count} ongewijzigde regels',
  skippedOne: '1 ongewijzigde regel',
  added: 'toegevoegd',
  removed: 'verwijderd',
  lineBefore: 'Regel in het origineel',
  lineAfter: 'Regel in de gewijzigde tekst',
  change: 'Wijziging',
  line: 'Regel',
  invalidJson: 'Het {side} is geen geldige JSON. Regel {line}, kolom {column}: {message}',
  sides: { before: 'origineel', after: 'gewijzigde deel' }
};

export default { en, nl };
