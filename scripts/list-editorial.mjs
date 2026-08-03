// Lista los artículos actuales de editorial_articles (diagnóstico previo a la limpieza).
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';

const env = Object.fromEntries(
    readFileSync('.env.local', 'utf8')
        .split('\n')
        .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
        .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()])
);

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const { data, error } = await supabase
    .from('editorial_articles')
    .select('id, slug, title, status, published_at, author_name')
    .order('created_at', { ascending: false });

if (error) { console.error('ERROR:', error.message); process.exit(1); }
console.log(`Total artículos en BD: ${data.length}`);
for (const a of data) console.log(`- [${a.status}] ${a.slug} | ${a.title} | ${a.author_name} | ${a.published_at}`);
