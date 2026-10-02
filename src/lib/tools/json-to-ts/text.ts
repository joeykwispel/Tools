const en = {
  input: 'JSON example',
  rootName: 'Name of the type',
  typescript: 'TypeScript',
  zod: 'Zod schema',
  hint: 'The types come from this one example: a field that is missing or null here may be something else in other data.',
  at: 'Line {line}, column {column}: '
};

const nl: typeof en = {
  input: 'JSON-voorbeeld',
  rootName: 'Naam van het type',
  typescript: 'TypeScript',
  zod: 'Zod-schema',
  hint: 'De types komen uit dit ene voorbeeld: een veld dat hier ontbreekt of null is, kan in andere data iets anders zijn.',
  at: 'Regel {line}, kolom {column}: '
};

export default { en, nl };
