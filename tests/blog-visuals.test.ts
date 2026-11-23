import { describe, it, expect } from "bun:test";
import { existsSync, statSync, readFileSync } from "fs";
import path from "path";
import { db } from "../src/lib/db";
import { getBlogCoverUrl, VERCEL_BLOB_BLOG_BASE } from "../src/lib/blog-image";

describe("Blog Visuals & Cover CDN Integrity", () => {
  it("chaque article de blog en base dispose d'un visuel WebP local de taille valide (> 5 Ko)", async () => {
    const posts = await db.blogPost.findMany({ select: { slug: true } });
    expect(posts.length).toBeGreaterThan(0);

    const blogImgDir = path.join(process.cwd(), "public", "img", "blog");
    for (const post of posts) {
      const filePath = path.join(blogImgDir, `${post.slug}.webp`);
      expect(existsSync(filePath)).toBe(true);
      const st = statSync(filePath);
      expect(st.size).toBeGreaterThan(5000);
    }
  });

  it("chaque article de blog est référencé dans manifest.json avec une URL Vercel Blob active", async () => {
    const posts = await db.blogPost.findMany({ select: { slug: true } });
    const manifestPath = path.join(process.cwd(), "public", "img", "blog", "manifest.json");
    expect(existsSync(manifestPath)).toBe(true);

    const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
    for (const post of posts) {
      const entry = manifest[post.slug];
      expect(entry).toBeDefined();
      expect(typeof entry.blobUrl).toBe("string");
      expect(entry.blobUrl.startsWith("https://")).toBe(true);
      expect(entry.blobUrl).toContain("vercel-storage.com");
    }
  });

  it("la fonction getBlogCoverUrl retourne l'URL CDN Vercel Blob prioritaire", () => {
    const slug = "citation-ia-marques-classement-perplexity-chatgpt";
    const url = getBlogCoverUrl(slug);
    expect(url.startsWith("https://")).toBe(true);
    expect(url).toContain("vercel-storage.com");
    expect(url).toContain(slug);
  });

  it("la fonction getBlogCoverUrl gère un slug inconnu avec l'URL canonique CDN", () => {
    const slugInconnu = "slug-test-non-existant";
    const url = getBlogCoverUrl(slugInconnu);
    expect(url).toBe(`${VERCEL_BLOB_BLOG_BASE}/${slugInconnu}.webp`);
  });
});
