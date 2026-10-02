const en = {
  kind: 'Kind',
  kinds: { uuid4: 'UUID v4 (random)', uuid7: 'UUID v7 (sorts by time)', ulid: 'ULID', nanoid: 'NanoID' },
  count: 'How many',
  uppercase: 'Upper case',
  size: 'Length',
  generate: 'Generate',
  result: 'Identifiers',
  hint: 'Made with the secure random numbers of your browser.',
  inspect: 'What is this ID?',
  inspectLabel: 'A UUID or ULID',
  inspectEmpty: 'Paste an identifier to see what kind it is and when it was made.',
  unknown: 'This is not a UUID or a ULID.',
  nil: 'The nil UUID: all zeros, used for "no value".',
  max: 'The max UUID: all ones.',
  uuid: 'A UUID, version {version}.',
  versions: {
    1: 'made from the time and a network address',
    2: 'a DCE security UUID',
    3: 'made from a name, with MD5',
    4: 'random',
    5: 'made from a name, with SHA-1',
    6: 'made from the time, sortable',
    7: 'made from the time in milliseconds, sortable',
    8: 'a custom layout'
  } as Record<number, string>,
  variantOther: 'Its variant is not the usual one (RFC 9562), so the version may mean something else.',
  ulid: 'A ULID.',
  made: 'Made on {time}.'
};

const nl: typeof en = {
  kind: 'Soort',
  kinds: { uuid4: 'UUID v4 (willekeurig)', uuid7: 'UUID v7 (sorteert op tijd)', ulid: 'ULID', nanoid: 'NanoID' },
  count: 'Hoeveel',
  uppercase: 'Hoofdletters',
  size: 'Lengte',
  generate: 'Genereer',
  result: 'Identifiers',
  hint: 'Gemaakt met de veilige willekeurige getallen van je browser.',
  inspect: 'Wat is dit ID?',
  inspectLabel: 'Een UUID of ULID',
  inspectEmpty: 'Plak een identifier om te zien wat voor soort het is en wanneer hij gemaakt is.',
  unknown: 'Dit is geen UUID en geen ULID.',
  nil: 'De nil-UUID: allemaal nullen, gebruikt voor "geen waarde".',
  max: 'De max-UUID: allemaal enen.',
  uuid: 'Een UUID, versie {version}.',
  versions: {
    1: 'gemaakt uit de tijd en een netwerkadres',
    2: 'een DCE-security-UUID',
    3: 'gemaakt uit een naam, met MD5',
    4: 'willekeurig',
    5: 'gemaakt uit een naam, met SHA-1',
    6: 'gemaakt uit de tijd, sorteerbaar',
    7: 'gemaakt uit de tijd in milliseconden, sorteerbaar',
    8: 'een eigen indeling'
  },
  variantOther: 'De variant is niet de gebruikelijke (RFC 9562), dus de versie kan iets anders betekenen.',
  ulid: 'Een ULID.',
  made: 'Gemaakt op {time}.'
};

export default { en, nl };
