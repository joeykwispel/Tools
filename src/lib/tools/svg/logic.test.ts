import { describe, expect, it } from 'vitest';
import { DEFAULTS, bytes, dataUri, optimise, roundList, roundPath, saved, short, type Options } from './logic';

const KEEP: Options = { comments: false, metadata: false, editor: false, empty: false, oneLine: true, precision: null };
/** The result with only the given options on. */
const run = (text: string, options: Partial<Options> = {}) => {
  const result = optimise(text, { ...KEEP, ...options });
  if (!result.ok) throw new Error('not read');
  return result.svg;
};

describe('short', () => {
  it('rounds and writes a number as short as it goes', () => {
    expect(short(1.23456, 3)).toBe('1.235');
    expect(short(24.0, 3)).toBe('24');
    expect(short(0.5, 2)).toBe('.5');
    expect(short(-0.25, 2)).toBe('-.25');
    expect(short(-0.0004, 3)).toBe('0');
    expect(short(1e-7, 3)).toBe('0');
    expect(short(100, 0)).toBe('100');
  });
});

describe('roundList', () => {
  it('rounds the numbers and keeps the rest', () => {
    expect(roundList('0 0 24.000 24.000', 2)).toBe('0 0 24 24');
    expect(roundList('translate(1.23456, -5.5) rotate(45.0001)', 2)).toBe('translate(1.23,-5.5) rotate(45)');
    expect(roundList('12.3456px', 1)).toBe('12.3px');
    expect(roundList('50%', 1)).toBe('50%');
    expect(roundList('none', 1)).toBe('none');
  });

  it('keeps numbers apart that were written against each other', () => {
    expect(roundList('1.04.5', 1)).toBe('1 .5');
    expect(roundList('10+5', 1)).toBe('10 5');
    expect(roundList('10-5', 1)).toBe('10-5');
  });
});

describe('roundPath', () => {
  it('rounds and shortens path data', () => {
    expect(roundPath('M 10.12345 , 20.98765 L 30 40 Z', 2)).toBe('M10.12 20.99L30 40Z');
    expect(roundPath('m0.5 0.5 -1.25 -2', 2)).toBe('m.5.5-1.25-2');
    expect(roundPath('M0 0 10 10 20 0z', 1)).toBe('M0 0 10 10 20 0z');
    expect(roundPath('M0,0h10.04v-10.06H0', 1)).toBe('M0 0h10v-10.1H0');
    expect(roundPath('M1 1C2.00001 2 3 3 4 4S5 5 6 6Q7 7 8 8T9 9', 3)).toBe('M1 1C2 2 3 3 4 4S5 5 6 6Q7 7 8 8T9 9');
  });

  it('reads the flags of an arc, also when they are written against the next number', () => {
    expect(roundPath('M0 0a1 1 0 01.5.5', 2)).toBe('M0 0a1 1 0 0 1 .5.5');
    expect(roundPath('M0 0A1.004 1.004 0 1 0 5 5', 2)).toBe('M0 0A1 1 0 1 0 5 5');
    expect(roundPath('M0 0a1 1 0 2 1 5 5', 2)).toBeNull();
  });

  it('gives null for path data that can not be read', () => {
    expect(roundPath('L10 10', 2)).toBeNull();
    expect(roundPath('M10', 2)).toBeNull();
    expect(roundPath('M10 10 X', 2)).toBeNull();
    expect(roundPath('M10 10 L', 2)).toBeNull();
    expect(roundPath('', 2)).toBe('');
  });
});

describe('optimise', () => {
  it('removes comments, but not the ones of a licence', () => {
    expect(run('<svg><!-- made by hand --><!--! MIT licence --><g><!-- inner --><path d="M0 0"/></g></svg>', { comments: true })).toBe(
      '<svg><!--! MIT licence --><g><path d="M0 0"/></g></svg>'
    );
  });

  it('removes the declaration, the doctype, instructions and metadata', () => {
    const svg =
      '<?xml version="1.0"?><!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd"><?xpacket begin?><svg><metadata><rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"/></metadata><title>Logo</title></svg>';
    expect(run(svg, { metadata: true })).toBe('<svg><title>Logo</title></svg>');
    expect(run(svg)).toContain('<?xml version="1.0"?><!DOCTYPE svg');
  });

  it('keeps a doctype that defines entities', () => {
    const svg = '<!DOCTYPE svg [<!ENTITY ns "http://www.w3.org/2000/svg">]><svg xmlns="&ns;"/>';
    expect(run(svg, { metadata: true })).toBe(svg);
  });

  it('removes what drawing programs add, and namespaces nothing uses', () => {
    const svg =
      '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape" xmlns:sodipodi="http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd" inkscape:version="1.3" sodipodi:docname="a.svg">' +
      '<sodipodi:namedview id="view" inkscape:zoom="2"/><g inkscape:label="Layer 1" id="layer1"><use xlink:href="#a"/></g></svg>';
    expect(run(svg, { editor: true })).toBe(
      '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"><g id="layer1"><use xlink:href="#a"/></g></svg>'
    );
    expect(run(svg)).toContain('sodipodi:namedview');
  });

  it('removes empty groups and defs, also when that empties the one around them', () => {
    expect(run('<svg><defs>\n</defs><g id="a"><g/></g><g><path d="M0 0"/></g><text></text></svg>', { empty: true })).toBe(
      '<svg><g><path d="M0 0"/></g><text/></svg>'
    );
    expect(run('<svg><g></g></svg>', { empty: true })).toBe('<svg/>');
  });

  it('rounds numbers in the attributes that hold them, and nowhere else', () => {
    expect(
      run(
        '<svg viewBox="0 0 24.000 24.000"><path id="p1.23456" d="M1.23456 2.00001L3 4" stroke-width="1.50000" fill="#123456"/><path d="nonsense 1.23456"/></svg>',
        {
          precision: 2
        }
      )
    ).toBe('<svg viewBox="0 0 24 24"><path id="p1.23456" d="M1.23 2L3 4" stroke-width="1.5" fill="#123456"/><path d="nonsense 1.23456"/></svg>');
    expect(run('<svg><rect width="10.56" height="&h;"/></svg>', { precision: 0 })).toBe('<svg><rect width="11" height="&h;"/></svg>');
  });

  it('lays the result out when it does not have to be on one line', () => {
    expect(run('<svg><g><path d="M0 0"/></g></svg>', { oneLine: false })).toBe('<svg>\n  <g>\n    <path d="M0 0"/>\n  </g>\n</svg>');
  });

  it('does all of it by default', () => {
    const result = optimise(
      '<?xml version="1.0"?>\n<!-- Generator: Adobe Illustrator -->\n<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10.0 10.0">\n  <g></g>\n  <circle cx="5.00004" cy="5" r="4.5"></circle>\n</svg>\n'
    );
    expect(result).toMatchObject({ ok: true, svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><circle cx="5" cy="5" r="4.5"/></svg>' });
    expect(DEFAULTS.precision).toBe(3);
  });

  it('says why something can not be read', () => {
    expect(optimise('<svg><g></svg>')).toMatchObject({ ok: false, reason: 'xml', error: { kind: 'mismatch', line: 1 } });
    expect(optimise('')).toMatchObject({ ok: false, reason: 'xml', error: { kind: 'empty' } });
    expect(optimise('<html><body/></html>')).toEqual({ ok: false, reason: 'root', name: 'html' });
    expect(optimise('<svg:svg xmlns:svg="http://www.w3.org/2000/svg"/>')).toMatchObject({ ok: true });
  });
});

describe('sizes', () => {
  it('counts bytes as UTF-8 and the part that was saved', () => {
    expect(bytes('<svg/>')).toBe(6);
    expect(bytes('é€')).toBe(5);
    expect(saved(200, 150)).toBe(25);
    expect(saved(200, 200)).toBe(0);
    expect(saved(200, 250)).toBe(0);
    expect(saved(0, 0)).toBe(0);
  });
});

describe('dataUri', () => {
  const document = (text: string) => {
    const result = optimise(text, KEEP);
    if (!result.ok) throw new Error('not read');
    return result.after;
  };

  it('escapes only what has to be, with single quotes', () => {
    expect(dataUri(document('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 8 8"><path fill="#f00" d="M0 0h8v8z"/></svg>'))).toBe(
      "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 8 8'%3E%3Cpath fill='%23f00' d='M0 0h8v8z'/%3E%3C/svg%3E"
    );
  });

  it('adds the namespace an image needs', () => {
    expect(dataUri(document('<svg/>'))).toBe("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'/%3E");
    expect(dataUri(document('<svg/>'), true)).toBe(`data:image/svg+xml;base64,${btoa('<svg xmlns="http://www.w3.org/2000/svg"/>')}`);
  });

  it('keeps double quotes around a value with a single quote in it, and escapes text', () => {
    const uri = dataUri(document(`<svg xmlns="http://www.w3.org/2000/svg" font-family="'Inter'"><text>50% &amp; "é"\n</text></svg>`));
    expect(uri).toBe(
      "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' font-family=%22'Inter'%22%3E%3Ctext%3E50%25 %26amp; %22%C3%A9%22%0A%3C/text%3E%3C/svg%3E"
    );
    expect(decodeURIComponent(uri.slice(uri.indexOf(',') + 1))).toBe(
      `<svg xmlns='http://www.w3.org/2000/svg' font-family="'Inter'"><text>50% &amp; "é"\n</text></svg>`
    );
  });

  it('writes Base64 of the UTF-8 bytes', () => {
    const uri = dataUri(document('<svg xmlns="http://www.w3.org/2000/svg"><text>é</text></svg>'), true);
    const decoded = new TextDecoder().decode(Uint8Array.from(atob(uri.slice(uri.indexOf(',') + 1)), (ch) => ch.charCodeAt(0)));
    expect(decoded).toBe('<svg xmlns="http://www.w3.org/2000/svg"><text>é</text></svg>');
  });
});
