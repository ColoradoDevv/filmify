import { fetchSettings } from "@/app/admin/settings/actions";
import { Info, AlertTriangle, CheckCircle } from "lucide-react";

export const dynamic = 'force-dynamic';

export default async function SystemAnnouncement() {
    const settings = await fetchSettings();

    if (!settings.activeAnnouncement) return null;

    const type = settings.announcementType || 'info';

    const styles = {
        info: "bg-blue-600 text-white",
        warning: "bg-amber-500 text-black",
        success: "bg-emerald-600 text-white"
    };

    const icons = {
        info: <Info className="w-4 h-4" />,
        warning: <AlertTriangle className="w-4 h-4" />,
        success: <CheckCircle className="w-4 h-4" />
    };

    return (
        <div className={`${styles[type]} px-4 py-2 text-center relative z-[100] font-medium shadow-md flex items-center justify-center gap-2 animate-in slide-in-from-top duration-300`}>
            {icons[type]}
            <span>{settings.activeAnnouncement}</span>
        </div>
    );
}
