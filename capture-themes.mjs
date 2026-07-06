import path from 'path';
import { fileURLToPath } from 'url';
import { chromium, devices } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const file = 'file:///' + path.join(__dirname, 'index.html').replace(/\\/g, '/');
const tag = process.argv[2] || '';

const browser = await chromium.launch({ channel: 'chrome' });

async function shoot(theme, kind) {
  const isMobile = kind === 'mobile';
  const opts = isMobile
    ? { ...devices['iPhone 13'], deviceScaleFactor: 1 }
    : { viewport: { width: 1280, height: 900 } };
  const context = await browser.newContext(opts);
  await context.addInitScript((t) => {
    try { localStorage.setItem('theme', t); } catch (e) {}
  }, theme);
  const page = await context.newPage();
  await page.goto(file, { waitUntil: 'networkidle' });
  await page.evaluate(async () => {
    const step = window.innerHeight * 0.7;
    for (let y = 0; y <= document.body.scrollHeight; y += step) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 90)); }
    window.scrollTo(0, 0);
    if (window.__revealAll) window.__revealAll();
  });
  await page.waitForTimeout(600);
  const out = `screenshots/theme-${theme}-${kind}${tag}.png`;
  await page.screenshot({ path: path.join(__dirname, out), fullPage: true });
  await context.close();
  console.log('->', out);
}

for (const theme of ['dark', 'light']) {
  await shoot(theme, 'desktop');
  await shoot(theme, 'mobile');
}
await browser.close();
