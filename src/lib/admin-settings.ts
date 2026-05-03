import { createServiceRoleClient } from './supabase/server';

export interface AdminSettings {
    enableAi: boolean;
    enableWatchParty: boolean;
    allowRegistration: boolean;
    maintenanceMode: boolean;
    activeAnnouncement: string;
    announcementType?: 'info' | 'warning' | 'success';
}

const DEFAULT_SETTINGS: AdminSettings = {
    enableAi: true,
    enableWatchParty: true,
    allowRegistration: true,
    maintenanceMode: false,
    activeAnnouncement: "",
    announcementType: 'info'
};

export async function getSettings(): Promise<AdminSettings> {
    try {
        const supabase = createServiceRoleClient();

        const [{ data: settingsData, error: settingsError }, { data: announcementData }] =
            await Promise.all([
                supabase.from('system_settings').select('*').single(),
                supabase
                    .from('announcements')
                    .select('message, type')
                    .eq('is_active', true)
                    .lte('start_at', new Date().toISOString())
                    .or(`end_at.is.null,end_at.gt.${new Date().toISOString()}`)
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .single(),
            ]);

        if (settingsError || !settingsData) {
            console.error('Failed to fetch settings from DB:', settingsError);
            return DEFAULT_SETTINGS;
        }

        return {
            enableAi: settingsData.enable_ai,
            enableWatchParty: settingsData.enable_watch_party,
            allowRegistration: settingsData.allow_registration,
            maintenanceMode: settingsData.maintenance_mode,
            activeAnnouncement: announcementData?.message ?? "",
            announcementType: announcementData?.type ?? 'info',
        };
    } catch (error) {
        console.error('Exception fetching settings from DB:', error);
        return DEFAULT_SETTINGS;
    }
}

export async function saveSettings(settings: AdminSettings): Promise<boolean> {
    try {
        const supabase = createServiceRoleClient();

        const { error } = await supabase.from('system_settings').upsert({
            id: 1,
            enable_ai: settings.enableAi,
            enable_watch_party: settings.enableWatchParty,
            allow_registration: settings.allowRegistration,
            maintenance_mode: settings.maintenanceMode,
            updated_at: new Date().toISOString(),
        });

        if (error) {
            console.error('Error saving settings to DB:', error);
            return false;
        }

        return true;
    } catch (error) {
        console.error('Exception saving settings to DB:', error);
        return false;
    }
}
