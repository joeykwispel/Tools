const en = {
  message: 'Message',
  key: 'Secret key',
  keyFormat: 'The key is written as',
  formats: { text: 'text', hex: 'hex', base64: 'Base64' },
  badKey: 'This key is not valid {format}.',
  algorithm: 'Algorithm',
  result: 'Signature',
  hex: 'Hex',
  base64: 'Base64',
  given: 'Compare with a signature',
  givenHint: 'Hex or Base64; a prefix like sha256= (GitHub webhooks) is ignored. The message has to be the exact bytes that were signed.',
  match: 'The signatures match: this message was signed with this key.',
  mismatch: 'The signatures do not match: another key, or the message is not exactly the same (a space or a line break counts).',
  wrongLength: 'This signature is {got} bytes; {algorithm} gives {expected}. It was probably made with another algorithm.',
  hint: 'The key never leaves this tab: the signature is made by your browser.'
};

const nl: typeof en = {
  message: 'Bericht',
  key: 'Geheime sleutel',
  keyFormat: 'De sleutel is geschreven als',
  formats: { text: 'tekst', hex: 'hex', base64: 'Base64' },
  badKey: 'Deze sleutel is geen geldige {format}.',
  algorithm: 'Algoritme',
  result: 'Handtekening',
  hex: 'Hex',
  base64: 'Base64',
  given: 'Vergelijk met een handtekening',
  givenHint: 'Hex of Base64; een prefix als sha256= (GitHub-webhooks) wordt genegeerd. Het bericht moet precies de bytes zijn die ondertekend zijn.',
  match: 'De handtekeningen kloppen: dit bericht is met deze sleutel ondertekend.',
  mismatch: 'De handtekeningen kloppen niet: een andere sleutel, of het bericht is niet precies hetzelfde (een spatie of regeleinde telt mee).',
  wrongLength: 'Deze handtekening is {got} bytes; {algorithm} geeft er {expected}. Hij is waarschijnlijk met een ander algoritme gemaakt.',
  hint: 'De sleutel verlaat dit tabblad nooit: je browser maakt de handtekening.'
};

export default { en, nl };
