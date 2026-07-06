# Bóveda Cuki

App web de finanzas para Venezuela: **tasas en vivo** (USDT, dólar BCV y euro BCV), **conversor**, **movimientos** y el asistente **Genio**. Es una **PWA instalable** con tema claro/oscuro y funciona offline.

🔗 **En vivo:** _(se completa al conectar Vercel)_

## Funcionalidades
- 📡 Tasas en tiempo real desde `ve.dolarapi.com` (auto-refresco cada 5 min).
- 💱 Conversor entre USDT, Dólar BCV, Euro BCV y Bolívares.
- 📋 Movimientos con guardado local en el dispositivo (offline).
- ✦ Genio: asistente que responde conversiones, brecha, "cuánto pierdo a tasa BCV", inflación y remesas.
- 🌗 Tema claro/oscuro con persistencia.
- 📲 PWA: instalable y funcional sin conexión (service worker).

## Estructura
- `index.html`, `styles.css`, `script.js` — la app (fuente).
- `dist/` — versión desplegable (lo que sirve Vercel). **Root Directory en Vercel: `dist`.**
- `manifest.json`, `sw.js`, `icon-*.png` — PWA.
- `*.mjs` — scripts de captura y pruebas automáticas (Playwright).

## Desarrollo local
```bash
npm install          # instala Playwright (para los scripts de prueba)
# abrir index.html en el navegador, o servir dist/ con cualquier servidor estático
```

## Despliegue (Vercel)
Proyecto estático (sin build). En Vercel: Framework **Other**, Root Directory **`dist`**, Build/Output vacíos.

---
Las tasas y noticias son **informativas**; consultar siempre fuentes oficiales (BCV). Bóveda Cuki no es un banco.
