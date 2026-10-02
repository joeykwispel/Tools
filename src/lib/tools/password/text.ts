const en = {
  kind: 'Kind',
  password: 'Password',
  passphrase: 'Passphrase (words)',
  length: 'Length',
  sets: 'Use',
  setNames: { lower: 'lower case (a–z)', upper: 'upper case (A–Z)', digits: 'digits (0–9)', symbols: 'symbols (!@#…)' },
  readable: 'Leave out characters that look alike (0 O o 1 l I)',
  words: 'Words',
  separator: 'Between the words',
  separators: { '-': 'a dash', ' ': 'a space', '.': 'a dot', _: 'an underscore' },
  capitalize: 'Start every word with a capital',
  digit: 'Add a digit',
  generate: 'Another one',
  result: 'Your {kind}',
  kinds: { password: 'password', passphrase: 'passphrase' },
  noSets: 'Choose at least one kind of character.',
  hint: 'Made in your browser with its secure random numbers. It is never sent or stored.',
  strength: '{label}: {bits} bits.',
  labels: { weak: 'Weak', fair: 'Fair', strong: 'Strong', veryStrong: 'Very strong' },
  crack: 'At ten billion guesses a second, guessing it takes {time} on average.',
  times: {
    instant: 'less than a second',
    seconds: '{n} seconds',
    minutes: '{n} minutes',
    hours: '{n} hours',
    days: '{n} days',
    years: '{n} years',
    centuries: 'more than a thousand years'
  }
};

const nl: typeof en = {
  kind: 'Soort',
  password: 'Wachtwoord',
  passphrase: 'Wachtzin (woorden)',
  length: 'Lengte',
  sets: 'Gebruik',
  setNames: { lower: 'kleine letters (a–z)', upper: 'hoofdletters (A–Z)', digits: 'cijfers (0–9)', symbols: 'symbolen (!@#…)' },
  readable: 'Laat tekens weg die op elkaar lijken (0 O o 1 l I)',
  words: 'Woorden',
  separator: 'Tussen de woorden',
  separators: { '-': 'een streepje', ' ': 'een spatie', '.': 'een punt', _: 'een underscore' },
  capitalize: 'Begin elk woord met een hoofdletter',
  digit: 'Voeg een cijfer toe',
  generate: 'Een andere',
  result: 'Je {kind}',
  kinds: { password: 'wachtwoord', passphrase: 'wachtzin' },
  noSets: 'Kies minstens één soort teken.',
  hint: 'Gemaakt in je browser met zijn veilige willekeurige getallen. Het wordt nooit verstuurd of opgeslagen.',
  strength: '{label}: {bits} bits.',
  labels: { weak: 'Zwak', fair: 'Redelijk', strong: 'Sterk', veryStrong: 'Zeer sterk' },
  crack: 'Bij tien miljard pogingen per seconde duurt raden gemiddeld {time}.',
  times: {
    instant: 'minder dan een seconde',
    seconds: '{n} seconden',
    minutes: '{n} minuten',
    hours: '{n} uur',
    days: '{n} dagen',
    years: '{n} jaar',
    centuries: 'meer dan duizend jaar'
  }
};

export default { en, nl };
