const en = {
  input: 'Timestamp or date',
  inputHint: 'A Unix timestamp, an ISO 8601 date like 2023-11-14T22:13:20Z, or the date of an HTTP header.',
  now: 'Now',
  nowIs: 'Now it is {seconds}.',
  unit: 'A timestamp is in',
  units: { auto: 'guess from its size', s: 'seconds', ms: 'milliseconds', us: 'microseconds', ns: 'nanoseconds' },
  zone: 'Time zone',
  zoneHint: 'For writing the date, and for reading a date that does not say its own zone.',
  yours: '{zone} (yours)',
  results: 'This moment',
  rows: {
    seconds: 'Seconds',
    milliseconds: 'Milliseconds',
    isoUtc: 'ISO 8601, UTC',
    isoZone: 'ISO 8601, {zone}',
    http: 'HTTP and e-mail',
    week: 'Week date',
    words: 'In words',
    relative: 'From now'
  },
  read: {
    s: 'Read as seconds.',
    ms: 'Read as milliseconds.',
    us: 'Read as microseconds.',
    ns: 'Read as nanoseconds.',
    zoned: 'Read as a date with its own time zone.',
    local: 'Read as a date in {zone}.'
  },
  errors: {
    empty: 'Type a timestamp or a date.',
    invalid: 'This is not a timestamp or a date that can be read.',
    range: 'This is further from 1970 than a date can reach: 100 million days.'
  }
};

const nl: typeof en = {
  input: 'Timestamp of datum',
  inputHint: 'Een Unix-timestamp, een ISO 8601-datum zoals 2023-11-14T22:13:20Z, of de datum uit een HTTP-header.',
  now: 'Nu',
  nowIs: 'Nu is het {seconds}.',
  unit: 'Een timestamp is in',
  units: { auto: 'raad uit de grootte', s: 'seconden', ms: 'milliseconden', us: 'microseconden', ns: 'nanoseconden' },
  zone: 'Tijdzone',
  zoneHint: 'Om de datum te schrijven, en om een datum te lezen die zijn eigen zone niet noemt.',
  yours: '{zone} (de jouwe)',
  results: 'Dit moment',
  rows: {
    seconds: 'Seconden',
    milliseconds: 'Milliseconden',
    isoUtc: 'ISO 8601, UTC',
    isoZone: 'ISO 8601, {zone}',
    http: 'HTTP en e-mail',
    week: 'Weekdatum',
    words: 'In woorden',
    relative: 'Vanaf nu'
  },
  read: {
    s: 'Gelezen als seconden.',
    ms: 'Gelezen als milliseconden.',
    us: 'Gelezen als microseconden.',
    ns: 'Gelezen als nanoseconden.',
    zoned: 'Gelezen als een datum met een eigen tijdzone.',
    local: 'Gelezen als een datum in {zone}.'
  },
  errors: {
    empty: 'Typ een timestamp of een datum.',
    invalid: 'Dit is geen timestamp of datum die te lezen is.',
    range: 'Dit ligt verder van 1970 dan een datum kan komen: 100 miljoen dagen.'
  }
};

export default { en, nl };
