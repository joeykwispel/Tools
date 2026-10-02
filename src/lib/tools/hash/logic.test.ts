import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { ALGORITHMS, compare, digest, hashAll, md5, size, toBase64, toHex } from './logic';

const utf8 = (text: string) => new TextEncoder().encode(text);

describe('md5', () => {
  it('matches the test suite of RFC 1321', () => {
    const vectors: [string, string][] = [
      ['', 'd41d8cd98f00b204e9800998ecf8427e'],
      ['a', '0cc175b9c0f1b6a831c399e269772661'],
      ['abc', '900150983cd24fb0d6963f7d28e17f72'],
      ['message digest', 'f96b697d7cb7938d525a2f31aaf161d0'],
      ['abcdefghijklmnopqrstuvwxyz', 'c3fcd3d76192e4007dfb496cca67e13b'],
      ['ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789', 'd174ab98d277d9f5a5611c2c9f419d9f'],
      ['1234567890'.repeat(8), '57edf4a22be3c955ac49da2e2107b67a']
    ];
    for (const [text, expected] of vectors) expect(toHex(md5(utf8(text))), JSON.stringify(text)).toBe(expected);
  });

  it('agrees with Node for every length around the block size, and for a large input', () => {
    for (const length of [55, 56, 57, 63, 64, 65, 119, 120, 121, 128, 1000, 100_000]) {
      const bytes = Uint8Array.from({ length }, (_, i) => (i * 31 + 7) % 256);
      expect(toHex(md5(bytes)), `length ${length}`).toBe(createHash('md5').update(bytes).digest('hex'));
    }
  });
});

describe('digest', () => {
  it('gives the known checksums of "abc"', async () => {
    const abc = utf8('abc');
    expect(toHex(await digest('SHA-1', abc))).toBe('a9993e364706816aba3e25717850c26c9cd0d89d');
    expect(toHex(await digest('SHA-256', abc))).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
    expect(toHex(await digest('SHA-384', abc))).toBe('cb00753f45a35e8bb5a03d699ac65007272c32ab0eded1631a8b605a43ff5bed8086072ba1e7cc2358baeca134c825a7');
    expect(toHex(await digest('SHA-512', abc))).toBe(
      'ddaf35a193617abacc417349ae20413112e6fa4e89a97ea20a9eeee64b55d39a2192992a274fc1a836ba3c23a3feebbd454d4423643ce80e2a9ac94fa54ca49f'
    );
  });

  it('hashes text as UTF-8', async () => {
    expect(toHex(await digest('SHA-256', utf8('zoë')))).toBe(createHash('sha256').update('zoë', 'utf8').digest('hex'));
  });
});

describe('hashAll', () => {
  it('gives every algorithm, each with its own length', async () => {
    const hashes = await hashAll(utf8('hello'));
    expect(Object.keys(hashes)).toEqual([...ALGORITHMS]);
    expect(ALGORITHMS.map((a) => hashes[a].length)).toEqual([16, 20, 32, 48, 64]);
  });
});

describe('toHex and toBase64', () => {
  it('writes bytes as hex in either case, and as Base64', () => {
    const bytes = new Uint8Array([0, 10, 255]);
    expect(toHex(bytes)).toBe('000aff');
    expect(toHex(bytes, true)).toBe('000AFF');
    expect(toBase64(bytes)).toBe('AAr/');
  });
});

describe('compare', () => {
  const sha256 = 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad';

  it('finds which algorithm a checksum is of', async () => {
    const hashes = await hashAll(utf8('abc'));
    expect(compare(sha256, hashes)).toEqual({ kind: 'match', algorithm: 'SHA-256' });
    expect(compare('900150983cd24fb0d6963f7d28e17f72', hashes)).toEqual({ kind: 'match', algorithm: 'MD5' });
    expect(compare(toBase64(hashes['SHA-1']), hashes)).toEqual({ kind: 'match', algorithm: 'SHA-1' });
  });

  it('reads a checksum the way it is published', async () => {
    const hashes = await hashAll(utf8('abc'));
    expect(compare(`  ${sha256.toUpperCase()}  `, hashes).kind).toBe('match');
    expect(compare(`${sha256}  download.zip`, hashes).kind).toBe('match');
    expect(compare(`${sha256} *download.zip\n`, hashes).kind).toBe('match');
    expect(compare('90:01:50:98:3c:d2:4f:b0:d6:96:3f:7d:28:e1:7f:72', hashes)).toEqual({ kind: 'match', algorithm: 'MD5' });
  });

  it('says which algorithm it looks like when it does not match', async () => {
    const hashes = await hashAll(utf8('abd'));
    expect(compare(sha256, hashes)).toEqual({ kind: 'mismatch', algorithm: 'SHA-256' });
    expect(compare('900150983cd24fb0d6963f7d28e17f72', hashes)).toEqual({ kind: 'mismatch', algorithm: 'MD5' });
    expect(compare('qZk+NkcGgWq6PiVxeFDCbJzQ2J0=', hashes)).toEqual({ kind: 'mismatch', algorithm: 'SHA-1' });
  });

  it('says so when there is nothing to compare, or it is no checksum at all', async () => {
    const hashes = await hashAll(utf8('abc'));
    expect(compare('', hashes)).toEqual({ kind: 'none' });
    expect(compare('   ', hashes)).toEqual({ kind: 'none' });
    expect(compare('abc123', hashes)).toEqual({ kind: 'unknown' });
    expect(compare('not a checksum', hashes)).toEqual({ kind: 'unknown' });
  });
});

describe('size', () => {
  it('writes a number of bytes the short way', () => {
    expect([0, 999, 1500, 2_400_000, 3_200_000_000].map(size)).toEqual(['0 B', '999 B', '1.5 kB', '2.4 MB', '3.2 GB']);
  });
});
