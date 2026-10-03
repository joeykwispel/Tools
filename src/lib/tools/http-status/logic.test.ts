import { describe, expect, it } from 'vitest';
import { MIMES, STATUSES, classOf, findMimes, findStatuses } from './logic';
import text from './text';

const describeEn = (code: number) => text.en.status[code];
const codes = (query: string, describeCode = describeEn) => findStatuses(query, describeCode).map((status) => status.code);
const types = (query: string, locale: 'en' | 'nl' = 'en') => findMimes(query, locale).map((mime) => mime.type);

describe('the data', () => {
  it('has every status once, in order, with a description in both languages', () => {
    const all = STATUSES.map((status) => status.code);
    expect(all).toEqual([...new Set(all)].sort((a, b) => a - b));
    for (const { code } of STATUSES) {
      expect(text.en.status[code], `en ${code}`).toBeTruthy();
      expect(text.nl.status[code], `nl ${code}`).toBeTruthy();
    }
    expect(Object.keys(text.en.status)).toHaveLength(STATUSES.length);
    expect(Object.keys(text.nl.status)).toHaveLength(STATUSES.length);
  });

  it('has every media type once, written as a type', () => {
    const all = MIMES.map((mime) => mime.type);
    expect(new Set(all).size).toBe(all.length);
    for (const mime of MIMES) {
      expect(mime.type).toMatch(/^(text|application|image|audio|video|font|multipart)\/[a-z0-9.+-]+$/);
      for (const extension of mime.extensions) expect(extension).toMatch(/^[a-z0-9]+$/);
    }
  });

  it('knows the class of a code', () => {
    expect([100, 204, 308, 404, 511].map(classOf)).toEqual([1, 2, 3, 4, 5]);
  });
});

describe('findStatuses', () => {
  it('gives everything for an empty search', () => {
    expect(codes('')).toHaveLength(STATUSES.length);
    expect(codes('   ')).toHaveLength(STATUSES.length);
  });

  it('finds a code by how it starts', () => {
    expect(codes('404')).toEqual([404]);
    expect(codes('41')).toEqual([410, 411, 412, 413, 414, 415, 416, 417, 418]);
    expect(codes('3')).toEqual([300, 301, 302, 303, 304, 307, 308]);
    expect(codes('3xx')).toEqual(codes('3'));
    expect(codes('50x')).toEqual([500, 501, 502, 503, 504, 505, 506, 507, 508]);
    expect(codes('999')).toEqual([]);
    expect(codes('604')).toEqual([]);
  });

  it('finds a code by its name or its description, in the language of the page', () => {
    expect(codes('teapot')).toEqual([418]);
    expect(codes('NOT found')).toEqual([404]);
    expect(codes('retry-after')).toEqual([429]);
    expect(codes('gateway')).toEqual([502, 504]);
    expect(codes('omleiding')).toEqual([]);
    expect(codes('omleiding', (code) => text.nl.status[code])).toEqual([301, 302, 307, 308]);
  });

  it('wants every word to match', () => {
    expect(codes('4 webdav')).toEqual([423, 424]);
    expect(codes('5 teapot')).toEqual([]);
  });
});

describe('findMimes', () => {
  it('gives everything for an empty search', () => {
    expect(types('')).toHaveLength(MIMES.length);
  });

  it('finds a type by its name, what it is, or its extension', () => {
    expect(types('application/json')).toEqual(['application/json']);
    expect(types('.json')).toEqual(['application/json', 'application/ld+json']);
    expect(types('.jp')).toEqual(['image/jpeg']);
    expect(types('woff')).toEqual(['font/woff2', 'font/woff']);
    expect(types('excel')).toEqual(['application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']);
    expect(types('font')).toEqual(['font/woff2', 'font/woff', 'font/ttf', 'font/otf']);
    expect(types('lettertype', 'nl')).toEqual(['font/woff2', 'font/woff', 'font/ttf', 'font/otf']);
    expect(types('lettertype')).toEqual([]);
  });

  it('does not take a status code for a type', () => {
    expect(types('404')).toEqual([]);
    expect(types('3')).toEqual([]);
    expect(types('4xx')).toEqual([]);
    expect(types('mp4')).toEqual(['audio/mp4', 'video/mp4']);
    expect(types('7z')).toEqual(['application/x-7z-compressed']);
  });

  it('wants every word to match', () => {
    expect(types('image svg')).toEqual(['image/svg+xml']);
    expect(types('video .mp4')).toEqual(['video/mp4']);
  });
});
