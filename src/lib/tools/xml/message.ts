import { fill } from '$lib/locales';
import type { Locale } from '$lib/types';
import type { XmlError } from './logic';
import text from './text';

/** What is wrong with a document, in words, with the place in front. Shared by every tool that reads XML. */
export function explain(error: XmlError, locale: Locale): string {
  const c = text[locale];
  if (error.kind === 'empty') return c.errors.empty;
  const message = fill(c.errors[error.kind], { name: error.name, open: error.open?.name ?? error.name, openLine: String(error.open?.line ?? '') });
  return fill(c.at, { line: String(error.line), column: String(error.column) }) + message;
}
