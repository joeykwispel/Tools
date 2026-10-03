import { deflateSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { ICONS, MAX_SIDE, contain, crc32, extension, headHtml, ico, manifest, pngSize, proportional, rename, steps, validSide, zip } from './logic';

const text = (value: string) => new TextEncoder().encode(value);

/** A real PNG of one colour, written the long way. */
function png(width: number, height: number): Uint8Array {
  const chunk = (type: string, data: Buffer) => {
    const body = Buffer.concat([Buffer.from(type), data]);
    const out = Buffer.alloc(body.length + 8);
    out.writeUInt32BE(data.length, 0);
    body.copy(out, 4);
    out.writeUInt32BE(crc32(body), body.length + 4);
    return out;
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header.set([8, 6, 0, 0, 0], 8);
  const rows = Buffer.alloc((width * 4 + 1) * height, 0x80);
  for (let y = 0; y < height; y++) rows[y * (width * 4 + 1)] = 0;
  return new Uint8Array(
    Buffer.concat([
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      chunk('IHDR', header),
      chunk('IDAT', deflateSync(rows)),
      chunk('IEND', Buffer.alloc(0))
    ])
  );
}

describe('names and sizes', () => {
  it('names the result after the file, its size and its format', () => {
    expect(rename('photo.jpeg', 800, 600, 'image/webp')).toBe('photo-800x600.webp');
    expect(rename('my.holiday.photo.PNG', 10, 20, 'image/jpeg')).toBe('my.holiday.photo-10x20.jpg');
    expect(rename('noextension', 1, 1, 'image/png')).toBe('noextension-1x1.png');
    expect(rename('.png', 1, 1, 'image/png')).toBe('image-1x1.png');
    expect(extension('image/avif')).toBe('png');
  });

  it('knows which sides can be made', () => {
    expect(validSide(1)).toBe(true);
    expect(validSide(MAX_SIDE)).toBe(true);
    expect(validSide(0)).toBe(false);
    expect(validSide(MAX_SIDE + 1)).toBe(false);
    expect(validSide(10.5)).toBe(false);
    expect(validSide(NaN)).toBe(false);
  });

  it('keeps the proportions', () => {
    expect(proportional(800, 1600, 900)).toBe(450);
    expect(proportional(100, 300, 200)).toBe(67);
    expect(proportional(1, 4000, 10)).toBe(1);
  });

  it('scales down in halves', () => {
    expect(steps(1600, 100)).toEqual([800, 400, 200]);
    expect(steps(1000, 500)).toEqual([]);
    expect(steps(1001, 500)).toEqual([501]);
    expect(steps(100, 400)).toEqual([]);
    expect(steps(5, 1)).toEqual([3, 2]);
  });

  it('centres an image in a square', () => {
    expect(contain(100, 100, 32)).toEqual({ x: 0, y: 0, width: 32, height: 32 });
    expect(contain(200, 100, 32)).toEqual({ x: 0, y: 8, width: 32, height: 16 });
    expect(contain(100, 400, 16)).toEqual({ x: 6, y: 0, width: 4, height: 16 });
    expect(contain(1000, 1, 16)).toEqual({ x: 0, y: 8, width: 16, height: 1 });
  });
});

describe('crc32', () => {
  it('matches the check value of the standard', () => {
    expect(crc32(text('123456789'))).toBe(0xcbf43926);
    expect(crc32(new Uint8Array())).toBe(0);
  });
});

describe('zip', () => {
  const date = new Date(2026, 9, 3, 12, 30, 44);
  const archive = zip(
    [
      { name: 'a.txt', bytes: text('hello') },
      { name: 'ünï.txt', bytes: text('') }
    ],
    date
  );
  const view = new DataView(archive.buffer);

  it('stores each file with its checksum, and lists them at the end', () => {
    // the first file: signature, and its content right after the header and the name
    expect(view.getUint32(0, true)).toBe(0x04034b50);
    expect(view.getUint16(8, true)).toBe(0);
    expect(view.getUint32(14, true)).toBe(crc32(text('hello')));
    expect(view.getUint32(18, true)).toBe(5);
    expect(new TextDecoder().decode(archive.slice(30, 35))).toBe('a.txt');
    expect(new TextDecoder().decode(archive.slice(35, 40))).toBe('hello');

    // the end record: two files, and where the list of them starts
    const end = archive.length - 22;
    expect(view.getUint32(end, true)).toBe(0x06054b50);
    expect(view.getUint16(end + 10, true)).toBe(2);
    const [size, start] = [view.getUint32(end + 12, true), view.getUint32(end + 16, true)];
    expect(start + size).toBe(end);
    expect(view.getUint32(start, true)).toBe(0x02014b50);

    // the second entry of the list points at the second file
    const second = start + 46 + 5;
    expect(view.getUint32(second, true)).toBe(0x02014b50);
    const offset = view.getUint32(second + 42, true);
    expect(offset).toBe(40);
    expect(view.getUint32(offset, true)).toBe(0x04034b50);
    expect(view.getUint16(second + 28, true)).toBe(9);
    expect(new TextDecoder().decode(archive.slice(second + 46, second + 46 + 9))).toBe('ünï.txt');
  });

  it('dates the files and marks the names as UTF-8', () => {
    expect(view.getUint16(6, true)).toBe(0x0800);
    expect(view.getUint16(10, true)).toBe((12 << 11) | (30 << 5) | 22);
    expect(view.getUint16(12, true)).toBe((46 << 9) | (10 << 5) | 3);
  });

  it('makes an empty archive of no files', () => {
    expect(zip([], date)).toHaveLength(22);
  });
});

describe('png and ico', () => {
  it('reads the size of a PNG', () => {
    expect(pngSize(png(16, 16))).toEqual({ width: 16, height: 16 });
    expect(pngSize(png(300, 2))).toEqual({ width: 300, height: 2 });
    expect(pngSize(text('not a png, but long enough to be one'))).toBeNull();
    expect(pngSize(new Uint8Array(4))).toBeNull();
  });

  it('puts PNGs in an icon as they are', () => {
    const [small, large] = [png(16, 16), png(256, 256)];
    const icon = ico([small, large]);
    const view = new DataView(icon.buffer);
    expect([view.getUint16(0, true), view.getUint16(2, true), view.getUint16(4, true)]).toEqual([0, 1, 2]);
    // the first image: 16 × 16, 32 bits, right after the two lines
    expect([icon[6], icon[7]]).toEqual([16, 16]);
    expect(view.getUint16(12, true)).toBe(32);
    expect(view.getUint32(14, true)).toBe(small.length);
    expect(view.getUint32(18, true)).toBe(38);
    // the second: 256 is written as 0
    expect([icon[22], icon[23]]).toEqual([0, 0]);
    expect(view.getUint32(34, true)).toBe(38 + small.length);
    expect(icon.slice(38, 38 + small.length)).toEqual(small);
    expect(icon).toHaveLength(38 + small.length + large.length);
  });

  it('refuses what an icon can not hold', () => {
    expect(() => ico([png(32, 16)])).toThrow(RangeError);
    expect(() => ico([png(512, 512)])).toThrow(RangeError);
    expect(() => ico([text('nope')])).toThrow(RangeError);
  });
});

describe('favicon set', () => {
  it('writes the lines for the head', () => {
    expect(headHtml(false)).toBe(
      '<link rel="icon" href="/favicon.ico" sizes="48x48">\n<link rel="apple-touch-icon" href="/apple-touch-icon.png">\n<link rel="manifest" href="/site.webmanifest">'
    );
    expect(headHtml(true)).toContain('\n<link rel="icon" href="/icon.svg" sizes="any" type="image/svg+xml">\n');
  });

  it('writes a manifest with the two large icons', () => {
    expect(JSON.parse(manifest())).toEqual({
      icons: [
        { src: '/icon-192.png', type: 'image/png', sizes: '192x192' },
        { src: '/icon-512.png', type: 'image/png', sizes: '512x512' }
      ]
    });
    expect(ICONS.map((icon) => icon.size)).toEqual([180, 192, 512]);
  });
});
