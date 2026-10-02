const en = {
  mode: 'Direction',
  encode: 'Encode',
  decode: 'Decode',
  text: 'Text',
  html: 'HTML with entities',
  level: 'What to escape',
  special: 'Only & < > " \'',
  named: 'Also non-ASCII, by name (&eacute;)',
  numeric: 'Also non-ASCII, by number (&#233;)',
  result: 'Result',
  unknownOne: '1 entity is not known and was left as it is.',
  unknownMany: '{count} entities are not known and were left as they are.'
};

const nl: typeof en = {
  mode: 'Richting',
  encode: 'Coderen',
  decode: 'Decoderen',
  text: 'Tekst',
  html: 'HTML met entiteiten',
  level: 'Wat er wordt ge-escaped',
  special: 'Alleen & < > " \'',
  named: 'Ook niet-ASCII, met een naam (&eacute;)',
  numeric: 'Ook niet-ASCII, met een nummer (&#233;)',
  result: 'Resultaat',
  unknownOne: '1 entiteit is niet bekend en is blijven staan.',
  unknownMany: '{count} entiteiten zijn niet bekend en zijn blijven staan.'
};

export default { en, nl };
