// E2E del flujo de Watch Party contra el dev server local:
// dos usuarios reales → crear sala → unirse → playback → cambiar título
// (validación de disponibilidad) → chat → salir con traspaso de host.
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';

const env = Object.fromEntries(
    readFileSync('.env.local', 'utf8')
        .split('\n')
        .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
        .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()])
);

const URL_SB = env.NEXT_PUBLIC_SUPABASE_URL;
const REF = URL_SB.replace('https://', '').split('.')[0];
const APP = process.env.APP_URL || 'http://localhost:3001';

const admin = createClient(URL_SB, env.SUPABASE_SERVICE_ROLE_KEY);

let pass = 0, fail = 0;
const check = (name, cond, extra = '') => {
    if (cond) { pass++; console.log(`  ✅ ${name}`); }
    else { fail++; console.log(`  ❌ ${name} ${extra}`); }
};

// ── Crear (o reutilizar) dos usuarios de prueba confirmados ──
async function ensureUser(email, password, username) {
    const { data: created, error } = await admin.auth.admin.createUser({
        email, password, email_confirm: true,
    });
    let userId = created?.user?.id;
    if (error) {
        // Probablemente ya existe — buscarlo.
        const { data: list } = await admin.auth.admin.listUsers({ perPage: 1000 });
        userId = list?.users?.find(u => u.email === email)?.id;
        if (!userId) throw new Error(`No se pudo crear/encontrar ${email}: ${error.message}`);
        await admin.auth.admin.updateUserById(userId, { password, email_confirm: true });
    }
    // Asegurar perfil (FK para mensajes/uso de username).
    await admin.from('profiles').upsert({ id: userId, username }, { onConflict: 'id' });
    return userId;
}

// ── Sesión → cookie del helper @supabase/ssr ──
function toBase64Url(str) {
    return Buffer.from(str, 'utf8').toString('base64')
        .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
async function loginCookie(email, password) {
    const client = createClient(URL_SB, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (error || !data.session) throw new Error(`Login falló para ${email}: ${error?.message}`);
    const value = 'base64-' + toBase64Url(JSON.stringify(data.session));
    return `sb-${REF}-auth-token=${value}`;
}

async function api(cookie, path, method = 'GET', body) {
    const res = await fetch(`${APP}/api${path}`, {
        method,
        headers: { 'Content-Type': 'application/json', Cookie: cookie },
        body: body ? JSON.stringify(body) : undefined,
    });
    let json = null;
    try { json = await res.json(); } catch { /* sin cuerpo */ }
    return { status: res.status, json };
}

console.log('Preparando usuarios de prueba...');
const hostId = await ensureUser('wp-test-host@filmify.internal', 'TestWP-2026!a', 'wp_host_test');
const viewerId = await ensureUser('wp-test-viewer@filmify.internal', 'TestWP-2026!a', 'wp_viewer_test');
const hostCookie = await loginCookie('wp-test-host@filmify.internal', 'TestWP-2026!a');
const viewerCookie = await loginCookie('wp-test-viewer@filmify.internal', 'TestWP-2026!a');
console.log('Usuarios listos:', hostId.slice(0, 8), viewerId.slice(0, 8));

// Una película disponible real: tomar una del catálogo Vimeus vía la página
// (usamos un id conocido de la BD de pruebas anterior: Fight Club 550 puede no
// estar). Mejor: pedir al buscador del catálogo... no hay endpoint REST; usamos
// el catálogo de salas — simplemente probamos con un id y, si el cambio de
// media lo rechaza, probamos la validación negativa igualmente.

console.log('\n1) Crear sala (host)...');
const create = await api(hostCookie, '/watch-party', 'POST', {
    tmdb_id: 550, title: 'Test Movie', poster_path: null, media_type: 'movie',
    name: 'Sala E2E', is_private: false,
});
check('crear sala → 200', create.status === 200, `status=${create.status} ${JSON.stringify(create.json)}`);
const code = create.json?.party?.room_code;
check('room_code presente', !!code);
check('no expone hash de contraseña', !('password' in (create.json?.party ?? {})));

console.log('\n2) Unirse (espectador)...');
const join = await api(viewerCookie, `/watch-party/${code}`, 'POST', {});
check('join espectador → 200', join.status === 200, `status=${join.status} ${JSON.stringify(join.json)}`);

console.log('\n3) Playback: host inicia countdown...');
const playback = await api(hostCookie, `/watch-party/${code}`, 'PATCH', {
    action: 'playback',
    playback: { v: 1, phase: 'countdown', countdownEndsAt: Date.now() + 5000, seq: 1, at: Date.now(), by: hostId },
});
check('PATCH playback (host) → 200', playback.status === 200, JSON.stringify(playback.json));

const playbackViewer = await api(viewerCookie, `/watch-party/${code}`, 'PATCH', {
    action: 'playback',
    playback: { v: 1, phase: 'paused', seq: 9, at: Date.now(), by: viewerId },
});
check('PATCH playback (espectador) → 403', playbackViewer.status === 403, `status=${playbackViewer.status}`);

console.log('\n4) Estado persistido visible al re-entrar...');
const rejoin = await api(viewerCookie, `/watch-party/${code}`, 'POST', {});
const persisted = rejoin.json?.party?.embed_url;
check('embed_url contiene playback JSON', typeof persisted === 'string' && persisted.includes('"countdown"'), String(persisted));

console.log('\n5) Cambio de media con título NO disponible → 422...');
const badMedia = await api(hostCookie, `/watch-party/${code}`, 'PATCH', {
    action: 'media', tmdb_id: 999999999, title: 'No existe', poster_path: null, media_type: 'movie',
});
check('media no disponible rechazado', badMedia.status === 422 || badMedia.status === 400, `status=${badMedia.status} ${JSON.stringify(badMedia.json)}`);

console.log('\n6) Chat...');
const msg = await api(viewerCookie, `/watch-party/${code}/message`, 'POST', { text: 'Hola desde el E2E 🎬' });
check('mensaje espectador → 200', msg.status === 200, JSON.stringify(msg.json));
const msgOutsider = await api(hostCookie, `/watch-party/NOEXIST/message`, 'POST', { text: 'x' });
check('mensaje a sala inexistente → 404', msgOutsider.status === 404, `status=${msgOutsider.status}`);

console.log('\n7) Heartbeat...');
const hb = await api(viewerCookie, `/watch-party/${code}/heartbeat`, 'POST');
check('heartbeat → 200', hb.status === 200);

console.log('\n8) Claim host con host vivo → 409...');
const claim = await api(viewerCookie, `/watch-party/${code}/claim-host`, 'POST');
check('claim rechazado (host vivo)', claim.status === 409, `status=${claim.status} ${JSON.stringify(claim.json)}`);

console.log('\n9) Host sale → traspaso al espectador...');
const leave = await api(hostCookie, `/watch-party/${code}`, 'DELETE');
check('host leave → 200', leave.status === 200);
check('traspaso: newHostId = espectador', leave.json?.newHostId === viewerId, JSON.stringify(leave.json));

console.log('\n10) Último miembro sale → sala finished...');
await api(viewerCookie, `/watch-party/${code}`, 'DELETE');
const { data: finalParty } = await admin.from('parties').select('status, host_id').eq('room_code', code).single();
check('sala finished al vaciarse', finalParty?.status === 'finished', JSON.stringify(finalParty));

// Limpieza
const { data: p } = await admin.from('parties').select('id').eq('room_code', code).single();
if (p) await admin.from('parties').delete().eq('id', p.id);

console.log(`\n── TOTAL: ${pass} ✅  ${fail} ❌ ──`);
process.exit(fail === 0 ? 0 : 1);
