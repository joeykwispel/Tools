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
    skip: 'Naar de inhoud',
    tools: 'Tools',
    how: 'Hoe het werkt'
  },
  hero: {
    title: 'Developertools,',
    titleAccent: 'in je browser.',
    intro: 'Eén pagina om elke werkdag te openen: de kleine tools die je als developer steeds weer nodig hebt, en de beste van elders, één klik verderop.',
    status: 'De tools worden nu gebouwd. Ze komen hier pakket voor pakket bij.'
  },
  how: {
    title: 'Hoe het werkt',
    intro: 'Drie regels waar elke tool hier aan voldoet.',
    steps: [
      {
        title: 'Niets verlaat de browser',
        body: 'Elke tool draait op je eigen computer. De pagina mag geen gegevens naar een andere server sturen, dus een token of wachtwoord dat je plakt blijft in dit tabblad.'
      },
      {
        title: 'Eén pagina per tool',
        body: 'Elke tool heeft een eigen adres, zodat je de tool die je gebruikt kunt bookmarken en met een collega kunt delen.'
      },
      {
        title: 'Geen account, geen tracking',
        body: 'Favorieten en je eigen links blijven in deze browser. Je hoeft je nergens aan te melden en er is geen cookiebanner om weg te klikken.'
      }
    ]
  },
  footer: {
    tagline: 'Developertools die in je browser blijven.',
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
