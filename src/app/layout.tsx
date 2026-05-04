import type { Metadata, Viewport } from "next";
import dynamic from 'next/dynamic';
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { GoogleAnalytics } from '@next/third-parties/google';
import { Analytics } from "@vercel/analytics/react";
import { CookieConsent } from "@/components/ui/CookieConsent";
import Script from "next/script";
import { getOptionalApiKeys } from '@/lib/env';
import SystemAnnouncement from "@/components/SystemAnnouncement";
import { Toaster } from "sonner";
import { isTVDevice } from "@/lib/device-detection";
import { headers } from "next/headers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const { appUrl, gaId, adsenseClientId } = getOptionalApiKeys();

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: "FilmiFy - Dónde ver películas y series online | Cine en streaming",
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
    url: "https://filmify.com",
    siteName: "FilmiFy",
    title: "FilmiFy - Dónde ver películas y series online",
    description: "FilmiFy te ayuda a descubrir dónde ver películas y series online, con reseñas, tráileres y proveedores actualizados.",
    images: [
      {
        url: "/logo-icon.svg",
        width: 512,
        height: 512,
        alt: "FilmiFy - Plataforma de Dónde Ver Cine",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "FilmiFy - Dónde ver películas y series online",
    description: "Descubre dónde ver películas y series online, con proveedores de streaming, alquiler y compra.",
    images: ["/logo-icon.svg"],
    creator: "@filmify",
  },
  alternates: {
    canonical: 'https://filmify.me',
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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const isTV = await isTVDevice();
  const headersList = await headers();
  const nonce = headersList.get('x-nonce') ?? undefined;

  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://image.tmdb.org" />
        <link rel="preconnect" href="https://cyiifumieluunoujaxbs.supabase.co" />
      </head>
      <body
        suppressHydrationWarning
        style={{ paddingTop: 'var(--announcement-height, 0px)' }}
        className={`${geistSans.variable} ${geistMono.variable} antialiased text-white ${isTV ? 'tv-mode' : ''}`}
      >
        <SystemAnnouncement />
        <Toaster position="top-center" richColors />
        {children}
        <SpeedInsights />
        <GoogleAnalytics gaId={gaId} />
        <Analytics />
        <CookieConsent />
        <Script id="google-consent-mode" strategy="beforeInteractive" nonce={nonce}>
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('consent', 'default', {
              'ad_storage': 'denied',
              'ad_user_data': 'denied',
              'ad_personalization': 'denied',
              'analytics_storage': 'denied'
            });
          `}
        </Script>

        {/* Google AdSense */}
        {adsenseClientId && (
          <Script
            async
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adsenseClientId}`}
            crossOrigin="anonymous"
            strategy="afterInteractive"
          />
        )}
      </body>
    </html>
  );
}
