import { renderMatchOgImage, OG_SIZE, OG_CONTENT_TYPE } from '@/lib/og/matchOgImage';

export const alt = 'Partido del Mundial 2026 en vivo y gratis en FilmiFy';
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    return renderMatchOgImage(id);
}
