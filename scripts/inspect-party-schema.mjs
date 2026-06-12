// Inspecciona el esquema real de las tablas de Watch Party en la BD viva.
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';

const env = Object.fromEntries(
    readFileSync('.env.local', 'utf8')
        .split('\n')
        .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
        .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()])
);

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

for (const table of ['parties', 'party_members', 'party_messages']) {
    const { data, error } = await supabase.from(table).select('*').limit(1);
    if (error) {
        console.log(`${table}: ERROR — ${error.message}`);
        continue;
    }
    if (data.length > 0) {
        console.log(`${table}: columnas =`, Object.keys(data[0]).join(', '));
    } else {
        // Tabla vacía: insertar es intrusivo; al menos confirmamos que existe.
        console.log(`${table}: existe (vacía — columnas no inferibles desde REST)`);
    }
}
