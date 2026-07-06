import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, 'dist');
const PORT = 5177;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
  '.png': 'image/png',
};

const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/') p = '/index.html';
  const file = path.join(root, p);
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); res.end('404'); return; }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
    res.end(data);
  });
});

await new Promise((r) => server.listen(PORT, r));
const base = `http://localhost:${PORT}/`;

const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage();
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));

await page.goto(base, { waitUntil: 'networkidle' });

// Manifest
const manifest = await page.evaluate(async () => {
  const link = document.querySelector('link[rel="manifest"]');
  if (!link) return { ok: false, reason: 'sin <link manifest>' };
  const res = await fetch(link.href);
  const j = await res.json();
  return { ok: true, name: j.name, icons: j.icons?.length, display: j.display, start: j.start_url };
});

// Service worker
let swReady = false;
try {
  swReady = await page.evaluate(() =>
    Promise.race([
      navigator.serviceWorker.ready.then(() => true),
      new Promise((r) => setTimeout(() => r(false), 8000)),
    ])
  );
} catch (e) { swReady = false; }

const swController = await page.evaluate(() => !!navigator.serviceWorker.controller);

// Iconos accesibles
const iconStatus = await page.evaluate(async () => {
  const r1 = await fetch('icon-192.png'); const r2 = await fetch('icon-512.png');
  return { i192: r1.status, i512: r2.status };
});

console.log('=== VERIFICACIÓN PWA ===');
console.log('Manifest:', JSON.stringify(manifest));
console.log('Iconos:', JSON.stringify(iconStatus));
console.log('SW ready (registrado/activo):', swReady);
console.log('SW controlando la página:', swController);
console.log('Errores de consola:', errors.length ? errors : 'ninguno');

await page.screenshot({ path: path.join(__dirname, 'screenshots', 'pwa-check.png'), fullPage: false });
await browser.close();
server.close();
