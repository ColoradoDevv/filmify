/**
 * Red publicitaria simulada para `audit.mjs`.
 *
 * Sirve por HTTPS los `invoke.js` que pediría Adsterra, en tres modos
 * (`mode.txt`): `normal`, `oversize` y `hostile`. Permite auditar el
 * comportamiento del sitio sin depender de la red real ni de qué creativo
 * toque ese día — incluido el caso que de verdad importa: un creativo que
 * intenta secuestrar la página.
 *
 *   node scripts/ads/mock-network.mjs
 */
import https from 'node:https';
import fs from 'node:fs';
import { execSync } from 'node:child_process';

// Certificado y modo viven junto a este script.
const DIR = new URL('.', import.meta.url).pathname;
const mode = () => { try { return fs.readFileSync(`${DIR}/mode.txt`, 'utf8').trim(); } catch { return 'normal'; } };

// Creativo bien portado, del tamaño declarado.
const normalJs = `(function(){
  var o = window.atOptions || {width:300,height:250};
  var small = o.height < 70;
  var d = document.createElement('div');
  d.setAttribute('style','width:'+o.width+'px;height:'+o.height+'px;box-sizing:border-box;overflow:hidden;'+
    'display:flex;align-items:center;gap:10px;padding:0 12px;font-family:system-ui,sans-serif;color:#fff;'+
    'background:linear-gradient(115deg,#3730a3,#0369a1);border-radius:4px');
  d.innerHTML = '<div style="width:'+(small?34:56)+'px;height:'+(small?34:56)+'px;border-radius:6px;background:rgba(255,255,255,.18);flex:none"></div>'+
    '<div style="min-width:0;flex:1"><div style="font-weight:700;font-size:'+(small?13:16)+'px">Anuncio del anunciante</div>'+
    '<div style="opacity:.8;font-size:'+(small?10:12)+'px;margin-top:2px">'+o.width+' × '+o.height+' · patrocinado</div></div>';
  document.body.appendChild(d);
})();`;

// Creativo que devuelve MUCHO más de lo declarado.
const oversizeJs = `(function(){
  var d = document.createElement('div');
  d.setAttribute('style','width:1600px;height:800px;background:repeating-linear-gradient(45deg,#b91c1c,#b91c1c 20px,#7f1d1d 20px,#7f1d1d 40px)');
  d.textContent = 'CREATIVO SOBREDIMENSIONADO 1600x800';
  document.body.appendChild(d);
  document.body.style.width = '1600px';
  document.documentElement.style.width = '1600px';
})();`;

// Creativo hostil: intenta exactamente lo que rompió el móvil en junio.
const hostileJs = `(function(){
  var log = [];
  try { top.location.href = 'https://evil.example/hijack'; log.push('top.location:no-error'); }
  catch (e) { log.push('top.location:BLOQUEADO'); }
  try { window.top.location.replace('https://evil.example/hijack2'); log.push('top.replace:no-error'); }
  catch (e) { log.push('top.replace:BLOQUEADO'); }
  try { var w = window.open('https://evil.example/popup','_blank'); log.push('window.open:' + (w ? 'ABIERTO' : 'null')); }
  catch (e) { log.push('window.open:BLOQUEADO'); }
  try {
    parent.document.body.setAttribute('data-hijacked','si');
    log.push('parent.dom:ESCRITO');
  } catch (e) { log.push('parent.dom:BLOQUEADO'); }
  try {
    parent.document.addEventListener('click', function(){ parent.location.href = 'https://evil.example/click'; }, true);
    log.push('parent.listener:PUESTO');
  } catch (e) { log.push('parent.listener:BLOQUEADO'); }
  try { document.cookie = 'adhijack=1'; } catch (e) {}
  var d = document.createElement('div');
  d.setAttribute('style','width:100%;height:100%;background:#7f1d1d;color:#fff;font:11px system-ui');
  d.textContent = log.join(' | ');
  document.body.appendChild(d);
  try { parent.postMessage({ adTest: log }, '*'); } catch (e) {}
})();`;

const bodies = { normal: normalJs, oversize: oversizeJs, hostile: hostileJs };

// Certificado autofirmado: el navegador de la auditoría arranca con
// --ignore-certificate-errors, así que sirve cualquiera.
if (!fs.existsSync(`${DIR}/cert.pem`)) {
  execSync(`openssl req -x509 -newkey rsa:2048 -keyout ${DIR}/key.pem -out ${DIR}/cert.pem -days 30 -nodes -subj "/CN=localhost"`, { stdio: 'ignore' });
}

https.createServer(
  { key: fs.readFileSync(`${DIR}/key.pem`), cert: fs.readFileSync(`${DIR}/cert.pem`) },
  (_req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/javascript', 'Access-Control-Allow-Origin': '*' });
    res.end(bodies[mode()] ?? normalJs);
  },
).listen(8443, () => console.log('mock ad server on 8443'));
