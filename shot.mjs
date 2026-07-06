import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const file = 'file:///' + path.join(__dirname, 'index.html').replace(/\\/g, '/');
const out = process.argv[2] || 'screenshots/actual.png';

const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1 });
await page.goto(file, { waitUntil: 'networkidle' });
// Scroll through the page to trigger IntersectionObserver reveal animations
await page.evaluate(async () => {
  const step = window.innerHeight * 0.7;
  for (let y = 0; y <= document.body.scrollHeight; y += step) {
    window.scrollTo(0, y);
    await new Promise((r) => setTimeout(r, 120));
  }
  window.scrollTo(0, 0);
  if (window.__revealAll) window.__revealAll();
});
await page.waitForTimeout(700);
await page.screenshot({ path: path.join(__dirname, out), fullPage: true });
await browser.close();
console.log('Screenshot saved to', out);
