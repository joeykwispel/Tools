const en = {
  mode: 'Direction',
  encode: 'Encode',
  decode: 'Decode',
  text: 'Text',
  base64: 'Base64',
  urlSafe: 'URL-safe (- and _ instead of + and /, no padding)',
  file: 'Or encode a file',
  fileHint: 'The file is read in your browser. Up to {max}.',
  fileTooLarge: '{name} is {size}; the limit is {max}.',
  fileLoaded: '{name}, {size}',
  result: 'Result',
  sizes: '{input} in, {output} out.',
  badCharacters: 'This is not Base64: it contains characters outside A–Z, a–z, 0–9, + / - _ and =.',
  badLength: 'This is not complete Base64: one character is missing or too many.',
  binary: 'The result is not text ({size} of binary data). You can download it as a file.',
  download: 'Download as a file'
};

const nl: typeof en = {
  mode: 'Richting',
  encode: 'Coderen',
  decode: 'Decoderen',
  text: 'Tekst',
  base64: 'Base64',
  urlSafe: 'URL-safe (- en _ in plaats van + en /, geen padding)',
  file: 'Of codeer een bestand',
  fileHint: 'Het bestand wordt in je browser gelezen. Maximaal {max}.',
  fileTooLarge: '{name} is {size}; de limiet is {max}.',
  fileLoaded: '{name}, {size}',
  result: 'Resultaat',
  sizes: '{input} erin, {output} eruit.',
  badCharacters: 'Dit is geen Base64: er staan tekens in buiten A–Z, a–z, 0–9, + / - _ en =.',
  badLength: 'Dit is geen volledige Base64: er ontbreekt een teken of er staat er een te veel.',
  binary: 'Het resultaat is geen tekst ({size} aan binaire data). Je kunt het downloaden als bestand.',
  download: 'Download als bestand'
};

export default { en, nl };
