const en = {
  input: 'curl command',
  inputHint: 'As copied from a terminal, documentation or the Network tab of a browser ("Copy as cURL"), for bash or for the Windows command prompt.',
  read: 'A {method} request with {count} headers.',
  readOne: 'A {method} request with 1 header.',
  errors: {
    empty: 'Paste a curl command.',
    notCurl: 'This starts with "{word}", not with curl.',
    quote: 'A quote is opened and never closed.',
    noUrl: 'There is no address in this command.',
    missing: '{option} has to be followed by a value.'
  },
  reading: 'Read the answer as',
  readings: { json: 'JSON', text: 'text', none: 'not at all' },
  code: 'fetch',
  notes: 'Not the same in fetch',
  note: {
    scheme: 'The address has no scheme. curl takes http:// then, and so does this.',
    insecure: '-k skips the check of the certificate. fetch can not do that: the certificate has to be valid.',
    cookie:
      "A page in a browser may not set the Cookie header; it is left out silently. Send the cookies the browser has with credentials: 'include'. In Node it works as written.",
    file: 'curl reads {name} from disk. Code in a page can not: put the contents there yourself.',
    bodyWithGet: 'A {method} request with a body: curl sends it, fetch refuses it.',
    urls: 'There are {count} addresses in the command; only the first is used.',
    ignored: 'Left out, because fetch has nothing like it: {options}.'
  },
  request: 'The request',
  method: 'method',
  url: 'address',
  headers: 'Headers',
  body: 'Body',
  bodyFile: 'the contents of {name}',
  formFile: 'the file {name}'
};

const nl: typeof en = {
  input: 'curl-commando',
  inputHint:
    'Zoals gekopieerd uit een terminal, documentatie of het Network-tabblad van een browser ("Copy as cURL"), voor bash of voor de Windows-opdrachtprompt.',
  read: 'Een {method}-verzoek met {count} headers.',
  readOne: 'Een {method}-verzoek met 1 header.',
  errors: {
    empty: 'Plak een curl-commando.',
    notCurl: 'Dit begint met "{word}", niet met curl.',
    quote: 'Er wordt een aanhalingsteken geopend dat nergens sluit.',
    noUrl: 'Er staat geen adres in dit commando.',
    missing: 'Na {option} moet een waarde komen.'
  },
  reading: 'Lees het antwoord als',
  readings: { json: 'JSON', text: 'tekst', none: 'helemaal niet' },
  code: 'fetch',
  notes: 'Niet hetzelfde in fetch',
  note: {
    scheme: 'Het adres heeft geen schema. curl neemt dan http://, en dit ook.',
    insecure: '-k slaat de controle van het certificaat over. Dat kan fetch niet: het certificaat moet geldig zijn.',
    cookie:
      "Een pagina in een browser mag de Cookie-header niet zetten; hij wordt stil weggelaten. Stuur de cookies die de browser heeft mee met credentials: 'include'. In Node werkt het zoals het er staat.",
    file: 'curl leest {name} van schijf. Code in een pagina kan dat niet: zet de inhoud er zelf in.',
    bodyWithGet: 'Een {method}-verzoek met een body: curl verstuurt het, fetch weigert het.',
    urls: 'Er staan {count} adressen in het commando; alleen het eerste wordt gebruikt.',
    ignored: 'Weggelaten, omdat fetch er niets voor heeft: {options}.'
  },
  request: 'Het verzoek',
  method: 'methode',
  url: 'adres',
  headers: 'Headers',
  body: 'Body',
  bodyFile: 'de inhoud van {name}',
  formFile: 'het bestand {name}'
};

export default { en, nl };
