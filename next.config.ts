import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Sortie standalone pour l'auto-hébergement local (`bun run start`) —
  // désactivée sur Vercel (inutile et source de friction avec leur runtime,
  // l'environnement VERCEL est injecté automatiquement par la plateforme).
  ...(process.env.VERCEL ? {} : { output: "standalone" }),
  /* Images distantes : miniatures/avatars WebP hébergés sur Vercel Blob
     (production — voir scripts/thumbs-to-blob.ts et docs/DEPLOIEMENT-VERCEL.md).
     Les SVG locaux de développement restent servis sans configuration. */
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.public.blob.vercel-storage.com",
      },
    ],
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
};

export default nextConfig;
