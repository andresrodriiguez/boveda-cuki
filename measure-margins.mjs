import path from 'path';
import { fileURLToPath } from 'url';
import { chromium, devices } from 'playwright';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const file = 'file:///' + path.join(__dirname, 'index.html').replace(/\\/g, '/');

const browser = await chromium.launch({ channel: 'chrome' });
const ctx = await browser.newContext({ ...devices['iPhone 13'] });
const page = await ctx.newPage();
await page.goto(file, { waitUntil: 'networkidle' });
await page.waitForTimeout(800);

const data = await page.evaluate(() => {
  const vw = window.innerWidth;
  const pick = (sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { left: Math.round(r.left), right: Math.round(vw - r.right), width: Math.round(r.width) };
  };
  return {
    viewport: vw,
    heroTitle: pick('.hero h1'),
    blockHeading: pick('section.block .big'),
    bodyPara: pick('.two-col p'),
    dashboard: pick('.dashboard'),
    featureCard: pick('.feature'),
    newsCard: pick('.news-card'),
    wrapPadding: getComputedStyle(document.querySelector('.wrap')).paddingLeft,
  };
});
console.log(JSON.stringify(data, null, 2));
await browser.close();
