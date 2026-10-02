const en = {
  query: 'XPath',
  document: 'XML document',
  examples: 'Examples',
  namespaces: 'Namespaces',
  prefix: 'Prefix',
  uri: 'Namespace',
  madeUp: 'made up for xmlns="…"',
  namespaceHint: 'XPath has no default namespace. Elements under xmlns="…" are found with the made-up prefix: //{prefix}:name.',
  results: 'Result',
  none: 'Nothing in the document matches.',
  noneDefault: 'Nothing matches. This document has a default namespace, so its elements need a prefix: try {prefix}:name instead of name.',
  one: '1 node.',
  many: '{count} nodes.',
  value: 'The result is a {type}.',
  types: { number: 'number', string: 'string', boolean: 'boolean' },
  kinds: { element: 'element', attribute: 'attribute', text: 'text', comment: 'comment', instruction: 'instruction', document: 'document' },
  listed: 'The first {count} nodes are listed.',
  invalid: 'This is not a valid XPath 1.0 expression.',
  unknownPrefix: 'The query uses a prefix the document does not declare. The prefixes you can use are listed under Namespaces.',
  empty: 'Type an XPath to see what it selects.'
};

const nl: typeof en = {
  query: 'XPath',
  document: 'XML-document',
  examples: 'Voorbeelden',
  namespaces: 'Namespaces',
  prefix: 'Prefix',
  uri: 'Namespace',
  madeUp: 'verzonnen voor xmlns="…"',
  namespaceHint: 'XPath kent geen default namespace. Elementen onder xmlns="…" vind je met de verzonnen prefix: //{prefix}:naam.',
  results: 'Resultaat',
  none: 'Niets in het document komt overeen.',
  noneDefault:
    'Niets komt overeen. Dit document heeft een default namespace, dus de elementen hebben een prefix nodig: probeer {prefix}:naam in plaats van naam.',
  one: '1 node.',
  many: '{count} nodes.',
  value: 'Het resultaat is een {type}.',
  types: { number: 'getal', string: 'string', boolean: 'boolean' },
  kinds: { element: 'element', attribute: 'attribuut', text: 'tekst', comment: 'comment', instruction: 'instructie', document: 'document' },
  listed: 'De eerste {count} nodes staan in de lijst.',
  invalid: 'Dit is geen geldige XPath 1.0-expressie.',
  unknownPrefix: 'De query gebruikt een prefix die het document niet declareert. De prefixen die je kunt gebruiken staan onder Namespaces.',
  empty: 'Typ een XPath om te zien wat het selecteert.'
};

export default { en, nl };
