const en = {
  date: 'Day',
  today: 'Today',
  zones: 'Time zones',
  zonesHint: 'The hours in the table are those of the first one.',
  first: 'first',
  putFirst: 'Put first',
  putFirstLabel: 'Put {zone} first',
  remove: 'Remove',
  removeLabel: 'Remove {zone}',
  add: 'Add a time zone',
  addButton: 'Add',
  advice: {
    work: 'Everyone is at work from {times}, on the clock of {place}.',
    awake: 'There is no hour in which everyone is at work. Nobody is asleep from {times}, on the clock of {place}.',
    none: 'Whatever the hour, it is night for someone. Pick who gets up early or stays up late.',
    stretch: '{from} to {to}',
    empty: 'Pick a day.'
  },
  table: 'The hours of {date}',
  pick: 'Pick {time}',
  legend: { work: 'at work', edge: 'early or late', weekend: 'weekend', night: 'night' },
  dayBefore: 'the day before',
  dayAfter: 'the day after',
  chosen: 'The time picked',
  chosenHint: 'Pick an hour in the table to see it on every clock.',
  copy: 'Copy as text'
};

const nl: typeof en = {
  date: 'Dag',
  today: 'Vandaag',
  zones: 'Tijdzones',
  zonesHint: 'De uren in de tabel zijn die van de eerste.',
  first: 'eerste',
  putFirst: 'Zet vooraan',
  putFirstLabel: 'Zet {zone} vooraan',
  remove: 'Verwijder',
  removeLabel: 'Verwijder {zone}',
  add: 'Voeg een tijdzone toe',
  addButton: 'Toevoegen',
  advice: {
    work: 'Iedereen is aan het werk van {times}, op de klok van {place}.',
    awake: 'Er is geen uur waarop iedereen aan het werk is. Niemand slaapt van {times}, op de klok van {place}.',
    none: 'Welk uur je ook kiest, voor iemand is het nacht. Kies wie vroeg opstaat of laat opblijft.',
    stretch: '{from} tot {to}',
    empty: 'Kies een dag.'
  },
  table: 'De uren van {date}',
  pick: 'Kies {time}',
  legend: { work: 'aan het werk', edge: 'vroeg of laat', weekend: 'weekend', night: 'nacht' },
  dayBefore: 'de dag ervoor',
  dayAfter: 'de dag erna',
  chosen: 'De gekozen tijd',
  chosenHint: 'Kies een uur in de tabel om het op elke klok te zien.',
  copy: 'Kopieer als tekst'
};

export default { en, nl };
