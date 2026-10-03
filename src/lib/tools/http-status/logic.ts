/**
 * The status codes of HTTP and the media types that come up in web work, to look up. What a code means is in text.ts,
 * in both languages; here are the codes, the types and the searching.
 */

export interface Status {
  code: number;
  /** The reason phrase, as the standard has it: the same in every language */
  name: string;
}

/** The registered status codes (IANA), without the ones that are unused or experimental. */
export const STATUSES: Status[] = (
  [
    [100, 'Continue'],
    [101, 'Switching Protocols'],
    [102, 'Processing'],
    [103, 'Early Hints'],
    [200, 'OK'],
    [201, 'Created'],
    [202, 'Accepted'],
    [203, 'Non-Authoritative Information'],
    [204, 'No Content'],
    [205, 'Reset Content'],
    [206, 'Partial Content'],
    [207, 'Multi-Status'],
    [208, 'Already Reported'],
    [226, 'IM Used'],
    [300, 'Multiple Choices'],
    [301, 'Moved Permanently'],
    [302, 'Found'],
    [303, 'See Other'],
    [304, 'Not Modified'],
    [307, 'Temporary Redirect'],
    [308, 'Permanent Redirect'],
    [400, 'Bad Request'],
    [401, 'Unauthorized'],
    [402, 'Payment Required'],
    [403, 'Forbidden'],
    [404, 'Not Found'],
    [405, 'Method Not Allowed'],
    [406, 'Not Acceptable'],
    [407, 'Proxy Authentication Required'],
    [408, 'Request Timeout'],
    [409, 'Conflict'],
    [410, 'Gone'],
    [411, 'Length Required'],
    [412, 'Precondition Failed'],
    [413, 'Content Too Large'],
    [414, 'URI Too Long'],
    [415, 'Unsupported Media Type'],
    [416, 'Range Not Satisfiable'],
    [417, 'Expectation Failed'],
    [418, "I'm a teapot"],
    [421, 'Misdirected Request'],
    [422, 'Unprocessable Content'],
    [423, 'Locked'],
    [424, 'Failed Dependency'],
    [425, 'Too Early'],
    [426, 'Upgrade Required'],
    [428, 'Precondition Required'],
    [429, 'Too Many Requests'],
    [431, 'Request Header Fields Too Large'],
    [451, 'Unavailable For Legal Reasons'],
    [500, 'Internal Server Error'],
    [501, 'Not Implemented'],
    [502, 'Bad Gateway'],
    [503, 'Service Unavailable'],
    [504, 'Gateway Timeout'],
    [505, 'HTTP Version Not Supported'],
    [506, 'Variant Also Negotiates'],
    [507, 'Insufficient Storage'],
    [508, 'Loop Detected'],
    [510, 'Not Extended'],
    [511, 'Network Authentication Required']
  ] as const
).map(([code, name]) => ({ code, name }));

export type StatusClass = 1 | 2 | 3 | 4 | 5;

/** The first digit says what kind of answer it is: 2 worked, 4 is the client's doing, 5 the server's. */
export const classOf = (code: number) => Math.floor(code / 100) as StatusClass;

export interface Mime {
  type: string;
  /** Without the dot; empty for a type that is not a file */
  extensions: string[];
  /** What it is, in English and in Dutch */
  en: string;
  nl: string;
}

/** Media types a web developer meets, by kind. Not the whole registry: that has two thousand. */
export const MIMES: Mime[] = (
  [
    ['text/plain', 'txt', 'Plain text', 'Platte tekst'],
    ['text/html', 'html htm', 'HTML page', 'HTML-pagina'],
    ['text/css', 'css', 'Stylesheet', 'Stylesheet'],
    ['text/javascript', 'js mjs', 'JavaScript', 'JavaScript'],
    ['text/csv', 'csv', 'Comma-separated values', 'Kommagescheiden waarden'],
    ['text/markdown', 'md', 'Markdown', 'Markdown'],
    ['text/calendar', 'ics', 'Calendar (iCalendar)', 'Agenda (iCalendar)'],
    ['text/vcard', 'vcf', 'Contact card (vCard)', 'Visitekaartje (vCard)'],
    ['text/event-stream', '', 'Server-sent events', 'Server-sent events'],
    ['application/json', 'json', 'JSON', 'JSON'],
    ['application/ld+json', 'jsonld', 'JSON-LD, linked data', 'JSON-LD, linked data'],
    ['application/problem+json', '', 'Error details from an API (RFC 9457)', 'Foutdetails van een API (RFC 9457)'],
    ['application/manifest+json', 'webmanifest', 'Web app manifest', 'Web-app-manifest'],
    ['application/x-ndjson', 'ndjson', 'JSON, one value per line', 'JSON, één waarde per regel'],
    ['application/xml', 'xml', 'XML', 'XML'],
    ['application/xhtml+xml', 'xhtml', 'XHTML page', 'XHTML-pagina'],
    ['application/rss+xml', 'rss', 'RSS feed', 'RSS-feed'],
    ['application/atom+xml', 'atom', 'Atom feed', 'Atom-feed'],
    ['application/yaml', 'yaml yml', 'YAML', 'YAML'],
    ['application/toml', 'toml', 'TOML', 'TOML'],
    ['application/sql', 'sql', 'SQL', 'SQL'],
    ['application/wasm', 'wasm', 'WebAssembly', 'WebAssembly'],
    ['application/x-www-form-urlencoded', '', 'Form fields, as an HTML form sends them', 'Formuliervelden, zoals een HTML-formulier ze verstuurt'],
    ['multipart/form-data', '', 'Form with files', 'Formulier met bestanden'],
    ['application/octet-stream', 'bin', 'Bytes of an unknown kind; a browser downloads it', 'Bytes van onbekende soort; een browser downloadt het'],
    ['application/pdf', 'pdf', 'PDF document', 'PDF-document'],
    ['application/zip', 'zip', 'Zip archive', 'Zip-archief'],
    ['application/gzip', 'gz', 'Gzip archive', 'Gzip-archief'],
    ['application/x-tar', 'tar', 'Tar archive', 'Tar-archief'],
    ['application/x-7z-compressed', '7z', '7-Zip archive', '7-Zip-archief'],
    ['application/vnd.rar', 'rar', 'RAR archive', 'RAR-archief'],
    ['application/epub+zip', 'epub', 'E-book (EPUB)', 'E-book (EPUB)'],
    ['application/rtf', 'rtf', 'Rich text', 'Rich text'],
    ['application/msword', 'doc', 'Word document, old format', 'Word-document, oud formaat'],
    ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'docx', 'Word document', 'Word-document'],
    ['application/vnd.ms-excel', 'xls', 'Excel workbook, old format', 'Excel-werkmap, oud formaat'],
    ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'xlsx', 'Excel workbook', 'Excel-werkmap'],
    ['application/vnd.ms-powerpoint', 'ppt', 'PowerPoint presentation, old format', 'PowerPoint-presentatie, oud formaat'],
    ['application/vnd.openxmlformats-officedocument.presentationml.presentation', 'pptx', 'PowerPoint presentation', 'PowerPoint-presentatie'],
    ['application/vnd.oasis.opendocument.text', 'odt', 'OpenDocument text', 'OpenDocument-tekst'],
    ['application/vnd.oasis.opendocument.spreadsheet', 'ods', 'OpenDocument spreadsheet', 'OpenDocument-spreadsheet'],
    ['image/png', 'png', 'PNG image', 'PNG-afbeelding'],
    ['image/jpeg', 'jpg jpeg', 'JPEG image', 'JPEG-afbeelding'],
    ['image/gif', 'gif', 'GIF image', 'GIF-afbeelding'],
    ['image/webp', 'webp', 'WebP image', 'WebP-afbeelding'],
    ['image/avif', 'avif', 'AVIF image', 'AVIF-afbeelding'],
    ['image/svg+xml', 'svg', 'SVG drawing', 'SVG-tekening'],
    ['image/apng', 'apng', 'Animated PNG', 'Geanimeerde PNG'],
    ['image/vnd.microsoft.icon', 'ico', 'Icon (favicon.ico)', 'Icoon (favicon.ico)'],
    ['image/bmp', 'bmp', 'Bitmap image', 'Bitmap-afbeelding'],
    ['image/tiff', 'tif tiff', 'TIFF image', 'TIFF-afbeelding'],
    ['image/heic', 'heic', 'HEIC image, from an iPhone', 'HEIC-afbeelding, van een iPhone'],
    ['audio/mpeg', 'mp3', 'MP3 audio', 'MP3-audio'],
    ['audio/mp4', 'm4a', 'MPEG-4 audio', 'MPEG-4-audio'],
    ['audio/aac', 'aac', 'AAC audio', 'AAC-audio'],
    ['audio/ogg', 'ogg oga', 'Ogg audio', 'Ogg-audio'],
    ['audio/wav', 'wav', 'WAV audio', 'WAV-audio'],
    ['audio/webm', 'weba', 'WebM audio', 'WebM-audio'],
    ['audio/flac', 'flac', 'FLAC audio', 'FLAC-audio'],
    ['audio/midi', 'mid midi', 'MIDI', 'MIDI'],
    ['video/mp4', 'mp4', 'MPEG-4 video', 'MPEG-4-video'],
    ['video/webm', 'webm', 'WebM video', 'WebM-video'],
    ['video/ogg', 'ogv', 'Ogg video', 'Ogg-video'],
    ['video/quicktime', 'mov', 'QuickTime video', 'QuickTime-video'],
    ['video/mpeg', 'mpeg mpg', 'MPEG video', 'MPEG-video'],
    ['video/x-msvideo', 'avi', 'AVI video', 'AVI-video'],
    ['video/mp2t', 'ts', 'MPEG transport stream', 'MPEG-transportstream'],
    ['application/vnd.apple.mpegurl', 'm3u8', 'HLS playlist, for streaming', 'HLS-afspeellijst, voor streaming'],
    ['application/dash+xml', 'mpd', 'DASH manifest, for streaming', 'DASH-manifest, voor streaming'],
    ['font/woff2', 'woff2', 'WOFF2 font', 'WOFF2-lettertype'],
    ['font/woff', 'woff', 'WOFF font', 'WOFF-lettertype'],
    ['font/ttf', 'ttf', 'TrueType font', 'TrueType-lettertype'],
    ['font/otf', 'otf', 'OpenType font', 'OpenType-lettertype']
  ] as const
).map(([type, extensions, en, nl]) => ({ type, extensions: extensions ? extensions.split(' ') : [], en, nl }));

/** The words of a search, lowercase. */
const words = (query: string) => query.toLowerCase().split(/\s+/).filter(Boolean);

/** 4, 40, 404, and 4xx or 40x for "starts with": the digits to start with, or null when the word is not a code. */
const codeStart = (word: string) => /^[1-5]\d{0,2}$|^[1-5]\d?x{1,2}$/.exec(word)?.[0].replace(/x+$/, '') ?? null;

/**
 * The status codes for a search: every word has to be the start of the code, or be in the name or in the description.
 * `describe` gives the description in the language of the page.
 */
export function findStatuses(query: string, describe: (code: number) => string): Status[] {
  const asked = words(query);
  return STATUSES.filter((status) =>
    asked.every((word) => {
      const start = codeStart(word);
      if (start !== null) return String(status.code).startsWith(start);
      return status.name.toLowerCase().includes(word) || describe(status.code).toLowerCase().includes(word);
    })
  );
}

/**
 * The media types for a search: every word has to be in the type, in what it is, or be the start of an extension
 * (with or without the dot). A word that is only digits is a status code, not a type.
 */
export function findMimes(query: string, locale: 'en' | 'nl'): Mime[] {
  const asked = words(query);
  return MIMES.filter((mime) =>
    asked.every((word) => {
      if (/^\d+$/.test(word) || codeStart(word) !== null) return false;
      if (word.startsWith('.')) return mime.extensions.some((extension) => extension.startsWith(word.slice(1)));
      return mime.type.includes(word) || mime[locale].toLowerCase().includes(word) || mime.extensions.some((extension) => extension.startsWith(word));
    })
  );
}
