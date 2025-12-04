import type { Metadata, Viewport } from "next";
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
  title: "FilmiFy - Tu Universo de Películas | Descubre y Organiza Cine",
  description: "Descubre, organiza y disfruta de miles de películas y series. Tu colección personal de cine en un solo lugar. Búsqueda inteligente, listas personalizadas y catálogo actualizado diariamente.",
  keywords: [
    "películas",
    "cine",
    "series",
    "streaming",
    "catálogo de películas",
    "organizar películas",
    "lista de películas",
    "favoritos",
    "cinéfilos",
    "base de datos de películas",
    "TMDB",
    "películas online",
    "descubrir películas",
    "recomendaciones de películas"
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
    title: "FilmiFy - Tu Universo de Películas",
    description: "Descubre, organiza y disfruta de miles de películas. Búsqueda inteligente, listas personalizadas y catálogo actualizado diariamente.",
    images: [
      {
        url: "/logo-icon.svg",
        width: 512,
        height: 512,
        alt: "FilmiFy - Plataforma de Gestión de Películas",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "FilmiFy - Tu Universo de Películas",
    description: "Descubre, organiza y disfruta de miles de películas. Tu colección personal de cine en un solo lugar.",
    images: ["/logo-icon.svg"],
    creator: "@filmify",
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

  return (
    <html lang="es" suppressHydrationWarning>
      <body
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
        <Script id="google-consent-mode" strategy="beforeInteractive">
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
