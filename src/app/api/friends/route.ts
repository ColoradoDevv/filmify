import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';

type FriendAction = 'accept' | 'reject' | 'cancel' | 'remove';

interface FriendPreferences {
    privacy: {
        allowFriendRequests?: boolean;
    };
    friends: string[];
    incomingFriendRequests: string[];
    outgoingFriendRequests: string[];
}

function normalizePreferences(preferences: any): FriendPreferences {
    return {
        privacy: preferences?.privacy ?? {},
        friends: Array.isArray(preferences?.friends) ? preferences.friends : [],
        incomingFriendRequests: Array.isArray(preferences?.incomingFriendRequests) ? preferences.incomingFriendRequests : [],
        outgoingFriendRequests: Array.isArray(preferences?.outgoingFriendRequests) ? preferences.outgoingFriendRequests : [],
    };
}

/**
 * Fetches both profiles using the service-role client (needed to read/write
 * the target user's preferences, which RLS would otherwise block).
 * Identity of the caller is already verified before this is called.
 */
async function fetchProfilesForFriendAction(requesterId: string, targetId: string) {
    const supabase = createServiceRoleClient();

    const [{ data: requesterData, error: requesterError }, { data: targetData, error: targetError }] = await Promise.all([
        supabase.from('profiles').select('id, preferences').eq('id', requesterId).single(),
        supabase.from('profiles').select('id, preferences').eq('id', targetId).single(),
    ]);

    if (requesterError || !requesterData) {
        throw new Error('No se pudo leer el perfil de usuario que solicita.');
    }
    if (targetError || !targetData) {
        throw new Error('No se pudo leer el perfil objetivo.');
    }

    return {
        requesterPrefs: normalizePreferences(requesterData.preferences),
        targetPrefs: normalizePreferences(targetData.preferences),
    };
}

/**
 * Writes updated preferences for both users using the service-role client.
 * Only called after the caller's identity has been verified via session.
 */
async function updateBothProfiles(
    requesterId: string,
    targetId: string,
    updatedRequesterPrefs: FriendPreferences,
    updatedTargetPrefs: FriendPreferences,
) {
    const supabase = createServiceRoleClient();

    const [{ error: updateRequesterError }, { error: updateTargetError }] = await Promise.all([
        supabase.from('profiles').update({ preferences: updatedRequesterPrefs }).eq('id', requesterId),
        supabase.from('profiles').update({ preferences: updatedTargetPrefs }).eq('id', targetId),
    ]);

    return { updateRequesterError, updateTargetError };
}

/** Resolves the authenticated user from the session cookie. Returns null if not authenticated. */
async function getAuthenticatedUserId(): Promise<string | null> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id ?? null;
}

// ── POST /api/friends — send a friend request ─────────────────────────────────
export async function POST(request: NextRequest) {
    try {
        // 1. Verify identity from session — never trust the request body for this.
        const authenticatedUserId = await getAuthenticatedUserId();
        if (!authenticatedUserId) {
            return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
        }

        const body = await request.json();
        const { targetId } = body;

        if (!targetId) {
            return NextResponse.json({ error: 'Falta el ID del destinatario.' }, { status: 400 });
        }

        // 2. requesterId is always the authenticated user — not from the body.
        const requesterId = authenticatedUserId;

        if (requesterId === targetId) {
            return NextResponse.json({ error: 'No puedes enviarte una solicitud a ti mismo.' }, { status: 400 });
        }

        const { requesterPrefs, targetPrefs } = await fetchProfilesForFriendAction(requesterId, targetId);
        const allowFriendRequests = targetPrefs.privacy.allowFriendRequests ?? true;

        if (!allowFriendRequests) {
            return NextResponse.json({ error: 'El usuario no acepta solicitudes de amistad.' }, { status: 403 });
        }

        if (targetPrefs.friends.includes(requesterId) || requesterPrefs.friends.includes(targetId)) {
            return NextResponse.json({ success: true, message: 'Ya son amigos.' });
        }

        if (targetPrefs.incomingFriendRequests.includes(requesterId) || requesterPrefs.outgoingFriendRequests.includes(targetId)) {
            return NextResponse.json({ success: true, message: 'Solicitud ya enviada.' });
        }

        const updatedTargetPrefs = {
            ...targetPrefs,
            incomingFriendRequests: Array.from(new Set([...targetPrefs.incomingFriendRequests, requesterId])),
        };
        const updatedRequesterPrefs = {
            ...requesterPrefs,
            outgoingFriendRequests: Array.from(new Set([...requesterPrefs.outgoingFriendRequests, targetId])),
        };

        const { updateRequesterError, updateTargetError } = await updateBothProfiles(
            requesterId, targetId, updatedRequesterPrefs, updatedTargetPrefs,
        );

        if (updateTargetError || updateRequesterError) {
            console.error(updateTargetError || updateRequesterError);
            return NextResponse.json({ error: 'No se pudo enviar la solicitud de amistad.' }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error(error);
        return NextResponse.json({ error: error.message || 'Error interno del servidor.' }, { status: 500 });
    }
}

// ── PATCH /api/friends — accept / reject / cancel / remove ────────────────────
export async function PATCH(request: NextRequest) {
    try {
        // 1. Verify identity from session — never trust the request body for this.
        const authenticatedUserId = await getAuthenticatedUserId();
        if (!authenticatedUserId) {
            return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
        }

        const body = await request.json();
        const { action, targetId } = body;

        if (!action || !targetId) {
            return NextResponse.json({ error: 'Faltan datos para procesar la acción.' }, { status: 400 });
        }
        if (!['accept', 'reject', 'cancel', 'remove'].includes(action as FriendAction)) {
            return NextResponse.json({ error: 'Acción no válida.' }, { status: 400 });
        }

        // 2. requesterId is always the authenticated user — not from the body.
        const requesterId = authenticatedUserId;

        if (requesterId === targetId) {
            return NextResponse.json({ error: 'Operación no válida.' }, { status: 400 });
        }

        const { requesterPrefs, targetPrefs } = await fetchProfilesForFriendAction(requesterId, targetId);

        // 3. Authorization checks: verify the action is consistent with the
        //    actual state of the relationship, preventing spoofed actions.
        const hasIncomingRequest = targetPrefs.incomingFriendRequests.includes(requesterId);
        const hasOutgoingRequest = requesterPrefs.outgoingFriendRequests.includes(targetId);

        if ((action === 'accept' || action === 'reject') && !hasIncomingRequest) {
            return NextResponse.json({ error: 'No existe esa solicitud de amistad.' }, { status: 400 });
        }

        if (action === 'cancel' && !hasOutgoingRequest) {
            return NextResponse.json({ error: 'No se encontró la solicitud enviada.' }, { status: 400 });
        }

        const updatedTargetPrefs: FriendPreferences = { ...targetPrefs };
        const updatedRequesterPrefs: FriendPreferences = { ...requesterPrefs };

        if (action === 'accept') {
            updatedTargetPrefs.incomingFriendRequests = targetPrefs.incomingFriendRequests.filter((id) => id !== requesterId);
            updatedRequesterPrefs.outgoingFriendRequests = requesterPrefs.outgoingFriendRequests.filter((id) => id !== targetId);
            updatedTargetPrefs.friends = Array.from(new Set([...targetPrefs.friends, requesterId]));
            updatedRequesterPrefs.friends = Array.from(new Set([...requesterPrefs.friends, targetId]));
        }

        if (action === 'reject') {
            updatedTargetPrefs.incomingFriendRequests = targetPrefs.incomingFriendRequests.filter((id) => id !== requesterId);
            updatedRequesterPrefs.outgoingFriendRequests = requesterPrefs.outgoingFriendRequests.filter((id) => id !== targetId);
        }

        if (action === 'cancel') {
            updatedTargetPrefs.incomingFriendRequests = targetPrefs.incomingFriendRequests.filter((id) => id !== requesterId);
            updatedRequesterPrefs.outgoingFriendRequests = requesterPrefs.outgoingFriendRequests.filter((id) => id !== targetId);
        }

        if (action === 'remove') {
            updatedTargetPrefs.friends = targetPrefs.friends.filter((id) => id !== requesterId);
            updatedRequesterPrefs.friends = requesterPrefs.friends.filter((id) => id !== targetId);
            updatedTargetPrefs.incomingFriendRequests = targetPrefs.incomingFriendRequests.filter((id) => id !== requesterId);
            updatedRequesterPrefs.incomingFriendRequests = requesterPrefs.incomingFriendRequests.filter((id) => id !== targetId);
            updatedTargetPrefs.outgoingFriendRequests = targetPrefs.outgoingFriendRequests.filter((id) => id !== requesterId);
            updatedRequesterPrefs.outgoingFriendRequests = requesterPrefs.outgoingFriendRequests.filter((id) => id !== targetId);
        }

        const { updateRequesterError, updateTargetError } = await updateBothProfiles(
            requesterId, targetId, updatedRequesterPrefs, updatedTargetPrefs,
        );

        if (updateTargetError || updateRequesterError) {
            console.error(updateTargetError || updateRequesterError);
            return NextResponse.json({ error: 'No se pudo procesar la acción de amistad.' }, { status: 500 });
        }

        return NextResponse.json({ success: true, action });
    } catch (error: any) {
        console.error(error);
        return NextResponse.json({ error: error.message || 'Error interno del servidor.' }, { status: 500 });
    }
}
