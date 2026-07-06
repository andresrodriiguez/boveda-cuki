import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, 'dist');

const svg = (size) => `<!doctype html><html><head><style>html,body{margin:0;padding:0}</style></head><body>
<svg width="${size}" height="${size}" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#5aa8ff"/><stop offset="1" stop-color="#35d0c0"/>
    </linearGradient>
    <radialGradient id="bg" cx="0.5" cy="0.28" r="0.85">
      <stop offset="0" stop-color="#0c1626"/><stop offset="1" stop-color="#05070d"/>
    </radialGradient>
  </defs>
  <rect width="24" height="24" fill="url(#bg)"/>
  <path d="M12 3.6L4.6 7.3v9.4L12 20.4l7.4-3.7V7.3L12 3.6z" fill="none" stroke="url(#g)" stroke-width="1.4"/>
  <path d="M12 7.8l3.6 2v4.4L12 16.2l-3.6-2v-4.4L12 7.8z" fill="url(#g)" opacity="0.9"/>
  <circle cx="12" cy="12" r="1.15" fill="#05070d"/>
</svg></body></html>`;

const browser = await chromium.launch({ channel: 'chrome' });
for (const { size, name } of [
  { size: 192, name: 'icon-192.png' },
  { size: 512, name: 'icon-512.png' },
  { size: 180, name: 'apple-touch-icon.png' },
]) {
  const page = await browser.newPage({ viewport: { width: size, height: size }, deviceScaleFactor: 1 });
  await page.setContent(svg(size));
  await page.screenshot({ path: path.join(outDir, name), clip: { x: 0, y: 0, width: size, height: size } });
  await page.close();
  console.log('icon ->', name);
}
await browser.close();
console.log('Listo.');
