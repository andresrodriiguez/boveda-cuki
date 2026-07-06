import path from 'path';
import { fileURLToPath } from 'url';
import { chromium, devices } from 'playwright';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const file = 'file:///' + path.join(__dirname, 'index.html').replace(/\\/g, '/');

const browser = await chromium.launch({ channel: 'chrome' });

// 1) iPhone -> debe aparecer el aviso
const ctxIOS = await browser.newContext({ ...devices['iPhone 13'] });
const p1 = await ctxIOS.newPage();
await p1.goto(file, { waitUntil: 'networkidle' });
await p1.waitForTimeout(2200);
const iosVisible = await p1.evaluate(() => !document.getElementById('iosInstall').hidden);
await p1.screenshot({ path: path.join(__dirname, 'screenshots', 'ios-hint.png'), fullPage: false });
// cerrar y verificar persistencia
await p1.click('#iosClose');
const afterClose = await p1.evaluate(() => document.getElementById('iosInstall').hidden);
await ctxIOS.close();

// 2) Desktop -> NO debe aparecer
const ctxDesk = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const p2 = await ctxDesk.newPage();
await p2.goto(file, { waitUntil: 'networkidle' });
await p2.waitForTimeout(2200);
const deskVisible = await p2.evaluate(() => !document.getElementById('iosInstall').hidden);
await ctxDesk.close();

console.log('iPhone: aviso visible =', iosVisible, '| tras cerrar oculto =', afterClose);
console.log('Desktop: aviso visible =', deskVisible, '(debe ser false)');
await browser.close();
