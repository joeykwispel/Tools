const en = {
  expression: 'Cron expression',
  hint: 'Five fields, as crontab reads them: minute, hour, day of the month, month, day of the week.',
  examples: 'Examples',
  meaning: 'When it runs',
  shorthand: 'Short for {expression}.',
  fields: 'Field by field',
  field: { minute: 'Minute', hour: 'Hour', dayOfMonth: 'Day of the month', month: 'Month', dayOfWeek: 'Day of the week' },
  all: 'every one ({values})',
  sunday: '0 is Sunday',
  next: 'Next runs',
  zone: 'On the clock of',
  utc: 'UTC, like most servers',
  own: 'you: {zone}',
  never: 'Never: this date does not come in the next eight years.',
  errors: {
    fields: {
      zero: 'Type a cron expression.',
      few: 'This has {count} of the five fields. A cron expression has a minute, hour, day of the month, month and day of the week.',
      many: 'This has {count} fields, cron has five. A sixth field for seconds or years is from other schedulers, like Quartz.'
    },
    reboot: '@reboot has no time to explain: it runs once, when the machine starts.',
    macro: '{token} is not a shorthand cron knows. There are @hourly, @daily, @weekly, @monthly and @yearly.',
    unsupported: '{field}: {token} is from other schedulers, like Quartz. Cron itself does not know L, W or #.',
    syntax: '{field}: “{token}” can not be read. A field is made of numbers, stars, commas, dashes and a slash for steps.',
    value: '{field}: {token} is out of range. It goes from {min} to {max}.',
    range: '{field}: the range {token} runs backwards.',
    step: '{field}: a step of 0 never gets anywhere.'
  },
  words: {
    everyMinute: 'every minute',
    everyNMinutes: 'every {n} minutes',
    at: 'at {times}',
    onTheHour: 'on the hour',
    minuteOne: 'at minute {minute} of the hour',
    minuteList: 'at minutes {minutes} of the hour',
    minuteRange: 'every minute from minute {from} to {to} of the hour',
    everyHour: 'every hour',
    everyNHours: 'every {n} hours',
    hourRange: 'from {from} to {to}',
    hourList: 'in the hours that start at {hours}',
    everyDay: 'every day',
    on: 'on {days}',
    fromTo: 'from {from} to {to}',
    domOne: 'on day {day} of the month',
    domRange: 'on days {from} to {to} of the month',
    domList: 'on days {days} of the month',
    domStep: 'every {n} days of the month, starting on day {from}',
    orAlso: 'and also',
    butOnly: 'but only',
    inMonths: 'in {months}'
  }
};

const nl: typeof en = {
  expression: 'Cron-expressie',
  hint: 'Vijf velden, zoals crontab ze leest: minuut, uur, dag van de maand, maand, dag van de week.',
  examples: 'Voorbeelden',
  meaning: 'Wanneer hij draait',
  shorthand: 'Kort voor {expression}.',
  fields: 'Veld voor veld',
  field: { minute: 'Minuut', hour: 'Uur', dayOfMonth: 'Dag van de maand', month: 'Maand', dayOfWeek: 'Dag van de week' },
  all: 'allemaal ({values})',
  sunday: '0 is zondag',
  next: 'Volgende keren',
  zone: 'Op de klok van',
  utc: 'UTC, zoals de meeste servers',
  own: 'jou: {zone}',
  never: 'Nooit: deze datum komt de komende acht jaar niet voor.',
  errors: {
    fields: {
      zero: 'Typ een cron-expressie.',
      few: 'Dit heeft {count} van de vijf velden. Een cron-expressie heeft een minuut, uur, dag van de maand, maand en dag van de week.',
      many: 'Dit heeft {count} velden, cron heeft er vijf. Een zesde veld voor seconden of jaren komt uit andere planners, zoals Quartz.'
    },
    reboot: '@reboot heeft geen tijd om uit te leggen: hij draait één keer, als de machine opstart.',
    macro: '{token} is geen afkorting die cron kent. Er zijn @hourly, @daily, @weekly, @monthly en @yearly.',
    unsupported: '{field}: {token} komt uit andere planners, zoals Quartz. Cron zelf kent geen L, W of #.',
    syntax: '{field}: “{token}” is niet te lezen. Een veld bestaat uit getallen, sterretjes, komma’s, streepjes en een schuine streep voor stappen.',
    value: '{field}: {token} valt buiten het bereik. Dat loopt van {min} tot en met {max}.',
    range: '{field}: het bereik {token} loopt achteruit.',
    step: '{field}: een stap van 0 komt nergens.'
  },
  words: {
    everyMinute: 'elke minuut',
    everyNMinutes: 'elke {n} minuten',
    at: 'om {times}',
    onTheHour: 'op het hele uur',
    minuteOne: 'op minuut {minute} van het uur',
    minuteList: 'op minuten {minutes} van het uur',
    minuteRange: 'elke minuut van minuut {from} tot en met {to} van het uur',
    everyHour: 'elk uur',
    everyNHours: 'elke {n} uur',
    hourRange: 'van {from} tot en met {to}',
    hourList: 'in de uren die beginnen om {hours}',
    everyDay: 'elke dag',
    on: 'op {days}',
    fromTo: 'van {from} tot en met {to}',
    domOne: 'op dag {day} van de maand',
    domRange: 'op dag {from} tot en met {to} van de maand',
    domList: 'op dag {days} van de maand',
    domStep: 'elke {n} dagen van de maand, vanaf dag {from}',
    orAlso: 'en ook',
    butOnly: 'maar alleen',
    inMonths: 'in {months}'
  }
};

export default { en, nl };
