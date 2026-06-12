// Reemplaza el contenido de editorial_articles con el lote de junio 2026.
// - Resuelve portadas vía TMDB (backdrop real del título) con fallback Unsplash.
// - Elimina TODOS los artículos existentes (decisión explícita del propietario).
// - Inserta los nuevos con read_time calculado.
// Uso: node scripts/seed-editorial.mjs
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { ARTICLES_1 } from './editorial-content-1.mjs';
import { ARTICLES_2 } from './editorial-content-2.mjs';

const env = Object.fromEntries(
    readFileSync('.env.local', 'utf8')
        .split('\n')
        .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
        .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()])
);

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const TMDB_KEY = env.TMDB_API_KEY || env.NEXT_PUBLIC_TMDB_API_KEY;

async function resolveCover(cover) {
    for (const c of cover.candidates) {
        try {
            const yearParam = c.year
                ? (c.type === 'tv' ? `&first_air_date_year=${c.year}` : `&year=${c.year}`)
                : '';
            const url = `https://api.themoviedb.org/3/search/${c.type}?api_key=${TMDB_KEY}&query=${encodeURIComponent(c.query)}${yearParam}&include_adult=false`;
            const res = await fetch(url);
            if (!res.ok) continue;
            const json = await res.json();
            const hit = (json.results ?? []).find((r) => r.backdrop_path);
            if (hit) return `https://image.tmdb.org/t/p/w1280${hit.backdrop_path}`;
        } catch { /* siguiente candidato */ }
    }
    return cover.fallback;
}

const ALL = [...ARTICLES_1, ...ARTICLES_2];

// Sanidad: slugs únicos y un solo destacado.
const slugs = new Set(ALL.map((a) => a.slug));
if (slugs.size !== ALL.length) throw new Error('Slugs duplicados en el lote');
const featuredCount = ALL.filter((a) => a.featured).length;
if (featuredCount !== 1) throw new Error(`Debe haber exactamente 1 destacado (hay ${featuredCount})`);

console.log(`Lote: ${ALL.length} artículos. Resolviendo portadas TMDB...`);
const rows = [];
for (const a of ALL) {
    const cover_url = await resolveCover(a.cover);
    const words = a.content.trim().split(/\s+/).length;
    rows.push({
        id: randomUUID(),
        slug: a.slug,
        title: a.title,
        excerpt: a.excerpt,
        content: a.content,
        cover_url,
        category: a.category,
        tags: a.tags,
        author_name: 'Redacción FilmiFy',
        status: 'published',
        featured: a.featured,
        // read_time: columna generada por la BD — no se puede insertar.
        published_at: a.published_at,
        created_at: a.published_at,
        updated_at: new Date().toISOString(),
    });
    console.log(`  ✓ ${a.slug} (${words} palabras) → ${cover_url.includes('tmdb') ? 'TMDB' : 'fallback'}`);
}

console.log('Eliminando artículos existentes...');
const { error: delError } = await supabase
    .from('editorial_articles')
    .delete()
    .neq('slug', '__none__');
if (delError) { console.error('ERROR al eliminar:', delError.message); process.exit(1); }

console.log('Insertando lote nuevo...');
const { error: insError } = await supabase.from('editorial_articles').insert(rows);
if (insError) { console.error('ERROR al insertar:', insError.message); process.exit(1); }

const { count } = await supabase
    .from('editorial_articles')
    .select('*', { count: 'exact', head: true });
console.log(`Hecho. Artículos en BD: ${count}`);
