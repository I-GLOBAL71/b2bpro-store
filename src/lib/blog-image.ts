/**
 * Gestionnaire des visuels de couverture du blog b2bpro.store
 * 
 * Stratégie de double résilience :
 * 1. CDN Vercel Blob Edge (prioritaire) : instantanément disponible dès la génération,
 *    sans nécessiter de redéploiement Git/Vercel.
 * 2. Fallback local /img/blog/<slug>.webp : servi depuis les assets statiques déployés.
 */

import manifest from "../../public/img/blog/manifest.json";

export const VERCEL_BLOB_BLOG_BASE = "https://lr22nex73oduip5n.public.blob.vercel-storage.com/blog";

/**
 * Retourne l'URL de couverture optimale pour un article de blog.
 * Priorise le CDN Vercel Blob (manifest ou convention d'URL), avec fallback local.
 */
export function getBlogCoverUrl(slug: string): string {
  const m = (manifest as Record<string, { blobUrl?: string }>)[slug];
  if (m?.blobUrl) {
    return m.blobUrl;
  }
  // Par défaut sur le CDN Vercel Blob déterministe
  return `${VERCEL_BLOB_BLOG_BASE}/${slug}.webp`;
}

/**
 * Retourne l'URL locale de secours pour le fallback onError
 */
export function getLocalBlogCoverUrl(slug: string): string {
  return `/img/blog/${slug}.webp`;
}
