export type AdminAction =
    | 'BAN_USER'
    | 'UNBAN_USER'
    | 'UPDATE_SETTINGS'
    | 'CLOSE_PARTY'
    | 'DELETE_CONTENT'
    | 'BLACKLIST_CONTENT'
    | 'UNBLACKLIST_CONTENT'
    | 'BROADCAST_MESSAGE'
    | 'BAN_IP'
    | 'IMPERSONATE_USER';

export async function logAdminAction(
    action: AdminAction,
    targetId?: string,
    details?: any
) {
    throw new Error(
        'logAdminAction is server-side only. Import it from \'@/app/admin/actions\' instead of @/lib/admin-logger.'
    );
}
