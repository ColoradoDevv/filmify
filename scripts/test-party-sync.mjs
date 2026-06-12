// Prueba E2E de la capa de sincronización de Watch Party:
// dos clientes (host y espectador) en el mismo canal broadcast+presence.
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';

const env = Object.fromEntries(
    readFileSync('.env.local', 'utf8')
        .split('\n')
        .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
        .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()])
);

const URL = env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY; // misma clave que usa el navegador

const host = createClient(URL, KEY);
const viewer = createClient(URL, KEY);

const CHANNEL = 'wp:test-' + Math.random().toString(36).slice(2, 8);
let viewerGotPlayback = false;
let viewerGotReaction = false;
let hostSawViewerPresence = false;

// ── Espectador ──
const viewerCh = viewer.channel(CHANNEL, {
    config: { broadcast: { self: false }, presence: { key: 'viewer-1' } },
});
viewerCh
    .on('broadcast', { event: 'playback' }, (msg) => {
        console.log('[viewer] playback recibido:', JSON.stringify(msg.payload));
        viewerGotPlayback = true;
    })
    .on('broadcast', { event: 'reaction' }, (msg) => {
        console.log('[viewer] reaction recibida:', JSON.stringify(msg.payload));
        viewerGotReaction = true;
    })
    .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
            await viewerCh.track({ user_id: 'viewer-1', username: 'Espectador' });
            console.log('[viewer] suscrito y trackeado');
        }
    });

// ── Host ──
const hostCh = host.channel(CHANNEL, {
    config: { broadcast: { self: false }, presence: { key: 'host-1' } },
});
hostCh
    .on('presence', { event: 'sync' }, () => {
        const state = hostCh.presenceState();
        const keys = Object.keys(state);
        console.log('[host] presence sync:', keys.join(', '));
        if (keys.includes('viewer-1')) hostSawViewerPresence = true;
    })
    .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
            await hostCh.track({ user_id: 'host-1', username: 'Host' });
            console.log('[host] suscrito y trackeado');
        }
    });

// Esperar suscripciones, luego emitir como host.
await new Promise(r => setTimeout(r, 3500));
console.log('[host] emitiendo playback countdown...');
hostCh.send({
    type: 'broadcast', event: 'playback',
    payload: { v: 1, phase: 'countdown', countdownEndsAt: Date.now() + 5000, seq: 1, at: Date.now(), by: 'host-1' },
});
hostCh.send({ type: 'broadcast', event: 'reaction', payload: { emoji: '🔥', username: 'Host' } });

await new Promise(r => setTimeout(r, 3500));

console.log('\n── RESULTADOS ──');
console.log('Broadcast playback host→viewer:', viewerGotPlayback ? 'FUNCIONA ✅' : 'FALLÓ ❌');
console.log('Broadcast reaction host→viewer:', viewerGotReaction ? 'FUNCIONA ✅' : 'FALLÓ ❌');
console.log('Presence (host ve al viewer):  ', hostSawViewerPresence ? 'FUNCIONA ✅' : 'FALLÓ ❌');

await host.removeChannel(hostCh);
await viewer.removeChannel(viewerCh);
process.exit(viewerGotPlayback && viewerGotReaction && hostSawViewerPresence ? 0 : 1);
