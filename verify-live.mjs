import path from 'path';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const url = process.argv[2] || 'https://cukiv2.vercel.app/';

const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));

await page.goto(url, { waitUntil: 'networkidle' });
await page.waitForTimeout(2500); // dar tiempo a fetch de tasas

const manifest = await page.evaluate(async () => {
  const link = document.querySelector('link[rel="manifest"]');
  if (!link) return { ok: false };
  const r = await fetch(link.href); const j = await r.json();
  return { ok: true, name: j.name, icons: j.icons?.length, display: j.display };
});

let swReady = false;
try {
  swReady = await page.evaluate(() => Promise.race([
    navigator.serviceWorker.ready.then(() => true),
    new Promise((r) => setTimeout(() => r(false), 9000)),
  ]));
} catch (e) {}

const rates = await page.evaluate(() => ({
  usdt: document.getElementById('rate-usdt')?.textContent,
  usd: document.getElementById('rate-usd')?.textContent,
  eur: document.getElementById('rate-eur')?.textContent,
  status: document.getElementById('rates-status')?.textContent,
}));

const icons = await page.evaluate(async () => {
  const a = await fetch('icon-192.png'); const b = await fetch('icon-512.png'); const c = await fetch('manifest.json');
  return { i192: a.status, i512: b.status, manifest: c.status };
});

console.log('=== VERIFICACIÓN EN VIVO:', url, '===');
console.log('Manifest:', JSON.stringify(manifest));
console.log('Recursos:', JSON.stringify(icons));
console.log('Service Worker activo:', swReady);
console.log('Tasas en pantalla:', JSON.stringify(rates));
console.log('Errores de consola:', errors.length ? errors : 'ninguno');

await page.evaluate(async () => {
  const step = window.innerHeight * 0.7;
  for (let y = 0; y <= document.body.scrollHeight; y += step) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 90)); }
  window.scrollTo(0, 0); if (window.__revealAll) window.__revealAll();
});
await page.waitForTimeout(500);
await page.screenshot({ path: path.join(__dirname, 'screenshots', 'live.png'), fullPage: true });
await browser.close();
