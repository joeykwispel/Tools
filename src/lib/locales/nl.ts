import type en from './en';

export default {
  meta: {
    title: 'Tools | developertools van Joey Oosenbrug',
    description:
      'Een dashboard met developertools die in je browser draaien: wat je plakt gaat niet naar een server. Encoders, formatters, generatoren en converters, plus een handgekozen lijst met de beste tools elders. In het Nederlands en Engels.',
    imageAlt: 'Tools: developertools die in je browser blijven',
    toolTitle: '{title} | Tools'
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
    soon: 'binnenkort',
    back: 'alle tools',
    privacy: 'Draait in je browser. Wat je hier typt wordt nergens heen gestuurd.',
    copy: 'Kopiëren',
    copied: 'Gekopieerd',
    sample: 'Voorbeeld',
    clear: 'Wissen',
    input: 'Invoer',
    output: 'Uitvoer',
    download: 'Downloaden',
    invalid: 'Ongeldige invoer: {message}'
  },
  menu: {
    placeholder: 'Zoek een tool…',
    tools: 'Tools',
    results: 'Resultaten',
    none: 'Geen tool gevonden voor “{query}”.',
    hint: '↑↓ kiezen · Enter openen · Esc sluiten'
  },
  favorites: {
    title: 'Favorieten',
    add: 'Voeg {title} toe aan favorieten',
    remove: 'Verwijder {title} uit favorieten'
  },
  auth: {
    signIn: 'Inloggen',
    account: 'Account',
    title: 'Synchroniseer je favorieten',
    why: 'Log in om je favoriete tools op elk apparaat te hebben. Alles werkt ook zonder account.',
    google: 'Doorgaan met Google',
    loading: 'Laden…',
    privacy: 'Alleen je favorieten worden opgeslagen. Wat je in een tool invoert wordt nooit verstuurd.',
    signedInAs: 'Ingelogd als {name}',
    syncing: 'Je favorieten worden gesynchroniseerd…',
    synced: 'Favorieten gesynchroniseerd op al je apparaten.',
    syncError: 'Synchroniseren lukte niet. Je favorieten staan veilig op dit apparaat.',
    signOut: 'Uitloggen',
    cancelled: 'Het inloggen is geannuleerd.',
    failed: 'Inloggen is mislukt. Probeer het later opnieuw.'
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
