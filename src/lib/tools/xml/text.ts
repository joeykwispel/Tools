const en = {
  input: 'XML',
  layout: 'Layout',
  two: '2 spaces',
  four: '4 spaces',
  tab: 'Tabs',
  minify: 'One line',
  result: 'Result',
  valid: 'Well-formed XML: {elements} elements, {attributes} attributes, {depth} levels deep.',
  at: 'Line {line}, column {column}: ',
  hint: 'This checks that the document is well-formed. It does not validate it against a schema or DTD.',
  errors: {
    empty: 'There is nothing here yet.',
    noRoot: 'there is no element. A document needs one root element.',
    afterRoot: 'the document already ended with its root element; nothing but comments may follow it. A document has exactly one root.',
    beforeRoot: 'text outside the root element. Everything has to be inside it.',
    unclosed: '<{open}>, opened on line {openLine}, is never closed.',
    mismatch: '</{name}> closes an element, but the one that is open is <{open}> (line {openLine}). Close that first.',
    strayClose: '</{name}> closes an element, but none is open.',
    tag: 'this tag is not complete or not written correctly.',
    name: 'a name is expected here. Names can not start with a digit, a dash or a dot; a < in text is written &lt;.',
    attribute: 'the attribute {name} needs a value in quotes: {name}="…".',
    duplicateAttribute: 'the attribute {name} is on this element twice.',
    attributeLt: 'a < inside the value of {name}. Write it as &lt;.',
    ampersand: 'a & that does not start an entity. Write it as &amp;.',
    unterminated: 'this starts something that never ends: a comment (-->), CDATA (]]>), an instruction (?>) or a doctype (>).',
    comment: 'two dashes (--) are not allowed inside a comment.',
    declaration: '<?xml … ?> may only be at the very start of the document.'
  }
};

const nl: typeof en = {
  input: 'XML',
  layout: 'Opmaak',
  two: '2 spaties',
  four: '4 spaties',
  tab: 'Tabs',
  minify: 'Eén regel',
  result: 'Resultaat',
  valid: 'Welgevormde XML: {elements} elementen, {attributes} attributen, {depth} niveaus diep.',
  at: 'Regel {line}, kolom {column}: ',
  hint: 'Dit controleert of het document welgevormd is. Het valideert het niet tegen een schema of DTD.',
  errors: {
    empty: 'Hier staat nog niets.',
    noRoot: 'er is geen element. Een document heeft één root-element nodig.',
    afterRoot: 'het document was al afgelopen met zijn root-element; daarna mogen alleen nog comments komen. Een document heeft precies één root.',
    beforeRoot: 'tekst buiten het root-element. Alles moet erbinnen staan.',
    unclosed: '<{open}>, geopend op regel {openLine}, wordt nergens gesloten.',
    mismatch: '</{name}> sluit een element, maar het element dat open staat is <{open}> (regel {openLine}). Sluit dat eerst.',
    strayClose: '</{name}> sluit een element, maar er staat er geen open.',
    tag: 'deze tag is niet compleet of niet goed geschreven.',
    name: 'hier wordt een naam verwacht. Namen kunnen niet beginnen met een cijfer, een streepje of een punt; een < in tekst schrijf je als &lt;.',
    attribute: 'het attribuut {name} heeft een waarde tussen aanhalingstekens nodig: {name}="…".',
    duplicateAttribute: 'het attribuut {name} staat twee keer op dit element.',
    attributeLt: 'een < in de waarde van {name}. Schrijf het als &lt;.',
    ampersand: 'een & die geen entiteit begint. Schrijf het als &amp;.',
    unterminated: 'hier begint iets dat nergens eindigt: een comment (-->), CDATA (]]>), een instructie (?>) of een doctype (>).',
    comment: 'twee streepjes (--) mogen niet in een comment staan.',
    declaration: '<?xml … ?> mag alleen helemaal aan het begin van het document staan.'
  }
};

export default { en, nl };
