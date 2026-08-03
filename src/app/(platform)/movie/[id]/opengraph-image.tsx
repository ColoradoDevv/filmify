import { renderTitleOgImage, OG_SIZE, OG_CONTENT_TYPE } from '@/lib/og/titleOgImage';

export const alt = 'Ver película online gratis en FilmiFy';
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    return renderTitleOgImage('movie', id);
}
