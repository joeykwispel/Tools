const en = {
  input: 'SVG',
  file: 'Or pick the file',
  fileHint: 'Read in your browser, never uploaded. Up to {max}.',
  fileTooLarge: '{name} is {size}; the limit is {max}.',
  remove: 'Take out',
  options: {
    comments: 'Comments',
    metadata: 'XML line, doctype and metadata',
    editor: 'Editor data and unused namespaces',
    empty: 'Empty groups',
    oneLine: 'Line breaks and indentation'
  },
  removeHint: 'A comment that starts with ! is kept: that is where a licence goes. Titles and descriptions stay, screen readers use them.',
  precision: 'Numbers',
  precisions: { keep: 'as written', 3: '3 decimals', 2: '2 decimals', 1: '1 decimal', 0: 'whole numbers' },
  precisionHint: 'Rounding moves points a little. Compare the two pictures, more so for a small viewBox.',
  smaller: '{before} → {after}: {percent}% smaller.',
  same: '{before} → {after}: no smaller with these settings.',
  notSvg: 'This is XML, but the root element is <{name}>, not <svg>.',
  before: 'Before',
  after: 'After',
  beforeAlt: 'The SVG as it was given',
  afterAlt: 'The SVG after optimising',
  result: 'Optimised SVG',
  downloadName: 'optimised.svg',
  encoding: 'Data URI as',
  encodings: { text: 'text (smaller)', base64: 'Base64' },
  uri: 'Data URI',
  css: 'In CSS',
  uriHint: 'For src="…" or url("…"). The SVG namespace is added when it is missing: an image does not show without it.'
};

const nl: typeof en = {
  input: 'SVG',
  file: 'Of kies het bestand',
  fileHint: 'In je browser gelezen, nooit geüpload. Maximaal {max}.',
  fileTooLarge: '{name} is {size}; de limiet is {max}.',
  remove: 'Haal weg',
  options: {
    comments: 'Comments',
    metadata: 'XML-regel, doctype en metadata',
    editor: 'Editor-data en ongebruikte namespaces',
    empty: 'Lege groepen',
    oneLine: 'Regeleinden en inspringing'
  },
  removeHint: 'Een comment dat met ! begint blijft staan: daar hoort een licentie. Titels en beschrijvingen blijven, schermlezers gebruiken ze.',
  precision: 'Getallen',
  precisions: { keep: 'zoals geschreven', 3: '3 decimalen', 2: '2 decimalen', 1: '1 decimaal', 0: 'hele getallen' },
  precisionHint: 'Afronden verschuift punten een beetje. Vergelijk de twee plaatjes, zeker bij een kleine viewBox.',
  smaller: '{before} → {after}: {percent}% kleiner.',
  same: '{before} → {after}: niet kleiner met deze instellingen.',
  notSvg: 'Dit is XML, maar het root-element is <{name}>, niet <svg>.',
  before: 'Voor',
  after: 'Na',
  beforeAlt: 'De SVG zoals hij is gegeven',
  afterAlt: 'De SVG na het optimaliseren',
  result: 'Geoptimaliseerde SVG',
  downloadName: 'geoptimaliseerd.svg',
  encoding: 'Data-URI als',
  encodings: { text: 'tekst (kleiner)', base64: 'Base64' },
  uri: 'Data-URI',
  css: 'In CSS',
  uriHint: 'Voor src="…" of url("…"). De SVG-namespace wordt toegevoegd als hij ontbreekt: zonder is een afbeelding niet te zien.'
};

export default { en, nl };
