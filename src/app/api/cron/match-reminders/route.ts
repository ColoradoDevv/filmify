/**
 * Cron: enviar recordatorios de partidos 30 min antes del kickoff.
 *
 * - Busca match_reminders donde kickoff <= now+30min y sent=false
 * - Envía email con Resend al usuario
 * - Crea notificación web
 * - Marca sent=true
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { getOptionalApiKeys } from '@/lib/env';
import { Resend } from 'resend';

export const runtime = 'nodejs';
export const maxDuration = 30;

const SANS = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

const DEFAULT_TZ = 'America/Bogota';

/**
 * Formatea el kickoff en la zona horaria del usuario. Si la zona es inválida o
 * falta, cae a Bogotá. Devuelve la etiqueta (ej. "14 de junio, 12:00 p. m.") y
 * el nombre corto de la zona (ej. "GMT-5") para mostrarlo en el email.
 */
function formatKickoff(iso: string, tz?: string): { label: string; tzName: string } {
    const date = new Date(iso);
    let zone = tz || DEFAULT_TZ;
    try {
        // Valida la zona: si es inválida, Intl lanza RangeError.
        new Intl.DateTimeFormat('es', { timeZone: zone }).format(date);
    } catch {
        zone = DEFAULT_TZ;
    }
    const label = date.toLocaleString('es', {
        timeZone: zone,
        hour: '2-digit',
        minute: '2-digit',
        day: 'numeric',
        month: 'long',
    });
    // Nombre corto de la zona (GMT±N) para que el usuario sepa el huso.
    const parts = new Intl.DateTimeFormat('es', {
        timeZone: zone,
        timeZoneName: 'short',
    }).formatToParts(date);
    const tzName = parts.find((p) => p.type === 'timeZoneName')?.value ?? '';
    return { label, tzName };
}

/**
 * HTML del email de recordatorio de partido. Sigue el mismo estilo que el email
 * de confirmación de cuenta (tablas para compatibilidad, fondo oscuro #15181c,
 * header FilmiFy en #00c2ff, footer filmify.me) con acento verde mundialista.
 */
function reminderEmailHtml(opts: {
    homeTeam: string;
    awayTeam: string;
    kickoffLocal: string;
    tzName: string;
    matchUrl: string;
}): string {
    const { homeTeam, awayTeam, kickoffLocal, tzName, matchUrl } = opts;
    const tzSuffix = tzName ? ` (${tzName})` : '';
    return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html dir="ltr" lang="es">
  <head>
    <meta content="width=device-width" name="viewport" />
    <meta content="text/html; charset=UTF-8" http-equiv="Content-Type" />
    <meta name="x-apple-disable-message-reformatting" />
    <meta content="IE=edge" http-equiv="X-UA-Compatible" />
    <meta content="telephone=no,address=no,email=no,date=no,url=no" name="format-detection" />
  </head>
  <body style="background-color:#ffffff">
    <div style="display:none;overflow:hidden;line-height:1px;opacity:0;max-height:0;max-width:0" data-skip-in-text="true">
      ${homeTeam} vs ${awayTeam} comienza en 30 minutos.
    </div>
    <table border="0" width="100%" cellpadding="0" cellspacing="0" role="presentation" align="center">
      <tbody>
        <tr>
          <td style="background-color:#ffffff">
            <table align="left" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="max-width:600px;width:100%;color:#000000;background-color:#ffffff">
              <tbody>
                <tr style="width:100%">
                  <td style="padding:0">
                    <table width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation" style="margin:0;padding:0;background-color:#09090b">
                      <tbody>
                        <tr style="margin:0;padding:0">
                          <td align="center" style="margin:0;padding:32px 16px">
                            <table width="600" border="0" cellpadding="0" cellspacing="0" role="presentation" class="wrapper" style="margin:0;padding:0;width:600px;max-width:600px;background-color:#15181c;border-style:solid;border-width:1px;border-color:#1f2937;border-radius:16px;overflow:hidden">
                              <tbody>
                                <tr style="margin:0;padding:0">
                                  <td align="center" style="margin:0;padding:36px 30px;background-color:#0b0e11;border-bottom:1px solid #1f2937">
                                    <h1 style="margin:0;padding:0;font-family:${SANS};font-size:30px;font-weight:800;color:#ffffff;letter-spacing:-1px">
                                      Filmi<span style="color:#00c2ff">Fy</span>
                                    </h1>
                                  </td>
                                </tr>
                                <tr style="margin:0;padding:0">
                                  <td class="px py" align="center" style="margin:0;padding:44px 40px;text-align:center;font-family:${SANS}">
                                    <p style="margin:0 0 8px 0;padding:0;font-size:13px;font-weight:600;letter-spacing:1px;text-transform:uppercase;color:#10b981">
                                      Mundial 2026 · En 30 minutos
                                    </p>
                                    <h2 style="margin:0 0 20px 0;padding:0;color:#ffffff;font-size:24px;font-weight:700;line-height:1.3">
                                      ${homeTeam} vs ${awayTeam}
                                    </h2>
                                    <p style="margin:0 0 32px 0;padding:0;color:#9ca3af;font-size:16px;line-height:1.6">
                                      Tu partido está por comenzar a las <strong style="color:#ffffff">${kickoffLocal}</strong>${tzSuffix}. Entra ya y míralo en vivo y gratis en <strong>FilmiFy</strong>.
                                    </p>
                                    <table align="center" border="0" cellpadding="0" cellspacing="0" role="presentation" style="margin:0 auto;padding:0">
                                      <tbody>
                                        <tr style="margin:0;padding:0">
                                          <td align="center" style="margin:0;padding:0;border-radius:8px;background-color:#10b981">
                                            <p style="margin:0;padding:0">
                                              <a href="${matchUrl}" rel="noopener noreferrer nofollow" style="color:#04231a;text-decoration:none;display:inline-block;background-color:#10b981;font-family:${SANS};font-size:16px;font-weight:bold;line-height:50px;text-align:center;padding:0 36px;border-radius:8px;mso-hide:all" target="_blank">Ver partido en vivo</a>
                                            </p>
                                          </td>
                                        </tr>
                                      </tbody>
                                    </table>
                                    <p style="margin:32px 0 0 0;padding:0;color:#6b7280;font-size:13px;line-height:1.6">
                                      Si el botón no funciona, copia y pega esta dirección en tu navegador:
                                    </p>
                                    <p style="margin:8px 0 0 0;padding:0">
                                      <a href="${matchUrl}" rel="noopener noreferrer nofollow" style="color:#10b981;text-decoration:underline;font-size:12px;word-break:break-all" target="_blank">${matchUrl}</a>
                                    </p>
                                  </td>
                                </tr>
                                <tr style="margin:0;padding:0">
                                  <td align="center" style="margin:0;padding:24px 30px;background-color:#0b0e11;border-top:1px solid #1f2937;font-family:${SANS}">
                                    <p style="margin:0 0 6px 0;padding:0;color:#6b7280;font-size:12px;line-height:1.5">
                                      Recibes este correo porque activaste un recordatorio. Puedes cancelarlo desde la página del partido.
                                    </p>
                                    <p style="margin:0;padding:0;color:#4b5563;font-size:12px">
                                      © 2026 FilmiFy ·
                                      <a href="https://filmify.me" rel="noopener noreferrer nofollow" style="color:#6b7280;text-decoration:underline" target="_blank">filmify.me</a>
                                    </p>
                                  </td>
                                </tr>
                              </tbody>
                            </table>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </td>
                </tr>
              </tbody>
            </table>
          </td>
        </tr>
      </tbody>
    </table>
  </body>
</html>`;
}

export async function GET(request: NextRequest) {
    const { cronSecret, resendApiKey, appUrl } = getOptionalApiKeys();
    const authHeader = request.headers.get('authorization');

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    const supabase = createServiceRoleClient();

    // Ventana: partidos que arrancan en los próximos 30-35 min (5 min de margen
    // para cubrir la frecuencia del cron de 5 minutos)
    const now = new Date();
    const windowStart = now.toISOString();
    const windowEnd = new Date(now.getTime() + 35 * 60 * 1000).toISOString();

    // Obtener recordatorios pendientes con el email del usuario
    const { data: reminders, error } = await supabase
        .from('match_reminders')
        .select('id, user_id, match_id, kickoff, home_team, away_team')
        .eq('sent', false)
        .gte('kickoff', windowStart)
        .lte('kickoff', windowEnd);

    if (error) {
        console.error('[cron/match-reminders] query error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!reminders || reminders.length === 0) {
        return NextResponse.json({ success: true, sent: 0 });
    }

    // Obtener emails de los usuarios
    const userIds = [...new Set(reminders.map((r: any) => r.user_id))];
    const { data: authUsers } = await supabase.auth.admin.listUsers();
    const emailMap: Record<string, string> = {};
    for (const u of authUsers?.users ?? []) {
        if (userIds.includes(u.id) && u.email) emailMap[u.id] = u.email;
    }

    // Zona horaria por usuario (guardada en profiles.preferences.timezone cuando
    // activó el recordatorio). Cae a Bogotá si no la tiene.
    const tzMap: Record<string, string> = {};
    const { data: profiles } = await supabase
        .from('profiles')
        .select('id, preferences')
        .in('id', userIds);
    for (const p of profiles ?? []) {
        const tz = (p as any).preferences?.timezone;
        if (typeof tz === 'string' && tz) tzMap[(p as any).id] = tz;
    }

    const resend = resendApiKey ? new Resend(resendApiKey) : null;
    const sentIds: string[] = [];
    const notificationRows: object[] = [];

    for (const reminder of reminders as any[]) {
        const email = emailMap[reminder.user_id];
        const matchUrl = `${appUrl}/mundial/partido/${reminder.match_id}`;
        const { label: kickoffLocal, tzName } = formatKickoff(
            reminder.kickoff,
            tzMap[reminder.user_id],
        );

        // Enviar email
        if (resend && email) {
            try {
                await resend.emails.send({
                    // Mismo remitente que el resto de correos (dominio filmify.me
                    // verificado en Resend). Configurable por env, fallback al sandbox.
                    from: process.env.RESEND_FROM_EMAIL ?? 'FilmiFy <onboarding@resend.dev>',
                    to: email,
                    subject: `En 30 min: ${reminder.home_team} vs ${reminder.away_team}`,
                    html: reminderEmailHtml({
                        homeTeam: reminder.home_team,
                        awayTeam: reminder.away_team,
                        kickoffLocal,
                        tzName,
                        matchUrl,
                    }),
                });
            } catch (err) {
                console.error('[cron/match-reminders] email error:', err);
            }
        }

        // Crear notificación web
        notificationRows.push({
            user_id: reminder.user_id,
            type: 'matchReminder',
            title: `⚽ En 30 min: ${reminder.home_team} vs ${reminder.away_team}`,
            message: `El partido comienza a las ${kickoffLocal}${tzName ? ` (${tzName})` : ''}. ¡No te lo pierdas!`,
            read: false,
            metadata: { url: matchUrl },
        });

        sentIds.push(reminder.id);
    }

    // Insertar notificaciones web
    if (notificationRows.length > 0) {
        const { error: notifError } = await supabase.from('notifications').insert(notificationRows);
        if (notifError) console.error('[cron/match-reminders] notification insert error:', notifError);
    }

    // Marcar como enviados
    if (sentIds.length > 0) {
        const { error: updateError } = await supabase
            .from('match_reminders')
            .update({ sent: true })
            .in('id', sentIds);
        if (updateError) console.error('[cron/match-reminders] update sent error:', updateError);
    }

    return NextResponse.json({ success: true, sent: sentIds.length });
}
