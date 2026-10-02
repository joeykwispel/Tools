const en = {
  fluid: 'Fluid size',
  minSize: 'Size on a narrow screen (px)',
  maxSize: 'Size on a wide screen (px)',
  minViewport: 'Narrow screen width (px)',
  maxViewport: 'Wide screen width (px)',
  root: 'Root font size (px)',
  rootHint: 'What 1rem is: 16 px in every browser, unless the site or the visitor changes it.',
  unit: 'Write in',
  units: { rem: 'rem', px: 'px' },
  remHint: 'rem grows along when the visitor sets a larger font size; px does not.',
  result: 'clamp()',
  declaration: 'As font-size',
  errors: {
    number: 'Fill in every number.',
    viewport: 'The narrow screen has to be narrower than the wide one.',
    root: 'The root font size has to be more than 0.'
  },
  zoom: 'The largest size is more than {limit} times the smallest. Text this fluid can not be zoomed to twice its size, which WCAG asks (1.4.4).',
  sizes: 'Size per screen width',
  width: 'Screen',
  size: 'Size',
  try: 'Try a width',
  tryValue: '{width} px wide: {size} px',
  sample: 'Fluid text',
  converter: 'px and rem',
  px: 'px',
  rem: 'rem',
  converterHint: 'With the root font size above.'
};

const nl: typeof en = {
  fluid: 'Vloeiende grootte',
  minSize: 'Grootte op een smal scherm (px)',
  maxSize: 'Grootte op een breed scherm (px)',
  minViewport: 'Breedte smal scherm (px)',
  maxViewport: 'Breedte breed scherm (px)',
  root: 'Basislettergrootte (px)',
  rootHint: 'Wat 1rem is: 16 px in elke browser, tenzij de site of de bezoeker het verandert.',
  unit: 'Schrijf in',
  units: { rem: 'rem', px: 'px' },
  remHint: 'rem groeit mee als de bezoeker een grotere letter instelt; px niet.',
  result: 'clamp()',
  declaration: 'Als font-size',
  errors: {
    number: 'Vul elk getal in.',
    viewport: 'Het smalle scherm moet smaller zijn dan het brede.',
    root: 'De basislettergrootte moet meer dan 0 zijn.'
  },
  zoom: 'De grootste maat is meer dan {limit} keer de kleinste. Zo vloeiende tekst kan niet tot twee keer zo groot worden ingezoomd, wat WCAG vraagt (1.4.4).',
  sizes: 'Grootte per schermbreedte',
  width: 'Scherm',
  size: 'Grootte',
  try: 'Probeer een breedte',
  tryValue: '{width} px breed: {size} px',
  sample: 'Vloeiende tekst',
  converter: 'px en rem',
  px: 'px',
  rem: 'rem',
  converterHint: 'Met de basislettergrootte hierboven.'
};

export default { en, nl };
