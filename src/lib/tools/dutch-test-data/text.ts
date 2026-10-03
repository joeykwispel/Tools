const en = {
  check: 'Check one',
  make: 'Make some',
  count: 'How many',
  again: 'Make new ones',
  made: 'Made up',
  warning:
    'Made up here, for testing forms and validation. A number that passes its check can by chance belong to a real person or account: never use it for anything real.',
  bsn: {
    title: 'BSN',
    input: 'BSN to check',
    hint: 'Nine digits; the digits times 9, 8, 7 … 2 and the last one times -1 have to add up to a multiple of 11.',
    ok: '{bsn} passes the 11-test.',
    errors: {
      empty: 'Type a BSN.',
      characters: 'A BSN has only digits.',
      length: 'A BSN has nine digits (or eight, with the zero in front left out).',
      zero: 'Only zeros is not a BSN.',
      check: 'This does not pass the 11-test.'
    }
  },
  iban: {
    title: 'IBAN',
    input: 'IBAN to check',
    hint: 'Of any country. The two digits after the country are worked out from the rest, so a typo shows.',
    ok: '{iban} has the right check digits.',
    okBank: '{iban} has the right check digits. The bank is {bank}.',
    errors: {
      empty: 'Type an IBAN.',
      characters: 'An IBAN has only letters and digits.',
      shape:
        'This does not have the shape of an IBAN: two letters of a country, two digits, then the account. A Dutch one is NL, two digits, four letters and ten digits.',
      length: 'An IBAN of {country} has {expected} characters; this has {length}.',
      check: 'The check digits are not right: there is a typo in it.'
    }
  },
  postcode: {
    title: 'Postcode',
    input: 'Postcode to check',
    hint: 'Four digits and two letters. This checks the shape, not whether the postcode is in use.',
    ok: '{postcode} has the shape of a postcode.',
    errors: {
      empty: 'Type a postcode.',
      shape: 'A postcode is four digits and two letters, like 1012 AB.',
      zero: 'A postcode does not start with 0.',
      letters: 'The letters SA, SD and SS are not used in postcodes.'
    }
  }
};

const nl: typeof en = {
  check: 'Controleer er een',
  make: 'Maak er een paar',
  count: 'Hoeveel',
  again: 'Maak nieuwe',
  made: 'Verzonnen',
  warning:
    'Hier verzonnen, om formulieren en validatie mee te testen. Een nummer dat door zijn controle komt kan toevallig van een echt persoon of een echte rekening zijn: gebruik het nooit voor iets echts.',
  bsn: {
    title: 'BSN',
    input: 'BSN om te controleren',
    hint: 'Negen cijfers; de cijfers keer 9, 8, 7 … 2 en het laatste keer -1 moeten samen een veelvoud van 11 zijn.',
    ok: '{bsn} komt door de 11-proef.',
    errors: {
      empty: 'Typ een BSN.',
      characters: 'Een BSN heeft alleen cijfers.',
      length: 'Een BSN heeft negen cijfers (of acht, als de nul vooraan is weggelaten).',
      zero: 'Alleen nullen is geen BSN.',
      check: 'Dit komt niet door de 11-proef.'
    }
  },
  iban: {
    title: 'IBAN',
    input: 'IBAN om te controleren',
    hint: 'Van elk land. De twee cijfers na het land worden uit de rest berekend, dus een typfout valt op.',
    ok: '{iban} heeft de juiste controlecijfers.',
    okBank: '{iban} heeft de juiste controlecijfers. De bank is {bank}.',
    errors: {
      empty: 'Typ een IBAN.',
      characters: 'Een IBAN heeft alleen letters en cijfers.',
      shape:
        'Dit heeft niet de vorm van een IBAN: twee letters van een land, twee cijfers, dan de rekening. Een Nederlandse is NL, twee cijfers, vier letters en tien cijfers.',
      length: 'Een IBAN van {country} heeft {expected} tekens; dit heeft er {length}.',
      check: 'De controlecijfers kloppen niet: er zit een typfout in.'
    }
  },
  postcode: {
    title: 'Postcode',
    input: 'Postcode om te controleren',
    hint: 'Vier cijfers en twee letters. Dit controleert de vorm, niet of de postcode in gebruik is.',
    ok: '{postcode} heeft de vorm van een postcode.',
    errors: {
      empty: 'Typ een postcode.',
      shape: 'Een postcode is vier cijfers en twee letters, zoals 1012 AB.',
      zero: 'Een postcode begint niet met 0.',
      letters: 'De letters SA, SD en SS worden niet gebruikt in postcodes.'
    }
  }
};

export default { en, nl };
