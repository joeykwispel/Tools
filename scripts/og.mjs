// Generates static/og.png (1200 × 630): the share image (Open Graph / Twitter card), also used as the README banner.
// Same design as the portfolio's og.png, with the kit's dark-theme colors.
// Run it with `npm run og` (PW_CHANNEL=chrome uses your installed Chrome).
import { readFileSync } from 'node:fs';
import { chromium } from '@playwright/test';

const MONO = `data:font/woff2;base64,${readFileSync('node_modules/@fontsource-variable/jetbrains-mono/files/jetbrains-mono-latin-wght-normal.woff2').toString('base64')}`;

const css = `
  @font-face { font-family: Mono; src: url(${MONO}) format('woff2'); font-weight: 100 800; }
  * { box-sizing: border-box; margin: 0; }
  body {
    width: 1200px; height: 630px; overflow: hidden; position: relative;
    font-family: Mono, monospace; color: #e6e9f2; background-color: #0a0e17;
    background-image:
      radial-gradient(900px 560px at 92% -14%, rgba(180, 156, 255, 0.18), transparent 60%),
      radial-gradient(760px 520px at -8% 112%, rgba(125, 211, 192, 0.14), transparent 60%),
      linear-gradient(rgba(255, 255, 255, 0.035) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255, 255, 255, 0.035) 1px, transparent 1px);
    background-size: auto, auto, 48px 48px, 48px 48px;
  }
  .top, .bottom { position: absolute; left: 72px; right: 72px; display: flex; align-items: center; justify-content: space-between; }
  .top { top: 64px; }
  .bottom { bottom: 64px; }
  .logo { font-weight: 800; font-size: 30px; padding: 8px 16px; border: 1px solid rgba(255, 255, 255, 0.12); border-radius: 12px;
          background: rgba(255, 255, 255, 0.04); letter-spacing: -0.02em; }
  .logo b { color: #7dd3c0; }
  .prompt { font-size: 21px; padding: 8px 18px; border: 1px solid rgba(255, 255, 255, 0.12); border-radius: 999px; background: rgba(255, 255, 255, 0.04); }
  .prompt b { color: #7dd3c0; font-weight: 500; }
  .prompt i { color: #98a3b9; font-style: normal; }
  .middle { position: absolute; left: 72px; top: 212px; }
  h1 { font-size: 112px; font-weight: 800; letter-spacing: -0.04em; line-height: 1; }
  .grad { background: linear-gradient(90deg, #7dd3c0, #b49cff); -webkit-background-clip: text; background-clip: text; color: transparent; }
  .sub { margin-top: 30px; font-size: 28px; font-weight: 700; }
  .sub i { color: #7a879e; font-style: normal; font-weight: 500; }
  .code { margin-top: 26px; font-size: 22px; display: flex; align-items: center; }
  .kw { color: #c792ea; } .fn { color: #82aaff; } .str { color: #c3e88d; } .punc { color: #89ddff; }
  .caret { display: inline-block; width: 13px; height: 28px; margin-left: 6px; background: #7dd3c0; }
  .tags { display: flex; gap: 14px; }
  .tag { font-size: 17px; color: #98a3b9; padding: 6px 14px; border: 1px solid rgba(255, 255, 255, 0.12); border-radius: 6px; background: rgba(255, 255, 255, 0.04); }
  .url { font-size: 19px; font-weight: 600; color: #7dd3c0; }
`;

const tags = ['Base64', 'JWT', 'JSON', 'XPath', 'Regex', 'Diff'];
const html = `
  <div class="top">
    <span class="logo">&lt;<b>JO</b>/&gt;</span>
    <span class="prompt"><b>joey@tools</b><i>:~$</i> ls</span>
  </div>
  <div class="middle">
    <h1>Developer <span class="grad">Tools</span></h1>
    <p class="sub"><i>/**</i> Runs in your browser, nothing is sent <i>*/</i></p>
    <p class="code"><span><span class="kw">await</span> <span class="fn">tools</span><span class="punc">.</span><span class="fn">open</span><span class="punc">(</span><span class="str">'jwt-decoder'</span><span class="punc">);</span></span><span class="caret"></span></p>
  </div>
  <div class="bottom">
    <div class="tags">${tags.map((t) => `<span class="tag">${t}</span>`).join('')}</div>
    <span class="url">tools.joeyoosenbrug.nl</span>
  </div>`;

const browser = await chromium.launch({ channel: process.env.PW_CHANNEL });
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
await page.setContent(`<!doctype html><html><head><style>${css}</style></head><body>${html}</body></html>`);
await page.evaluate(() => document.fonts.ready);
await page.screenshot({ path: 'static/og.png', type: 'png' });
await browser.close();
console.log('wrote static/og.png');
