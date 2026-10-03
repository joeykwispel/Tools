/**
 * The arithmetic and the file formats around resizing an image: sizes that keep the proportions, the steps to scale
 * down in, an .ico and a .zip written by hand, and what a favicon set consists of. The drawing itself is done by the
 * browser on a canvas, in Tool.svelte.
 */

/** A side longer than this is more than a canvas takes in every browser. */
export const MAX_SIDE = 8192;

export const FORMATS = ['image/png', 'image/jpeg', 'image/webp'] as const;
export type Format = (typeof FORMATS)[number];

const EXTENSIONS: Record<string, string> = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' };

/** The extension for what the browser really wrote: one that can not write WebP writes a PNG instead. */
export const extension = (type: string) => EXTENSIONS[type] ?? 'png';

/** photo.jpeg at 800 × 600 as WebP is photo-800x600.webp. */
export function rename(name: string, width: number, height: number, type: string): string {
  const base = name.replace(/\.[^./\\]+$/, '') || 'image';
  return `${base}-${width}x${height}.${extension(type)}`;
}

/** Whether a side is something to make an image of. */
export const validSide = (value: number) => Number.isInteger(value) && value >= 1 && value <= MAX_SIDE;

/** The other side for `side`, in the proportions of `from` to `to`: at least one pixel. */
export const proportional = (side: number, from: number, to: number) => Math.max(1, Math.round((side * to) / from));

/**
 * The sizes to pass through on the way from `from` down to `to`: halving each time. A browser that scales a photo to
 * a tenth in one go skips most of its pixels, which shows as jagged edges; in halves every pixel counts.
 */
export function steps(from: number, to: number): number[] {
  const out: number[] = [];
  for (let size = Math.ceil(from / 2); size > to; size = Math.ceil(size / 2)) out.push(size);
  return out;
}

export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Where an image of `width` × `height` goes in a square of `size`: as large as fits, in the middle. */
export function contain(width: number, height: number, size: number): Box {
  const scale = size / Math.max(width, height);
  const [w, h] = [Math.max(1, Math.round(width * scale)), Math.max(1, Math.round(height * scale))];
  return { x: Math.round((size - w) / 2), y: Math.round((size - h) / 2), width: w, height: h };
}

export interface FileEntry {
  name: string;
  bytes: Uint8Array;
}

const CRC_TABLE = Uint32Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

/** The CRC-32 checksum a zip file stores for each file. */
export function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

/** Bytes written one after another, numbers little-endian. */
class Writer {
  private parts: Uint8Array[] = [];
  length = 0;

  bytes(bytes: Uint8Array) {
    this.parts.push(bytes);
    this.length += bytes.length;
    return this;
  }
  u8(...values: number[]) {
    return this.bytes(Uint8Array.from(values));
  }
  u16(...values: number[]) {
    return this.bytes(Uint8Array.from(values.flatMap((v) => [v & 0xff, (v >>> 8) & 0xff])));
  }
  u32(...values: number[]) {
    return this.bytes(Uint8Array.from(values.flatMap((v) => [v & 0xff, (v >>> 8) & 0xff, (v >>> 16) & 0xff, (v >>> 24) & 0xff])));
  }
  done(): Uint8Array {
    const out = new Uint8Array(this.length);
    let at = 0;
    for (const part of this.parts) {
      out.set(part, at);
      at += part.length;
    }
    return out;
  }
}

/**
 * A zip file of the given files, stored without compressing: PNGs are compressed already. `date` is what each file is
 * dated, in local time, as a zip does.
 */
export function zip(files: FileEntry[], date = new Date()): Uint8Array {
  const time = (date.getHours() << 11) | (date.getMinutes() << 5) | (date.getSeconds() >> 1);
  const day = ((Math.max(1980, date.getFullYear()) - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();
  const out = new Writer();
  const directory = new Writer();
  for (const file of files) {
    const name = new TextEncoder().encode(file.name);
    const [crc, size, offset] = [crc32(file.bytes), file.bytes.length, out.length];
    // version 2.0, names in UTF-8 (bit 11), method 0: stored
    const shared = () => [20, 0x0800, 0, time, day] as const;
    out
      .u32(0x04034b50)
      .u16(...shared())
      .u32(crc, size, size)
      .u16(name.length, 0)
      .bytes(name)
      .bytes(file.bytes);
    directory
      .u32(0x02014b50)
      .u16(20, ...shared())
      .u32(crc, size, size)
      .u16(name.length, 0, 0, 0, 0)
      .u32(0, offset)
      .bytes(name);
  }
  const start = out.length;
  const entries = directory.done();
  return out.bytes(entries).u32(0x06054b50).u16(0, 0, files.length, files.length).u32(entries.length, start).u16(0).done();
}

/** Width and height of a PNG, from its header; null when the bytes are not a PNG. */
export function pngSize(bytes: Uint8Array): { width: number; height: number } | null {
  const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (bytes.length < 24 || signature.some((byte, i) => bytes[i] !== byte)) return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return { width: view.getUint32(16), height: view.getUint32(20) };
}

/**
 * An .ico of the given PNGs. Since Windows Vista an icon may hold PNGs as they are, so nothing is converted: a header,
 * one line per image, and the images. Each has to be square and at most 256 pixels.
 */
export function ico(pngs: Uint8Array[]): Uint8Array {
  const out = new Writer().u16(0, 1, pngs.length);
  let offset = 6 + 16 * pngs.length;
  for (const png of pngs) {
    const size = pngSize(png);
    if (!size || size.width !== size.height || size.width > 256) throw new RangeError('An icon holds square PNGs of at most 256 pixels.');
    // 256 is written as 0; then colours in the palette, reserved, planes, bits per pixel
    out
      .u8(size.width % 256, size.height % 256, 0, 0)
      .u16(1, 32)
      .u32(png.length, offset);
    offset += png.length;
  }
  for (const png of pngs) out.bytes(png);
  return out.done();
}

/** The sizes inside favicon.ico: the tab, a high-density tab, and a Windows shortcut. */
export const ICO_SIZES = [16, 32, 48];

/** The PNGs of a favicon set. `opaque` gets a background: iOS shows black where the icon is transparent. */
export const ICONS = [
  { name: 'apple-touch-icon.png', size: 180, opaque: true },
  { name: 'icon-192.png', size: 192, opaque: false },
  { name: 'icon-512.png', size: 512, opaque: false }
];

/** The lines for the <head>. An SVG source is offered too: a browser that can use it gets it sharp at every size. */
export const headHtml = (svg: boolean) =>
  [
    '<link rel="icon" href="/favicon.ico" sizes="48x48">',
    ...(svg ? ['<link rel="icon" href="/icon.svg" sizes="any" type="image/svg+xml">'] : []),
    '<link rel="apple-touch-icon" href="/apple-touch-icon.png">',
    '<link rel="manifest" href="/site.webmanifest">'
  ].join('\n');

/** The web app manifest that points Android at the two large icons. */
export const manifest = () =>
  JSON.stringify(
    {
      icons: ICONS.filter((icon) => !icon.opaque).map((icon) => ({ src: `/${icon.name}`, type: 'image/png', sizes: `${icon.size}x${icon.size}` }))
    },
    null,
    2
  );
