const en = {
  text: 'Text',
  summary: 'Summary',
  graphemes: 'Characters as you see them',
  codePoints: 'Code points',
  utf16: 'UTF-16 units (JavaScript length)',
  utf8: 'UTF-8 bytes',
  hidden: 'Hidden or unusual',
  noneHidden: 'Nothing hidden: every character is one you can see, or ordinary whitespace.',
  hiddenOne: '1 character is hidden or unusual. It is marked in the table.',
  hiddenMany: '{count} characters are hidden or unusual. They are marked in the table.',
  cleaned: 'Text without them',
  characters: 'Characters',
  char: 'Character',
  codePoint: 'Code point',
  bytes: 'UTF-8',
  what: 'What it is',
  listed: 'The first {count} code points are listed.',
  kinds: {
    visible: '',
    whitespace: 'whitespace',
    space: 'unusual space',
    invisible: 'invisible',
    bidi: 'changes text direction',
    control: 'control character',
    combining: 'combines with the character before it',
    invalid: 'not a character'
  }
};

const nl: typeof en = {
  text: 'Tekst',
  summary: 'Samenvatting',
  graphemes: 'Tekens zoals je ze ziet',
  codePoints: 'Codepunten',
  utf16: 'UTF-16-eenheden (lengte in JavaScript)',
  utf8: 'UTF-8-bytes',
  hidden: 'Verborgen of ongebruikelijk',
  noneHidden: 'Niets verborgen: elk teken is zichtbaar, of gewone witruimte.',
  hiddenOne: '1 teken is verborgen of ongebruikelijk. Het is gemarkeerd in de tabel.',
  hiddenMany: '{count} tekens zijn verborgen of ongebruikelijk. Ze zijn gemarkeerd in de tabel.',
  cleaned: 'Tekst zonder die tekens',
  characters: 'Tekens',
  char: 'Teken',
  codePoint: 'Codepunt',
  bytes: 'UTF-8',
  what: 'Wat het is',
  listed: 'De eerste {count} codepunten staan in de lijst.',
  kinds: {
    visible: '',
    whitespace: 'witruimte',
    space: 'ongebruikelijke spatie',
    invisible: 'onzichtbaar',
    bidi: 'verandert de tekstrichting',
    control: 'besturingsteken',
    combining: 'combineert met het teken ervoor',
    invalid: 'geen teken'
  }
};

export default { en, nl };
