import type { Metadata } from 'next';

// page.tsx is a client component, so metadata lives in this layout.
export const metadata: Metadata = {
    title: 'Contacto - FilmiFy',
    description: 'Ponte en contacto con el equipo de FilmiFy: soporte, sugerencias y consultas.',
    alternates: { canonical: '/contact' },
    openGraph: {
        title: 'Contacto - FilmiFy',
        description: 'Ponte en contacto con el equipo de FilmiFy.',
        url: '/contact',
        type: 'website',
    },
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
    return children;
}
