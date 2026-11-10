/**
 * Génère docs/GSC-SOUMISSION-SERVICES.md — la liste exhaustive des URLs directes
 * des fiches service pour soumission individuelle dans Google Search Console.
 *
 * Usage : bun run scripts/gen-gsc-urls.ts
 */
import { Database } from "bun:sqlite";

const POLE_LABELS: Record<string, string> = {
  "b2b-sales-intelligence": "B2B Sales Intelligence",
  "ecommerce-pricing": "E-commerce & Pricing",
  "ia-rag-data": "IA, RAG & Data",
  "immobilier-local": "Immobilier & Local",
  "social-media-influence": "Social Media & Influence",
  "rh-recrutement": "RH & Recrutement",
  "evenementiel-marches-publics": "Événementiel & Marchés Publics",
  "grand-public": "Grand Public & Quotidien",
  "hotellerie-tourisme": "Hôtellerie & Tourisme",
  "grandes-entreprises": "Grandes Entreprises & Finance",
  "saas-tech": "SaaS & Tech",
  "seo-geo-medias": "SEO, GEO & Médias",
  "formation-sante": "Formation & Santé",
  "logistique-franchises": "Logistique & Franchises",
};

interface ServiceRow {
  slug: string;
  title: string;
  poleSlug: string;
  rating: number;
  reviewsCount: number;
  salesCount: number;
}

const db = new Database("db/custom.db", { readonly: true });
const services = db
  .query(
    "SELECT slug, title, poleSlug, rating, reviewsCount, salesCount FROM Service ORDER BY salesCount DESC, reviewsCount DESC",
  )
  .all() as ServiceRow[];
const poleOrder = (
  db
    .query("SELECT poleSlug, COUNT(*) as n FROM Service GROUP BY poleSlug ORDER BY n DESC")
    .all() as { poleSlug: string; n: number }[]
).map((r) => r.poleSlug);

const lines: string[] = [];
lines.push(`# Soumission Google Search Console — les ${services.length} fiches service individuellement`);
lines.push("");
lines.push(`> **Objet :** procédure de soumission robuste de b2bpro.store à GSC, avec la liste`);
lines.push(`> exhaustive des URLs directes des ${services.length} fiches service (une URL = une page`);
lines.push(`> individuelle indexable, déjà présente individuellement dans \`sitemap.xml\`).`);
lines.push("");
lines.push("---");
lines.push("");
lines.push("## 1. Vérification de propriété — méthode « Fichier HTML » (déjà déployée)");
lines.push("");
lines.push("Le fichier de vérification \`googlec5dc6c64480779bb.html\` est **committé à la racine");
lines.push("\`public/\`** et donc servi sur chaque déploiement :");
lines.push("");
lines.push("- \`https://b2bpro.store/googlec5dc6c64480779bb.html\` (une fois le domaine branché) ;");
lines.push("- \`https://b2bpro-store.vercel.app/googlec5dc6c64480779bb.html\` (dès maintenant).");
lines.push("");
lines.push("Réponse attendue : **HTTP 200**, contenu \`google-site-verification: googlec5dc6c64480779bb.html\`.");
lines.push("\`robots.txt\` ne contient aucune règle \`Disallow\` : le fichier est librement récupérable.");
lines.push("");
lines.push("**Étapes GSC** : *Ajouter une propriété* → **Préfixe URL** \`https://b2bpro.store\` →");
lines.push("*Autres méthodes de vérification* → **Fichier HTML** → (le fichier est déjà en ligne) →");
lines.push("cliquer **« Vérifier »**.");
lines.push("");
lines.push("> ⚠️ La vérification ne peut aboutir **que lorsque le domaine \`b2bpro.store\` est");
lines.push("> branché sur Vercel** (barre latérale → Domains + DNS registrar, runbook §2.3) :");
lines.push("> Google doit pouvoir interroger \`https://b2bpro.store/google…html\`. En attendant,");
lines.push("> le même fichier vérifie la propriété \`https://b2bpro-store.vercel.app\` à tout moment.");
lines.push("> Alternative sans fichier : la balise META (\`GOOGLE_SITE_VERIFICATION\`, runbook §6.2).");
lines.push(">");
lines.push("> ⚠️ **Prérequis absolu — 200 direct sur l'apex, sans redirection** : si");
lines.push("> \`https://b2bpro.store/*\` renvoie une **redirection 308 vers \`www.b2bpro.store\`**");
lines.push("> (sens inversé dans Vercel : www = cible Production, apex ↪ www), la vérification");
lines.push("> **échoue** : Google ne suit pas les redirections pour la méthode fichier HTML.");
lines.push("> Symptôme typique : domaine en « Valid Configuration » dans Vercel mais GSC");
lines.push("> « se comporte comme si rien n'était connecté ». **Inverser** dans Vercel →");
lines.push("> Domains → *Edit* (www → *Redirect To* \`b2bpro.store\` ; vider le *Redirect To*");
lines.push("> de l'apex — runbook §2.3), puis re-cliquer « Vérifier ».");
lines.push("> Contrôle : \`curl -I https://b2bpro.store/googlec5dc6c64480779bb.html\` → **200 direct**.");
lines.push("");
lines.push(`## 2. Soumission groupée — le sitemap (les ${services.length} fiches d'un coup)`);
lines.push("");
lines.push("GSC → **Sitemaps** → saisir \`sitemap.xml\` → **Envoyer**. Le sitemap liste **176 URLs**");
lines.push(`dont **chaque fiche service individuellement** (\`/services/<slug>\`, priorité 0.9,`);
lines.push("\`lastmod\` = date de création réelle) + 14 pages de pôle, blog, vendeurs, pages clés.");
lines.push("C'est le mécanisme officiel de soumission en masse : chaque service y figure");
lines.push("**individuellement** avec sa propre URL.");
lines.push("");
lines.push("## 3. Soumission individuelle — Inspection d'URL (fiche par fiche)");
lines.push("");
lines.push("Pour accélérer la découverte des pages prioritaires : GSC → barre **« Inspection");
lines.push("d'URL »** (en haut) → coller l'URL complète → **« Tester la diffusion »** →");
lines.push("**« Demander l'indexation »** (quota journalier par propriété, ~10-12 demandes/jour");
lines.push("recommandées). Ordre conseillé : best-sellers d'abord (colonne ventes ci-dessous),");
lines.push("puis 2-3 fiches par pôle, puis le reste sur plusieurs jours.");
lines.push("");
lines.push("---");
lines.push("");
lines.push(`## 4. Les ${services.length} URLs directes des fiches service`);
lines.push("");
lines.push("Classées par volume de ventes décroissant dans chaque pôle. Format prêt à coller");
lines.push("dans l'inspection d'URL GSC.");
lines.push("");

for (const pole of poleOrder) {
  const list = services.filter((s) => s.poleSlug === pole);
  lines.push("");
  lines.push(`### ${POLE_LABELS[pole] ?? pole} — ${list.length} services`);
  lines.push("");
  for (const s of list) {
    lines.push(
      `- https://b2bpro.store/services/${s.slug} — ${s.title.replace(/\n/g, " ")} (★${s.rating}, ${s.reviewsCount} avis, ${s.salesCount} ventes)`,
    );
  }
}

lines.push("");
lines.push("---");
lines.push("");
lines.push("*Document généré depuis la base locale le 2026-11-10 (v1.6.2) — mettre à jour à chaque");
lines.push("nouveau service (régénérer via \`bun run scripts/gen-gsc-urls.ts\`).*");
lines.push("");

await Bun.write("docs/GSC-SOUMISSION-SERVICES.md", lines.join("\n"));
console.log(`OK — docs/GSC-SOUMISSION-SERVICES.md : ${services.length} services, ${lines.length} lignes`);
db.close();
