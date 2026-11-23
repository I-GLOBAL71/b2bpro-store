#!/usr/bin/env bun
/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  CLI GOOGLE SEARCH CONSOLE & INDEXATION — b2bpro.store
 * ═══════════════════════════════════════════════════════════════════════════
 *
 *  Utilitaire d'administration et d'automatisation de l'indexation :
 *   • bun run scripts/gsc-sync.ts --sitemaps     (re-soumission des sitemaps)
 *   • bun run scripts/gsc-sync.ts --list         (liste des sitemaps enregistrés)
 *   • bun run scripts/gsc-sync.ts --recent 5     (soumission sitemap + 5 récents)
 *   • bun run scripts/gsc-sync.ts --all          (indexation globale articles & services)
 *   • bun run scripts/gsc-sync.ts --inspect <url>(diagnostic complet GSC)
 *   • bun run scripts/gsc-sync.ts --url <url>    (soumission unitaire)
 */

import {
  GSC_DEFAULT_PROPERTY,
  GSC_WWW_PROPERTY,
  GSC_ALL_PROPERTIES,
  getGscAccessToken,
  submitSitemapToGSC,
  inspectUrlGSC,
  submitIndexNow,
  submitNewOrUpdatedContent,
} from "../src/lib/gsc";
import { db } from "../src/lib/db";
import { getSiteUrl } from "../src/lib/env";

function printHelp() {
  console.log(`
Usage: bun run scripts/gsc-sync.ts [options]

Modes:
  --sitemaps            Re-soumet le sitemap.xml aux propriétés GSC (b2bpro.store et www)
  --list                Affiche les sitemaps enregistrés et leur état sur GSC
  --recent [N]          Soumet les N articles de blog et N services les plus récents (défaut : 5)
  --all                 Indexation globale : sitemaps + tous les articles et services via IndexNow & GSC
  --inspect <url>       Inspecte l'état d'indexation d'une URL via l'API URL Inspection GSC
  --url <url>           Soumission complète immédiate pour une URL spécifique (GSC + IndexNow)
  --help                Affiche cette aide
`);
}

async function listRegisteredSitemaps() {
  const token = await getGscAccessToken();
  if (!token) {
    console.error("❌ Impossible d'obtenir le jeton d'authentification Google Search Console.");
    process.exit(1);
  }

  for (const property of GSC_ALL_PROPERTIES) {
    console.log(`\n📋 Sitemaps enregistrés sur la propriété [${property}] :`);
    try {
      const endpoint = `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(
        property
      )}/sitemaps`;
      const res = await fetch(endpoint, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        console.log(`   ⚠️ Erreur HTTP ${res.status} : ${await res.text()}`);
        continue;
      }

      const data = (await res.json()) as any;
      const list = data?.sitemap || [];
      if (list.length === 0) {
        console.log("   (Aucun sitemap enregistré)");
      } else {
        for (const sm of list) {
          console.log(
            `   • ${sm.path} | Dernière soumission : ${sm.lastSubmitted || "inconnue"} | Erreurs : ${
              sm.errors || 0
            } | En attente : ${sm.isPending ? "Oui" : "Non"}`
          );
        }
      }
    } catch (e) {
      console.error(`   ⚠️ Erreur de récupération :`, e);
    }
  }
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
    printHelp();
    return;
  }

  const siteUrl = getSiteUrl();

  // 1. Mode --sitemaps
  if (args.includes("--sitemaps")) {
    console.log("🚀 Re-soumission des Sitemaps à Google Search Console...");
    for (const prop of GSC_ALL_PROPERTIES) {
      const res = await submitSitemapToGSC(prop);
      if (res.ok) {
        console.log(`   ✅ Propriété ${prop} : Sitemap soumis avec succès (HTTP ${res.status})`);
      } else {
        console.log(`   ⚠️ Propriété ${prop} : Échec (HTTP ${res.status}) - ${res.error}`);
      }
    }
    return;
  }

  // 2. Mode --list
  if (args.includes("--list")) {
    await listRegisteredSitemaps();
    return;
  }

  // 3. Mode --inspect <url>
  const inspectIdx = args.indexOf("--inspect");
  if (inspectIdx !== -1) {
    const url = args[inspectIdx + 1];
    if (!url) {
      console.error("❌ Erreur : URL manquante pour --inspect <url>");
      process.exit(1);
    }
    console.log(`\n🔍 Diagnostic Google Search Console (URL Inspection) : ${url}`);
    const res = await inspectUrlGSC(url);
    if (!res.ok) {
      console.error(`❌ Échec de l'inspection (${res.status}) : ${res.error}`);
      process.exit(1);
    }

    const d = res.details!;
    const icon = d.verdict === "PASS" ? "🟢" : d.verdict === "NEUTRAL" ? "🟡" : "🔴";
    console.log(`\n${icon} RÉSULTAT DE L'INSPECTION GSC :`);
    console.log(`   • Verdict         : ${d.verdict}`);
    console.log(`   • État Couverture : ${d.coverageState}`);
    console.log(`   • Autorisation    : ${d.indexingState}`);
    console.log(`   • Robots.txt      : ${d.robotsTxtState}`);
    console.log(`   • Dernier Crawl   : ${d.lastCrawlTime || "Pas encore crawlé"}`);
    console.log(`   • Fetch HTTP      : ${d.pageFetchState || "Non renseigné"}`);
    console.log(`   • Canonique Google: ${d.googleCanonical || "N/A"}`);
    if (d.inspectionResultLink) {
      console.log(`   • Lien GSC direct : ${d.inspectionResultLink}`);
    }
    return;
  }

  // 4. Mode --url <url>
  const urlIdx = args.indexOf("--url");
  if (urlIdx !== -1) {
    const url = args[urlIdx + 1];
    if (!url) {
      console.error("❌ Erreur : URL manquante pour --url <url>");
      process.exit(1);
    }
    const type = url.includes("/blog/") ? "blog" : url.includes("/services/") ? "service" : "general";
    await submitNewOrUpdatedContent({ url, type });
    return;
  }

  // 5. Mode --recent [N]
  const recentIdx = args.indexOf("--recent");
  if (recentIdx !== -1) {
    const nVal = parseInt(args[recentIdx + 1] || "5", 10) || 5;
    console.log(`\n⚡ Soumission des ${nVal} derniers articles de blog et ${nVal} derniers services...`);

    // 1. Sitemap
    console.log("→ Étape 1 : Re-soumission du sitemap à Google Search Console...");
    for (const prop of GSC_ALL_PROPERTIES) {
      await submitSitemapToGSC(prop);
    }

    // 2. Derniers articles
    const posts = await db.blogPost.findMany({
      orderBy: { publishedAt: "desc" },
      take: nVal,
      select: { slug: true, title: true },
    });

    console.log(`\n→ Étape 2 : Inspection & Ping des ${posts.length} derniers articles...`);
    for (const post of posts) {
      await submitNewOrUpdatedContent({
        type: "blog",
        slug: post.slug,
        title: post.title,
      });
      await new Promise((r) => setTimeout(r, 200));
    }

    // 3. Derniers services
    const services = await db.service.findMany({
      orderBy: { createdAt: "desc" },
      take: nVal,
      select: { slug: true, title: true },
    });

    console.log(`\n→ Étape 3 : Inspection & Ping des ${services.length} derniers services...`);
    for (const svc of services) {
      await submitNewOrUpdatedContent({
        type: "service",
        slug: svc.slug,
        title: svc.title,
      });
      await new Promise((r) => setTimeout(r, 200));
    }

    console.log("\n🎉 Synchronisation récente terminée avec succès !");
    return;
  }

  // 6. Mode --all
  if (args.includes("--all")) {
    console.log("🌐 INDEXATION GLOBALE DE LA PLATEFORME b2bpro.store");
    console.log("=" .repeat(70));

    // 1. Sitemap
    console.log("→ [1/3] Re-soumission des Sitemaps à Google Search Console...");
    for (const prop of GSC_ALL_PROPERTIES) {
      const smRes = await submitSitemapToGSC(prop);
      console.log(`   ✓ Propriété ${prop} : Sitemap notifié (HTTP ${smRes.status})`);
    }

    // 2. Collecte de toutes les URLs
    const [posts, services] = await Promise.all([
      db.blogPost.findMany({ select: { slug: true } }),
      db.service.findMany({ select: { slug: true } }),
    ]);

    const allUrls = [
      `${siteUrl}/`,
      `${siteUrl}/services`,
      `${siteUrl}/blog`,
      ...posts.map((p) => `${siteUrl}/blog/${p.slug}`),
      ...services.map((s) => `${siteUrl}/services/${s.slug}`),
    ];

    console.log(`\n→ [2/3] Notification IndexNow pour ${allUrls.length} URLs (moteurs de recherche universels)...`);
    // Découpage par lots de 50 pour IndexNow
    const chunkSize = 50;
    for (let i = 0; i < allUrls.length; i += chunkSize) {
      const chunk = allUrls.slice(i, i + chunkSize);
      const res = await submitIndexNow(chunk);
      console.log(`   ✓ Lot ${Math.floor(i / chunkSize) + 1}/${Math.ceil(allUrls.length / chunkSize)} (${chunk.length} URLs) soumis à IndexNow`);
      await new Promise((r) => setTimeout(r, 300));
    }

    // 3. Échantillon d'inspection Google Search Console sur les 5 derniers articles et services
    console.log(`\n→ [3/3] Échantillonnage d'inspection GSC sur les contenus récents...`);
    const recentPosts = posts.slice(0, 3);
    for (const p of recentPosts) {
      const url = `${siteUrl}/blog/${p.slug}`;
      const insp = await inspectUrlGSC(url);
      console.log(`   • Article : /blog/${p.slug} -> GSC : ${insp.verdict || "Soumis"}`);
      await new Promise((r) => setTimeout(r, 200));
    }

    console.log("\n═════════════════════════════════════════════════════════════════");
    console.log(`🎉 INDEXATION GLOBALE TERMINÉE POUR ${allUrls.length} CONTENUS !`);
    console.log("═════════════════════════════════════════════════════════════════\n");
    return;
  }

  printHelp();
}

main().catch((err) => {
  console.error("❌ Erreur gsc-sync :", err);
  process.exit(1);
});
