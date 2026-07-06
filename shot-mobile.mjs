import { chromium, devices } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const file = 'file:///' + path.join(__dirname, 'index.html').replace(/\\/g, '/');
const out = process.argv[2] || 'screenshots/mobile.png';

const iphone = devices['iPhone 13'];
const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ ...iphone, deviceScaleFactor: 1 });
await page.goto(file, { waitUntil: 'networkidle' });
await page.evaluate(async () => {
  const step = window.innerHeight * 0.7;
  for (let y = 0; y <= document.body.scrollHeight; y += step) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 100)); }
  window.scrollTo(0, 0);
  if (window.__revealAll) window.__revealAll();
});
await page.waitForTimeout(500);
await page.screenshot({ path: path.join(__dirname, out), fullPage: true });
await browser.close();
console.log('Mobile screenshot saved to', out);
