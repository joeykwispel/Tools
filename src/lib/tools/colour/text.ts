const en = {
  input: 'Colour',
  inputHint: 'HEX, rgb(), hsl(), oklch() or a name like rebeccapurple.',
  picker: 'Pick a colour',
  examples: 'Examples',
  commas: 'Write rgb() and hsl() the older way, with commas',
  preview: 'Preview',
  read: {
    hex: 'Read as HEX.',
    rgb: 'Read as rgb().',
    hsl: 'Read as hsl().',
    oklch: 'Read as oklch().',
    name: 'Read as a colour name.'
  },
  mapped: 'This colour is outside what an sRGB screen can show. Below is the nearest one that fits, with the same lightness and hue.',
  errors: { empty: 'Type a colour.', invalid: 'This is not a colour that can be read.' },
  name: 'Name',
  shades: 'Lighter and darker',
  shadesHint: 'The same hue in steps that look even, made in OKLCH. Pick one to use it.',
  use: 'Use {colour}'
};

const nl: typeof en = {
  input: 'Kleur',
  inputHint: 'HEX, rgb(), hsl(), oklch() of een naam zoals rebeccapurple.',
  picker: 'Kies een kleur',
  examples: 'Voorbeelden',
  commas: 'Schrijf rgb() en hsl() op de oudere manier, met komma’s',
  preview: 'Voorbeeld',
  read: {
    hex: 'Gelezen als HEX.',
    rgb: 'Gelezen als rgb().',
    hsl: 'Gelezen als hsl().',
    oklch: 'Gelezen als oklch().',
    name: 'Gelezen als kleurnaam.'
  },
  mapped: 'Deze kleur valt buiten wat een sRGB-scherm kan tonen. Hieronder staat de dichtstbijzijnde die past, met dezelfde lichtheid en tint.',
  errors: { empty: 'Typ een kleur.', invalid: 'Dit is geen kleur die te lezen is.' },
  name: 'Naam',
  shades: 'Lichter en donkerder',
  shadesHint: 'Dezelfde tint in stappen die gelijk ogen, gemaakt in OKLCH. Kies er een om die te gebruiken.',
  use: 'Gebruik {colour}'
};

export default { en, nl };
