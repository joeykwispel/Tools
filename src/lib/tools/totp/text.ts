const en = {
  secret: 'Secret',
  secretHint: 'The Base32 key from a 2FA set-up, or the whole otpauth:// link from its QR code.',
  newSecret: 'New secret',
  issuer: 'Service',
  account: 'Account',
  algorithm: 'Algorithm',
  digits: 'Digits',
  period: 'Seconds per code',
  code: 'Code now',
  next: 'Next code',
  waiting: 'Counting…',
  left: { one: 'Valid for 1 more second.', other: 'Valid for {seconds} more seconds.' },
  uri: 'Link for an authenticator app',
  qr: 'QR code for an authenticator app',
  qrAlt: 'QR code with the link above',
  read: 'Read from the link: {account}.',
  noName: 'no name',
  errors: {
    empty: 'Type or paste a secret.',
    characters: 'A secret is Base32: only the letters A to Z and the digits 2 to 7.',
    length: 'This secret is cut off: its length can not come from whole bytes.',
    scheme: 'This is not an otpauth://totp/ link.',
    hotp: 'This link is for counter-based codes (HOTP). This tool makes time-based codes.',
    secret: 'This link has no valid secret in it.',
    settings: 'This link asks for an algorithm, a number of digits or a period that does not exist.',
    period: 'The period is a whole number of seconds, from 1 to 3600.'
  },
  hint: 'Meant for testing. A real secret is the second factor itself: here it stays in this tab and is gone when you close it.',
  defaults: 'Nearly every app uses SHA-1, 6 digits and 30 seconds, and many ignore anything else.'
};

const nl: typeof en = {
  secret: 'Secret',
  secretHint: 'De Base32-sleutel uit een 2FA-instelling, of de hele otpauth://-link uit de QR-code ervan.',
  newSecret: 'Nieuw secret',
  issuer: 'Dienst',
  account: 'Account',
  algorithm: 'Algoritme',
  digits: 'Cijfers',
  period: 'Seconden per code',
  code: 'Code nu',
  next: 'Volgende code',
  waiting: 'Aan het tellen…',
  left: { one: 'Nog 1 seconde geldig.', other: 'Nog {seconds} seconden geldig.' },
  uri: 'Link voor een authenticator-app',
  qr: 'QR-code voor een authenticator-app',
  qrAlt: 'QR-code met de link hierboven',
  read: 'Uit de link gelezen: {account}.',
  noName: 'geen naam',
  errors: {
    empty: 'Typ of plak een secret.',
    characters: 'Een secret is Base32: alleen de letters A tot en met Z en de cijfers 2 tot en met 7.',
    length: 'Dit secret is afgekapt: deze lengte kan niet uit hele bytes komen.',
    scheme: 'Dit is geen otpauth://totp/-link.',
    hotp: 'Deze link is voor codes op een teller (HOTP). Deze tool maakt codes op tijd.',
    secret: 'In deze link staat geen geldig secret.',
    settings: 'Deze link vraagt om een algoritme, een aantal cijfers of een periode die niet bestaat.',
    period: 'De periode is een heel aantal seconden, van 1 tot en met 3600.'
  },
  hint: 'Bedoeld om te testen. Een echt secret is de tweede factor zelf: hier blijft het in dit tabblad en is het weg als je het sluit.',
  defaults: 'Bijna elke app gebruikt SHA-1, 6 cijfers en 30 seconden, en veel apps negeren al het andere.'
};

export default { en, nl };
