// Prueba empírica de capacidades de la BD viva para Watch Party.
// Inserta filas de prueba (y las borra) para detectar columnas, constraints
// y si Realtime emite eventos en party_messages.
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';

const env = Object.fromEntries(
    readFileSync('.env.local', 'utf8')
        .split('\n')
        .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
        .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()])
);

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    realtime: { params: { eventsPerSecond: 10 } },
});

// Un usuario real cualquiera para FKs (host_id referencia auth.users).
const { data: users } = await supabase.auth.admin.listUsers({ perPage: 1 });
const testUser = users?.users?.[0]?.id;
if (!testUser) { console.log('No hay usuarios en auth.users — abortando'); process.exit(1); }
console.log('Usuario de prueba:', testUser);

// 1) Insert completo en parties con todas las columnas que asume el código.
const full = {
    tmdb_id: 550, title: '__test__', poster_path: null, host_id: testUser,
    status: 'waiting', name: '__test__', is_private: true, password: null,
    room_code: 'TST' + Math.random().toString(36).slice(2, 5).toUpperCase(),
    media_type: 'movie', season: null, episode: null,
    imdb_id: null, player_mode: 'movie', embed_url: null,
};
let { data: party, error: e1 } = await supabase.from('parties').insert(full).select().single();
if (e1) {
    console.log('INSERT completo FALLÓ:', e1.message);
    process.exit(1);
}
console.log('parties columnas reales:', Object.keys(party).join(', '));

// 2) ¿Acepta status=paused?
const { error: e2 } = await supabase.from('parties').update({ status: 'paused' }).eq('id', party.id);
console.log('status=paused:', e2 ? `RECHAZADO (${e2.message})` : 'ACEPTADO');

// 3) ¿Acepta status=counting?
const { error: e3 } = await supabase.from('parties').update({ status: 'counting' }).eq('id', party.id);
console.log('status=counting:', e3 ? `RECHAZADO (${e3.message})` : 'ACEPTADO');

// 4) party_members: insert + update (heartbeat) con columnas asumidas.
const { data: member, error: e4 } = await supabase.from('party_members')
    .insert({ party_id: party.id, user_id: testUser, is_ready: false, online_at: new Date().toISOString() })
    .select().single();
console.log('party_members insert:', e4 ? `FALLÓ (${e4.message})` : `OK — columnas: ${Object.keys(member ?? {}).join(', ')}`);

// 5) party_messages: insert user + system, y Realtime.
let realtimeReceived = false;
const channel = supabase
    .channel('test-msgs')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'party_messages', filter: `party_id=eq.${party.id}` },
        () => { realtimeReceived = true; })
    .subscribe();

await new Promise(r => setTimeout(r, 2500)); // esperar suscripción

const { data: msg, error: e5 } = await supabase.from('party_messages')
    .insert({ party_id: party.id, user_id: testUser, text: '__test__', type: 'system', reply_to_id: null, reply_preview: null, reply_username: null })
    .select().single();
console.log('party_messages insert (system):', e5 ? `FALLÓ (${e5.message})` : `OK — columnas: ${Object.keys(msg ?? {}).join(', ')}`);

await new Promise(r => setTimeout(r, 3000)); // esperar evento realtime
console.log('Realtime party_messages:', realtimeReceived ? 'FUNCIONA' : 'NO llegó evento (posible falta en publicación)');
await supabase.removeChannel(channel);

// 6) Realtime en parties (UPDATE) — el room ya depende de esto.
let partyRt = false;
const ch2 = supabase
    .channel('test-party')
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'parties', filter: `id=eq.${party.id}` },
        () => { partyRt = true; })
    .subscribe();
await new Promise(r => setTimeout(r, 2000));
await supabase.from('parties').update({ name: '__test2__' }).eq('id', party.id);
await new Promise(r => setTimeout(r, 3000));
console.log('Realtime parties UPDATE:', partyRt ? 'FUNCIONA' : 'NO llegó evento');
await supabase.removeChannel(ch2);

// Limpieza
await supabase.from('parties').delete().eq('id', party.id);
console.log('Fila de prueba eliminada. Listo.');
process.exit(0);
