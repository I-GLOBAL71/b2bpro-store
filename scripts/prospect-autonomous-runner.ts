/**
 * Runner CLI autonome de prospection B2B — b2bpro.store
 * Usage :
 *   bun run scripts/prospect-autonomous-runner.ts --wave=launch --limit=5
 *   bun run scripts/prospect-autonomous-runner.ts --dry-run --limit=3
 *   bun run scripts/prospect-autonomous-runner.ts --wave=midi --limit=5 --skip-social
 */

import { existsSync, readFileSync } from "fs";
import path from "path";
import { runAutonomousProspectingWave } from "../src/lib/prospecting/engine";
import { syncProspectingToNeon } from "../src/lib/prospecting/store";

function loadDotEnvIfNeeded(): void {
  const envPath = path.join(process.cwd(), ".env");
  if (!existsSync(envPath)) return;
  const content = readFileSync(envPath, "utf8");
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) {
      process.env[key] = val;
    }
  }
}

async function main() {
  loadDotEnvIfNeeded();

  const args = process.argv.slice(2);
  const waveArg = args.find((a) => a.startsWith("--wave="))?.split("=")[1] || "auto";
  const limitArg = Number(args.find((a) => a.startsWith("--limit="))?.split("=")[1] || "5");
  const dryRun = args.includes("--dry-run");
  const skipSocial = args.includes("--skip-social");
  const noSync = args.includes("--no-sync");

  const emailLimit = Number.isFinite(limitArg) ? Math.max(1, Math.min(50, limitArg)) : 5;

  console.log("===============================================================");
  console.log(`  MOTEUR PROSPECTION B2B — b2bpro.store (${dryRun ? "SIMULATION" : "PRODUCTION"})`);
  console.log(`  Vague : ${waveArg} | Plafond vague : ${emailLimit} | Dev.to : ${skipSocial ? "non" : "oui"}`);
  console.log("===============================================================");

  const summary = await runAutonomousProspectingWave({
    wave: waveArg,
    emailLimit,
    dryRun,
    skipSocial,
  });

  console.log(`\n✓ Entreprises auditées : ${summary.newAudited}`);
  console.log(`✓ Premiers emails envoyés : ${summary.initialSent}`);
  console.log(`✓ Relances J+3 envoyées : ${summary.followupsSent}`);
  console.log(`✓ Cumul aujourd'hui : ${summary.emailsSentToday} / ${summary.dailyEmailCap}`);
  if (summary.devtoPublished) {
    console.log(`✓ Article Dev.to : ${summary.devtoPublished.externalUrl}`);
  }
  if (summary.errors.length > 0) {
    console.log(`! Avertissements (${summary.errors.length}) :`);
    for (const err of summary.errors.slice(0, 8)) {
      console.log(`  - ${err}`);
    }
  }
  if (summary.previewSamples.length > 0) {
    console.log("\n--- Aperçu des messages ---");
    for (const sample of summary.previewSamples) {
      console.log(`> ${sample.companyName} <${sample.email}> [${sample.domain}]`);
      console.log(`  Service : /services/${sample.serviceSlug}`);
      console.log(`  Objet   : ${sample.subject}`);
      console.log(`  Points  : ${sample.issues.join(" | ")}`);
      console.log(`  Extrait : ${sample.textBody.slice(0, 260).replace(/\n/g, " ")}...`);
    }
  }

  if (!dryRun && !noSync && process.env.NEON_DATABASE_URL) {
    console.log("\nSynchronisation rapide SiteConfig (prospecting:*) vers Neon...");
    const syncRes = await syncProspectingToNeon();
    if (syncRes.error) {
      console.warn("! Synchronisation Neon non bloquante :", syncRes.error);
    } else {
      console.log(`✓ ${syncRes.synced} clé(s) prospection synchronisée(s) sur Neon PostgreSQL.`);
    }
  }
}

main().catch((err) => {
  console.error("Erreur fatale runner prospection:", err);
  process.exit(1);
});
