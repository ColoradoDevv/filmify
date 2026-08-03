# Plantillas de correo de Supabase Auth

Los correos de autenticación (confirmación de cuenta, recuperación de
contraseña, cambio de email) **no se generan en este repo**: los envía
Supabase Auth con las plantillas configuradas en el dashboard.

> **Dashboard → Authentication → Emails → Templates**

## Cómo funciona el flujo de recuperación en FilmiFy

La app soporta **ambos** mecanismos de recuperación, así que la plantilla
"Reset Password" debe incluir los dos:

| Variable de plantilla | Qué es | Quién la usa |
|---|---|---|
| `{{ .Token }}` | Código OTP numérico | `/forgot-password` (paso 2) y Ajustes → Cuenta → Cambiar contraseña |
| `{{ .ConfirmationURL }}` | Enlace mágico | Redirige a `/auth/callback?next=/reset-password` |

⚠️ El enlace (`ConfirmationURL`) usa PKCE: **solo funciona si se abre en el
mismo navegador** desde el que se pidió la recuperación. El código OTP
funciona en cualquier dispositivo — por eso la UI pide el código como vía
principal.

⚠️ La longitud del OTP se configura en **Authentication → Providers → Email →
Email OTP Length**. El modal de Ajustes espera **8 dígitos**; la página
`/forgot-password` acepta de 6 a 10.

## Plantilla: Reset Password (recuperación de contraseña)

**Subject:** `Tu código para restablecer la contraseña — FilmiFy`

```html
<div style="background-color:#0a0a0f;padding:40px 16px;font-family:'Segoe UI',Arial,sans-serif;">
  <div style="max-width:480px;margin:0 auto;background-color:#14141c;border:1px solid #26262f;border-radius:16px;padding:40px 32px;text-align:center;">
    <h1 style="color:#ffffff;font-size:22px;margin:0 0 8px;">Film<span style="color:#6366f1;">iFy</span></h1>
    <h2 style="color:#ffffff;font-size:18px;margin:24px 0 8px;">Restablece tu contraseña</h2>
    <p style="color:#9ca3af;font-size:14px;line-height:1.6;margin:0 0 24px;">
      Recibimos una solicitud para restablecer la contraseña de tu cuenta.
      Introduce este código en FilmiFy:
    </p>
    <div style="background-color:#1c1c26;border:1px solid #6366f1;border-radius:12px;padding:16px;margin:0 0 24px;">
      <span style="color:#ffffff;font-size:32px;font-weight:700;letter-spacing:8px;">{{ .Token }}</span>
    </div>
    <p style="color:#9ca3af;font-size:13px;margin:0 0 16px;">
      O si lo prefieres, haz clic en el botón (debe abrirse en el mismo
      navegador donde pediste la recuperación):
    </p>
    <a href="{{ .ConfirmationURL }}"
       style="display:inline-block;background:linear-gradient(90deg,#6366f1,#a855f7);color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;padding:12px 28px;border-radius:10px;">
      Restablecer contraseña
    </a>
    <p style="color:#6b7280;font-size:12px;line-height:1.6;margin:32px 0 0;">
      El código caduca en 1 hora. Si no solicitaste este cambio, ignora este
      correo — tu contraseña seguirá siendo la misma.
    </p>
  </div>
  <p style="color:#4b5563;font-size:11px;text-align:center;margin:24px 0 0;">
    © FilmiFy · filmify.me
  </p>
</div>
```

## Plantilla: Confirm signup (confirmación de registro)

⚠️ **No quitar `{{ .ConfirmationURL }}` de esta plantilla.** La página
`/confirm-email` instruye al usuario a hacer clic en un enlace y no tiene
input de código.

**Subject:** `Confirma tu cuenta de FilmiFy`

```html
<div style="background-color:#0a0a0f;padding:40px 16px;font-family:'Segoe UI',Arial,sans-serif;">
  <div style="max-width:480px;margin:0 auto;background-color:#14141c;border:1px solid #26262f;border-radius:16px;padding:40px 32px;text-align:center;">
    <h1 style="color:#ffffff;font-size:22px;margin:0 0 8px;">Film<span style="color:#6366f1;">iFy</span></h1>
    <h2 style="color:#ffffff;font-size:18px;margin:24px 0 8px;">¡Bienvenido/a! 🎬</h2>
    <p style="color:#9ca3af;font-size:14px;line-height:1.6;margin:0 0 24px;">
      Solo falta un paso: confirma tu correo electrónico para activar tu
      cuenta y empezar a descubrir películas y series.
    </p>
    <a href="{{ .ConfirmationURL }}"
       style="display:inline-block;background:linear-gradient(90deg,#6366f1,#a855f7);color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:14px 32px;border-radius:10px;">
      Confirmar mi cuenta
    </a>
    <p style="color:#6b7280;font-size:12px;line-height:1.6;margin:32px 0 0;">
      Si no creaste una cuenta en FilmiFy, puedes ignorar este correo.
    </p>
  </div>
  <p style="color:#4b5563;font-size:11px;text-align:center;margin:24px 0 0;">
    © FilmiFy · filmify.me
  </p>
</div>
```

## Remitente (que el correo no llegue como "Supabase")

Por defecto Supabase envía desde `noreply@mail.app.supabase.io` con límites
de envío muy bajos (no apto para producción). Para enviar desde
`no-reply@filmify.me` con Resend (ya usado en el proyecto):

1. En Resend: verificar el dominio `filmify.me` (registros DNS SPF/DKIM).
2. En Resend → **SMTP**: crear credenciales SMTP.
3. En Supabase → **Project Settings → Authentication → SMTP Settings**:
   - Host: `smtp.resend.com`, puerto `465`
   - Usuario: `resend`, contraseña: la API key de Resend
   - Sender email: `no-reply@filmify.me`, Sender name: `FilmiFy`
4. Subir el rate limit de emails en **Authentication → Rate Limits** si hace
   falta (el default con SMTP propio es 30/h).
