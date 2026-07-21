import { OG_CONTENT_TYPE, OG_SIZE } from '@/lib/og/shared';
import { renderHomeOgImage } from '@/lib/og/homeOgImage';

export const alt = 'FilmiFy - Ver películas y series online gratis';
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function OpengraphImage() {
    return renderHomeOgImage();
}
