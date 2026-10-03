import { describe, expect, it } from 'vitest';
import {
  UNITS,
  bit,
  bits,
  character,
  compare,
  convert,
  describeRange,
  format,
  octal,
  parseCidr,
  parseMode,
  parseRange,
  parseVersion,
  read,
  satisfies,
  show,
  specialBit,
  symbolic,
  toAddress,
  toNumber,
  write
} from './logic';

describe('bases', () => {
  it('reads a number by its prefix', () => {
    expect(read('255')).toEqual({ ok: true, value: 255n, base: 10 });
    expect(read('0xff')).toEqual({ ok: true, value: 255n, base: 16 });
    expect(read('0b1111_1111')).toEqual({ ok: true, value: 255n, base: 2 });
    expect(read('0o377')).toEqual({ ok: true, value: 255n, base: 8 });
    expect(read(' -0xFF ')).toEqual({ ok: true, value: -255n, base: 16 });
    expect(read('1 000 000')).toMatchObject({ value: 1000000n });
  });

  it('reads a number in the base that is given', () => {
    expect(read('ff', 16)).toMatchObject({ value: 255n });
    expect(read('0xff', 16)).toMatchObject({ value: 255n });
    // with hexadecimal given, 0b1 is three hexadecimal digits
    expect(read('0b1', 16)).toMatchObject({ value: 0xb1n });
    expect(read('1111', 2)).toMatchObject({ value: 15n });
    expect(read('777', 8)).toMatchObject({ value: 511n });
  });

  it('says when it is not a number in that base', () => {
    expect(read('')).toEqual({ ok: false, error: 'empty' });
    expect(read('  ')).toEqual({ ok: false, error: 'empty' });
    expect(read('12a')).toEqual({ ok: false, error: 'digits' });
    expect(read('102', 2)).toEqual({ ok: false, error: 'digits' });
    expect(read('8', 8)).toEqual({ ok: false, error: 'digits' });
    expect(read('0x')).toEqual({ ok: false, error: 'digits' });
    expect(read('1.5')).toEqual({ ok: false, error: 'digits' });
  });

  it('writes a number in a base, grouped when asked', () => {
    expect(write(255n, 2)).toBe('11111111');
    expect(write(255n, 16)).toBe('ff');
    expect(write(1023n, 2, true)).toBe('11 1111 1111');
    expect(write(0xdeadbeefn, 16, true)).toBe('dead beef');
    expect(write(-10n, 2, true)).toBe('-1010');
    expect(write(1000000n, 10, true)).toBe('1000000');
    expect(write(0n, 8)).toBe('0');
  });

  it('does not lose digits of a large number', () => {
    const large = read('0xffffffffffffffffffffffffffffffff');
    expect(large).toMatchObject({ ok: true, value: 2n ** 128n - 1n });
    expect(write(2n ** 128n - 1n, 10)).toBe('340282366920938463463374607431768211455');
  });

  it('counts bits and finds the character', () => {
    expect([0n, 1n, 255n, 256n, -256n].map(bits)).toEqual([1, 1, 8, 9, 9]);
    expect(character(65n)).toBe('A');
    expect(character(0x1f600n)).toBe('😀');
    expect([character(10n), character(0x7fn), character(0xd800n), character(0x110000n), character(-65n)]).toEqual(['', '', '', '', '']);
  });
});

describe('chmod', () => {
  it('knows the bits', () => {
    expect([bit(0, 0), bit(0, 2), bit(1, 1), bit(2, 2)]).toEqual([0o400, 0o100, 0o020, 0o001]);
    expect([0, 1, 2].map(specialBit)).toEqual([0o4000, 0o2000, 0o1000]);
  });

  it('reads the number and the letters', () => {
    expect(parseMode('755')).toBe(0o755);
    expect(parseMode('0644')).toBe(0o644);
    expect(parseMode('4755')).toBe(0o4755);
    expect(parseMode('rwxr-xr-x')).toBe(0o755);
    expect(parseMode('-rw-r--r--')).toBe(0o644);
    expect(parseMode('drwxrwxrwt')).toBe(0o1777);
    expect(parseMode('rwsr-sr-x')).toBe(0o6755);
    expect(parseMode('rwSr--r-T')).toBe(0o5644);
    expect(parseMode('---------')).toBe(0);
  });

  it('gives null for what is neither', () => {
    expect(['', '75', '888', '77777', 'rwxrwxrw', 'rwxrwxrwxx', 'xwrxwrxwr', 'abc'].map(parseMode)).toEqual(Array(8).fill(null));
  });

  it('writes the number and the letters', () => {
    expect(octal(0o755)).toBe('755');
    expect(octal(0o4755)).toBe('4755');
    expect(octal(0)).toBe('000');
    expect(octal(0o7)).toBe('007');
    expect(symbolic(0o755)).toBe('rwxr-xr-x');
    expect(symbolic(0o644)).toBe('rw-r--r--');
    expect(symbolic(0o1777)).toBe('rwxrwxrwt');
    expect(symbolic(0o6755)).toBe('rwsr-sr-x');
    expect(symbolic(0o5644)).toBe('rwSr--r-T');
  });

  it('gives back every mode it reads', () => {
    for (let mode = 0; mode <= 0o7777; mode++) {
      expect(parseMode(symbolic(mode))).toBe(mode);
      expect(parseMode(octal(mode))).toBe(mode);
    }
  });
});

describe('sizes', () => {
  const value = (amount: number, from: string, to: string) => convert(amount, from).find((row) => row.unit.id === to)?.value;

  it('converts between bytes in steps of 1000 and of 1024', () => {
    expect(value(1, 'GB', 'MB')).toBe(1000);
    expect(value(1, 'GiB', 'MiB')).toBe(1024);
    expect(value(1, 'GiB', 'B')).toBe(1073741824);
    expect(value(500, 'GB', 'GiB')).toBeCloseTo(465.661, 3);
    expect(value(1, 'TiB', 'GB')).toBeCloseTo(1099.51, 2);
  });

  it('converts between bytes and bits', () => {
    expect(value(1, 'B', 'bit')).toBe(8);
    expect(value(100, 'Mbit', 'MB')).toBe(12.5);
    expect(value(1, 'Gbit', 'MiB')).toBeCloseTo(119.209, 3);
  });

  it('gives every unit, or nothing for what it can not convert', () => {
    expect(convert(1, 'MB')).toHaveLength(UNITS.length);
    expect(convert(1, 'parsec')).toEqual([]);
    expect(convert(NaN, 'MB')).toEqual([]);
  });

  it('shows a number to read', () => {
    expect(show(1073741824)).toBe('1073741824');
    expect(show(465.66128730773926)).toBe('465.661');
    expect(show(0.000125)).toBe('0.000125');
    expect(show(12.5)).toBe('12.5');
    expect(show(1e-9)).toBe('1e-9');
    expect(show(Infinity)).toBe('');
  });
});

describe('cidr', () => {
  it('turns an address into a number and back', () => {
    expect(toNumber('192.168.1.10')).toBe(0xc0a8010a);
    expect(toAddress(0xc0a8010a)).toBe('192.168.1.10');
    expect(toNumber('255.255.255.255')).toBe(0xffffffff);
    expect(['256.1.1.1', '1.2.3', '1.2.3.4.5', 'a.b.c.d', '1..2.3', '-1.2.3.4', ''].map(toNumber)).toEqual(Array(7).fill(null));
  });

  it('works out a network', () => {
    expect(parseCidr('192.168.1.10/24')).toEqual({
      ok: true,
      address: '192.168.1.10',
      prefix: 24,
      mask: '255.255.255.0',
      wildcard: '0.0.0.255',
      network: '192.168.1.0',
      broadcast: '192.168.1.255',
      first: '192.168.1.1',
      last: '192.168.1.254',
      hosts: 254,
      total: 256,
      kind: 'private',
      binary: '11111111.11111111.11111111.00000000'
    });
    expect(parseCidr('10.20.30.40/20')).toMatchObject({ network: '10.20.16.0', broadcast: '10.20.31.255', mask: '255.255.240.0', hosts: 4094 });
    expect(parseCidr('8.8.8.8/0')).toMatchObject({ network: '0.0.0.0', broadcast: '255.255.255.255', mask: '0.0.0.0', total: 4294967296, hosts: 4294967294 });
  });

  it('knows the smallest networks', () => {
    expect(parseCidr('10.0.0.5/31')).toMatchObject({ network: '10.0.0.4', first: '10.0.0.4', last: '10.0.0.5', hosts: 2, total: 2 });
    expect(parseCidr('10.0.0.5/32')).toMatchObject({ network: '10.0.0.5', first: '10.0.0.5', last: '10.0.0.5', hosts: 1 });
    expect(parseCidr('10.0.0.5')).toMatchObject({ prefix: 32, mask: '255.255.255.255' });
    expect(parseCidr('10.0.0.5/30')).toMatchObject({ first: '10.0.0.5', last: '10.0.0.6', hosts: 2, total: 4 });
  });

  it('says what kind of address it is', () => {
    const kind = (text: string) => {
      const read = parseCidr(text);
      return read.ok ? read.kind : null;
    };
    expect(['10.1.2.3', '172.16.0.1', '172.31.255.255', '192.168.0.1'].map(kind)).toEqual(Array(4).fill('private'));
    expect(['172.15.0.1', '172.32.0.1', '8.8.8.8', '193.168.0.1'].map(kind)).toEqual(Array(4).fill('public'));
    expect(['127.0.0.1', '169.254.1.1', '100.64.0.1', '224.0.0.1', '255.255.255.255', '0.0.0.0'].map(kind)).toEqual([
      'loopback',
      'linkLocal',
      'shared',
      'multicast',
      'reserved',
      'reserved'
    ]);
  });

  it('says what is wrong', () => {
    expect(parseCidr('')).toEqual({ ok: false, error: 'empty' });
    expect(parseCidr('192.168.1/24')).toEqual({ ok: false, error: 'address' });
    expect(parseCidr('192.168.1.1/24/8')).toEqual({ ok: false, error: 'address' });
    expect(parseCidr('192.168.1.1/33')).toEqual({ ok: false, error: 'prefix' });
    expect(parseCidr('192.168.1.1/')).toEqual({ ok: false, error: 'prefix' });
    expect(parseCidr('192.168.1.1/a')).toEqual({ ok: false, error: 'prefix' });
  });
});

describe('semver', () => {
  const v = (text: string) => {
    const version = parseVersion(text);
    if (!version) throw new Error(`not a version: ${text}`);
    return version;
  };
  const written = (range: string) => {
    const parsed = parseRange(range);
    return parsed && describeRange(parsed);
  };
  const within = (version: string, range: string) => satisfies(v(version), parseRange(range)!);

  it('reads a version', () => {
    expect(parseVersion('1.2.3')).toEqual({ major: 1, minor: 2, patch: 3, prerelease: [] });
    expect(parseVersion('v10.0.1-beta.2+build.5')).toEqual({ major: 10, minor: 0, patch: 1, prerelease: ['beta', 2] });
    expect(format(v('v1.2.3-rc.1+abc'))).toBe('1.2.3-rc.1');
    expect(['1.2', '1', '1.2.3.4', 'latest', '1.2.x', ''].map(parseVersion)).toEqual(Array(6).fill(null));
  });

  it('orders versions', () => {
    const order = [
      '1.0.0-alpha',
      '1.0.0-alpha.1',
      '1.0.0-alpha.beta',
      '1.0.0-beta',
      '1.0.0-beta.2',
      '1.0.0-beta.11',
      '1.0.0-rc.1',
      '1.0.0',
      '1.0.1',
      '1.1.0',
      '2.0.0'
    ];
    for (let i = 0; i < order.length - 1; i++) {
      expect(compare(v(order[i]), v(order[i + 1])), `${order[i]} < ${order[i + 1]}`).toBe(-1);
      expect(compare(v(order[i + 1]), v(order[i]))).toBe(1);
    }
    expect(compare(v('1.2.3'), v('1.2.3+build'))).toBe(0);
  });

  it('writes out a caret and a tilde', () => {
    expect(written('^1.2.3')).toBe('>=1.2.3 <2.0.0-0');
    expect(written('^0.2.3')).toBe('>=0.2.3 <0.3.0-0');
    expect(written('^0.0.3')).toBe('>=0.0.3 <0.0.4-0');
    expect(written('^1.2.x')).toBe('>=1.2.0 <2.0.0-0');
    expect(written('^0.0.x')).toBe('>=0.0.0 <0.1.0-0');
    expect(written('^0.x')).toBe('>=0.0.0 <1.0.0-0');
    expect(written('^1.2.3-beta.2')).toBe('>=1.2.3-beta.2 <2.0.0-0');
    expect(written('~1.2.3')).toBe('>=1.2.3 <1.3.0-0');
    expect(written('~1.2')).toBe('>=1.2.0 <1.3.0-0');
    expect(written('~1')).toBe('>=1.0.0 <2.0.0-0');
    expect(written('~>1.2.3')).toBe('>=1.2.3 <1.3.0-0');
  });

  it('writes out versions that leave parts out', () => {
    expect(written('1.2.3')).toBe('1.2.3');
    expect(written('=1.2.3')).toBe('1.2.3');
    expect(written('1.x')).toBe('>=1.0.0 <2.0.0-0');
    expect(written('1')).toBe('>=1.0.0 <2.0.0-0');
    expect(written('1.2.*')).toBe('>=1.2.0 <1.3.0-0');
    expect(written('*')).toBe('>=0.0.0');
    expect(written('')).toBe('>=0.0.0');
    expect(written('>1.2')).toBe('>=1.3.0');
    expect(written('>1')).toBe('>=2.0.0');
    expect(written('>=1.2')).toBe('>=1.2.0');
    expect(written('<1.2')).toBe('<1.2.0-0');
    expect(written('<=1.2')).toBe('<1.3.0-0');
    expect(written('<=1')).toBe('<2.0.0-0');
    expect(written('>*')).toBe('<0.0.0-0');
  });

  it('writes out ranges with a hyphen, a space and ||', () => {
    expect(written('1.2.3 - 2.3.4')).toBe('>=1.2.3 <=2.3.4');
    expect(written('1.2 - 2.3')).toBe('>=1.2.0 <2.4.0-0');
    expect(written('>= 1.2.3  < 2')).toBe('>=1.2.3 <2.0.0-0');
    expect(written('^1.2.3 || ~2.0.1 ||3.x')).toBe('>=1.2.3 <2.0.0-0 || >=2.0.1 <2.1.0-0 || >=3.0.0 <4.0.0-0');
  });

  it('gives null for a range it can not read', () => {
    expect(['latest', '^^1.2.3', '1.2.3.4', '>=1.2.3 <', 'a - b', '^1.2.3 || nope'].map(parseRange)).toEqual(Array(6).fill(null));
  });

  it('holds a version against a range', () => {
    expect(within('1.2.3', '^1.2.3')).toBe(true);
    expect(within('1.9.9', '^1.2.3')).toBe(true);
    expect(within('2.0.0', '^1.2.3')).toBe(false);
    expect(within('1.2.2', '^1.2.3')).toBe(false);
    expect(within('0.2.9', '^0.2.3')).toBe(true);
    expect(within('0.3.0', '^0.2.3')).toBe(false);
    expect(within('1.2.9', '~1.2.3')).toBe(true);
    expect(within('1.3.0', '~1.2.3')).toBe(false);
    expect(within('2.3.4', '1.2.3 - 2.3.4')).toBe(true);
    expect(within('3.1.0', '^1.2.3 || 3.x')).toBe(true);
    expect(within('2.5.0', '^1.2.3 || 3.x')).toBe(false);
    expect(within('0.0.1', '*')).toBe(true);
    expect(within('1.0.0', '>*')).toBe(false);
  });

  it('only lets a prerelease in when the range names one of that version', () => {
    expect(within('1.3.0-beta', '^1.2.3')).toBe(false);
    expect(within('2.0.0-alpha', '^1.2.3')).toBe(false);
    expect(within('1.2.3-beta.4', '^1.2.3-beta.2')).toBe(true);
    expect(within('1.2.3-beta.1', '^1.2.3-beta.2')).toBe(false);
    expect(within('1.2.4-beta.1', '^1.2.3-beta.2')).toBe(false);
    expect(within('1.2.4', '^1.2.3-beta.2')).toBe(true);
    expect(within('1.0.0-rc.1', '*')).toBe(false);
    expect(within('1.2.3-alpha.7', '>1.2.3-alpha.3')).toBe(true);
    expect(within('3.4.5-alpha.9', '>1.2.3-alpha.3')).toBe(false);
  });
});
