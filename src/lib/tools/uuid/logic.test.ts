import { describe, expect, it } from 'vitest';
import { NANOID_ALPHABET, generate, inspect, nanoid, ulid, uuidV4, uuidV7, type RandomBytes } from './logic';

/** "Random" bytes that are known: 0, 1, 2, … */
const counting: RandomBytes = (length) => Uint8Array.from({ length }, (_, i) => i);
const ones: RandomBytes = (length) => new Uint8Array(length).fill(0xff);
const T = Date.parse('2026-10-02T12:00:00.000Z');

describe('uuidV4', () => {
  it('sets the version and the variant, and keeps the rest of the random bytes', () => {
    expect(uuidV4(counting)).toBe('00010203-0405-4607-8809-0a0b0c0d0e0f');
    expect(uuidV4(ones)).toBe('ffffffff-ffff-4fff-bfff-ffffffffffff');
  });

  it('is a valid random UUID with the browser random numbers, and not the same twice', () => {
    const a = uuidV4();
    expect(a).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(uuidV4()).not.toBe(a);
  });
});

describe('uuidV7', () => {
  it('starts with the time in milliseconds', () => {
    const id = uuidV7(T, counting);
    expect(id).toBe(`${T.toString(16).padStart(12, '0').slice(0, 8)}-${T.toString(16).padStart(12, '0').slice(8)}-7607-8809-0a0b0c0d0e0f`);
    expect(inspect(id)).toEqual({ kind: 'uuid', version: 7, variant: 'rfc', time: T });
  });

  it('sorts by time', () => {
    const ids = [T + 2, T, T + 1].map((time) => uuidV7(time));
    expect([...ids].sort()).toEqual([ids[1], ids[2], ids[0]]);
  });
});

describe('ulid', () => {
  it('is 26 characters: 10 of time and 16 random', () => {
    // the example of the ULID specification: 1469918176385 is 01ARYZ6S41
    expect(ulid(1469918176385, counting).slice(0, 10)).toBe('01ARYZ6S41');
    expect(ulid(1469918176385, ones)).toBe('01ARYZ6S41ZZZZZZZZZZZZZZZZ');
    expect(ulid(T)).toMatch(/^[0-9A-HJKMNP-TV-Z]{26}$/);
  });

  it('holds its time, and sorts by it', () => {
    expect(inspect(ulid(T))).toEqual({ kind: 'ulid', time: T });
    const ids = [T + 2, T, T + 1].map((time) => ulid(time));
    expect([...ids].sort()).toEqual([ids[1], ids[2], ids[0]]);
  });
});

describe('nanoid', () => {
  it('takes one character per random byte', () => {
    expect(nanoid(5, counting)).toBe(NANOID_ALPHABET.slice(0, 5));
    expect(nanoid(3, ones)).toBe(NANOID_ALPHABET[63].repeat(3));
  });

  it('has the length asked for and only URL-safe characters', () => {
    expect(nanoid()).toMatch(/^[A-Za-z0-9_-]{21}$/);
    expect(nanoid(10)).toHaveLength(10);
    expect(new Set(NANOID_ALPHABET).size).toBe(64);
  });
});

describe('generate', () => {
  it('gives the number asked for, all different', () => {
    for (const kind of ['uuid4', 'uuid7', 'ulid', 'nanoid'] as const) {
      const ids = generate(kind, 50, T);
      expect(ids, kind).toHaveLength(50);
      expect(new Set(ids).size, kind).toBe(50);
    }
  });

  it('writes UUIDs in upper case when asked, and takes the NanoID size', () => {
    expect(generate('uuid4', 1, T, { uppercase: true })[0]).toMatch(/^[0-9A-F-]{36}$/);
    expect(generate('nanoid', 1, T, { size: 8 })[0]).toHaveLength(8);
  });

  it('keeps the count and the size within reason', () => {
    expect(generate('uuid4', 0, T)).toEqual([]);
    expect(generate('uuid4', -5, T)).toEqual([]);
    expect(generate('uuid4', Number.NaN, T)).toEqual([]);
    expect(generate('uuid4', 5000, T)).toHaveLength(1000);
    expect(generate('nanoid', 1, T, { size: 9999 })[0]).toHaveLength(128);
    expect(generate('nanoid', 1, T, { size: 0 })[0]).toHaveLength(21);
  });
});

describe('inspect', () => {
  it('tells the version and the variant of a UUID', () => {
    expect(inspect('f47ac10b-58cc-4372-a567-0e02b2c3d479')).toEqual({ kind: 'uuid', version: 4, variant: 'rfc', time: null });
    expect(inspect('F47AC10B58CC4372A5670E02B2C3D479')).toEqual({ kind: 'uuid', version: 4, variant: 'rfc', time: null });
    expect(inspect('urn:uuid:f47ac10b-58cc-4372-a567-0e02b2c3d479')).toMatchObject({ version: 4 });
    expect(inspect('{f47ac10b-58cc-4372-c567-0e02b2c3d479}')).toMatchObject({ variant: 'microsoft' });
  });

  it('reads the time out of a version 1, 6 and 7 UUID', () => {
    // the examples of RFC 9562, appendix A: all three hold Tuesday 22 February 2022, 19:22:22 UTC
    const moment = Date.parse('2022-02-22T19:22:22.000Z');
    expect(inspect('C232AB00-9414-11EC-B3C8-9F6BDECED846')).toEqual({ kind: 'uuid', version: 1, variant: 'rfc', time: moment });
    expect(inspect('1EC9414C-232A-6B00-B3C8-9F6BDECED846')).toEqual({ kind: 'uuid', version: 6, variant: 'rfc', time: moment });
    expect(inspect('017F22E2-79B0-7CC3-98C4-DC0C0C07398F')).toEqual({ kind: 'uuid', version: 7, variant: 'rfc', time: moment });
  });

  it('knows the nil and the max UUID', () => {
    expect(inspect('00000000-0000-0000-0000-000000000000')).toEqual({ kind: 'nil' });
    expect(inspect('ffffffff-ffff-ffff-ffff-ffffffffffff')).toEqual({ kind: 'max' });
  });

  it('reads the time out of a ULID', () => {
    expect(inspect('01ARYZ6S41TSV4RRFFQ69G5FAV')).toEqual({ kind: 'ulid', time: 1469918176385 });
    expect(inspect('01aryz6s41tsv4rrffq69g5fav')).toEqual({ kind: 'ulid', time: 1469918176385 });
  });

  it('says so when it does not know what it is looking at', () => {
    for (const text of ['', 'hello', 'f47ac10b-58cc-4372-a567', '8ZZZZZZZZZZZZZZZZZZZZZZZZZ', '01ARYZ6S41TSV4RRFFQ69G5FAU'])
      expect(inspect(text), text).toEqual({ kind: 'unknown' });
  });
});
