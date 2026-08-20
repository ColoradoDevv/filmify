/**
 * Auditoría de los huecos publicitarios.
 *
 * Comprueba, a lo largo de trece anchos de pantalla, que ningún anuncio se
 * desborda, que ninguno queda tapado por la UI flotante del sitio y que un
 * creativo hostil no puede tocar la página. Los tres son fallos que ya han
 * ocurrido en producción.
 *
 * Requisitos:
 *   npm i -D playwright
 *   npm run dev                          (en otra terminal)
 *   node scripts/ads/mock-network.mjs    (en otra terminal)
 *   node scripts/ads/audit.mjs [ruta...]
 *
 * Sale con código 1 si alguna comprobación falla.
 */
import { chromium } from 'playwright';
import fs from 'node:fs';

const SP = new URL('.', import.meta.url).pathname;
const BASE = 'http://localhost:3000';
const setMode = (m) => fs.writeFileSync(`${SP}/mode.txt`, m);

const WIDTHS = [320, 360, 375, 390, 414, 600, 768, 820, 1024, 1100, 1280, 1440, 1920];
const ROUTES = process.argv.slice(2).length ? process.argv.slice(2) : ['/about', '/watch-party'];

let pass = 0;
const fails = [];
const ok  = (msg) => { pass++; };
const bad = (msg) => { fails.push(msg); };

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium',
  args: [
    '--host-resolver-rules=MAP www.highperformanceformat.com 127.0.0.1:8443,MAP pl29700108.effectivecpmnetwork.com 127.0.0.1:8443',
    '--ignore-certificate-errors',
    '--no-proxy-server',
  ],
});

async function newPage(width, height = 900) {
  const ctx = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: 1,
    isMobile: width < 768,
    hasTouch: width < 768,
    ignoreHTTPSErrors: true,
  });
  await ctx.addInitScript(() => {
    localStorage.setItem('cookie_consent', JSON.stringify({ analytics: true, marketing: true }));
  });
  const page = await ctx.newPage();
  return { ctx, page };
}

/** Recoge geometría de anuncios, overflow de página y solapes con elementos fijos. */
const AUDIT = () => {
  const round = (n) => Math.round(n * 100) / 100;
  const vw = document.documentElement.clientWidth;

  const overflow = round(document.documentElement.scrollWidth - vw);

  const fixed = [...document.querySelectorAll('body *')].filter((el) => {
    const cs = getComputedStyle(el);
    if (cs.position !== 'fixed' && cs.position !== 'sticky') return false;
    if (cs.visibility === 'hidden' || cs.display === 'none' || cs.opacity === '0') return false;
    if (cs.pointerEvents === 'none') return false;
    const r = el.getBoundingClientRect();
    return r.width > 8 && r.height > 8;
  });

  const ads = [...document.querySelectorAll('iframe[title="Publicidad"]')].map((frame) => {
    const wrapper = frame.parentElement;
    const slotHost = wrapper.parentElement;
    const container = slotHost.parentElement;
    const fr = frame.getBoundingClientRect();
    const wr = wrapper.getBoundingClientRect();
    const cr = container.getBoundingClientRect();

    let creative = null;
    try {
      const el = frame.contentDocument?.querySelector('body > div');
      if (el) {
        const r = el.getBoundingClientRect();
        creative = { w: round(r.width), h: round(r.height) };
      }
    } catch { /* opaco */ }

    const overlaps = fixed
      .map((el) => {
        const r = el.getBoundingClientRect();
        const ix = Math.min(fr.right, r.right) - Math.max(fr.left, r.left);
        const iy = Math.min(fr.bottom, r.bottom) - Math.max(fr.top, r.top);
        if (ix <= 1 || iy <= 1) return null;
        return {
          area: round(ix * iy),
          what: (el.getAttribute('aria-label') || el.className || el.tagName).toString().slice(0, 60),
        };
      })
      .filter(Boolean);

    return {
      slot: slotHost.parentElement?.dataset?.slot || container?.dataset?.slot || '?',
      declared: `${frame.getAttribute('width')}x${frame.getAttribute('height')}`,
      frame: { l: round(fr.left), r: round(fr.right), w: round(fr.width), h: round(fr.height) },
      wrapper: { l: round(wr.left), r: round(wr.right), w: round(wr.width) },
      container: { l: round(cr.left), r: round(cr.right), w: round(cr.width) },
      creative,
      overlaps,
    };
  });

  return { vw, overflow, ads, fixedCount: fixed.length };
};

// ─────────────────────────────── 1. Geometría ────────────────────────────────
console.log('\n═══ 1. DESBORDAMIENTO Y ENCAJE (creativo normal) ═══\n');
setMode('normal');

for (const route of ROUTES) {
  for (const width of WIDTHS) {
    const { ctx, page } = await newPage(width);
    const res = await page.goto(BASE + route, { waitUntil: 'networkidle', timeout: 60000 }).catch(() => null);
    if (!res || res.status() >= 400) {
      console.log(`  ${route} @${width}px → HTTP ${res ? res.status() : 'sin respuesta'} (omitida)`);
      await ctx.close();
      continue;
    }
    await page.waitForTimeout(1200);

    // Recorre cada anuncio dejándolo centrado: un solape solo cuenta como
    // problema si ocurre cuando el anuncio está realmente a la vista.
    const nAds = await page.evaluate(() => document.querySelectorAll('iframe[title="Publicidad"]').length);
    for (let i = 0; i < nAds; i++) {
      await page.evaluate((idx) => {
        document.querySelectorAll('iframe[title="Publicidad"]')[idx]
          ?.scrollIntoView({ block: 'center', behavior: 'instant' });
      }, i);
      await page.waitForTimeout(250);
      const parcial = await page.evaluate(AUDIT);
      const ad = parcial.ads[i];
      if (ad) {
        for (const o of ad.overlaps) {
          bad(`${route} @${width}px [${ad.slot}/${ad.declared}] · SOLAPE con "${o.what}" (${o.area}px²) con el anuncio centrado`);
        }
      }
    }
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(200);

    const a = await page.evaluate(AUDIT);

    if (a.overflow > 1) bad(`${route} @${width}px · scroll horizontal de ${a.overflow}px`);
    else ok();

    for (const ad of a.ads) {
      const tag = `${route} @${width}px [${ad.slot}/${ad.declared}]`;
      if (ad.frame.l < -0.5 || ad.frame.r > a.vw + 0.5) bad(`${tag} · se sale del viewport (${ad.frame.l} → ${ad.frame.r}, vw ${a.vw})`);
      else ok();
      if (ad.frame.w > ad.container.w + 0.5) bad(`${tag} · más ancho que su contenedor (${ad.frame.w} > ${ad.container.w})`);
      else ok();
      if (ad.frame.l < ad.wrapper.l - 0.5 || ad.frame.r > ad.wrapper.r + 0.5) bad(`${tag} · se sale de su hueco`);
      else ok();
      ok();
    }

    const resumen = a.ads.length
      ? a.ads.map((x) => `${x.slot}:${x.declared}`).join(' ')
      : 'sin anuncios';
    const estado = a.overflow > 1 ? `⚠ overflow ${a.overflow}px` : 'ok';
    console.log(`  ${route.padEnd(18)} @${String(width).padStart(4)}px  ${estado.padEnd(18)} ${resumen}`);
    await ctx.close();
  }
}

// ──────────────────────── 2. Creativo sobredimensionado ──────────────────────
console.log('\n═══ 2. CREATIVO SOBREDIMENSIONADO (1600x800 en cada zona) ═══\n');
setMode('oversize');
for (const width of [320, 375, 768, 1280]) {
  const { ctx, page } = await newPage(width);
  await page.goto(BASE + ROUTES[0], { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(1500);
  const a = await page.evaluate(AUDIT);
  if (a.overflow > 1) bad(`sobredimensionado @${width}px · scroll horizontal de ${a.overflow}px`);
  else ok();
  const salidos = a.ads.filter((ad) => ad.frame.r > a.vw + 0.5);
  if (salidos.length) bad(`sobredimensionado @${width}px · ${salidos.length} anuncio(s) fuera del viewport`);
  else ok();
  console.log(`  @${String(width).padStart(4)}px  overflow=${a.overflow}px  anuncios=${a.ads.length}  recortados dentro del iframe: ${a.ads.every((x) => x.frame.w <= x.container.w + 0.5) ? 'sí' : 'NO'}`);
  await ctx.close();
}

// ──────────────────────────── 3. Creativo hostil ─────────────────────────────
console.log('\n═══ 3. CREATIVO HOSTIL (intenta secuestrar la página) ═══\n');
setMode('hostile');
for (const width of [375, 1280]) {
  const ctx = await browser.newContext({
    viewport: { width, height: 900 }, isMobile: width < 768, hasTouch: width < 768, ignoreHTTPSErrors: true,
  });
  await ctx.addInitScript(() => {
    localStorage.setItem('cookie_consent', JSON.stringify({ analytics: true, marketing: true }));
  });
  const page = await ctx.newPage();
  const popups = [];
  ctx.on('page', (p) => popups.push(p.url()));
  const intentos = [];
  page.on('console', (m) => { const t = m.text(); if (/BLOQUEADO|ABIERTO|ESCRITO|PUESTO|no-error/.test(t)) intentos.push(t); });

  await page.goto(BASE + ROUTES[0], { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(2000);

  const urlAntes = page.url();

  // Toques por toda la página, evitando enlaces reales para no confundir una
  // navegación legítima con un secuestro.
  const puntos = await page.evaluate(() => {
    const libres = [];
    for (let y = 100; y < window.innerHeight - 60; y += 90) {
      for (let x = 30; x < window.innerWidth - 30; x += 140) {
        const el = document.elementFromPoint(x, y);
        if (el && !el.closest('a,button,[role="button"],iframe')) libres.push([x, y]);
      }
    }
    return libres.slice(0, 12);
  });
  for (const [x, y] of puntos) {
    await page.mouse.click(x, y).catch(() => {});
    await page.waitForTimeout(120);
  }
  await page.waitForTimeout(1200);

  const urlDespues = page.url();
  const hijacked = await page.evaluate(() => document.body.getAttribute('data-hijacked'));
  const reporte = await page.evaluate(() => {
    const f = document.querySelector('iframe[title="Publicidad"]');
    try { return f?.contentDocument?.body?.textContent?.slice(0, 300) ?? '(sin acceso)'; } catch { return '(opaco)'; }
  });

  if (/evil\.example/.test(urlDespues)) bad(`hostil @${width}px · la página fue SECUESTRADA a ${urlDespues}`);
  else if (urlDespues !== urlAntes) bad(`hostil @${width}px · la página navegó a ${urlDespues} (revisar si fue un enlace real)`);
  else ok();
  if (popups.length) bad(`hostil @${width}px · abrió ${popups.length} pop-up(s): ${popups.join(', ')}`); else ok();
  if (hijacked) bad(`hostil @${width}px · el anuncio ESCRIBIÓ en el DOM de la página`); else ok();

  console.log(`  @${width}px`);
  console.log(`    URL antes/después : ${urlAntes === urlDespues ? 'sin cambios ✔' : '¡CAMBIÓ! ✘'}`);
  console.log(`    pop-ups abiertos  : ${popups.length}`);
  console.log(`    DOM del padre     : ${hijacked ? '¡ESCRITO! ✘' : 'intacto ✔'}`);
  console.log(`    lo que reportó el creativo desde dentro del iframe:`);
  console.log(`      ${reporte}`);
  await ctx.close();
}

await browser.close();
setMode('normal');

console.log('\n════════════════════════════════════════════');
console.log(`  Comprobaciones superadas: ${pass}`);
console.log(`  Fallos: ${fails.length}`);
fails.forEach((f) => console.log(`    ✘ ${f}`));
console.log('════════════════════════════════════════════\n');
process.exit(fails.length ? 1 : 0);
