import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseConfig } from '@/lib/env';

type FriendAction = 'accept' | 'reject' | 'cancel' | 'remove';

interface FriendPreferences {
    privacy: {
        allowFriendRequests?: boolean;
    };
    friends: string[];
    incomingFriendRequests: string[];
    outgoingFriendRequests: string[];
}

function createFriendsClient() {
    const { url, serviceRoleKey } = getSupabaseConfig();
    if (!url || !serviceRoleKey) {
        return null;
    }

    return createClient(url, serviceRoleKey, {
        auth: {
            persistSession: false,
        },
    });
}

function normalizePreferences(preferences: any): FriendPreferences {
    return {
        privacy: preferences?.privacy ?? {},
        friends: Array.isArray(preferences?.friends) ? preferences.friends : [],
        incomingFriendRequests: Array.isArray(preferences?.incomingFriendRequests) ? preferences.incomingFriendRequests : [],
        outgoingFriendRequests: Array.isArray(preferences?.outgoingFriendRequests) ? preferences.outgoingFriendRequests : [],
    };
}

async function fetchProfilesForFriendAction(supabase: any, requesterId: string, targetId: string) {
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

export async function POST(request: NextRequest) {
    try {
        const supabase = createFriendsClient();
        if (!supabase) {
            return NextResponse.json({ error: 'Supabase service credentials are not configuradas.' }, { status: 500 });
        }

        const body = await request.json();
        const { requesterId, targetId } = body;

        if (!requesterId || !targetId) {
            return NextResponse.json({ error: 'Faltan datos de la solicitud.' }, { status: 400 });
        }
        if (requesterId === targetId) {
            return NextResponse.json({ error: 'No puedes enviarte una solicitud a ti mismo.' }, { status: 400 });
        }

        const { requesterPrefs, targetPrefs } = await fetchProfilesForFriendAction(supabase, requesterId, targetId);
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

        const [{ error: updateTargetError }, { error: updateRequesterError }] = await Promise.all([
            supabase.from('profiles').update({ preferences: updatedTargetPrefs }).eq('id', targetId),
            supabase.from('profiles').update({ preferences: updatedRequesterPrefs }).eq('id', requesterId),
        ]);

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

export async function PATCH(request: NextRequest) {
    try {
        const supabase = createFriendsClient();
        if (!supabase) {
            return NextResponse.json({ error: 'Supabase service credentials are not configuradas.' }, { status: 500 });
        }

        const body = await request.json();
        const { action, requesterId, targetId } = body;

        if (!action || !requesterId || !targetId) {
            return NextResponse.json({ error: 'Faltan datos para procesar la acción.' }, { status: 400 });
        }
        if (!['accept', 'reject', 'cancel', 'remove'].includes(action)) {
            return NextResponse.json({ error: 'Acción no válida.' }, { status: 400 });
        }

        const { requesterPrefs, targetPrefs } = await fetchProfilesForFriendAction(supabase, requesterId, targetId);
        const hasIncomingRequest = targetPrefs.incomingFriendRequests.includes(requesterId);
        const hasOutgoingRequest = requesterPrefs.outgoingFriendRequests.includes(targetId);
        const areFriends = targetPrefs.friends.includes(requesterId) || requesterPrefs.friends.includes(targetId);

        if (action === 'accept' || action === 'reject') {
            if (!hasIncomingRequest) {
                return NextResponse.json({ error: 'No existe esa solicitud de amistad.' }, { status: 400 });
            }
        }

        if (action === 'cancel') {
            if (!hasOutgoingRequest) {
                return NextResponse.json({ error: 'No se encontró la solicitud enviada.' }, { status: 400 });
            }
        }

        const updatedTargetPrefs: FriendPreferences = {
            ...targetPrefs,
            privacy: targetPrefs.privacy,
            friends: targetPrefs.friends,
            incomingFriendRequests: targetPrefs.incomingFriendRequests,
            outgoingFriendRequests: targetPrefs.outgoingFriendRequests,
        };

        const updatedRequesterPrefs: FriendPreferences = {
            ...requesterPrefs,
            privacy: requesterPrefs.privacy,
            friends: requesterPrefs.friends,
            incomingFriendRequests: requesterPrefs.incomingFriendRequests,
            outgoingFriendRequests: requesterPrefs.outgoingFriendRequests,
        };

        if (action === 'accept') {
            updatedTargetPrefs.incomingFriendRequests = targetPrefs.incomingFriendRequests.filter((id: string) => id !== requesterId);
            updatedRequesterPrefs.outgoingFriendRequests = requesterPrefs.outgoingFriendRequests.filter((id: string) => id !== targetId);
            updatedTargetPrefs.friends = Array.from(new Set([...(updatedTargetPrefs.friends || []), requesterId]));
            updatedRequesterPrefs.friends = Array.from(new Set([...(updatedRequesterPrefs.friends || []), targetId]));
        }

        if (action === 'reject') {
            updatedTargetPrefs.incomingFriendRequests = targetPrefs.incomingFriendRequests.filter((id: string) => id !== requesterId);
            updatedRequesterPrefs.outgoingFriendRequests = requesterPrefs.outgoingFriendRequests.filter((id: string) => id !== targetId);
        }

        if (action === 'cancel') {
            updatedTargetPrefs.incomingFriendRequests = targetPrefs.incomingFriendRequests.filter((id: string) => id !== requesterId);
            updatedRequesterPrefs.outgoingFriendRequests = requesterPrefs.outgoingFriendRequests.filter((id: string) => id !== targetId);
        }

        if (action === 'remove') {
            updatedTargetPrefs.friends = targetPrefs.friends.filter((id: string) => id !== requesterId);
            updatedRequesterPrefs.friends = requesterPrefs.friends.filter((id: string) => id !== targetId);
            updatedTargetPrefs.incomingFriendRequests = targetPrefs.incomingFriendRequests.filter((id: string) => id !== requesterId);
            updatedRequesterPrefs.incomingFriendRequests = requesterPrefs.incomingFriendRequests.filter((id: string) => id !== targetId);
            updatedTargetPrefs.outgoingFriendRequests = targetPrefs.outgoingFriendRequests.filter((id: string) => id !== requesterId);
            updatedRequesterPrefs.outgoingFriendRequests = requesterPrefs.outgoingFriendRequests.filter((id: string) => id !== targetId);
        }

        const [{ error: updateTargetError }, { error: updateRequesterError }] = await Promise.all([
            supabase.from('profiles').update({ preferences: updatedTargetPrefs }).eq('id', targetId),
            supabase.from('profiles').update({ preferences: updatedRequesterPrefs }).eq('id', requesterId),
        ]);

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
