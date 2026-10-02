import type en from './en';

export default {
  meta: {
    title: 'Tools | developertools van Joey Oosenbrug',
    description:
      'Een dashboard met developertools die in je browser draaien: wat je plakt gaat niet naar een server. Encoders, formatters, generatoren en converters, plus een handgekozen lijst met de beste tools elders. In het Nederlands en Engels.',
    imageAlt: 'Tools: developertools die in je browser blijven'
  },
  header: {
    home: 'joeyoosenbrug.nl',
    main: 'Hoofdmenu',
    language: 'Taal wijzigen',
    toLight: 'Schakel naar licht thema',
    toDark: 'Schakel naar donker thema',
    menu: 'Menu',
    search: 'Commandomenu',
    skip: 'Naar de inhoud'
  },
  hero: {
    title: 'Developertools,',
    titleAccent: 'in je browser.',
    status: 'Binnenkort: {count} tools.'
  },
  tools: {
    soon: 'binnenkort'
  },
  footer: {
    madeBy: 'Gemaakt door',
    source: 'Broncode',
    newTab: '(opent in een nieuw tabblad)'
  },
  error: {
    notFound: 'tool niet gevonden',
    line: 'Deze tool bestaat (nog) niet, of hij is weggerefactord.',
    home: 'terug naar de tools'
  }
} satisfies typeof en;
