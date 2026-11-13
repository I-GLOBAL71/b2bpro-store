"use client";

import { useState } from "react";
import Image from "next/image";

/**
 * Galerie 3 miniatures d'un service.
 * `thumbUrls` : URLs absolues WebP (Vercel Blob) issues de Service.thumbUrls —
 * fallback automatique sur les SVG locaux /thumbs/<slug>-{1,2,3}.svg.
 */
export function ServiceGallery({
  slug,
  alt,
  thumbUrls,
}: {
  slug: string;
  alt: string;
  thumbUrls?: string[];
}) {
  const [active, setActive] = useState(0);
  const images =
    thumbUrls && thumbUrls.length === 3
      ? thumbUrls
      : [1, 2, 3].map((v) => `/thumbs/${slug}-${v}.svg`);

  return (
    <div className="flex flex-col gap-3">
      <div className="relative aspect-[16/10] overflow-hidden rounded-2xl border border-border bg-muted">
        <Image
          key={active}
          src={images[active]}
          alt={`${alt}, miniature ${active + 1} sur 3`}
          fill
          priority
          sizes="(max-width: 1024px) 100vw, 60vw"
          className="animate-fade-up object-cover"
        />
      </div>
      <div className="grid grid-cols-3 gap-3" role="tablist" aria-label="Miniatures du service">
        {images.map((src, i) => (
          <button
            key={src}
            type="button"
            role="tab"
            aria-selected={active === i}
            aria-label={`Voir la miniature ${i + 1}`}
            onClick={() => setActive(i)}
            className={`relative aspect-[16/10] overflow-hidden rounded-xl border-2 transition-all ${
              active === i
                ? "border-primary shadow-sm"
                : "border-transparent opacity-70 hover:opacity-100"
            }`}
          >
            <Image src={src} alt="" fill sizes="20vw" className="object-cover" />
          </button>
        ))}
      </div>
    </div>
  );
}
