const en = {
  easing: 'Easing',
  easingHint: 'cubic-bezier(), a keyword like ease-out, or four numbers.',
  preset: 'Start from',
  custom: 'your own curve',
  graph: 'The curve: time from left to right, progress from bottom to top. Drag the two handles, or use the numbers.',
  handle: { x1: 'First handle, time (x1)', y1: 'First handle, progress (y1)', x2: 'Second handle, time (x2)', y2: 'Second handle, progress (y2)' },
  errors: {
    empty: 'Type an easing.',
    invalid: 'This is not an easing that can be read.',
    x: 'Both time values (x1 and x2) have to lie from 0 to 1.'
  },
  overshoot: 'This curve goes beyond the start or the end before it settles.',
  timing: 'Timing function',
  transition: 'As a transition',
  duration: 'Duration',
  durationValue: '{ms} ms',
  play: 'Play',
  back: 'Back',
  thisCurve: 'This curve',
  linear: 'linear'
};

const nl: typeof en = {
  easing: 'Easing',
  easingHint: 'cubic-bezier(), een trefwoord zoals ease-out, of vier getallen.',
  preset: 'Begin met',
  custom: 'je eigen curve',
  graph: 'De curve: tijd van links naar rechts, voortgang van onder naar boven. Sleep de twee handvatten, of gebruik de getallen.',
  handle: { x1: 'Eerste handvat, tijd (x1)', y1: 'Eerste handvat, voortgang (y1)', x2: 'Tweede handvat, tijd (x2)', y2: 'Tweede handvat, voortgang (y2)' },
  errors: {
    empty: 'Typ een easing.',
    invalid: 'Dit is geen easing die te lezen is.',
    x: 'Beide tijdwaarden (x1 en x2) moeten tussen 0 en 1 liggen.'
  },
  overshoot: 'Deze curve schiet voorbij het begin of het eind voordat hij stilvalt.',
  timing: 'Timing-functie',
  transition: 'Als transition',
  duration: 'Duur',
  durationValue: '{ms} ms',
  play: 'Afspelen',
  back: 'Terug',
  thisCurve: 'Deze curve',
  linear: 'lineair'
};

export default { en, nl };
