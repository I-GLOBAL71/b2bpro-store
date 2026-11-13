import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { SessionBoundary } from "@/components/site/session-boundary";
import { PwaClient } from "@/components/site/pwa-client";
import { defaultMetadata, SITE } from "@/lib/site";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = defaultMetadata();

/**
 * Viewport PWA (v2.3.0) — couleur de barre émeraude sur l'écran d'accueil
 * installé (Android/desktop) et respect des zones de sécurité iOS.
 */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#059669",
};

/**
 * Icônes du site (v2.0.1) — servies via <link> React 19 (remontés dans le
 * <head>), avec des URLs RELATIVES : le navigateur les résout selon l'origine
 * réelle (localhost, passerelle de prévisualisation ou https://b2bpro.store),
 * ce qui évite toute dépendance à metadataBase.
 *
 * Une seule marque partout : b2bpro.store (« b2b » blanc sur dégradé
 * émeraude) — développement comme production. favicon.ico (16/32/48) reste le
 * repli legacy/Safari ; apple-touch-icon et site.webmanifest complètent
 * (iOS, Android « Ajouter à l'écran d'accueil »).
 */

/**
 * Layout racine — socle commun (polices, JSON-LD Organisation, toasts).
 * Le chrome public (header/footer/annonce/maintenance) vit dans
 * src/app/(public)/layout.tsx ; le panneau d'administration a son propre
 * chrome sous src/app/admin — la maintenance ne bloque jamais l'admin.
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const orgJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "b2bpro.store",
    url: SITE.url,
    description: SITE.description,
    areaServed: "Francophonie",
    slogan: SITE.tagline,
    knowsLanguage: ["fr", "en"],
    sameAs: [],
  };

  return (
    <html lang="fr" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} flex min-h-screen flex-col bg-background font-sans text-foreground antialiased`}
      >
        {/* Icônes du site (remontées dans le <head> par React 19) */}
        <link rel="icon" href="/favicon.ico" sizes="48x48" />
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/site.webmanifest" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }}
        />
        <SessionBoundary>{children}</SessionBoundary>
        {/* PWA v2.3.0 — service worker + invite d'installation écran d'accueil */}
        <PwaClient />
        <Toaster position="bottom-right" richColors />
      </body>
    </html>
  );
}
