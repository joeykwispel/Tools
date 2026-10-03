/**
 * Semantic versions and the ranges npm writes for them: ^1.2.3, ~1.2, 1.x, >=1.0.0 <2.0.0, 1.2.3 - 2.3.4 and ||.
 * A range is worked out to plain comparisons, the way npm itself does, and a version is held against them.
 */

export interface Version {
  major: number;
  minor: number;
  patch: number;
  /** The parts after the dash, as in 1.0.0-beta.2: numbers as numbers */
  prerelease: (string | number)[];
}

const VERSION = /^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+[0-9A-Za-z.-]+)?$/;
const identifiers = (text: string | undefined) => (text ? text.split('.').map((part) => (/^\d+$/.test(part) ? Number(part) : part)) : []);

/** Reads 1.2.3, v1.2.3 or 1.2.3-beta.1+build; build metadata says nothing about order and is dropped. */
export function parseVersion(text: string): Version | null {
  const found = VERSION.exec(text.trim());
  return found && { major: Number(found[1]), minor: Number(found[2]), patch: Number(found[3]), prerelease: identifiers(found[4]) };
}

export const format = (v: Version) => `${v.major}.${v.minor}.${v.patch}${v.prerelease.length ? `-${v.prerelease.join('.')}` : ''}`;

/** Which of two versions comes first: -1, 0 or 1. A prerelease comes before the version it leads up to. */
export function compare(a: Version, b: Version): -1 | 0 | 1 {
  for (const part of ['major', 'minor', 'patch'] as const) if (a[part] !== b[part]) return a[part] < b[part] ? -1 : 1;
  if (!a.prerelease.length || !b.prerelease.length) return a.prerelease.length === b.prerelease.length ? 0 : a.prerelease.length ? -1 : 1;
  for (let i = 0; i < Math.max(a.prerelease.length, b.prerelease.length); i++) {
    const [x, y] = [a.prerelease[i], b.prerelease[i]];
    if (x === y) continue;
    if (x === undefined) return -1;
    if (y === undefined) return 1;
    // a number comes before a word; numbers by value, words by letter
    if (typeof x !== typeof y) return typeof x === 'number' ? -1 : 1;
    return x < y ? -1 : 1;
  }
  return 0;
}

export type Operator = '<' | '<=' | '>' | '>=' | '=';
export interface Comparator {
  operator: Operator;
  version: Version;
}
/** Any of the sets may hold; within a set all comparisons have to. */
export type Range = Comparator[][];

const version = (major: number, minor = 0, patch = 0, prerelease: (string | number)[] = []): Version => ({ major, minor, patch, prerelease });
/** Below this: the version, and its prereleases too. That is what "-0" says. */
const below = (major: number, minor = 0, patch = 0): Comparator => ({ operator: '<', version: version(major, minor, patch, [0]) });
const from = (v: Version): Comparator => ({ operator: '>=', version: v });
const NOTHING: Comparator[] = [below(0)];

const PARTIAL = /^v?(\d+|[xX*])(?:\.(\d+|[xX*]))?(?:\.(\d+|[xX*]))?(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+[0-9A-Za-z.-]+)?$/;

/** A version that may leave parts out: 1, 1.2, 1.x. A part that is left out or an x is null. */
function partial(text: string): { parts: (number | null)[]; prerelease: (string | number)[] } | null {
  const found = PARTIAL.exec(text);
  if (!found) return null;
  const parts = [found[1], found[2], found[3]].map((part) => (part === undefined || /[xX*]/.test(part) ? null : Number(part)));
  // after an x nothing counts: 1.x.3 is 1.x
  const open = parts.indexOf(null);
  return { parts: open < 0 ? parts : parts.map((part, i) => (i < open ? part : null)), prerelease: open < 0 ? identifiers(found[4]) : [] };
}

/** One piece of a range, such as ^1.2.3 or >=1.2, as plain comparisons. Null when it can not be read. */
function comparators(piece: string): Comparator[] | null {
  const found = /^(\^|~>?|>=|<=|>|<|=)?(.+)$/.exec(piece);
  const read = found && partial(found[2]);
  if (!found || !read) return null;
  const operator = (found[1] ?? '').replace('~>', '~');
  const [major, minor, patch] = read.parts;
  const low = version(major ?? 0, minor ?? 0, patch ?? 0, read.prerelease);

  if (operator === '^') {
    if (major === null) return [from(version(0))];
    // the leftmost part that is not zero may not change
    if (major > 0 || minor === null) return [from(low), below(major + 1)];
    if (minor > 0 || patch === null) return [from(low), below(0, minor + 1)];
    return [from(low), below(0, 0, patch + 1)];
  }
  if (operator === '~') {
    if (major === null) return [from(version(0))];
    return minor === null ? [from(low), below(major + 1)] : [from(low), below(major, minor + 1)];
  }
  if (operator === '' || operator === '=') {
    if (major === null) return [from(version(0))];
    if (minor === null) return [from(low), below(major + 1)];
    if (patch === null) return [from(low), below(major, minor + 1)];
    return [{ operator: '=', version: low }];
  }
  // a comparison with a version that leaves parts out is about the whole range it stands for
  if (major === null) return operator === '>=' || operator === '<=' ? [from(version(0))] : NOTHING;
  if (operator === '>') {
    if (minor === null) return [from(version(major + 1))];
    if (patch === null) return [from(version(major, minor + 1))];
  }
  if (operator === '<=') {
    if (minor === null) return [below(major + 1)];
    if (patch === null) return [below(major, minor + 1)];
  }
  if (operator === '<' && patch === null) return [below(major, minor ?? 0, 0)];
  return [{ operator: operator as Operator, version: low }];
}

/** Reads a range as npm does. Null when a part of it can not be read. */
export function parseRange(text: string): Range | null {
  const range: Range = [];
  for (const alternative of text.split('||')) {
    const set: Comparator[] = [];
    // an operator may be written apart from its version: ">= 1.2.3"
    const value = alternative.trim().replace(/([<>=~^]+)\s+/g, '$1');
    const hyphen = /^(\S+)\s+-\s+(\S+)$/.exec(value);
    if (hyphen) {
      const [low, high] = [comparators(`>=${hyphen[1]}`), comparators(`<=${hyphen[2]}`)];
      if (!low || !high) return null;
      set.push(...low, ...high);
    } else {
      for (const piece of value.split(/\s+/).filter(Boolean)) {
        const made = comparators(piece);
        if (!made) return null;
        set.push(...made);
      }
    }
    range.push(set.length ? set : [from(version(0))]);
  }
  return range;
}

const holds = ({ operator, version: bound }: Comparator, v: Version) => {
  const order = compare(v, bound);
  return operator === '=' ? order === 0 : operator === '<' ? order < 0 : operator === '<=' ? order <= 0 : operator === '>' ? order > 0 : order >= 0;
};

/**
 * Whether a version is in a range. A prerelease is only in it when the range names a prerelease of that same version:
 * 1.3.0-beta is not in ^1.2.3, because who asks for 1.2.3 or later did not ask for betas.
 */
export function satisfies(v: Version, range: Range): boolean {
  return range.some((set) => {
    if (!set.every((comparator) => holds(comparator, v))) return false;
    if (!v.prerelease.length) return true;
    return set.some(({ version: bound }) => bound.prerelease.length && bound.major === v.major && bound.minor === v.minor && bound.patch === v.patch);
  });
}

/** The range written out: >=1.2.3 <2.0.0-0, with || between the alternatives. */
export const describe = (range: Range) =>
  range.map((set) => set.map(({ operator, version: bound }) => (operator === '=' ? '' : operator) + format(bound)).join(' ')).join(' || ');
