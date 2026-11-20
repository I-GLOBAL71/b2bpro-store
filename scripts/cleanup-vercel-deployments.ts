/**
 * Script de nettoyage automatique des prévisualisations et anciens déploiements Vercel
 * Conserve strictement la production active et supprime les builds preview/orphelins.
 */

const VERCEL_TOKEN = process.env.VERCEL_TOKEN || process.argv[2];

if (!VERCEL_TOKEN) {
  console.error("❌ ERREUR: Aucun token Vercel fourni.");
  console.log("Usage: bun run scripts/cleanup-vercel-deployments.ts <VERCEL_TOKEN>");
  process.exit(1);
}

const headers = {
  Authorization: `Bearer ${VERCEL_TOKEN}`,
  "Content-Type": "application/json",
};

interface Project {
  id: string;
  name: string;
}

interface Deployment {
  uid: string;
  name: string;
  url: string;
  created: number;
  state: string;
  target?: string;
  type?: string;
}

async function getProjects(): Promise<Project[]> {
  const res = await fetch("https://api.vercel.com/v9/projects", { headers });
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Échec de récupération des projets (${res.status}): ${errorText}`);
  }
  const data = await res.json();
  return data.projects || [];
}

async function getDeployments(projectId: string): Promise<Deployment[]> {
  const deployments: Deployment[] = [];
  let nextTimestamp: number | null = null;
  let page = 0;

  do {
    const url = new URL("https://api.vercel.com/v6/deployments");
    url.searchParams.set("projectId", projectId);
    url.searchParams.set("limit", "100");
    if (nextTimestamp) {
      url.searchParams.set("until", nextTimestamp.toString());
    }

    const res = await fetch(url.toString(), { headers });
    if (!res.ok) break;

    const data = await res.json();
    if (data.deployments && data.deployments.length > 0) {
      deployments.push(...data.deployments);
      nextTimestamp = data.pagination?.next || null;
    } else {
      nextTimestamp = null;
    }
    page++;
  } while (nextTimestamp && page < 10);

  return deployments;
}

async function deleteDeployment(id: string): Promise<boolean> {
  const res = await fetch(`https://api.vercel.com/v13/deployments/${id}`, {
    method: "DELETE",
    headers,
  });
  return res.ok;
}

async function run() {
  console.log("🔍 Connexion à l'API Vercel...");
  try {
    const projects = await getProjects();
    console.log(`✅ ${projects.length} projet(s) détecté(s) sur le compte Vercel :`);
    projects.forEach((p) => console.log(`   - ${p.name} (${p.id})`));

    let totalDeleted = 0;

    for (const project of projects) {
      console.log(`\n📂 Analyse de : ${project.name}...`);
      const allDeployments = await getDeployments(project.id);
      console.log(`   Total de déploiements trouvés : ${allDeployments.length}`);

      // Séparer production et previews
      const prodDeployments = allDeployments.filter((d) => d.target === "production");
      const previewDeployments = allDeployments.filter((d) => d.target !== "production");

      console.log(`   - Déploiements Production : ${prodDeployments.length} (PROTÉGÉS 🔒)`);
      console.log(`   - Déploiements Preview/Test : ${previewDeployments.length} à purger 🧹`);

      for (const d of previewDeployments) {
        process.stdout.write(`   Suppression de ${d.uid} (${d.url || "sans URL"})... `);
        const ok = await deleteDeployment(d.uid);
        if (ok) {
          console.log("✅");
          totalDeleted++;
        } else {
          console.log("⚠️ Échec");
        }
        // Léger délai pour respecter les rate limits de l'API Vercel
        await new Promise((r) => setTimeout(r, 150));
      }
    }

    console.log(`\n🎉 Nettoyage terminé ! ${totalDeleted} déploiement(s) preview supprimé(s).`);
    console.log("ℹ️ Votre jauge Functions Storage descendra sur le tableau de bord Vercel d'ici quelques minutes.");
  } catch (err: any) {
    console.error("❌ Erreur pendant le nettoyage :", err.message);
  }
}

run();
