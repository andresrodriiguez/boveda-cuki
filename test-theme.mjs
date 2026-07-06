import path from 'path';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const file = 'file:///' + path.join(__dirname, 'index.html').replace(/\\/g, '/');

const browser = await chromium.launch({ channel: 'chrome' });
const ctx = await browser.newContext({ colorScheme: 'dark' });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.goto(file, { waitUntil: 'networkidle' });

const initial = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
await page.click('#themeToggle');
const afterClick = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
const stored = await page.evaluate(() => localStorage.getItem('theme'));
const metaColor = await page.evaluate(() => document.querySelector('meta[name="theme-color"]').content);
const icon = await page.evaluate(() => document.getElementById('themeToggle').textContent);

// Recargar: debe recordar la elección
await page.reload({ waitUntil: 'networkidle' });
const afterReload = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));

console.log('Tema inicial (sistema dark):', initial);
console.log('Tras clic:', afterClick, '| guardado:', stored, '| meta:', metaColor, '| icono:', icon);
console.log('Tras recargar (persistencia):', afterReload);
console.log('Errores:', errors.length ? errors : 'ninguno');
await browser.close();
