import { fetchSettings } from "@/app/admin/settings/actions";
import AnnouncementBanner from "./AnnouncementBanner";

export const dynamic = 'force-dynamic';

export default async function SystemAnnouncement() {
    const settings = await fetchSettings();

    if (!settings.activeAnnouncement) return null;

    const type = settings.announcementType || 'info';

    return <AnnouncementBanner message={settings.activeAnnouncement} type={type} />;
}
