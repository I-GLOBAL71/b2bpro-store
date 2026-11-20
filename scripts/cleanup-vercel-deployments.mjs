// Script intelligent de purge des anciens déploiements Vercel
// Conserve STRICTEMENT le déploiement actif de production + les 2 plus récents (sécurité rollback)
// Purge tous les anciens déploiements obsolètes qui saturent les 10 Go de Functions Storage.

const VERCEL_TOKEN = process.env.VERCEL_TOKEN || process.argv[2];

if (!VERCEL_TOKEN) {
  console.error("❌ ERREUR: Aucun token Vercel fourni.");
  process.exit(1);
}

const headers = {
  Authorization: `Bearer ${VERCEL_TOKEN}`,
  "Content-Type": "application/json",
};

async function fetchJson(url) {
  const res = await fetch(url, { headers });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status} sur ${url}: ${text}`);
  }
  return res.json();
}

async function deleteDeployment(id, teamId) {
  const url = new URL(`https://api.vercel.com/v13/deployments/${id}`);
  if (teamId) url.searchParams.set("teamId", teamId);
  const res = await fetch(url.toString(), {
    method: "DELETE",
    headers,
  });
  if (!res.ok) {
    const err = await res.text();
    return { ok: false, err };
  }
  return { ok: true };
}

async function run() {
  console.log("🔐 Authentification Vercel...");
  const user = await fetchJson("https://api.vercel.com/v2/user");
  console.log(`👤 Utilisateur : ${user.user.username} (${user.user.email})`);

  const teamsData = await fetchJson("https://api.vercel.com/v2/teams").catch(() => ({ teams: [] }));
  const scopes = [
    { name: "Compte Personnel", teamId: null },
    ...teamsData.teams.map((t) => ({ name: `Équipe: ${t.name}`, teamId: t.id })),
  ];

  let totalDeleted = 0;
  let totalPreserved = 0;

  for (const scope of scopes) {
    console.log(`\n======================================================`);
    console.log(`🏢 Scope : ${scope.name} ${scope.teamId ? `(${scope.teamId})` : ""}`);
    console.log(`======================================================`);

    const projectsUrl = new URL("https://api.vercel.com/v9/projects");
    if (scope.teamId) projectsUrl.searchParams.set("teamId", scope.teamId);

    let projects = [];
    try {
      const projData = await fetchJson(projectsUrl.toString());
      projects = projData.projects || [];
    } catch (e) {
      console.log(`ℹ️ Impossible de lister les projets : ${e.message}`);
      continue;
    }

    for (const project of projects) {
      console.log(`\n📁 Projet : ${project.name} (${project.id})`);

      // 1. Récupérer les détails du projet pour connaître le déploiement actif de production
      const projDetailUrl = new URL(`https://api.vercel.com/v9/projects/${project.id}`);
      if (scope.teamId) projDetailUrl.searchParams.set("teamId", scope.teamId);
      
      let activeProdId = null;
      try {
        const details = await fetchJson(projDetailUrl.toString());
        activeProdId = details.targets?.production?.id || null;
      } catch (err) {
        console.warn(`   Avertissement : détails du projet inaccessibles (${err.message})`);
      }

      console.log(`   🔒 Déploiement actif en production : ${activeProdId || "Non défini"}`);

      // 2. Récupérer tous les déploiements (du plus récent au plus ancien)
      let deployments = [];
      let nextTimestamp = null;
      let page = 0;

      do {
        const depUrl = new URL("https://api.vercel.com/v6/deployments");
        depUrl.searchParams.set("projectId", project.id);
        depUrl.searchParams.set("limit", "100");
        if (scope.teamId) depUrl.searchParams.set("teamId", scope.teamId);
        if (nextTimestamp) depUrl.searchParams.set("until", nextTimestamp.toString());

        try {
          const depData = await fetchJson(depUrl.toString());
          if (depData.deployments && depData.deployments.length > 0) {
            deployments.push(...depData.deployments);
            nextTimestamp = depData.pagination?.next || null;
          } else {
            nextTimestamp = null;
          }
        } catch (e) {
          console.error(`   Erreur déploiements : ${e.message}`);
          break;
        }
        page++;
      } while (nextTimestamp && page < 10);

      console.log(`   Nombre total de versions enregistrées : ${deployments.length}`);

      if (deployments.length <= 2) {
        console.log(`   ✨ Déjà optimisé (<= 2 versions). Rien à purger.`);
        totalPreserved += deployments.length;
        continue;
      }

      // Trier par date décroissante (plus récent en premier)
      deployments.sort((a, b) => b.created - a.created);

      // On conserve :
      // - Le déploiement actif actuel (activeProdId)
      // - Les 2 déploiements les plus récents (sécurité rollback)
      const toKeep = new Set();
      if (activeProdId) toKeep.add(activeProdId);
      deployments.slice(0, 2).forEach((d) => toKeep.add(d.uid));

      const toDelete = deployments.filter((d) => !toKeep.has(d.uid));

      console.log(`   🛡️ Versions conservées en ligne / backup : ${toKeep.size}`);
      console.log(`   🗑️ Anciennes versions obsolètes à purger : ${toDelete.length}`);

      totalPreserved += toKeep.size;

      for (const d of toDelete) {
        const dateStr = new Date(d.created).toLocaleDateString("fr-FR", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });
        process.stdout.write(`   Suppression [${d.uid}] (${dateStr}) - ${d.url || ""}... `);
        const res = await deleteDeployment(d.uid, scope.teamId);
        if (res.ok) {
          console.log("✅ Supprimé");
          totalDeleted++;
        } else {
          console.log(`⚠️ Échec: ${res.err}`);
        }
        // Pause de 100ms pour respecter les quotas d'appels API
        await new Promise((r) => setTimeout(r, 100));
      }
    }
  }

  console.log(`\n======================================================`);
  console.log(`🎉 BILAN DU NETTOYAGE VERCEL :`);
  console.log(`- Versions obsolètes purgées avec succès : ${totalDeleted}`);
  console.log(`- Versions actives & rollback protégées : ${totalPreserved}`);
  console.log(`======================================================`);
  console.log(`\n💡 Note : Votre jauge "Functions Storage" (qui était à 8,39 Go) va chuter drastiquement d'ici quelques minutes sur votre tableau de bord Vercel.`);
}

run().catch((err) => {
  console.error("❌ Erreur fatale :", err);
  process.exit(1);
});
