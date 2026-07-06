import path from 'path';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const url = process.argv[2] || 'https://cukiv3.vercel.app/';

const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));

await page.goto(url, { waitUntil: 'networkidle' });
await page.waitForTimeout(2500);

const out = {};
out.status = await page.evaluate(() => document.getElementById('rates-status')?.textContent);
out.sw = await page.evaluate(() => Promise.race([
  navigator.serviceWorker.ready.then(() => true),
  new Promise((r) => setTimeout(() => r(false), 8000)),
]));

// Conversor
await page.click('.dash-side .nav-item[data-view="conversiones"]');
await page.fill('#conv-amount', '100');
await page.selectOption('#conv-from', 'usdt');
await page.waitForTimeout(300);
out.conversor = await page.evaluate(() => document.getElementById('conv-results').innerText.replace(/\n/g, ' '));

// Movimientos
await page.click('.dash-side .nav-item[data-view="movimientos"]');
await page.fill('#mov-amount', '250');
await page.selectOption('#mov-cur', 'usdt');
await page.fill('#mov-note', 'Prueba');
await page.click('#mov-form button[type="submit"]');
await page.waitForTimeout(300);
out.mov = await page.evaluate(() => document.getElementById('mov-summary').innerText.replace(/\n/g, ' '));

// Genio
await page.click('.dash-side .nav-item[data-view="genio"]');
await page.fill('#chat-input', '¿cuánto es 30 euros en bs?');
await page.click('#chat-form button[type="submit"]');
await page.waitForTimeout(500);
out.genio = await page.evaluate(() => document.querySelector('.msg.bot:last-child')?.innerText);

console.log('=== VERIFICACIÓN EN VIVO (interactiva):', url, '===');
console.log('Tasas:', out.status);
console.log('Service Worker:', out.sw);
console.log('Conversor 100 USDT:', out.conversor);
console.log('Movimientos:', out.mov);
console.log('Genio:', out.genio);
console.log('Errores consola:', errors.length ? errors : 'ninguno');
await browser.close();
