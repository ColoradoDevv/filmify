import { OG_CONTENT_TYPE, OG_SIZE } from '@/lib/og/shared';
import { renderHomeOgImage } from '@/lib/og/homeOgImage';
import { renderTitleOgImage } from '@/lib/og/titleOgImage';
import { renderPageOgImage } from '@/lib/og/pageOgImage';

export const alt = 'FilmiFy - Ver películas y series online gratis';
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function OpengraphImage({ searchParams }: { searchParams?: { [key: string]: string | string[] } }) {
    // Dispatch to the appropriate renderer based on query params.
    const rawType = Array.isArray(searchParams?.type) ? searchParams?.type[0] : searchParams?.type;
    const type = typeof rawType === 'string' ? rawType : undefined;

    if (!type || type === 'home') {
        return renderHomeOgImage();
    }

    if (type === 'title') {
        const rawMedia = Array.isArray(searchParams?.media) ? searchParams?.media[0] : searchParams?.media;
        const rawId = Array.isArray(searchParams?.id) ? searchParams?.id[0] : searchParams?.id;
        const media = typeof rawMedia === 'string' ? rawMedia : undefined;
        const id = typeof rawId === 'string' ? rawId : undefined;

        if (media && id) {
            if (media === 'movie' || media === 'tv') {
                return renderTitleOgImage(media as 'movie' | 'tv', id);
            }
            // Treat 'anime' as TV-style title cards (TMDB uses similar endpoints)
            if (media === 'anime') {
                return renderTitleOgImage('tv', id);
            }
        }

        // Invalid params -> fallback to home image
        return renderHomeOgImage();
    }

    if (type === 'page') {
        const rawTitle = Array.isArray(searchParams?.title) ? searchParams?.title[0] : searchParams?.title;
        const rawImage = Array.isArray(searchParams?.image) ? searchParams?.image[0] : searchParams?.image;
        const title = typeof rawTitle === 'string' ? decodeURIComponent(rawTitle) : undefined;
        const image = typeof rawImage === 'string' ? decodeURIComponent(rawImage) : undefined;

        if (title) {
            return renderPageOgImage(title, image);
        }

        return renderHomeOgImage();
    }

    // Unknown type -> fallback
    return renderHomeOgImage();
}
