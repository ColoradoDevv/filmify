import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

type FriendAction = 'accept' | 'reject' | 'cancel' | 'remove';

/**
 * Mapea el `status` devuelto por la RPC `friend_action` a la respuesta HTTP.
 * La RPC hace TODA la mutación de forma atómica (bloquea ambas filas de
 * profiles con FOR UPDATE dentro de una sola transacción), eliminando la race
 * condition del anterior read-modify-write en dos writes separados.
 *
 * La identidad del solicitante la deriva la propia RPC de auth.uid() — nunca se
 * confía en el cuerpo de la petición. La función es SECURITY DEFINER, así que
 * puede leer/escribir la fila del objetivo pese a RLS, y por eso basta con el
 * cliente de sesión del usuario (no service role).
 */
function statusToResponse(status: string, action?: string): NextResponse {
    switch (status) {
        case 'ok':
            return NextResponse.json(action ? { success: true, action } : { success: true });
        // Idempotencias: no son errores, se reportan como éxito (igual que antes).
        case 'already_friends':
            return NextResponse.json({ success: true, message: 'Ya son amigos.' });
        case 'already_sent':
            return NextResponse.json({ success: true, message: 'Solicitud ya enviada.' });

        case 'not_authenticated':
            return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });
        case 'self':
            return NextResponse.json({ error: 'Operación no válida.' }, { status: 400 });
        case 'bad_request':
            return NextResponse.json({ error: 'Faltan datos para procesar la acción.' }, { status: 400 });
        case 'invalid_action':
            return NextResponse.json({ error: 'Acción no válida.' }, { status: 400 });
        case 'requests_disabled':
            return NextResponse.json({ error: 'El usuario no acepta solicitudes de amistad.' }, { status: 403 });
        case 'no_incoming':
            return NextResponse.json({ error: 'No existe esa solicitud de amistad.' }, { status: 400 });
        case 'no_outgoing':
            return NextResponse.json({ error: 'No se encontró la solicitud enviada.' }, { status: 400 });
        case 'requester_missing':
        case 'target_missing':
            return NextResponse.json({ error: 'No se pudo leer el perfil.' }, { status: 404 });
        default:
            return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
    }
}

/** Ejecuta la RPC atómica y traduce el resultado a HTTP. */
async function runFriendAction(
    action: 'send' | FriendAction,
    targetId: string,
    responseAction?: string,
): Promise<NextResponse> {
    const supabase = await createClient();

    const { data, error } = await supabase.rpc('friend_action', {
        p_action: action,
        p_target: targetId,
    });

    if (error) {
        console.error('[friends] friend_action RPC error:', error);
        return NextResponse.json({ error: 'No se pudo procesar la acción de amistad.' }, { status: 500 });
    }

    const status = (data as { status?: string } | null)?.status ?? 'unknown';
    return statusToResponse(status, responseAction);
}

// ── POST /api/friends — send a friend request ─────────────────────────────────
export async function POST(request: NextRequest) {
    try {
        const body = await request.json().catch(() => ({}));
        const { targetId } = body as { targetId?: string };

        if (!targetId) {
            return NextResponse.json({ error: 'Falta el ID del destinatario.' }, { status: 400 });
        }

        // La RPC deriva el solicitante de auth.uid() y valida todo atómicamente.
        return await runFriendAction('send', targetId);
    } catch (error) {
        console.error('[friends] POST error:', error);
        return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
    }
}

// ── PATCH /api/friends — accept / reject / cancel / remove ────────────────────
export async function PATCH(request: NextRequest) {
    try {
        const body = await request.json().catch(() => ({}));
        const { action, targetId } = body as { action?: string; targetId?: string };

        if (!action || !targetId) {
            return NextResponse.json({ error: 'Faltan datos para procesar la acción.' }, { status: 400 });
        }
        if (!['accept', 'reject', 'cancel', 'remove'].includes(action)) {
            return NextResponse.json({ error: 'Acción no válida.' }, { status: 400 });
        }

        return await runFriendAction(action as FriendAction, targetId, action);
    } catch (error) {
        console.error('[friends] PATCH error:', error);
        return NextResponse.json({ error: 'Error interno del servidor.' }, { status: 500 });
    }
}
