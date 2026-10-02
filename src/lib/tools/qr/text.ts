const en = {
  kind: 'What for',
  text: 'A link or text',
  wifi: 'A Wi-Fi network',
  content: 'Link or text',
  ssid: 'Network name',
  password: 'Password',
  security: 'Security',
  securities: { WPA: 'WPA / WPA2 / WPA3', WEP: 'WEP', nopass: 'none' },
  hidden: 'The network is hidden',
  level: 'Error correction',
  levels: { L: 'low (7%)', M: 'medium (15%)', Q: 'high (25%)', H: 'highest (30%)' },
  levelHint: 'More correction survives more damage or a logo on top, and makes the code larger.',
  code: 'QR code',
  alt: 'QR code for: {text}',
  size: 'Version {version}: {size} × {size} squares.',
  empty: 'Type something to make a code of.',
  tooLong: 'This is too much for a QR code. With lower error correction more fits.',
  svg: 'Download SVG',
  png: 'Download PNG',
  hint: 'The password goes into the code and nowhere else. Anyone who scans the code can read it.'
};

const nl: typeof en = {
  kind: 'Waarvoor',
  text: 'Een link of tekst',
  wifi: 'Een wifi-netwerk',
  content: 'Link of tekst',
  ssid: 'Netwerknaam',
  password: 'Wachtwoord',
  security: 'Beveiliging',
  securities: { WPA: 'WPA / WPA2 / WPA3', WEP: 'WEP', nopass: 'geen' },
  hidden: 'Het netwerk is verborgen',
  level: 'Foutcorrectie',
  levels: { L: 'laag (7%)', M: 'middel (15%)', Q: 'hoog (25%)', H: 'hoogst (30%)' },
  levelHint: 'Meer correctie overleeft meer schade of een logo erop, en maakt de code groter.',
  code: 'QR-code',
  alt: 'QR-code voor: {text}',
  size: 'Versie {version}: {size} × {size} blokjes.',
  empty: 'Typ iets om er een code van te maken.',
  tooLong: 'Dit is te veel voor een QR-code. Met minder foutcorrectie past er meer in.',
  svg: 'Download SVG',
  png: 'Download PNG',
  hint: 'Het wachtwoord gaat de code in en nergens anders heen. Wie de code scant, kan het lezen.'
};

export default { en, nl };
