const en = {
  input: 'SQL',
  keywords: 'Keywords',
  upper: 'UPPER CASE',
  lower: 'lower case',
  keep: 'as typed',
  indent: 'Indent with',
  two: '2 spaces',
  four: '4 spaces',
  result: 'Result',
  hint: 'Only whitespace and the case of keywords change. The query is not checked: any dialect works, and so does a query with a mistake in it.'
};

const nl: typeof en = {
  input: 'SQL',
  keywords: 'Keywords',
  upper: 'HOOFDLETTERS',
  lower: 'kleine letters',
  keep: 'zoals getypt',
  indent: 'Inspringen met',
  two: '2 spaties',
  four: '4 spaties',
  result: 'Resultaat',
  hint: 'Alleen witruimte en de hoofdletters van keywords veranderen. De query wordt niet gecontroleerd: elk dialect werkt, en een query met een fout erin ook.'
};

export default { en, nl };
