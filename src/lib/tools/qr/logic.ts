import qrcode from 'qrcode-generator';

/**
 * QR codes. The pattern of dark and light squares comes from the `qrcode-generator` library; drawing it (as SVG here,
 * as PNG on the page) and writing what goes into it (text, or the settings of a Wi-Fi network) is done here.
 */

/** How much of the code may be damaged or covered and still be read: about 7%, 15%, 25% and 30%. */
export type Level = 'L' | 'M' | 'Q' | 'H';

/** The squares of a code: true is dark. Always as many rows as columns. */
export type Matrix = boolean[][];

export type Made = { ok: true; matrix: Matrix; /** 1 (21 × 21) to 40 (177 × 177) */ version: number } | { ok: false; error: 'tooLong' | 'empty' };

/** The code for `text`, in the smallest size that holds it. Text is written as UTF-8, so every character works. */
export function make(text: string, level: Level = 'M'): Made {
  if (!text) return { ok: false, error: 'empty' };
  // the library's default takes one byte per character, which breaks everything outside Latin-1
  qrcode.stringToBytes = (value) => [...new TextEncoder().encode(value)];
  const qr = qrcode(0, level);
  qr.addData(text, 'Byte');
  try {
    qr.make();
  } catch {
    // more than fits in the largest code (2953 bytes at level L, 1273 at level H)
    return { ok: false, error: 'tooLong' };
  }
  const size = qr.getModuleCount();
  const matrix = Array.from({ length: size }, (_, row) => Array.from({ length: size }, (_, column) => qr.isDark(row, column)));
  return { ok: true, matrix, version: (size - 17) / 4 };
}

/** The quiet zone a scanner needs around a code: four squares, by the standard. */
export const MARGIN = 4;

/** The dark squares as the `d` of one SVG path, each row's neighbours joined into one rectangle. */
export function path(matrix: Matrix, margin = MARGIN): string {
  let d = '';
  matrix.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      if (!row[x]) continue;
      let width = 1;
      while (row[x + width]) width++;
      d += `M${x + margin} ${y + margin}h${width}v1h-${width}z`;
      x += width;
    }
  });
  return d;
}

/**
 * The code as an SVG document: dark on white with the quiet zone around it, one unit per square. It scales to any
 * size without getting blurry. Colours are fixed: a scanner needs dark on light, whatever theme the page has.
 */
export function toSvg(matrix: Matrix, margin = MARGIN): string {
  const size = matrix.length + margin * 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges"><rect width="${size}" height="${size}" fill="#fff"/><path d="${path(matrix, margin)}" fill="#000"/></svg>`;
}

export interface Wifi {
  ssid: string;
  password: string;
  security: 'WPA' | 'WEP' | 'nopass';
  /** The network does not announce its name */
  hidden?: boolean;
}

/** Characters that have a meaning in the Wi-Fi format get a backslash in front. */
const escape = (value: string) => value.replace(/([\\;,:"])/g, '\\$1');

/** What a phone's camera reads to join a network: WIFI:T:WPA;S:name;P:password;; */
export function wifi({ ssid, password, security, hidden = false }: Wifi): string {
  const fields = [`T:${security}`, `S:${escape(ssid)}`, ...(security === 'nopass' ? [] : [`P:${escape(password)}`]), ...(hidden ? ['H:true'] : [])];
  return `WIFI:${fields.join(';')};;`;
}
