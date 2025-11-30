'use server';

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export async function verifyRoomPassword(partyId: string, password: string): Promise<{ success: boolean; error?: string }> {
    const supabase = await createClient();

    const { data: party, error } = await supabase
        .from('parties')
        .select('password')
        .eq('id', partyId)
        .single();

    if (error || !party) {
        return { success: false, error: 'Sala no encontrada' };
    }

    if (party.password !== password) {
        return { success: false, error: 'Contraseña incorrecta' };
    }

    return { success: true };
}

export async function getRoomByCode(code: string): Promise<{ success: boolean; party?: any; error?: string }> {
    const supabase = await createClient();

    const { data: party, error } = await supabase
        .from('parties')
        .select('id, is_private')
        .eq('room_code', code.toUpperCase())
        .single();

    if (error || !party) {
        return { success: false, error: 'Sala no encontrada' };
    }

    return { success: true, party };
}
