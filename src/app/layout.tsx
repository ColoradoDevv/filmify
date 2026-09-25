import type { Metadata, Viewport } from "next";
import { serializeJsonLd } from '@/lib/json-ld';

import { Geist, Geist_Mono } from "next/font/google";

import "./globals.css";
import { CookieConsent } from "@/components/ui/CookieConsent";
import ReducedMotionBoot from "@/components/layout/ReducedMotionBoot";
import TVModeBoot from "@/components/layout/TVModeBoot";
import WhatsNewModal from "@/components/WhatsNewModal";
import Script from "next/script";
import { getOptionalApiKeys } from '@/lib/env';
import { buildGaInitScript, CONSENT_MODE_DEFAULT_SCRIPT, REGISTER_SW_SCRIPT } from '@/lib/inline-scripts';
import SystemAnnouncement from "@/components/SystemAnnouncement";
import { DonateFloating } from "@/components/ui/DonateButton";

import { Toaster } from "sonner";





const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const { appUrl, gaId } = getOptionalApiKeys();

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  // Las páginas que tienen su propio <title> ya incluyen la marca "FilmiFy"
  // de forma consistente, así que NO usamos un template "%s | FilmiFy"
  // (duplicaría la marca). Este título es solo el fallback para páginas que
  // no fijan uno propio.
  title: "FilmiFy - Ver películas y series online gratis | Cine en streaming",
  description: "FilmiFy te ayuda a descubrir dónde ver películas y series online, con reseñas, tráileres y proveedores actualizados. Encuentra opciones de streaming, alquiler y compra desde un solo lugar.",
  keywords: [
    "ver películas online",
    "dónde ver películas",
    "ver series online",
    "dónde ver series",
    "streaming",
    "películas",
    "series",
    "catálogo de películas",
    "ver cine online",
    "películas en streaming",
    "opciones de streaming",
    "alquilar películas",
    "comprar películas",
    "recomendaciones de películas",
    "buscar películas"
  ],
  authors: [{ name: "FilmiFy Team" }],
  creator: "FilmiFy",
  publisher: "FilmiFy",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "es_ES",
    url: appUrl,
    siteName: "FilmiFy",
    title: "FilmiFy - Dónde ver películas y series online",
    description: "FilmiFy te ayuda a descubrir dónde ver películas y series online, con reseñas, tráileres y proveedores actualizados.",
    // og:image is generated dynamically by the opengraph-image route.
    // Provide a default (home) image URL so crawlers and social cards get a concrete URL.
    images: [
      { url: `${appUrl}/opengraph-image?type=home`, width: 1200, height: 630 }
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "FilmiFy - Dónde ver películas y series online",
    description: "Descubre dónde ver películas y series online, con proveedores de streaming, alquiler y compra.",
    // twitter:image falls back to the generated og:image SVG.
    creator: "@filmify",
  },
  alternates: {
    canonical: '/',
  },
  category: "entertainment",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0b0e11" },
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>

        {/* Apple touch icons. La convención src/app/apple-icon.png ya emite el
            <link rel="apple-touch-icon"> estándar; estos cubren los nombres de
            archivo legados que algunos clientes iOS piden directos (aparecían
            como 404 en los logs). Los PNG viven en /public. */}
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="apple-touch-icon-precomposed" href="/apple-touch-icon-precomposed.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/touch-icon-iphone.png" />
        <link rel="apple-touch-icon" sizes="152x152" href="/touch-icon-ipad.png" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#0b0e11" />
        <link rel="preconnect" href="https://image.tmdb.org" />
        <link rel="preconnect" href="https://cyiifumieluunoujaxbs.supabase.co" />
        {/* Player embeds — connect early so playback starts faster */}
        <link rel="preconnect" href="https://vimeus.com" />
        <link rel="preconnect" href="https://vaplayer.ru" />
        <link rel="preconnect" href="https://vidcore.org" />
        <link rel="preconnect" href="https://vsembed.su" />
        {/* Site-wide structured data: WebSite (enables Google sitelinks search
            box) + Organization (brand knowledge panel). */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: serializeJsonLd([
              {
                '@context': 'https://schema.org',
                '@type': 'WebSite',
                name: 'FilmiFy',
                url: appUrl,
                potentialAction: {
                  '@type': 'SearchAction',
                  target: {
                    '@type': 'EntryPoint',
                    urlTemplate: `${appUrl}/search?q={search_term_string}`,
                  },
                  'query-input': 'required name=search_term_string',
                },
              },
              {
                '@context': 'https://schema.org',
                '@type': 'Organization',
                name: 'FilmiFy',
                url: appUrl,
                logo: `${appUrl}/logo-icon.svg`,
                sameAs: [
                  'https://twitter.com/filmify',
                  'https://facebook.com/filmify',
                ],
              },
            ]),
          }}
        />
      </head>
      <body
        suppressHydrationWarning
        style={{ paddingTop: 'var(--announcement-height, 0px)' }}
        className={`${geistSans.variable} ${geistMono.variable} antialiased text-white`}
      >
        <SystemAnnouncement />
        <Toaster position="top-center" richColors />
        {children}

        {/* Botón flotante de donación. Oculto en modo TV vía CSS
            (body.tv-mode .donate-floating, globals.css) — la detección de TV
            corre en cliente (TVModeBoot), no aquí. Persistente, descartable
            por 7 días (recordado en localStorage). */}
        <DonateFloating />

        {/* Analítica de Google. Sin nonce: contenido fijo por despliegue
            (ver @/lib/inline-scripts), permitido en el CSP por hash. */}
        <Script id="_next-ga-init" strategy="afterInteractive">
          {buildGaInitScript(gaId)}
        </Script>
        <Script
          id="_next-ga"
          src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
          strategy="afterInteractive"
        />
        <CookieConsent />
        <ReducedMotionBoot />
        <TVModeBoot />
        <WhatsNewModal />

        {/* Sin nonce: contenido fijo (ver @/lib/inline-scripts), permitido
            en el CSP por hash en vez de por nonce por petición. */}
        <Script id="google-consent-mode" strategy="beforeInteractive">
          {CONSENT_MODE_DEFAULT_SCRIPT}
        </Script>

        {/* Sin nonce: mismo motivo. Sin esto el CSP bloquearía el script y
            el service worker nunca se registraría (la PWA deja de
            instalarse y de cachear). */}
        <Script id="register-sw" strategy="afterInteractive">
          {REGISTER_SW_SCRIPT}
        </Script>

        <Script
          defer
          src="https://analytics.filmify.me/script.js"
          data-website-id="2824ea64-ae5f-496e-8f86-9919461f025c"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}
