import { NextResponse } from 'next/server';
import { Resend } from 'resend';

export async function POST(request: Request) {
    const resend = new Resend(process.env.RESEND_API_KEY);

    try {
        const body = await request.json();
        const { name, email, message } = body;

        // Simple validation
        if (!name || !email || !message) {
            return NextResponse.json(
                { error: 'Todos los campos son requeridos' },
                { status: 400 }
            );
        }

        // Send email
        const data = await resend.emails.send({
            from: 'FilmiFy Contact <onboarding@resend.dev>', // Use verified domain or testing domain
            to: 'juanmakate0517@gmail.com', // Verified testing email
            subject: `Nuevo mensaje de contacto de ${name}`,
            replyTo: email,
            text: `Nombre: ${name}\nEmail: ${email}\n\nMensaje:\n${message}`,
            html: `
                <h1>Nuevo Mensaje de Contacto</h1>
                <p><strong>Nombre:</strong> ${name}</p>
                <p><strong>Email:</strong> ${email}</p>
                <p><strong>Mensaje:</strong></p>
                <p>${message.replace(/\n/g, '<br>')}</p>
            `,
        });

        if (data.error) {
            return NextResponse.json({ error: data.error.message || 'Error al enviar el email' }, { status: 500 });
        }

        return NextResponse.json({ success: true, data });
    } catch (error) {
        return NextResponse.json(
            { error: 'Error interno del servidor' },
            { status: 500 }
        );
    }
}
