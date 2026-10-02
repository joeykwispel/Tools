const en = {
  mode: 'Direction',
  toJson: '.env to JSON',
  toEnv: 'JSON to .env',
  env: '.env',
  json: 'JSON',
  rename: 'Write the names the environment way (apiUrl → API_URL)',
  result: 'Result',
  count: '{count} variables.',
  countOne: '1 variable.',
  notObject: 'An environment file needs a JSON object: names with values.',
  at: 'Line {line}, column {column}: ',
  problems: {
    noEquals: 'Line {line}: no = on this line ("{text}"). It was skipped.',
    badName: 'Line {line}: "{text}" is not a valid name. It was skipped.',
    openQuote: 'Line {line}: the quote of {text} is never closed. It was skipped.',
    duplicate: 'Line {line}: {text} was already set; this value replaces the earlier one.'
  }
};

const nl: typeof en = {
  mode: 'Richting',
  toJson: '.env naar JSON',
  toEnv: 'JSON naar .env',
  env: '.env',
  json: 'JSON',
  rename: 'Schrijf de namen zoals in een environment (apiUrl → API_URL)',
  result: 'Resultaat',
  count: '{count} variabelen.',
  countOne: '1 variabele.',
  notObject: 'Een environment-bestand heeft een JSON-object nodig: namen met waarden.',
  at: 'Regel {line}, kolom {column}: ',
  problems: {
    noEquals: 'Regel {line}: geen = op deze regel ("{text}"). Hij is overgeslagen.',
    badName: 'Regel {line}: "{text}" is geen geldige naam. Hij is overgeslagen.',
    openQuote: 'Regel {line}: het aanhalingsteken van {text} wordt nergens gesloten. Hij is overgeslagen.',
    duplicate: 'Regel {line}: {text} was al gezet; deze waarde vervangt de eerdere.'
  }
};

export default { en, nl };
