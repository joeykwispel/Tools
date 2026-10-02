const en = {
  mode: 'Direction',
  toJson: 'XML to JSON',
  toXml: 'JSON to XML',
  xml: 'XML',
  json: 'JSON',
  types: 'Write numbers and true/false as those types, not as text',
  declaration: 'Start with <?xml … ?>',
  indent: 'Indent the result with',
  two: '2 spaces',
  four: '4 spaces',
  result: 'Result',
  convention: 'Attributes become "@name", text next to them "#text", and elements with the same name an array. Comments are dropped.',
  wrapped: 'This JSON has no single root, so it is wrapped in <root>: XML needs exactly one.',
  jsonAt: 'Line {line}, column {column}: '
};

const nl: typeof en = {
  mode: 'Richting',
  toJson: 'XML naar JSON',
  toXml: 'JSON naar XML',
  xml: 'XML',
  json: 'JSON',
  types: 'Schrijf getallen en true/false als die types, niet als tekst',
  declaration: 'Begin met <?xml … ?>',
  indent: 'Laat het resultaat inspringen met',
  two: '2 spaties',
  four: '4 spaties',
  result: 'Resultaat',
  convention: 'Attributen worden "@naam", tekst ernaast "#text", en elementen met dezelfde naam een array. Comments vervallen.',
  wrapped: 'Deze JSON heeft niet één root en is daarom in <root> gezet: XML heeft er precies één nodig.',
  jsonAt: 'Regel {line}, kolom {column}: '
};

export default { en, nl };
