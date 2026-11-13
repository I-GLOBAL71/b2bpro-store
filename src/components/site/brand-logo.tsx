"use client";

import { useId } from "react";

/**
 * BrandLogo — marque b2bpro.store (v2.5.0).
 *
 * Reprend EXACTEMENT le glyphe du favicon officiel (public/favicon.svg) :
 * « b2b » blanc au trait arrondi sur carré émeraude dégradé. Inline SVG →
 * net à toutes les tailles (header, login admin, sheet mobile), sans requête
 * réseau ni flash d'image — et toujours synchrone avec l'icône d'onglet.
 *
 * Un identifiant de dégradé unique par instance (useId, purgé des « : » —
 * les NCName XML ne les tolèrent pas) évite toute collision url(#…) lorsque
 * plusieurs logos vivent sur la même page.
 */
export function BrandLogo({ className }: { className?: string }) {
  const rawId = useId();
  const gradId = `brand-${rawId.replace(/[^a-zA-Z0-9]/g, "")}`;

  return (
    <svg
      viewBox="0 0 64 64"
      className={className}
      role="img"
      aria-label="Logo b2bpro.store"
      shapeRendering="geometricPrecision"
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#059669" />
          <stop offset="1" stopColor="#34d399" />
        </linearGradient>
      </defs>
      {/* Carré émeraude dégradé, coins arrondis — miroir du favicon. */}
      <rect x="2" y="2" width="60" height="60" rx="15" fill={`url(#${gradId})`} />
      {/* Glyphe « b2b » — identique trait pour trait au favicon officiel. */}
      <g
        fill="none"
        stroke="#ffffff"
        strokeWidth="6"
        strokeLinecap="round"
        transform="translate(3.2 3.2) scale(0.9)"
      >
        {/* b */}
        <path d="M10 12 V52" />
        <path d="M10 32 a10 10 0 1 1 0 20" />
        {/* 2 */}
        <path d="M27 32 a5.5 5.5 0 1 1 9.5 4 L28.5 52 H37" />
        {/* b */}
        <path d="M44 12 V52" />
        <path d="M44 32 a10 10 0 1 1 0 20" />
      </g>
    </svg>
  );
}
