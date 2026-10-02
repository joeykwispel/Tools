import { Marked } from 'marked';

/**
 * Markdown to HTML (GitHub flavoured: tables, task lists, strikethrough, fenced code), by the `marked` library.
 * The HTML is not safe to show as it is: Markdown may hold raw HTML. The page cleans it with DOMPurify before it is
 * shown or copied; this file only does the part that needs no browser.
 */
const marked = new Marked({ gfm: true, breaks: false, async: false });

export const toHtml = (markdown: string): string => marked.parse(markdown) as string;

export interface Heading {
  level: number;
  text: string;
}

/** The headings of a document, in order: its outline. */
export function outline(markdown: string): Heading[] {
  const headings: Heading[] = [];
  marked.walkTokens(marked.lexer(markdown), (token) => {
    // the text without its own markup: "A **bold** title" is "A bold title"
    if (token.type === 'heading') headings.push({ level: token.depth as number, text: plain(token.tokens ?? []) });
  });
  return headings;
}

interface TokenLike {
  type: string;
  text?: string;
  raw?: string;
  tokens?: TokenLike[];
}

const plain = (tokens: TokenLike[]): string => tokens.map((token) => (token.tokens ? plain(token.tokens) : (token.text ?? token.raw ?? ''))).join('');
