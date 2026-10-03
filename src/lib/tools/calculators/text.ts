const en = {
  pick: 'Calculate',
  picks: { bases: 'number bases', chmod: 'chmod', sizes: 'data sizes', cidr: 'CIDR', semver: 'semver' },
  bases: {
    input: 'Number',
    base: 'Written in',
    auto: 'by its prefix (0x, 0b, 0o), else decimal',
    names: { 2: 'binary', 8: 'octal', 10: 'decimal', 16: 'hexadecimal' },
    hint: 'Whole numbers of any size. Spaces and underscores between digits are fine.',
    errors: { empty: 'Type a number.', digits: 'This is not a whole number in that base.' },
    bits: 'Bits needed',
    character: 'As a character'
  },
  chmod: {
    input: 'Permissions',
    hint: 'A number like 755 or 4755, or the letters ls shows: rwxr-xr-x.',
    error: 'This is not a mode: three or four digits from 0 to 7, or nine letters like rwxr-xr-x.',
    who: { owner: 'Owner', group: 'Group', other: 'Others' },
    what: { read: 'read', write: 'write', execute: 'execute' },
    grid: 'Who may do what',
    cell: '{who}: {what}',
    special: 'Special',
    specials: { setuid: 'setuid: run as the owner', setgid: 'setgid: run as the group', sticky: 'sticky: only the owner deletes' },
    octal: 'Number',
    symbolic: 'Letters',
    command: 'Command'
  },
  sizes: {
    value: 'Amount',
    unit: 'Unit',
    error: 'Type a number.',
    families: { decimal: 'Bytes, in steps of 1000', binary: 'Bytes, in steps of 1024', bits: 'Bits' },
    hint: 'Disks and networks count in steps of 1000 (GB, Mbit); memory and most operating systems in steps of 1024 (GiB), often still written as GB.'
  },
  cidr: {
    input: 'Address and prefix',
    hint: 'IPv4 in CIDR notation, like 192.168.1.10/24. Without a prefix it is one address.',
    errors: {
      empty: 'Type an address.',
      address: 'This is not an IPv4 address: four numbers from 0 to 255 with dots between them.',
      prefix: 'The prefix has to be a number from 0 to 32.'
    },
    names: {
      network: 'Network',
      mask: 'Mask',
      binary: 'Mask in bits',
      wildcard: 'Wildcard',
      broadcast: 'Broadcast',
      first: 'First host',
      last: 'Last host',
      hosts: 'Hosts',
      total: 'Addresses',
      kind: 'Kind'
    },
    kinds: {
      private: 'private: not reachable from the internet',
      loopback: 'loopback: this machine itself',
      linkLocal: 'link-local: self-assigned, when there is no DHCP',
      shared: 'shared: between a provider and its customers (CGNAT)',
      multicast: 'multicast',
      reserved: 'reserved',
      public: 'public'
    }
  },
  semver: {
    range: 'Range',
    rangeHint: 'As in package.json: ^1.2.3, ~1.2, 1.x, >=1.0.0 <2.0.0, 1.2.3 - 2.3.4, with || for "or".',
    rangeError: 'This is not a range that can be read.',
    means: 'What it means',
    versions: 'Versions to try',
    versionsHint: 'One per line.',
    results: 'In the range',
    yes: 'in',
    no: 'out',
    invalid: 'not a version',
    prerelease: 'A prerelease is only in a range that names a prerelease of that same version.'
  }
};

const nl: typeof en = {
  pick: 'Reken met',
  picks: { bases: 'talstelsels', chmod: 'chmod', sizes: 'datagroottes', cidr: 'CIDR', semver: 'semver' },
  bases: {
    input: 'Getal',
    base: 'Geschreven in',
    auto: 'volgens de prefix (0x, 0b, 0o), anders decimaal',
    names: { 2: 'binair', 8: 'octaal', 10: 'decimaal', 16: 'hexadecimaal' },
    hint: 'Hele getallen van elke grootte. Spaties en underscores tussen cijfers mogen.',
    errors: { empty: 'Typ een getal.', digits: 'Dit is geen heel getal in dat talstelsel.' },
    bits: 'Bits nodig',
    character: 'Als teken'
  },
  chmod: {
    input: 'Rechten',
    hint: 'Een getal zoals 755 of 4755, of de letters die ls toont: rwxr-xr-x.',
    error: 'Dit is geen mode: drie of vier cijfers van 0 tot 7, of negen letters zoals rwxr-xr-x.',
    who: { owner: 'Eigenaar', group: 'Groep', other: 'Anderen' },
    what: { read: 'lezen', write: 'schrijven', execute: 'uitvoeren' },
    grid: 'Wie mag wat',
    cell: '{who}: {what}',
    special: 'Bijzonder',
    specials: { setuid: 'setuid: draait als de eigenaar', setgid: 'setgid: draait als de groep', sticky: 'sticky: alleen de eigenaar verwijdert' },
    octal: 'Getal',
    symbolic: 'Letters',
    command: 'Commando'
  },
  sizes: {
    value: 'Hoeveelheid',
    unit: 'Eenheid',
    error: 'Typ een getal.',
    families: { decimal: 'Bytes, in stappen van 1000', binary: 'Bytes, in stappen van 1024', bits: 'Bits' },
    hint: 'Schijven en netwerken tellen in stappen van 1000 (GB, Mbit); geheugen en de meeste besturingssystemen in stappen van 1024 (GiB), vaak nog geschreven als GB.'
  },
  cidr: {
    input: 'Adres en prefix',
    hint: 'IPv4 in CIDR-notatie, zoals 192.168.1.10/24. Zonder prefix is het één adres.',
    errors: {
      empty: 'Typ een adres.',
      address: 'Dit is geen IPv4-adres: vier getallen van 0 tot 255 met punten ertussen.',
      prefix: 'De prefix moet een getal van 0 tot 32 zijn.'
    },
    names: {
      network: 'Netwerk',
      mask: 'Masker',
      binary: 'Masker in bits',
      wildcard: 'Wildcard',
      broadcast: 'Broadcast',
      first: 'Eerste host',
      last: 'Laatste host',
      hosts: 'Hosts',
      total: 'Adressen',
      kind: 'Soort'
    },
    kinds: {
      private: 'privé: niet bereikbaar vanaf internet',
      loopback: 'loopback: deze machine zelf',
      linkLocal: 'link-local: zelf toegewezen, als er geen DHCP is',
      shared: 'gedeeld: tussen een provider en zijn klanten (CGNAT)',
      multicast: 'multicast',
      reserved: 'gereserveerd',
      public: 'publiek'
    }
  },
  semver: {
    range: 'Range',
    rangeHint: 'Zoals in package.json: ^1.2.3, ~1.2, 1.x, >=1.0.0 <2.0.0, 1.2.3 - 2.3.4, met || voor "of".',
    rangeError: 'Dit is geen range die te lezen is.',
    means: 'Wat het betekent',
    versions: 'Versies om te proberen',
    versionsHint: 'Eén per regel.',
    results: 'In de range',
    yes: 'erin',
    no: 'erbuiten',
    invalid: 'geen versie',
    prerelease: 'Een prerelease valt alleen in een range die een prerelease van diezelfde versie noemt.'
  }
};

export default { en, nl };
