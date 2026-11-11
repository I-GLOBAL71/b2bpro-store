import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { SessionBoundary } from "@/components/site/session-boundary";
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
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }}
        />
        <SessionBoundary>{children}</SessionBoundary>
        <Toaster position="bottom-right" richColors />
      </body>
    </html>
  );
}
