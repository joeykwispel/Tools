const en = {
  input: 'Certificate (PEM)',
  hint: 'Paste one certificate or a whole chain. Only certificates: a private key never belongs in a website.',
  certificate: 'Certificate {n}',
  subject: 'Subject',
  issuer: 'Issuer',
  selfSigned: 'self-signed: it vouches for itself',
  validFrom: 'Valid from',
  validUntil: 'Valid until',
  valid: 'Valid for another {days} days.',
  validToday: 'Valid, and expires today.',
  expired: 'Expired {days} days ago.',
  expiredToday: 'Expired today.',
  notYet: 'Not valid yet: it starts in {days} days.',
  serial: 'Serial number',
  version: 'Version',
  signature: 'Signed with',
  weak: 'This signature algorithm is no longer accepted by browsers.',
  publicKey: 'Public key',
  bits: '{bits} bits',
  altNames: 'Alternative names',
  ca: 'Certificate authority',
  yes: 'yes',
  no: 'no',
  pathLength: 'at most {count} authorities below it',
  keyUsage: 'Key usage',
  extendedKeyUsage: 'Extended key usage',
  sha256: 'SHA-256 fingerprint',
  sha1: 'SHA-1 fingerprint',
  quantumSafe: 'Post-quantum: this algorithm is not broken by a quantum computer.',
  notQuantumSafe:
    'Not quantum-safe: a large quantum computer could break this key and forge this signature. Fine today; plan for a post-quantum algorithm (ML-DSA) before that changes.',
  empty: 'Paste a certificate to see what is in it.',
  errors: {
    none: 'There is no certificate here. It starts with -----BEGIN CERTIFICATE-----.',
    privateKey:
      'This is a private key ({label}). It is not read or shown. If this key is in use, treat it as leaked only if you pasted it somewhere else too: here it never left this tab.',
    otherBlock: 'This block is a {label}, not a certificate.',
    base64: 'What is between BEGIN and END is not valid Base64.',
    structure: 'This is not a complete certificate: its contents can not be read. It may be cut off.'
  }
};

const nl: typeof en = {
  input: 'Certificaat (PEM)',
  hint: 'Plak één certificaat of een hele keten. Alleen certificaten: een private key hoort nooit in een website.',
  certificate: 'Certificaat {n}',
  subject: 'Onderwerp',
  issuer: 'Uitgever',
  selfSigned: 'self-signed: het staat voor zichzelf in',
  validFrom: 'Geldig vanaf',
  validUntil: 'Geldig tot',
  valid: 'Nog {days} dagen geldig.',
  validToday: 'Geldig, en verloopt vandaag.',
  expired: '{days} dagen geleden verlopen.',
  expiredToday: 'Vandaag verlopen.',
  notYet: 'Nog niet geldig: het gaat in over {days} dagen.',
  serial: 'Serienummer',
  version: 'Versie',
  signature: 'Ondertekend met',
  weak: 'Dit ondertekeningsalgoritme wordt door browsers niet meer geaccepteerd.',
  publicKey: 'Publieke sleutel',
  bits: '{bits} bits',
  altNames: 'Alternatieve namen',
  ca: 'Certificaatautoriteit',
  yes: 'ja',
  no: 'nee',
  pathLength: 'hooguit {count} autoriteiten eronder',
  keyUsage: 'Sleutelgebruik',
  extendedKeyUsage: 'Uitgebreid sleutelgebruik',
  sha256: 'SHA-256-fingerprint',
  sha1: 'SHA-1-fingerprint',
  quantumSafe: 'Post-quantum: dit algoritme wordt niet gebroken door een kwantumcomputer.',
  notQuantumSafe:
    'Niet quantum-safe: een grote kwantumcomputer kan deze sleutel breken en deze handtekening vervalsen. Vandaag prima; plan de overstap naar een post-quantum-algoritme (ML-DSA) voordat dat verandert.',
  empty: 'Plak een certificaat om te zien wat erin staat.',
  errors: {
    none: 'Hier staat geen certificaat. Het begint met -----BEGIN CERTIFICATE-----.',
    privateKey:
      'Dit is een private key ({label}). Hij wordt niet gelezen of getoond. Is deze sleutel in gebruik, beschouw hem dan alleen als gelekt als je hem ook ergens anders hebt geplakt: hier heeft hij dit tabblad niet verlaten.',
    otherBlock: 'Dit blok is een {label}, geen certificaat.',
    base64: 'Wat tussen BEGIN en END staat is geen geldige Base64.',
    structure: 'Dit is geen compleet certificaat: de inhoud is niet te lezen. Misschien is het afgekapt.'
  }
};

export default { en, nl };
