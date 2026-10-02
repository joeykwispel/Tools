import { describe, expect, it } from 'vitest';
import { outline, toHtml } from './logic';

const html = (markdown: string) => toHtml(markdown).trim();

describe('toHtml', () => {
  it('writes headings, emphasis, links and code', () => {
    expect(html('# Title')).toBe('<h1>Title</h1>');
    expect(html('Some *emphasis*, **strong** and `code`.')).toBe('<p>Some <em>emphasis</em>, <strong>strong</strong> and <code>code</code>.</p>');
    expect(html('[a link](https://example.com "title")')).toBe('<p><a href="https://example.com" title="title">a link</a></p>');
  });

  it('writes lists and quotes', () => {
    expect(html('- one\n- two')).toBe('<ul>\n<li>one</li>\n<li>two</li>\n</ul>');
    expect(html('1. first\n2. second')).toBe('<ol>\n<li>first</li>\n<li>second</li>\n</ol>');
    expect(html('> quoted')).toBe('<blockquote>\n<p>quoted</p>\n</blockquote>');
  });

  it('writes fenced code with its language, and escapes what is in it', () => {
    expect(html('```js\nif (a < b) {}\n```')).toBe('<pre><code class="language-js">if (a &lt; b) {}\n</code></pre>');
  });

  it('follows GitHub flavoured Markdown: tables, task lists and strikethrough', () => {
    expect(html('| a | b |\n|---|--:|\n| 1 | 2 |')).toBe(
      '<table>\n<thead>\n<tr>\n<th>a</th>\n<th align="right">b</th>\n</tr>\n</thead>\n<tbody><tr>\n<td>1</td>\n<td align="right">2</td>\n</tr>\n</tbody></table>'
    );
    expect(html('- [x] done\n- [ ] todo')).toContain('<input checked="" disabled="" type="checkbox">');
    expect(html('~~gone~~')).toBe('<p><del>gone</del></p>');
  });

  it('keeps a single line break inside a paragraph, as Markdown does', () => {
    expect(html('line one\nline two')).toBe('<p>line one\nline two</p>');
    expect(html('para one\n\npara two')).toBe('<p>para one</p>\n<p>para two</p>');
  });

  it('passes raw HTML through: cleaning it is the job of the page', () => {
    expect(html('<b onclick="x()">raw</b>')).toContain('<b onclick="x()">raw</b>');
  });

  it('gives nothing for an empty text', () => {
    expect(toHtml('')).toBe('');
  });
});

describe('outline', () => {
  it('lists the headings in order, without their markup', () => {
    expect(outline('# One\n\ntext\n\n## Two with `code` and **bold**\n\n### Three\n\nSetext\n===\n')).toEqual([
      { level: 1, text: 'One' },
      { level: 2, text: 'Two with code and bold' },
      { level: 3, text: 'Three' },
      { level: 1, text: 'Setext' }
    ]);
  });

  it('does not take a # in code or text for a heading', () => {
    expect(outline('```\n# not a heading\n```\n\nissue #12')).toEqual([]);
  });
});
