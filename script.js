// ============================================================
//  Bóveda — interacciones y efectos 3D
// ============================================================
const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ---------- 1. Glow que sigue el cursor ----------
const glow = document.getElementById('cursorGlow');
if (glow && !reduce) {
  let gx = window.innerWidth / 2, gy = window.innerHeight / 2, cx = gx, cy = gy;
  window.addEventListener('mousemove', (e) => { gx = e.clientX; gy = e.clientY; glow.style.opacity = '1'; });
  (function loop() {
    cx += (gx - cx) * 0.12; cy += (gy - cy) * 0.12;
    glow.style.transform = `translate(${cx}px, ${cy}px) translate(-50%, -50%)`;
    requestAnimationFrame(loop);
  })();
}

// ---------- 2. Tilt 3D genérico (dashboard + tarjetas) ----------
function attachTilt(el, max = 8, scale = 1.0) {
  if (reduce) return;
  const glare = el.querySelector('.glare');
  el.addEventListener('mousemove', (e) => {
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    const ry = (px - 0.5) * (max * 2);
    const rx = (0.5 - py) * (max * 2);
    el.style.transform = `perspective(1000px) rotateX(${rx}deg) rotateY(${ry}deg) scale(${scale})`;
    if (glare) { glare.style.setProperty('--gx', px * 100 + '%'); glare.style.setProperty('--gy', py * 100 + '%'); glare.style.opacity = '1'; }
  });
  el.addEventListener('mouseleave', () => {
    el.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) scale(1)';
    if (glare) glare.style.opacity = '0';
  });
}
const dash = document.getElementById('dashTilt');
if (dash) attachTilt(dash, 5, 1.0);
document.querySelectorAll('.tilt-card').forEach((c) => attachTilt(c, 9, 1.02));

// ---------- 3. Botones magnéticos ----------
if (!reduce) {
  document.querySelectorAll('.btn-primary').forEach((btn) => {
    btn.addEventListener('mousemove', (e) => {
      const r = btn.getBoundingClientRect();
      const mx = e.clientX - r.left - r.width / 2;
      const my = e.clientY - r.top - r.height / 2;
      btn.style.transform = `translate(${mx * 0.25}px, ${my * 0.35}px)`;
    });
    btn.addEventListener('mouseleave', () => { btn.style.transform = 'translate(0,0)'; });
  });
}

// ---------- 4. Count-up de tasas ----------
function countUp(el) {
  const to = parseFloat(el.dataset.to);
  const dec = parseInt(el.dataset.dec || '0', 10);
  const fmt = (n) => n.toLocaleString('es-VE', { minimumFractionDigits: dec, maximumFractionDigits: dec });
  if (reduce) { el.textContent = fmt(to); return; }
  const dur = 1400; let start = null;
  function tick(t) {
    if (start === null) start = t;
    const p = Math.min((t - start) / dur, 1);
    const eased = 1 - Math.pow(1 - p, 3);
    el.textContent = fmt(to * eased);
    if (p < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

// ---------- 5. Reveal on scroll + disparadores ----------
const revealEls = document.querySelectorAll('.feature, .news-card, .stat, .two-col, .final, .section-lead, .chart-card');
revealEls.forEach((el, i) => { el.classList.add('reveal'); el.style.transitionDelay = (i % 3) * 90 + 'ms'; });

const io = new IntersectionObserver((entries) => {
  entries.forEach((e) => {
    if (!e.isIntersecting) return;
    e.target.classList.add('in');
    e.target.querySelectorAll?.('.countup').forEach(countUp);
    e.target.querySelectorAll?.('.chart-line').forEach((p) => p.classList.add('draw'));
    io.unobserve(e.target);
  });
}, { threshold: 0.15 });
revealEls.forEach((el) => io.observe(el));

// ---------- 5b. Tilt 3D por giroscopio (móviles/tablets) ----------
function enableGyro() {
  if (reduce) return;
  const tiltEls = [document.getElementById('dashTilt'), ...document.querySelectorAll('.tilt-card')].filter(Boolean);
  if (!tiltEls.length) return;
  let baseBeta = null, baseGamma = null;
  window.addEventListener('deviceorientation', (e) => {
    if (e.beta == null || e.gamma == null) return;
    if (baseBeta === null) { baseBeta = e.beta; baseGamma = e.gamma; }
    const clamp = (v) => Math.max(-18, Math.min(18, v));
    const dB = clamp(e.beta - baseBeta);   // inclinación adelante/atrás
    const dG = clamp(e.gamma - baseGamma); // inclinación izquierda/derecha
    const rx = (-dB / 18) * 6;
    const ry = (dG / 18) * 8;
    tiltEls.forEach((el) => { el.style.transform = `perspective(1000px) rotateX(${rx}deg) rotateY(${ry}deg)`; });
  }, true);
}
if (!reduce && window.matchMedia('(hover: none)').matches && 'DeviceOrientationEvent' in window) {
  const DOE = window.DeviceOrientationEvent;
  if (typeof DOE.requestPermission === 'function') {
    // iOS 13+: requiere gesto del usuario para pedir permiso
    const ask = () => {
      DOE.requestPermission().then((s) => { if (s === 'granted') enableGyro(); }).catch(() => {});
      window.removeEventListener('touchend', ask);
    };
    window.addEventListener('touchend', ask, { once: true });
  } else {
    enableGyro();
  }
}

// ---------- 6. Parallax suave en monedas del hero ----------
if (!reduce) {
  const coins = document.querySelectorAll('.coin-float');
  window.addEventListener('scroll', () => {
    const y = window.scrollY;
    coins.forEach((c, i) => { c.style.marginTop = (y * (0.06 + i * 0.02)) + 'px'; });
  }, { passive: true });
}

// ============================================================
//  TASAS EN VIVO — ve.dolarapi.com (sin backend, CORS abierto)
// ============================================================
const RATES = {
  dolares: 'https://ve.dolarapi.com/v1/dolares',
  euros: 'https://ve.dolarapi.com/v1/euros',
};
const REFRESH_MS = 5 * 60 * 1000; // 5 minutos
let prevRates = null;             // para calcular ▲/▼ entre refrescos
// Tasas actuales (Bs por unidad). Arrancan con valores de respaldo y se actualizan en vivo.
const currentRates = { usdt: 745.18, usd: 667.05, eur: 763.19 };
const CUR_INFO = {
  usdt: { label: 'USDT', sym: '₮' },
  usd: { label: 'Dólar BCV', sym: '$' },
  eur: { label: 'Euro BCV', sym: '€' },
  bs: { label: 'Bolívares', sym: 'Bs' },
};

const fmtNum = (n, dec) => Number(n).toLocaleString('es-VE', { minimumFractionDigits: dec, maximumFractionDigits: dec });
const parseNum = (txt) => {
  const cleaned = String(txt).replace(/[^\d.,]/g, '').replace(/\./g, '').replace(',', '.');
  const v = parseFloat(cleaned);
  return isNaN(v) ? 0 : v;
};

function animateNumber(el, to, dec, suffix = '') {
  const from = parseNum(el.textContent);
  if (reduce || Math.abs(to - from) < 0.001) { el.textContent = fmtNum(to, dec) + suffix; return; }
  const dur = 900; let start = null;
  function tick(t) {
    if (start === null) start = t;
    const p = Math.min((t - start) / dur, 1);
    const eased = 1 - Math.pow(1 - p, 3);
    el.textContent = fmtNum(from + (to - from) * eased, dec) + suffix;
    if (p < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
  el.classList.remove('rate-flash'); void el.offsetWidth; el.classList.add('rate-flash');
}

function updateBadge(key, current) {
  const el = document.getElementById('badge-' + key);
  if (!el) return;
  const base = key === 'usd' || key === 'eur' ? 'Oficial' : 'P2P';
  if (!prevRates || prevRates[key] == null) { el.textContent = base; el.className = 'badge blue'; return; }
  const diff = ((current - prevRates[key]) / prevRates[key]) * 100;
  if (Math.abs(diff) < 0.01) { el.textContent = base; el.className = 'badge blue'; return; }
  const up = diff > 0;
  el.className = 'badge ' + (up ? 'green' : 'red');
  el.innerHTML = '<span class="arrow">' + (up ? '▲' : '▼') + '</span> ' + fmtNum(Math.abs(diff), 1) + '%';
}

function applyRates(r) {
  const gap = r.usd ? ((r.usdt - r.usd) / r.usd) * 100 : 0;
  const values = { usdt: r.usdt, usd: r.usd, eur: r.eur, gap };

  // Stat cards (contadores animados)
  ['usdt', 'usd', 'eur'].forEach((k) => {
    const el = document.getElementById('rate-' + k);
    if (el && values[k] != null) { el.dataset.to = values[k]; animateNumber(el, values[k], 2); }
    updateBadge(k, values[k]);
  });

  // Leyenda y ticker (cualquier [data-rate] que no sea stat card)
  document.querySelectorAll('[data-rate]').forEach((el) => {
    if (el.id && el.id.startsWith('rate-')) return; // ya tratado arriba
    const k = el.dataset.rate;
    if (values[k] == null) return;
    const dec = parseInt(el.dataset.dec || '2', 10);
    animateNumber(el, values[k], dec, el.dataset.suffix || '');
  });

  // Estado "en vivo"
  const status = document.getElementById('rates-status');
  if (status) {
    let hora = '';
    try {
      const d = r.fecha ? new Date(r.fecha) : new Date();
      hora = d.toLocaleString('es-VE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
    } catch (e) {}
    status.textContent = r.offline
      ? 'Últimas tasas conocidas · ' + hora
      : 'EN VIVO · actualizado ' + hora;
  }
  prevRates = values;

  // Actualizar tasas globales para el conversor / movimientos / Genio
  if (r.usdt != null) currentRates.usdt = r.usdt;
  if (r.usd != null) currentRates.usd = r.usd;
  if (r.eur != null) currentRates.eur = r.eur;
  if (typeof window.__onRatesUpdated === 'function') window.__onRatesUpdated();
}

async function fetchRates() {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 12000);
  try {
    const [dRes, eRes] = await Promise.all([
      fetch(RATES.dolares, { signal: ctrl.signal }),
      fetch(RATES.euros, { signal: ctrl.signal }),
    ]);
    clearTimeout(timer);
    const dolares = await dRes.json();
    const euros = await eRes.json();
    const oficial = dolares.find((x) => x.fuente === 'oficial');
    const paralelo = dolares.find((x) => x.fuente === 'paralelo');
    const euroOf = euros.find((x) => x.fuente === 'oficial');
    applyRates({
      usd: oficial?.promedio,
      usdt: paralelo?.promedio,
      eur: euroOf?.promedio,
      fecha: paralelo?.fechaActualizacion || oficial?.fechaActualizacion,
    });
  } catch (e) {
    clearTimeout(timer);
    // Fallback: dejamos los valores del HTML y avisamos
    const status = document.getElementById('rates-status');
    if (status && !prevRates) status.textContent = 'Tasas de referencia · sin conexión';
  }
}

// Arranque + auto-refresco
fetchRates();
setInterval(fetchRates, REFRESH_MS);
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') fetchRates(); });

// ---------- 7. Helper para screenshots: forzar estado final ----------
window.__revealAll = function () {
  document.querySelectorAll('.reveal').forEach((el) => { el.classList.add('in'); el.style.transitionDelay = '0ms'; });
  document.querySelectorAll('.countup').forEach((el) => {
    const dec = parseInt(el.dataset.dec || '0', 10);
    el.textContent = parseFloat(el.dataset.to).toLocaleString('es-VE', { minimumFractionDigits: dec, maximumFractionDigits: dec });
  });
  document.querySelectorAll('.chart-line').forEach((p) => { p.style.strokeDashoffset = '0'; p.style.animation = 'none'; });
};

// ============================================================
//  PWA — Service Worker + botón "Instalar app"
// ============================================================
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}

let deferredPrompt = null;
const installBtn = document.getElementById('installBtn');
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  if (installBtn) installBtn.style.display = 'inline-flex';
});
if (installBtn) {
  installBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
    installBtn.style.display = 'none';
  });
}
window.addEventListener('appinstalled', () => {
  if (installBtn) installBtn.style.display = 'none';
});

// ============================================================
//  TEMA CLARO / OSCURO
// ============================================================
const themeToggle = document.getElementById('themeToggle');
const getTheme = () => document.documentElement.getAttribute('data-theme') || 'dark';
function refreshThemeIcon() {
  if (themeToggle) themeToggle.textContent = getTheme() === 'light' ? '🌙' : '☀️';
}
function applyTheme(t) {
  document.documentElement.setAttribute('data-theme', t);
  try { localStorage.setItem('theme', t); } catch (e) {}
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', t === 'light' ? '#eef2f8' : '#05070d');
  refreshThemeIcon();
}
refreshThemeIcon();
themeToggle?.addEventListener('click', () => applyTheme(getTheme() === 'light' ? 'dark' : 'light'));

// ============================================================
//  APP INTERACTIVA — Panel · Conversor · Movimientos · Genio
// ============================================================
const rateOf = (c) => (c === 'bs' ? 1 : currentRates[c]);   // Bs por unidad
const toBs = (amount, c) => amount * rateOf(c);
const fromBs = (bs, c) => bs / rateOf(c);
const money = (n, dec = 2) => fmtNum(n, dec);

function parseUserNum(s) {
  const m = String(s).match(/-?\d[\d.,]*/);
  if (!m) return null;
  let t = m[0];
  if (t.includes(',')) { t = t.replace(/\./g, '').replace(',', '.'); }
  else {
    const parts = t.split('.');
    if (parts.length > 2) t = t.replace(/\./g, '');
    else if (parts.length === 2 && parts[1].length === 3) t = t.replace(/\./g, '');
  }
  const v = parseFloat(t);
  return isNaN(v) ? null : v;
}

// ---------- Navegación por vistas ----------
const VIEW_TITLES = {
  panel: '◈ Panel · Resumen del mercado',
  conversiones: '↺ Conversor de monedas',
  movimientos: '▤ Movimientos',
  genio: '✦ Genio · asistente',
  soon: '◫ Próximamente',
};
let genioSeeded = false;
function openView(name) {
  document.querySelectorAll('.dash-side .nav-item').forEach((n) => n.classList.toggle('active', n.dataset.view === name));
  document.querySelectorAll('.dash-main .view').forEach((v) => v.classList.toggle('active', v.dataset.view === name));
  const title = document.getElementById('app-title');
  if (title) title.textContent = VIEW_TITLES[name] || '';
  if (name === 'conversiones') renderConverter();
  if (name === 'movimientos') renderMovements();
  if (name === 'genio' && !genioSeeded) seedGenio();
}
document.querySelectorAll('.dash-side .nav-item').forEach((n) => {
  n.addEventListener('click', () => openView(n.dataset.view));
});
document.getElementById('app-refresh')?.addEventListener('click', () => { fetchRates(); });

// ---------- Conversor ----------
function renderConverter() {
  const amtEl = document.getElementById('conv-amount');
  const fromEl = document.getElementById('conv-from');
  const out = document.getElementById('conv-results');
  if (!amtEl || !fromEl || !out) return;
  const amount = parseFloat(amtEl.value) || 0;
  const from = fromEl.value;
  const bs = toBs(amount, from);
  const targets = ['usdt', 'usd', 'eur', 'bs'].filter((c) => c !== from);
  out.innerHTML = targets.map((c) => {
    const val = fromBs(bs, c);
    return `<div class="conv-row">
      <span class="cleft"><span class="coin ${c === 'bs' ? 'usd' : c}" style="width:22px;height:22px">${CUR_INFO[c].sym}</span>${CUR_INFO[c].label}</span>
      <span class="cval">${money(val, c === 'bs' ? 2 : 2)} <small>${c === 'bs' ? 'Bs' : ''}</small></span>
    </div>`;
  }).join('');
  const basis = document.getElementById('conv-basis');
  if (basis) basis.textContent = `1 USDT = ${money(currentRates.usdt)} Bs · 1 $ = ${money(currentRates.usd)} Bs · 1 € = ${money(currentRates.eur)} Bs`;
}
document.getElementById('conv-amount')?.addEventListener('input', renderConverter);
document.getElementById('conv-from')?.addEventListener('change', renderConverter);

// ---------- Movimientos ----------
const MOV_KEY = 'bovedacuki_mov_v1';
const loadMov = () => { try { return JSON.parse(localStorage.getItem(MOV_KEY)) || []; } catch (e) { return []; } };
const saveMov = (a) => { try { localStorage.setItem(MOV_KEY, JSON.stringify(a)); } catch (e) {} };

function renderMovements() {
  const list = document.getElementById('mov-list');
  const summary = document.getElementById('mov-summary');
  if (!list || !summary) return;
  const items = loadMov().sort((a, b) => b.ts - a.ts);
  let netBs = 0;
  items.forEach((m) => { netBs += (m.type === 'ingreso' ? 1 : -1) * toBs(m.amount, m.cur); });
  const netUsdt = fromBs(netBs, 'usdt');
  summary.innerHTML = `
    <div class="mov-card"><div class="k">Balance (Bs)</div><div class="v ${netBs >= 0 ? 'pos' : 'neg'}">${money(netBs)}</div></div>
    <div class="mov-card"><div class="k">Equivale en USDT</div><div class="v">${money(netUsdt)} ₮</div></div>`;
  if (!items.length) { list.innerHTML = '<div class="mov-empty">Aún no hay movimientos. Agrega tu primer ingreso o gasto arriba. Se guardan en tu dispositivo.</div>'; return; }
  list.innerHTML = items.map((m) => `
    <div class="mov-item">
      <span class="dot ${m.type}"></span>
      <span class="mnote">${escapeHtml(m.note || (m.type === 'ingreso' ? 'Ingreso' : 'Gasto'))}<br/><span class="mdate">${m.dateLabel} · ${CUR_INFO[m.cur].label}</span></span>
      <span class="mamt ${m.type}">${m.type === 'ingreso' ? '+' : '−'}${money(m.amount)} ${m.cur === 'bs' ? 'Bs' : CUR_INFO[m.cur].sym}</span>
      <button class="mdel" data-id="${m.ts}" title="Eliminar">✕</button>
    </div>`).join('');
  list.querySelectorAll('.mdel').forEach((b) => b.addEventListener('click', () => {
    saveMov(loadMov().filter((x) => String(x.ts) !== b.dataset.id));
    renderMovements();
  }));
}
function escapeHtml(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }

document.getElementById('mov-form')?.addEventListener('submit', (e) => {
  e.preventDefault();
  const amount = parseFloat(document.getElementById('mov-amount').value);
  if (!amount || amount <= 0) return;
  const now = new Date();
  const item = {
    ts: now.getTime(),
    type: document.getElementById('mov-type').value,
    amount,
    cur: document.getElementById('mov-cur').value,
    note: document.getElementById('mov-note').value.trim(),
    dateLabel: now.toLocaleDateString('es-VE', { day: '2-digit', month: 'short' }),
  };
  const arr = loadMov(); arr.push(item); saveMov(arr);
  e.target.reset();
  renderMovements();
});

// ---------- Genio (asistente por reglas + tasas en vivo) ----------
function detectCurrencies(t) {
  const pats = [
    ['usdt', /usdt|tether/],
    ['eur', /euro|€/],
    ['usd', /d[oó]lar|dolares|dólares|\busd\b|\$|bcv/],
    ['bs', /bol[ií]var|bol[ií]vares|\bbs\b|\bbss\b/],
  ];
  const hits = [];
  pats.forEach(([cur, re]) => { const m = t.match(re); if (m) hits.push([cur, m.index]); });
  hits.sort((a, b) => a[1] - b[1]);
  return hits.map((h) => h[0]);
}
function genioReply(text) {
  const t = ' ' + text.toLowerCase() + ' ';
  const num = parseUserNum(text);
  const curs = detectCurrencies(t);
  const g = ((currentRates.usdt - currentRates.usd) / currentRates.usd) * 100;

  if (/brecha/.test(t)) {
    return `La <b>brecha</b> entre el USDT (${money(currentRates.usdt)} Bs) y el dólar BCV (${money(currentRates.usd)} Bs) es de <b>${money(g, 1)}%</b>. Es lo que el mercado paga por encima de la tasa oficial.`;
  }
  if (/(pierdo|p[eé]rdida|conviene|desventaja)/.test(t) || (/bcv/.test(t) && /cobr|recib|pag/.test(t))) {
    const dif = currentRates.usdt - currentRates.usd;
    const pct = (dif / currentRates.usdt) * 100;
    return `Cobrando a <b>tasa BCV</b> recibes <b>${money(currentRates.usd)} Bs</b> por dólar, pero el mercado (USDT) paga <b>${money(currentRates.usdt)} Bs</b>. Pierdes <b>${money(dif)} Bs por dólar</b> (~<b>${money(pct, 1)}%</b>). En $100 son ~<b>${money(dif * 100)} Bs</b> menos.`;
  }
  if (/inflaci[oó]n/.test(t)) {
    return `La <b>inflación</b> de mayo 2026 fue de <b>524,5%</b> interanual (bajó desde 611,9% en abril). Proyección de cierre 2026: ~<b>174%</b>. Por eso muchos ahorran en USDT.`;
  }
  if (/remesa/.test(t)) {
    return `Las <b>remesas</b> a Venezuela se estabilizaron en ~<b>USD 3.200 millones</b> (2023–2025), un soporte clave del consumo de los hogares.`;
  }
  if (num != null && curs.length >= 1) {
    const from = curs[0];
    const targets = curs[1] ? [curs[1]] : (from === 'bs' ? ['usdt', 'usd', 'eur'] : ['bs']);
    const bs = toBs(num, from);
    const lines = targets.map((c) => `<b>${money(num)} ${CUR_INFO[from].label}</b> = <b>${money(fromBs(bs, c))} ${CUR_INFO[c].label === 'Bolívares' ? 'Bs' : CUR_INFO[c].label}</b>`);
    return lines.join('<br/>');
  }
  if (curs.length >= 1 && (/(c[oó]mo est|precio|vale|tasa|cu[aá]nto)/.test(t) || curs.length)) {
    const lines = curs.map((c) => c === 'bs' ? null : `1 ${CUR_INFO[c].label} = <b>${money(currentRates[c])} Bs</b>`).filter(Boolean);
    if (lines.length) return lines.join('<br/>');
  }
  if (/(tasa|precio|c[oó]mo est|mercado)/.test(t)) {
    return `Tasas de hoy:<br/>USDT/Paralelo = <b>${money(currentRates.usdt)} Bs</b><br/>Dólar BCV = <b>${money(currentRates.usd)} Bs</b><br/>Euro BCV = <b>${money(currentRates.eur)} Bs</b>`;
  }
  return `Puedo ayudarte con:<br/>• <b>Convertir</b> (ej. "¿cuánto es 50 USDT en Bs?")<br/>• <b>Tasas</b> del día (dólar, euro, USDT)<br/>• La <b>brecha</b> USDT/BCV<br/>• <b>Cuánto pierdes</b> cobrando a tasa BCV<br/>• Datos de <b>inflación</b> y <b>remesas</b>`;
}
function addMsg(content, who) {
  const thread = document.getElementById('chat-thread');
  if (!thread) return;
  const d = document.createElement('div');
  d.className = 'msg ' + who;
  if (who === 'me') d.textContent = content; else d.innerHTML = content;
  thread.appendChild(d);
  thread.scrollTop = thread.scrollHeight;
}
function seedGenio() {
  genioSeeded = true;
  addMsg('¡Hola! Soy <b>Genio</b> 👋 Pregúntame sobre tasas, conversiones o tu dinero en Venezuela.', 'bot');
  const chips = ['¿A cómo está el dólar?', '¿Cuánto es 50 USDT en Bs?', '¿Cuánto pierdo a tasa BCV?', '¿Cuál es la brecha?'];
  const box = document.getElementById('chat-suggest');
  if (box) box.innerHTML = chips.map((c) => `<span class="chat-chip">${c}</span>`).join('');
  box?.querySelectorAll('.chat-chip').forEach((ch) => ch.addEventListener('click', () => sendGenio(ch.textContent)));
}
function sendGenio(text) {
  if (!text || !text.trim()) return;
  addMsg(text, 'me');
  setTimeout(() => addMsg(genioReply(text), 'bot'), 250);
}
document.getElementById('chat-form')?.addEventListener('submit', (e) => {
  e.preventDefault();
  const input = document.getElementById('chat-input');
  sendGenio(input.value);
  input.value = '';
});

// El botón "Preguntar" de la sección promocional lleva al Genio funcional
document.querySelectorAll('.chat-art .ask, .chat-art .bubble-input').forEach((el) => {
  el.addEventListener('click', () => {
    document.getElementById('tasas')?.scrollIntoView({ behavior: 'smooth' });
    openView('genio');
  });
});

// Cuando llegan tasas nuevas, refrescar vistas activas
window.__onRatesUpdated = function () {
  if (document.querySelector('.view[data-view="conversiones"].active')) renderConverter();
  if (document.querySelector('.view[data-view="movimientos"].active')) renderMovements();
};

// ---------- Aviso de instalación para iPhone ----------
(function iosInstallHint() {
  const el = document.getElementById('iosInstall');
  if (!el) return;
  const ua = navigator.userAgent || '';
  const isIOS = /iphone|ipad|ipod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const standalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  let dismissed = false;
  try { dismissed = localStorage.getItem('iosHintDismissed') === '1'; } catch (e) {}
  if (isIOS && !standalone && !dismissed) {
    setTimeout(() => { el.hidden = false; }, 1500);
  }
  document.getElementById('iosClose')?.addEventListener('click', () => {
    el.hidden = true;
    try { localStorage.setItem('iosHintDismissed', '1'); } catch (e) {}
  });
})();
