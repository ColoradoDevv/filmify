import fs from 'fs/promises';
import path from 'path';
import { createServiceRoleClient } from './supabase/server';

const SETTINGS_FILE = path.join(process.cwd(), 'admin-settings.json');

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
    console.log('getSettings called');
    let dbSettings: AdminSettings | null = null;

    // Try fetching from DB
    try {
        const supabase = createServiceRoleClient();

        // Fetch System Settings
        const { data: settingsData, error: settingsError } = await supabase
            .from('system_settings')
            .select('*')
            .single();

        // Fetch Active Announcement
        const { data: announcementData, error: announcementError } = await supabase
            .from('announcements')
            .select('message, type')
            .eq('is_active', true)
            .lte('start_at', new Date().toISOString())
            .or(`end_at.is.null,end_at.gt.${new Date().toISOString()}`)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (settingsData && !settingsError) {
            dbSettings = {
                enableAi: settingsData.enable_ai,
                enableWatchParty: settingsData.enable_watch_party,
                allowRegistration: settingsData.allow_registration,
                maintenanceMode: settingsData.maintenance_mode,
                activeAnnouncement: announcementData?.message || "",
                announcementType: announcementData?.type || 'info'
            };
        }
    } catch (error) {
        console.warn('Failed to fetch settings from DB, falling back to file:', error);
    }

    if (dbSettings) return dbSettings;

    // Fallback to File
    try {
        const data = await fs.readFile(SETTINGS_FILE, 'utf-8');
        return { ...DEFAULT_SETTINGS, ...JSON.parse(data) };
    } catch (error) {
        return DEFAULT_SETTINGS;
    }
}

export async function saveSettings(settings: AdminSettings): Promise<boolean> {
    let dbSuccess = false;
    let fileSuccess = false;

    // Save to DB
    try {
        const supabase = createServiceRoleClient();
        const { error } = await supabase
            .from('system_settings')
            .upsert({
                id: 1,
                enable_ai: settings.enableAi,
                enable_watch_party: settings.enableWatchParty,
                allow_registration: settings.allowRegistration,
                maintenance_mode: settings.maintenanceMode,
                active_announcement: settings.activeAnnouncement,
                updated_at: new Date().toISOString()
            });

        if (error) {
            console.error('Error saving settings to DB:', error);
        } else {
            dbSuccess = true;
        }
    } catch (error) {
        console.error('Exception saving settings to DB:', error);
    }

    // Save to File (Always try to save locally as backup/cache)
    try {
        await fs.writeFile(SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf-8');
        fileSuccess = true;
    } catch (error) {
        console.error('Error saving settings to file:', error);
    }

    // Return true if at least one method succeeded
    if (dbSuccess || fileSuccess) {
        if (!dbSuccess) {
            console.warn('Settings saved to file but failed to save to DB (likely missing table).');
        }
        return true;
    }

    return false;
}
