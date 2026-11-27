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
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.public.blob.vercel-storage.com",
      },
    ],
  },
  // Exclusions de traçage serverless (Functions Storage Vercel) :
  // - Purge les ~56 Mo de moteurs WASM/Edge Prisma inutilisés en Node.js
  //   (cockroachdb, mysql, sqlserver, sqlite, edge, source maps) de toutes les fonctions.
  // - Empêche les appels dynamiques path.join(process.cwd(), ...) de embarquer
  //   public/pinterest, db/snapshots, upload, skills, scripts, tests, etc.
  // - Préserve uniquement sur /api/integrity les fichiers vérifiés par guard.ts
  //   (public/img/blog, public/thumbs, public/avatars, public/logo.svg, data/seed.ts,
  //    data/catalog.json, docs/GSC-REINDEXATION.txt, src/**).
  outputFileTracingIncludes: {
    "/api/integrity": [
      "./src/**/*",
      "./public/logo.svg",
      "./public/img/blog/**/*",
      "./public/thumbs/**/*",
      "./public/avatars/**/*",
      "./data/seed.ts",
      "./data/catalog.json",
      "./docs/GSC-REINDEXATION.txt",
    ],
  },
  outputFileTracingExcludes: {
    "*": [
      "./node_modules/**/@prisma/client/runtime/*wasm*",
      "./node_modules/**/@prisma/client/runtime/wasm*",
      "./node_modules/**/@prisma/client/runtime/edge*",
      "./node_modules/**/@prisma/client/runtime/react-native*",
      "./node_modules/**/@prisma/client/runtime/index-browser*",
      "./node_modules/**/.prisma/client/query_engine_bg.*",
      "./node_modules/**/.prisma/client/wasm*",
      "./node_modules/**/.prisma/client/edge*",
      "./node_modules/**/*.map",
      "./node_modules/**/prisma/build/**/*",
      "./node_modules/**/@prisma/engines/**/*",
      "./db/**/*",
      "./public/pinterest/**/*",
      "./incoming-flow-pins/**/*",
      "./upload/**/*",
      "./skills/**/*",
      "./scripts/**/*",
      "./tests/**/*",
      "./tool-results/**/*",
      "./examples/**/*",
      "./mini-services/**/*",
      "./download/**/*",
      "./docs/audits/**/*",
      "./docs/logs/**/*",
      "./docs/IDEES-SERVICES-ANTIGRAVITY.txt",
      "./docs/PLAN-*",
      "./docs/SKILL-*",
      "./docs/AUTHENTIFICATION-*",
      "./docs/DEPLOIEMENT-*",
      "./docs/GSC-SOUMISSION-*",
      "./data/blog/**/*",
      "./data/gen/**/*",
      "./data/prospecting/**/*",
      "./data/pinterest-*",
      "./data/RECHERCHE_*",
      "./data/parse-catalog.ts",
      "./*.zip",
      "./*.csv",
      "./CHANGELOG.md",
      "./*.log",
      "./tsconfig.tsbuildinfo",
    ],
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  async rewrites() {
    return {
      fallback: [
        {
          source: "/img/blog/:slug*.webp",
          destination: "https://lr22nex73oduip5n.public.blob.vercel-storage.com/blog/:slug*.webp",
        },
      ],
    };
  },
};

export default nextConfig;
