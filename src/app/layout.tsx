import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
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
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 5,
  },
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0b0e11" },
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
  ],
  category: "entertainment",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
