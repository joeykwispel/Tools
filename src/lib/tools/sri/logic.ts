import { digest, toBase64 } from '../hash/logic';

/**
 * Subresource Integrity: the `integrity` attribute that lets a browser refuse a script or stylesheet from another
 * server when it is not byte for byte what you expected. The value is the name of a hash, a dash, and the hash of
 * the file in Base64.
 */

export const ALGORITHMS = ['sha256', 'sha384', 'sha512'] as const;
export type Algorithm = (typeof ALGORITHMS)[number];

const NAMES = { sha256: 'SHA-256', sha384: 'SHA-384', sha512: 'SHA-512' } as const;
/** How long each hash is in Base64, without the = signs at the end. */
const LENGTHS: Record<Algorithm, number> = { sha256: 43, sha384: 64, sha512: 86 };

/** The Base64 hash of the content by each algorithm. */
export type Hashes = Record<Algorithm, string>;

export async function hashAll(bytes: Uint8Array): Promise<Hashes> {
  const [sha256, sha384, sha512] = await Promise.all(ALGORITHMS.map(async (algorithm) => toBase64(await digest(NAMES[algorithm], bytes))));
  return { sha256, sha384, sha512 };
}

/** The value of the attribute: sha384-… */
export const integrity = (hashes: Hashes, algorithm: Algorithm) => `${algorithm}-${hashes[algorithm]}`;

export type Kind = 'script' | 'module' | 'style';

const attribute = (value: string) => value.replace(/&/g, '&amp;').replace(/"/g, '&quot;');

/**
 * The whole tag. `crossorigin` belongs to it: without it a browser does not check a file from another server at
 * all, it refuses it.
 */
export function tag(kind: Kind, url: string, value: string): string {
  const rest = `integrity="${attribute(value)}" crossorigin="anonymous"`;
  if (kind === 'style') return `<link rel="stylesheet" href="${attribute(url)}" ${rest}>`;
  return `<script ${kind === 'module' ? 'type="module" ' : ''}src="${attribute(url)}" ${rest}></script>`;
}

export interface Entry {
  algorithm: Algorithm;
  /** Base64, written the standard way (+ and /) */
  hash: string;
}

/**
 * Reads the value of an integrity attribute: one or more hashes with spaces between them. A whole tag or a whole
 * attribute may be pasted; the value is taken out of it. What is not a hash a browser knows ends up in `ignored`,
 * the way a browser skips it.
 */
export function parse(value: string): { entries: Entry[]; ignored: string[] } {
  const inTag = /integrity\s*=\s*(?:"([^"]*)"|'([^']*)')/i.exec(value);
  const text = inTag ? (inTag[1] ?? inTag[2]) : value;
  const entries: Entry[] = [];
  const ignored: string[] = [];
  for (const token of text.split(/\s+/).filter(Boolean)) {
    // sha384-<base64>, optionally with ?options behind it, which no browser uses yet
    const match = /^(sha256|sha384|sha512)-([A-Za-z0-9+/_-]+={0,2})(?:\?.*)?$/i.exec(token);
    const algorithm = match?.[1].toLowerCase() as Algorithm | undefined;
    const hash = match?.[2].replace(/-/g, '+').replace(/_/g, '/');
    if (algorithm && hash) entries.push({ algorithm, hash });
    else ignored.push(token);
  }
  return { entries, ignored };
}

export type Verdict =
  | { kind: 'none' }
  /** Nothing in it a browser understands: it loads the file without checking */
  | { kind: 'unchecked' }
  | { kind: 'match'; algorithm: Algorithm }
  | { kind: 'mismatch'; algorithm: Algorithm; /** the hash has the wrong length for its algorithm */ malformed: boolean };

/**
 * What a browser does with this integrity value for this content. Of several hashes only those of the strongest
 * algorithm count, and one of them matching is enough.
 */
export function check(value: string, hashes: Hashes): Verdict {
  const { entries, ignored } = parse(value);
  if (!entries.length) return ignored.length ? { kind: 'unchecked' } : { kind: 'none' };
  const algorithm = [...ALGORITHMS].reverse().find((candidate) => entries.some((entry) => entry.algorithm === candidate))!;
  const strongest = entries.filter((entry) => entry.algorithm === algorithm);
  // padding is optional when comparing: some tools leave it out
  const bare = (hash: string) => hash.replace(/=+$/, '');
  if (strongest.some((entry) => bare(entry.hash) === bare(hashes[algorithm]))) return { kind: 'match', algorithm };
  return { kind: 'mismatch', algorithm, malformed: strongest.every((entry) => bare(entry.hash).length !== LENGTHS[algorithm]) };
}
