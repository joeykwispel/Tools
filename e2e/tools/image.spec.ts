import { crc32, deflateSync } from 'node:zlib';
import { expect, test, type Download, type Page } from '@playwright/test';
import { open } from '../helpers';

/** A PNG of one colour, half transparent. */
function png(width: number, height: number): Buffer {
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
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(rows)),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

async function bytes(download: Download): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of await download.createReadStream()) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks);
}

const save = async (page: Page, button: string) => (await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: button }).click()]))[0];

test('Image resizer makes another size, keeps the proportions and writes the format asked for', async ({ page }) => {
  await open(page, '/image/');
  await expect(page.getByRole('status')).toHaveText('Pick an image, or try the sample.');
  const photo = png(40, 20);
  await page.getByLabel('Image', { exact: true }).setInputFiles({ name: 'photo.png', mimeType: 'image/png', buffer: photo });
  await expect(page.getByRole('status')).toHaveText(`photo.png: 40 × 20 px, ${photo.length} B.`);

  const width = page.getByRole('spinbutton', { name: 'Width (px)' });
  const height = page.getByRole('spinbutton', { name: 'Height (px)' });
  await expect(width).toHaveValue('40');
  await expect(height).toHaveValue('20');
  await width.fill('20');
  await expect(height).toHaveValue('10');
  await expect(page.getByTestId('image-made')).toContainText('photo-20x10.png: 20 × 10 px');
  await expect(page.getByTestId('image-canvas')).toHaveAttribute('width', '20');

  let download = await save(page, 'Download');
  expect(download.suggestedFilename()).toBe('photo-20x10.png');
  let file = await bytes(download);
  expect([file.readUInt32BE(16), file.readUInt32BE(20)]).toEqual([20, 10]);

  // without the lock a side is changed by itself, and with it again the other follows
  await page.getByRole('checkbox', { name: 'Keep the proportions' }).uncheck();
  await height.fill('5');
  await expect(width).toHaveValue('20');
  await expect(page.getByTestId('image-made')).toContainText('20 × 5 px');
  await page.getByRole('checkbox', { name: 'Keep the proportions' }).check();
  await expect(height).toHaveValue('10');

  await page.getByRole('radio', { name: 'JPEG' }).check();
  await expect(page.getByText('JPEG has no transparency')).toBeVisible();
  await expect(page.getByTestId('image-made')).toContainText('photo-20x10.jpg');
  download = await save(page, 'Download');
  expect(download.suggestedFilename()).toBe('photo-20x10.jpg');
  file = await bytes(download);
  expect([file[0], file[1]]).toEqual([0xff, 0xd8]);

  await width.fill('0');
  await expect(page.getByText('Width and height have to be whole numbers from 1 to 8192.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Download' })).toBeDisabled();
});

test('Image resizer makes a favicon set of the sample', async ({ page }) => {
  await open(page, '/image/');
  await page.getByRole('button', { name: 'Sample' }).click();
  await expect(page.getByRole('status')).toContainText('sample.png: 1200 × 800 px');
  await page.getByRole('radio', { name: 'a favicon set' }).check();
  await expect(page.getByText('The image is not square')).toBeVisible();

  const files = page.getByTestId('image-files').getByRole('rowheader');
  await expect(files).toHaveText(['favicon.ico', 'apple-touch-icon.png', 'icon-192.png', 'icon-512.png', 'site.webmanifest']);
  await expect(page.getByTestId('image-head')).toHaveText(
    '<link rel="icon" href="/favicon.ico" sizes="48x48">\n<link rel="apple-touch-icon" href="/apple-touch-icon.png">\n<link rel="manifest" href="/site.webmanifest">'
  );
  await expect(page.getByRole('img', { name: 'The icon at 32 px' })).toHaveJSProperty('naturalWidth', 32);

  // the icon: three images, each a PNG of its own size
  const icon = await bytes(await save(page, 'Download favicon.ico'));
  expect([icon.readUInt16LE(0), icon.readUInt16LE(2), icon.readUInt16LE(4)]).toEqual([0, 1, 3]);
  for (const [i, side] of [16, 32, 48].entries()) {
    const at = icon.readUInt32LE(6 + i * 16 + 12);
    expect(icon[6 + i * 16]).toBe(side);
    expect(icon.subarray(at + 1, at + 4).toString()).toBe('PNG');
    expect(icon.readUInt32BE(at + 16)).toBe(side);
  }

  const apple = await bytes(await save(page, 'Download apple-touch-icon.png'));
  expect([apple.readUInt32BE(16), apple.readUInt32BE(20)]).toEqual([180, 180]);

  const all = await save(page, 'Download all as .zip');
  expect(all.suggestedFilename()).toBe('favicons.zip');
  const archive = await bytes(all);
  expect(archive.subarray(0, 2).toString()).toBe('PK');
  expect(archive.readUInt16LE(archive.length - 12)).toBe(5);
  for (const name of ['favicon.ico', 'apple-touch-icon.png', 'icon-192.png', 'icon-512.png', 'site.webmanifest']) expect(archive.includes(name)).toBe(true);
});

test('Image resizer reads an SVG, and adds it to the favicon set', async ({ page }) => {
  await open(page, '/image/');
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#e8a317"/></svg>';
  await page.getByLabel('Image', { exact: true }).setInputFiles({ name: 'dot.svg', mimeType: 'image/svg+xml', buffer: Buffer.from(svg) });
  await expect(page.getByRole('status')).toHaveText(`dot.svg: 24 × 24 px, ${svg.length} B.`);

  // larger than the drawing says it is: an SVG is drawn at the size asked for
  await page.getByRole('spinbutton', { name: 'Width (px)' }).fill('96');
  await expect(page.getByTestId('image-made')).toContainText('dot-96x96.png: 96 × 96 px');
  const middle = await page.getByTestId('image-canvas').evaluate((canvas: HTMLCanvasElement) => [...canvas.getContext('2d')!.getImageData(48, 48, 1, 1).data]);
  expect(middle).toEqual([0xe8, 0xa3, 0x17, 255]);

  await page.getByRole('radio', { name: 'a favicon set' }).check();
  await expect(page.getByTestId('image-files').getByRole('rowheader')).toContainText(['favicon.ico', 'icon.svg']);
  await expect(page.getByTestId('image-head')).toContainText('<link rel="icon" href="/icon.svg" sizes="any" type="image/svg+xml">');
  expect((await bytes(await save(page, 'Download icon.svg'))).toString()).toBe(svg);
});

test('Image resizer says when a file is not an image, and speaks Dutch', async ({ page }) => {
  await open(page, '/image/');
  await page.getByLabel('Image', { exact: true }).setInputFiles({ name: 'notes.png', mimeType: 'image/png', buffer: Buffer.from('not an image') });
  await expect(page.getByRole('status')).toHaveText('notes.png is not an image this browser can read.');

  await open(page, '/nl/image/');
  await expect(page.getByRole('status')).toHaveText('Kies een afbeelding, of probeer het voorbeeld.');
  await page.getByRole('button', { name: 'Voorbeeld' }).click();
  await page.getByRole('spinbutton', { name: 'Breedte (px)' }).fill('300');
  await expect(page.getByTestId('image-made')).toContainText('voorbeeld-300x200.png: 300 × 200 px');
  await expect(page.getByTestId('image-made')).toContainText('van de grootte van het oorspronkelijke bestand');
});
