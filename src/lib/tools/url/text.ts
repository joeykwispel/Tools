const en = {
  mode: 'Direction',
  encode: 'Encode',
  decode: 'Decode',
  text: 'Text',
  encoded: 'Encoded text',
  scope: 'What to escape',
  component: 'A value (escapes : / ? # & = too)',
  url: 'A whole URL (keeps its structure)',
  plusEncode: 'Write a space as + (form encoding)',
  plusDecode: 'Read + as a space (form encoding)',
  result: 'Result',
  invalidOne: '1 % sequence is not a valid escape and was left as it is.',
  invalidMany: '{count} % sequences are not valid escapes and were left as they are.'
};

const nl: typeof en = {
  mode: 'Richting',
  encode: 'Coderen',
  decode: 'Decoderen',
  text: 'Tekst',
  encoded: 'Gecodeerde tekst',
  scope: 'Wat er wordt ge-escaped',
  component: 'Een waarde (ook : / ? # & = worden ge-escaped)',
  url: 'Een hele URL (de structuur blijft staan)',
  plusEncode: 'Schrijf een spatie als + (formuliercodering)',
  plusDecode: 'Lees + als een spatie (formuliercodering)',
  result: 'Resultaat',
  invalidOne: '1 %-reeks is geen geldige escape en is blijven staan.',
  invalidMany: '{count} %-reeksen zijn geen geldige escapes en zijn blijven staan.'
};

export default { en, nl };
