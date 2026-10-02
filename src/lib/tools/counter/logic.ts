/** Counting what is in a text: characters, words, sentences, and how long it takes to read. */

/** Average silent reading speed of adults, in words per minute (Brysbaert, 2019). */
export const READING_WPM = 238;
/** A comfortable pace for speaking to an audience. */
export const SPEAKING_WPM = 150;

export interface Counts {
  /** Characters as a reader counts them: an emoji or an accented letter is one */
  characters: number;
  /** The same, without spaces, tabs and line breaks */
  charactersNoSpaces: number;
  words: number;
  sentences: number;
  /** Blocks of text separated by an empty line */
  paragraphs: number;
  lines: number;
  /** Size in UTF-8 */
  bytes: number;
  /** Seconds to read it in silence, and to say it out loud */
  readingSeconds: number;
  speakingSeconds: number;
}

/**
 * The words of a text, counted the way a word processor does: what stands between spaces is a word when it has a
 * letter or a digit in it. So "don't", "e-mail", "state-of-the-art" and "9.30" are one word each. The punctuation
 * around a word is taken off.
 */
export function words(text: string): string[] {
  return (text.match(/\S+/g) ?? []).map((token) => token.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '')).filter(Boolean);
}

export function count(text: string, locale = 'en'): Counts {
  const graphemes = [...new Intl.Segmenter(locale, { granularity: 'grapheme' }).segment(text)].map((s) => s.segment);
  const wordCount = words(text).length;
  const sentences = [...new Intl.Segmenter(locale, { granularity: 'sentence' }).segment(text)].filter((s) => /[\p{L}\p{N}]/u.test(s.segment)).length;
  return {
    characters: graphemes.length,
    charactersNoSpaces: graphemes.filter((g) => !/^\s+$/.test(g)).length,
    words: wordCount,
    sentences,
    paragraphs: text.split(/\n\s*\n/).filter((block) => block.trim()).length,
    lines: text ? text.split(/\r\n|\r|\n/).length : 0,
    bytes: new TextEncoder().encode(text).length,
    readingSeconds: Math.round((wordCount / READING_WPM) * 60),
    speakingSeconds: Math.round((wordCount / SPEAKING_WPM) * 60)
  };
}

/** "45 s", "3 min 20 s", "1 h 5 min": a duration the way you would say it. */
export function duration(seconds: number): string {
  if (seconds < 60) return `${seconds} s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return seconds % 60 ? `${minutes} min ${seconds % 60} s` : `${minutes} min`;
  return minutes % 60 ? `${Math.floor(minutes / 60)} h ${minutes % 60} min` : `${Math.floor(minutes / 60)} h`;
}

export interface Frequency {
  word: string;
  count: number;
}

/**
 * The words used most, without regard to case, most used first; words used equally often stay in the order they
 * first appear. Single letters and numbers are left out.
 */
export function frequent(text: string, limit = 10, locale = 'en'): Frequency[] {
  const counts = new Map<string, number>();
  for (const word of words(text)) {
    const key = word.toLocaleLowerCase(locale);
    if ([...key].length < 2 || /^[\p{N}.,]+$/u.test(key)) continue;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts]
    .map(([word, n]) => ({ word, count: n }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}
