import { fetchSettings } from "@/app/admin/settings/actions";
import AnnouncementBanner from "./AnnouncementBanner";

export const dynamic = 'force-dynamic';

/**
 * Genera un ID único por anuncio basado en el contenido del mensaje.
 * Si el mensaje cambia → nuevo ID → el banner se vuelve a mostrar.
 */
function generateAnnouncementId(message: string): string {
    return `ann-${Buffer.from(message).toString('base64').slice(0, 8)}`;
}

export default async function SystemAnnouncement() {
    let settings;
    try {
        settings = await fetchSettings();
    } catch (error) {
        console.error('[SystemAnnouncement] Error fetching settings:', error);
        return null;
    }

    const activeAnnouncement: string | undefined = settings?.activeAnnouncement;

    if (!activeAnnouncement || typeof activeAnnouncement !== 'string') {
        return null;
    }

    const type = settings?.announcementType || 'info';

    return (
        <AnnouncementBanner
            id={generateAnnouncementId(activeAnnouncement)}
            message={activeAnnouncement}
            type={type as 'info' | 'warning' | 'success'}
        />
    );
}