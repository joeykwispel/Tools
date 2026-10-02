const en = {
  content: 'Content of the file',
  file: 'Or pick the file',
  fileHint: 'Read in your browser, never uploaded. Up to {max}. Picking the file is the safe way: pasted text can differ by a line ending.',
  fileTooLarge: '{name} is {size}; the limit is {max}.',
  hashedFile: 'Hashed {name} ({size}).',
  hashedText: 'Hashed the text ({size} as UTF-8).',
  url: 'Address of the file',
  urlHint: 'Only written into the tag. This tool does not fetch it.',
  kind: 'Tag',
  kinds: { script: 'script', module: 'module script', style: 'stylesheet' },
  algorithm: 'Hash',
  recommended: '{algorithm} (usual)',
  integrity: 'integrity',
  tag: 'Tag',
  verify: 'Check an integrity value',
  verifyHint: 'Paste a value, an attribute or a whole tag to see what a browser does with it for this content.',
  match: 'It matches by {algorithm}: a browser loads this content.',
  mismatch: 'It does not match by {algorithm}: a browser refuses this content.',
  malformed: 'It does not match: the value is too short or too long for {algorithm}. A browser refuses the file.',
  unchecked: 'There is no sha256, sha384 or sha512 hash in this. A browser skips it and loads the file without checking.',
  note: 'The hash is of the exact bytes. When the file changes at the address, even by a space, the browser refuses it until the value is updated.'
};

const nl: typeof en = {
  content: 'Inhoud van het bestand',
  file: 'Of kies het bestand',
  fileHint: 'In je browser gelezen, nooit geüpload. Maximaal {max}. Het bestand kiezen is de veilige weg: geplakte tekst kan een regeleinde verschillen.',
  fileTooLarge: '{name} is {size}; de limiet is {max}.',
  hashedFile: '{name} gehasht ({size}).',
  hashedText: 'De tekst gehasht ({size} als UTF-8).',
  url: 'Adres van het bestand',
  urlHint: 'Wordt alleen in de tag gezet. Deze tool haalt het niet op.',
  kind: 'Tag',
  kinds: { script: 'script', module: 'module-script', style: 'stylesheet' },
  algorithm: 'Hash',
  recommended: '{algorithm} (gebruikelijk)',
  integrity: 'integrity',
  tag: 'Tag',
  verify: 'Controleer een integrity-waarde',
  verifyHint: 'Plak een waarde, een attribuut of een hele tag om te zien wat een browser ermee doet voor deze inhoud.',
  match: 'Het klopt volgens {algorithm}: een browser laadt deze inhoud.',
  mismatch: 'Het klopt niet volgens {algorithm}: een browser weigert deze inhoud.',
  malformed: 'Het klopt niet: de waarde is te kort of te lang voor {algorithm}. Een browser weigert het bestand.',
  unchecked: 'Hier staat geen sha256-, sha384- of sha512-hash in. Een browser slaat het over en laadt het bestand zonder te controleren.',
  note: 'De hash is van de exacte bytes. Verandert het bestand op het adres, al is het een spatie, dan weigert de browser het tot de waarde is bijgewerkt.'
};

export default { en, nl };
