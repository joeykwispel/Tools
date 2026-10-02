const en = {
  first: 'First date',
  second: 'Second date',
  today: 'Today',
  includeEnd: 'Count the last day too',
  skipHolidays: 'Take Dutch public holidays off the working days',
  holidaysHint: 'New Year, Easter Monday, King’s Day, Ascension, Whit Monday and both days of Christmas, and Liberation Day once every five years.',
  results: 'Between these dates',
  pick: 'Pick two dates.',
  counted: 'From {from} up to {to}.',
  countedIncluding: 'From {from} up to and including {to}.',
  backwards: 'The second date is the earlier one: counted from there.',
  rows: { days: 'Days', weeks: 'Weeks', calendar: 'On the calendar', working: 'Working days', weekend: 'Weekend days', holidays: 'Holidays taken off' },
  units: {
    day: { one: '1 day', other: '{n} days' },
    week: { one: '1 week', other: '{n} weeks' },
    month: { one: '1 month', other: '{n} months' },
    year: { one: '1 year', other: '{n} years' }
  },
  holiday: {
    newYear: 'New Year’s Day',
    easter: 'Easter Sunday',
    easterMonday: 'Easter Monday',
    kingsDay: 'King’s Day',
    liberationDay: 'Liberation Day',
    ascension: 'Ascension Day',
    pentecost: 'Whit Sunday',
    whitMonday: 'Whit Monday',
    christmas: 'Christmas Day',
    boxingDay: 'Boxing Day'
  },
  add: 'The first date plus',
  amount: 'How many',
  unit: 'Of what',
  addUnits: { days: 'days', workingDays: 'working days', weeks: 'weeks', months: 'months', years: 'years' },
  addHint: 'A negative number counts back. Working days step over weekends, and over the holidays when those are taken off.',
  fallsOn: 'Falls on',
  amountError: 'Type a whole number.'
};

const nl: typeof en = {
  first: 'Eerste datum',
  second: 'Tweede datum',
  today: 'Vandaag',
  includeEnd: 'Tel de laatste dag ook mee',
  skipHolidays: 'Haal Nederlandse feestdagen van de werkdagen af',
  holidaysHint: 'Nieuwjaar, tweede paasdag, Koningsdag, Hemelvaart, tweede pinksterdag en beide kerstdagen, en Bevrijdingsdag eens in de vijf jaar.',
  results: 'Tussen deze datums',
  pick: 'Kies twee datums.',
  counted: 'Van {from} tot {to}.',
  countedIncluding: 'Van {from} tot en met {to}.',
  backwards: 'De tweede datum is de vroegste: vanaf daar geteld.',
  rows: { days: 'Dagen', weeks: 'Weken', calendar: 'Op de kalender', working: 'Werkdagen', weekend: 'Weekenddagen', holidays: 'Feestdagen eraf' },
  units: {
    day: { one: '1 dag', other: '{n} dagen' },
    week: { one: '1 week', other: '{n} weken' },
    month: { one: '1 maand', other: '{n} maanden' },
    year: { one: '1 jaar', other: '{n} jaar' }
  },
  holiday: {
    newYear: 'Nieuwjaarsdag',
    easter: 'Eerste paasdag',
    easterMonday: 'Tweede paasdag',
    kingsDay: 'Koningsdag',
    liberationDay: 'Bevrijdingsdag',
    ascension: 'Hemelvaartsdag',
    pentecost: 'Eerste pinksterdag',
    whitMonday: 'Tweede pinksterdag',
    christmas: 'Eerste kerstdag',
    boxingDay: 'Tweede kerstdag'
  },
  add: 'De eerste datum plus',
  amount: 'Hoeveel',
  unit: 'Waarvan',
  addUnits: { days: 'dagen', workingDays: 'werkdagen', weeks: 'weken', months: 'maanden', years: 'jaren' },
  addHint: 'Een negatief getal telt terug. Werkdagen stappen over weekenden heen, en over de feestdagen als die eraf gaan.',
  fallsOn: 'Valt op',
  amountError: 'Typ een heel getal.'
};

export default { en, nl };
