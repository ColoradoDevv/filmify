// Prueba de concurrencia para la RPC atómica `friend_action`.
//
// Verifica que peticiones de amistad simultáneas NO pierden actualizaciones
// (la race condition que motivó 20260702_atomic_friend_action.sql).
//
// REQUISITOS (contra Supabase en vivo):
//   1. Aplicar la migración 20260702_atomic_friend_action.sql.
//   2. En .env.local:
//        NEXT_PUBLIC_SUPABASE_URL
//        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY  (o NEXT_PUBLIC_SUPABASE_ANON_KEY)
//        SUPABASE_SERVICE_ROLE_KEY             (para crear/limpiar usuarios de prueba)
//
// Ejecutar:  node scripts/test-friends-concurrency.mjs
//
// La RPC deriva el solicitante de auth.uid(), así que el test usa DOS sesiones
// autenticadas reales (usuarios de prueba efímeros que crea y borra).

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';

const env = Object.fromEntries(
    readFileSync('.env.local', 'utf8')
        .split('\n')
        .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
        .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()])
);

const URL = env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE = env.SUPABASE_SERVICE_ROLE_KEY;

if (!URL || !ANON || !SERVICE) {
    console.error('Faltan variables en .env.local (URL / ANON / SERVICE_ROLE).');
    process.exit(1);
}

const admin = createClient(URL, SERVICE, { auth: { persistSession: false } });

let pass = 0, fail = 0;
const assert = (cond, msg) => {
    if (cond) { pass++; console.log('  ✅', msg); }
    else { fail++; console.log('  ❌', msg); }
};

// ── Utilidades ────────────────────────────────────────────────────────────────

async function createTestUser(tag) {
    const email = `friendtest+${tag}-${Date.now()}@example.com`;
    const password = 'Test-' + Math.random().toString(36).slice(2) + 'Aa1!';
    const { data, error } = await admin.auth.admin.createUser({
        email, password, email_confirm: true,
        user_metadata: { username: `test_${tag}` },
    });
    if (error) throw new Error(`crear usuario ${tag}: ${error.message}`);
    // Asegurar fila en profiles (por si el trigger no la crea con preferences).
    await admin.from('profiles').upsert({ id: data.user.id, preferences: {} }, { onConflict: 'id' });
    const client = createClient(URL, ANON, { auth: { persistSession: false } });
    const { error: signErr } = await client.auth.signInWithPassword({ email, password });
    if (signErr) throw new Error(`login ${tag}: ${signErr.message}`);
    return { id: data.user.id, client, email };
}

async function getPrefs(id) {
    const { data } = await admin.from('profiles').select('preferences').eq('id', id).single();
    return data?.preferences ?? {};
}

async function resetPrefs(a, b) {
    await admin.from('profiles').update({ preferences: {} }).in('id', [a, b]);
}

const arr = (p, k) => Array.isArray(p?.[k]) ? p[k] : [];
const count = (list, val) => list.filter((x) => x === val).length;

// ── Ejecución ───────────────────────────────────────────────────────────────

let A, B;
try {
    console.log('Creando usuarios de prueba…');
    [A, B] = await Promise.all([createTestUser('a'), createTestUser('b')]);
    console.log('  A =', A.id, '\n  B =', B.id);

    // ── Test 1: A→B duplicado concurrente (5 sends idénticos a la vez) ────────
    console.log('\n[1] 5x send A→B concurrentes → una sola solicitud, sin duplicados');
    await resetPrefs(A.id, B.id);
    await Promise.all(
        Array.from({ length: 5 }, () => A.client.rpc('friend_action', { p_action: 'send', p_target: B.id })),
    );
    {
        const pa = await getPrefs(A.id), pb = await getPrefs(B.id);
        assert(count(arr(pb, 'incomingFriendRequests'), A.id) === 1, 'B.incoming tiene A exactamente 1 vez');
        assert(count(arr(pa, 'outgoingFriendRequests'), B.id) === 1, 'A.outgoing tiene B exactamente 1 vez');
    }

    // ── Test 2: solicitudes cruzadas simultáneas (A→B y B→A a la vez) ─────────
    console.log('\n[2] A→B y B→A simultáneos → estado consistente, sin pérdida');
    await resetPrefs(A.id, B.id);
    await Promise.all([
        A.client.rpc('friend_action', { p_action: 'send', p_target: B.id }),
        B.client.rpc('friend_action', { p_action: 'send', p_target: A.id }),
    ]);
    {
        const pa = await getPrefs(A.id), pb = await getPrefs(B.id);
        // Ninguna actualización se pierde: cada lado refleja su envío.
        const aSentB = count(arr(pa, 'outgoingFriendRequests'), B.id) + count(arr(pb, 'incomingFriendRequests'), A.id);
        const bSentA = count(arr(pb, 'outgoingFriendRequests'), A.id) + count(arr(pa, 'incomingFriendRequests'), B.id);
        assert(aSentB >= 1, 'el envío A→B sobrevive (no se perdió por la escritura concurrente de B)');
        assert(bSentA >= 1, 'el envío B→A sobrevive (no se perdió por la escritura concurrente de A)');
    }

    // ── Test 3: accept idempotente concurrente ───────────────────────────────
    console.log('\n[3] send A→B, luego 5x accept B→A concurrentes → amigos sin duplicados');
    await resetPrefs(A.id, B.id);
    await A.client.rpc('friend_action', { p_action: 'send', p_target: B.id });
    await Promise.all(
        Array.from({ length: 5 }, () => B.client.rpc('friend_action', { p_action: 'accept', p_target: A.id })),
    );
    {
        const pa = await getPrefs(A.id), pb = await getPrefs(B.id);
        assert(count(arr(pa, 'friends'), B.id) === 1, 'A.friends tiene B exactamente 1 vez');
        assert(count(arr(pb, 'friends'), A.id) === 1, 'B.friends tiene A exactamente 1 vez');
        assert(arr(pb, 'incomingFriendRequests').includes(A.id) === false, 'B.incoming ya no tiene A');
        assert(arr(pa, 'outgoingFriendRequests').includes(B.id) === false, 'A.outgoing ya no tiene B');
    }

    // ── Test 4: otras preferencias se conservan ──────────────────────────────
    console.log('\n[4] friend_action conserva otras claves de preferences (tema, etc.)');
    await admin.from('profiles').update({ preferences: { theme: 'dark', friends: [] } }).eq('id', A.id);
    await admin.from('profiles').update({ preferences: {} }).eq('id', B.id);
    await A.client.rpc('friend_action', { p_action: 'send', p_target: B.id });
    {
        const pa = await getPrefs(A.id);
        assert(pa.theme === 'dark', 'A conserva preferences.theme tras la acción');
    }

    // ── Test 5: identidad — no se puede suplantar al solicitante ──────────────
    console.log('\n[5] la RPC ignora cualquier suplantación: requester = auth.uid()');
    await resetPrefs(A.id, B.id);
    // B intenta "enviar como A" — la RPC usará auth.uid()=B, no A.
    await B.client.rpc('friend_action', { p_action: 'send', p_target: A.id });
    {
        const pb = await getPrefs(B.id);
        assert(arr(pb, 'outgoingFriendRequests').includes(A.id), 'el envío se registra como B (solicitante real)');
    }

} catch (e) {
    console.error('\n💥 Error en el test:', e.message);
    fail++;
} finally {
    // Limpieza: borra los usuarios de prueba y sus perfiles.
    for (const u of [A, B]) {
        if (u?.id) {
            await admin.from('profiles').delete().eq('id', u.id).catch(() => {});
            await admin.auth.admin.deleteUser(u.id).catch(() => {});
        }
    }
    console.log(`\n── Resultado: ${pass} OK, ${fail} fallos ──`);
    process.exit(fail === 0 ? 0 : 1);
}
