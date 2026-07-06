import path from 'path';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const file = 'file:///' + path.join(__dirname, 'index.html').replace(/\\/g, '/');

const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));

await page.goto(file, { waitUntil: 'networkidle' });
await page.waitForTimeout(2000);

const results = {};

// --- CONVERSOR ---
await page.click('.dash-side .nav-item[data-view="conversiones"]');
await page.fill('#conv-amount', '100');
await page.selectOption('#conv-from', 'usdt');
await page.waitForTimeout(300);
results.conversor = await page.evaluate(() => document.getElementById('conv-results').innerText.replace(/\n/g, ' | '));

// --- MOVIMIENTOS ---
await page.click('.dash-side .nav-item[data-view="movimientos"]');
await page.selectOption('#mov-type', 'ingreso');
await page.fill('#mov-amount', '250');
await page.selectOption('#mov-cur', 'usdt');
await page.fill('#mov-note', 'Pago freelance');
await page.click('#mov-form button[type="submit"]');
await page.waitForTimeout(300);
results.movSummary = await page.evaluate(() => document.getElementById('mov-summary').innerText.replace(/\n/g, ' | '));
results.movCount = await page.evaluate(() => document.querySelectorAll('.mov-item').length);

// --- GENIO ---
await page.click('.dash-side .nav-item[data-view="genio"]');
await page.fill('#chat-input', '¿cuánto es 50 usdt en bs?');
await page.click('#chat-form button[type="submit"]');
await page.waitForTimeout(500);
await page.fill('#chat-input', '¿cuánto pierdo a tasa bcv?');
await page.click('#chat-form button[type="submit"]');
await page.waitForTimeout(500);
results.genioMsgs = await page.evaluate(() => Array.from(document.querySelectorAll('.msg.bot')).map((m) => m.innerText).slice(-2));

console.log('=== TEST FUNCIONAL ===');
console.log('CONVERSOR (100 USDT):', results.conversor);
console.log('MOV resumen:', results.movSummary);
console.log('MOV items:', results.movCount);
console.log('GENIO respuestas:', JSON.stringify(results.genioMsgs, null, 2));
console.log('Errores consola:', errors.length ? errors : 'ninguno');

await page.screenshot({ path: path.join(__dirname, 'screenshots', 'app-genio.png') });
await browser.close();
