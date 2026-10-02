const en = {
  text: 'Text',
  file: 'Or hash a file',
  fileHint: 'The file is read in your browser and never uploaded. Up to {max}.',
  fileTooLarge: '{name} is {size}; the limit is {max}.',
  hashing: 'Hashing {name}…',
  hashed: 'The checksums of {name} ({size}).',
  hashedText: 'The checksums of the text ({size} as UTF-8).',
  format: 'Write as',
  hex: 'hex',
  hexUpper: 'HEX',
  base64: 'Base64',
  results: 'Checksums',
  algorithm: 'Algorithm',
  checksum: 'Checksum',
  copy: 'Copy {algorithm}',
  broken: 'Fine for checking a download, broken for security.',
  expected: 'Compare with',
  expectedHint: 'Paste the checksum you were given: hex or Base64, with or without a file name behind it.',
  match: 'It matches: the same {algorithm} checksum.',
  mismatch: 'It does not match. It has the length of {algorithm}, but the checksum here is different: the content is not the same.',
  unknown: 'This is not a checksum of MD5, SHA-1, SHA-256, SHA-384 or SHA-512.'
};

const nl: typeof en = {
  text: 'Tekst',
  file: 'Of hash een bestand',
  fileHint: 'Het bestand wordt in je browser gelezen en nooit geüpload. Maximaal {max}.',
  fileTooLarge: '{name} is {size}; de limiet is {max}.',
  hashing: '{name} wordt gehasht…',
  hashed: 'De checksums van {name} ({size}).',
  hashedText: 'De checksums van de tekst ({size} als UTF-8).',
  format: 'Schrijf als',
  hex: 'hex',
  hexUpper: 'HEX',
  base64: 'Base64',
  results: 'Checksums',
  algorithm: 'Algoritme',
  checksum: 'Checksum',
  copy: 'Kopieer {algorithm}',
  broken: 'Prima om een download te controleren, gebroken voor beveiliging.',
  expected: 'Vergelijk met',
  expectedHint: 'Plak de checksum die je gekregen hebt: hex of Base64, met of zonder bestandsnaam erachter.',
  match: 'Hij klopt: dezelfde {algorithm}-checksum.',
  mismatch: 'Hij klopt niet. Hij heeft de lengte van {algorithm}, maar de checksum hier is anders: de inhoud is niet dezelfde.',
  unknown: 'Dit is geen checksum van MD5, SHA-1, SHA-256, SHA-384 of SHA-512.'
};

export default { en, nl };
