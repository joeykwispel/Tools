const en = {
  format: 'Format',
  hex: 'Hex',
  base32: 'Base32',
  mode: 'Direction',
  encode: 'Text to {format}',
  decode: '{format} to text',
  text: 'Text',
  separator: 'Between the bytes',
  none: 'nothing',
  space: 'a space',
  colon: 'a colon',
  upper: 'Upper case',
  padding: 'Pad with = to a multiple of 8',
  result: 'Result',
  bytes: '{count} bytes.',
  badHexCharacters: 'This is not hex: only 0–9 and a–f are allowed, with spaces, colons, dashes or 0x between the bytes.',
  badHexLength: 'This is not complete hex: a byte is two digits, and one digit is left over.',
  badBase32Characters: 'This is not Base32: only A–Z and 2–7 are allowed.',
  badBase32Length: 'This is not complete Base32: characters are missing at the end.',
  binary: 'These {count} bytes are not text (not valid UTF-8). As hex:'
};

const nl: typeof en = {
  format: 'Formaat',
  hex: 'Hex',
  base32: 'Base32',
  mode: 'Richting',
  encode: 'Tekst naar {format}',
  decode: '{format} naar tekst',
  text: 'Tekst',
  separator: 'Tussen de bytes',
  none: 'niets',
  space: 'een spatie',
  colon: 'een dubbele punt',
  upper: 'Hoofdletters',
  padding: 'Aanvullen met = tot een veelvoud van 8',
  result: 'Resultaat',
  bytes: '{count} bytes.',
  badHexCharacters: 'Dit is geen hex: alleen 0–9 en a–f zijn toegestaan, met spaties, dubbele punten, streepjes of 0x tussen de bytes.',
  badHexLength: 'Dit is geen volledige hex: een byte is twee cijfers, en er blijft één cijfer over.',
  badBase32Characters: 'Dit is geen Base32: alleen A–Z en 2–7 zijn toegestaan.',
  badBase32Length: 'Dit is geen volledige Base32: er ontbreken tekens aan het eind.',
  binary: 'Deze {count} bytes zijn geen tekst (geen geldige UTF-8). Als hex:'
};

export default { en, nl };
