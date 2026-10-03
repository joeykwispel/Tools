/**
 * What a page tells the sites it is shared on: the Open Graph and Twitter tags in its HTML, what a card is made of
 * when some are missing, and what there is to fix. The HTML is read as text, tag by tag; nothing is fetched.
 */
import { decode } from '../html-entities/logic';

/** One thing the page says about itself: og:title, twitter:card, or `title`, `description` and `canonical` for the plain ones. */
export interface Tag {
  key: string;
  value: string;
}

const ATTRIBUTE = /\s*([^\s=/>"']+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]*)))?/y;

/** The attributes of the tag that starts at `from`, with lowercase names; the first of a name counts, as in a browser. */
function attributes(html: string, from: number): Record<string, string> {
  const found: Record<string, string> = {};
  ATTRIBUTE.lastIndex = from;
  for (let m = ATTRIBUTE.exec(html); m; m = ATTRIBUTE.exec(html)) {
    const name = m[1].toLowerCase();
    if (!(name in found)) found[name] = decode(m[2] ?? m[3] ?? m[4] ?? '').text;
  }
  return found;
}

const tidy = (text: string) => text.replace(/\s+/g, ' ').trim();

/** The tags of a page that matter when it is shared, in the order they are written. */
export function read(html: string): Tag[] {
  // what is in a comment, a script or a style is not a tag of the page
  const source = html.replace(/<!--[\s\S]*?-->|<(script|style)\b[\s\S]*?<\/\1\s*>/gi, '');
  const tags: Tag[] = [];
  const start = /<(meta|link|title)(?=[\s/>])/gi;
  for (let m = start.exec(source); m; m = start.exec(source)) {
    const kind = m[1].toLowerCase();
    if (kind === 'title') {
      // the first <title> is the one of the page: an SVG further down has titles of its own
      if (tags.some((tag) => tag.key === 'title')) continue;
      const from = source.indexOf('>', m.index) + 1;
      const end = source.toLowerCase().indexOf('</title', from);
      if (from > 0 && end >= 0) tags.push({ key: 'title', value: tidy(decode(source.slice(from, end)).text) });
      continue;
    }
    const found = attributes(source, start.lastIndex);
    if (kind === 'link') {
      if (found.rel?.toLowerCase().split(/\s+/).includes('canonical') && found.href) tags.push({ key: 'canonical', value: found.href.trim() });
      continue;
    }
    const key = (found.property ?? found.name ?? '').trim().toLowerCase();
    if (found.content === undefined || !/^(og:|twitter:|article:|fb:|description$)/.test(key)) continue;
    tags.push({ key, value: tidy(found.content) });
  }
  return tags;
}

/** What a card is made of once the fallbacks are applied. Empty when the page does not say. */
export interface Card {
  title: string;
  description: string;
  /** The address of the picture, as written */
  image: string;
  imageAlt: string;
  url: string;
  /** The domain shown under a card: example.com */
  host: string;
  siteName: string;
  /** Whether X shows the picture large (summary_large_image) or as a small square */
  large: boolean;
}

/** The first tag of the first of `keys` that the page has, and is not empty. */
function first(tags: Tag[], ...keys: string[]): string {
  for (const key of keys) {
    const tag = tags.find((known) => known.key === key && known.value);
    if (tag) return tag.value;
  }
  return '';
}

const isAbsolute = (url: string) => /^https?:\/\/[^/\s]+/i.test(url);

function hostOf(url: string): string {
  try {
    return isAbsolute(url) ? new URL(url).hostname.replace(/^www\./, '') : '';
  } catch {
    return '';
  }
}

/** The card as the sites build it: Open Graph first, then Twitter's own tags, then what every page has. */
export function card(tags: Tag[]): Card {
  const url = first(tags, 'og:url', 'canonical');
  return {
    title: first(tags, 'og:title', 'twitter:title', 'title'),
    description: first(tags, 'og:description', 'twitter:description', 'description'),
    image: first(tags, 'og:image', 'og:image:url', 'og:image:secure_url', 'twitter:image', 'twitter:image:src'),
    imageAlt: first(tags, 'og:image:alt', 'twitter:image:alt'),
    url,
    host: hostOf(url),
    siteName: first(tags, 'og:site_name'),
    large: first(tags, 'twitter:card').toLowerCase() === 'summary_large_image'
  };
}

/** `good` is in order, `tip` works but can be better, `fix` shows wrong or not at all. */
export type Level = 'good' | 'tip' | 'fix';

export type CheckId =
  | 'titleMissing'
  | 'titleFallback'
  | 'titleLong'
  | 'titleGood'
  | 'descriptionMissing'
  | 'descriptionFallback'
  | 'descriptionLong'
  | 'descriptionGood'
  | 'imageMissing'
  | 'imageRelative'
  | 'imageHttp'
  | 'imageGood'
  | 'altMissing'
  | 'urlMissing'
  | 'urlRelative'
  | 'urlGood'
  | 'cardMissing'
  | 'cardUnknown'
  | 'cardGood'
  | 'typeMissing';

export interface Check {
  level: Level;
  id: CheckId;
  /** What the sentence is about: a length, a value, the tag fallen back on */
  vars: Record<string, string>;
}

/** Longer than this and a title is cut off on X and in most chat apps. */
export const TITLE_MAX = 70;
/** Longer than this and a description is cut off nearly everywhere. */
export const DESCRIPTION_MAX = 200;

const CARDS = ['summary', 'summary_large_image', 'app', 'player'];
const count = (text: string) => String([...text].length);

/** What is in order and what is not, in the order of the card: title, description, picture, address, kind. */
export function check(tags: Tag[]): Check[] {
  const has = (key: string) => first(tags, key);
  const made = card(tags);
  const out: Check[] = [];
  const add = (level: Level, id: CheckId, vars: Record<string, string> = {}) => out.push({ level, id, vars });

  if (!made.title) add('fix', 'titleMissing');
  else if (!has('og:title')) add('tip', 'titleFallback', { source: has('twitter:title') ? 'twitter:title' : '<title>' });
  else if ([...made.title].length > TITLE_MAX) add('tip', 'titleLong', { length: count(made.title), max: String(TITLE_MAX) });
  else add('good', 'titleGood', { length: count(made.title) });

  if (!made.description) add('fix', 'descriptionMissing');
  else if (!has('og:description'))
    add('tip', 'descriptionFallback', { source: has('twitter:description') ? 'twitter:description' : '<meta name="description">' });
  else if ([...made.description].length > DESCRIPTION_MAX) add('tip', 'descriptionLong', { length: count(made.description), max: String(DESCRIPTION_MAX) });
  else add('good', 'descriptionGood', { length: count(made.description) });

  if (!made.image) add('fix', 'imageMissing');
  else if (!isAbsolute(made.image)) add('fix', 'imageRelative', { value: made.image });
  else if (/^http:/i.test(made.image)) add('tip', 'imageHttp');
  else add('good', 'imageGood');
  if (made.image && !made.imageAlt) add('tip', 'altMissing');

  const url = has('og:url');
  if (!url) add('tip', 'urlMissing');
  else if (!isAbsolute(url)) add('fix', 'urlRelative', { value: url });
  else add('good', 'urlGood');

  const kind = has('twitter:card').toLowerCase();
  if (!kind) add('tip', 'cardMissing');
  else if (!CARDS.includes(kind)) add('fix', 'cardUnknown', { value: kind });
  else add('good', 'cardGood', { value: kind });

  if (!has('og:type')) add('tip', 'typeMissing');
  return out;
}

/** The size a share picture is made at: 1200 × 630, which is 1.91 to 1. */
export const IMAGE = { width: 1200, height: 630, minWidth: 200, minHeight: 200 };

export type ImageVerdict = 'tooSmall' | 'low' | 'ratio' | 'good';

/** What the sites do with a picture of this size: refuse it, show it small, crop it, or show it as it is. */
export function judgeImage(width: number, height: number): ImageVerdict {
  if (width < IMAGE.minWidth || height < IMAGE.minHeight) return 'tooSmall';
  if (Math.abs(width / height - IMAGE.width / IMAGE.height) > 0.1) return 'ratio';
  if (width < IMAGE.width || height < IMAGE.height) return 'low';
  return 'good';
}
