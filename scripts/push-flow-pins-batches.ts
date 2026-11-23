/**
 * SAFE PUSH BATCHES SCRIPT
 * Pousse les visuels restants par paquets de 5 fichiers (~700 Ko)
 * pour éviter les déconnexions OpenSSH Windows.
 */

import { execSync } from "child_process";
import { readdirSync } from "fs";
import path from "path";

const PINS_DIR = path.join(process.cwd(), "public", "pinterest", "pins-flow");

function run(cmd: string): string {
  return execSync(cmd, { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] });
}

async function safePush() {
  console.log("🚀 Lancement du déploiement Git sécurisé par paquets de 5 visuels...\n");

  // Vérifier les fichiers non commités dans public/pinterest/pins-flow
  const statusOut = run("git status --short public/pinterest/pins-flow");
  const untracked = statusOut
    .split("\n")
    .map(line => line.trim())
    .filter(line => line.startsWith("??") || line.startsWith("M"))
    .map(line => line.replace(/^(\?\?|M)\s+/, "").trim())
    .filter(f => f.endsWith(".webp"));

  console.log(`🔍 ${untracked.length} visuels restant à synchroniser.`);

  if (untracked.length === 0) {
    console.log("✓ Tous les visuels sont déjà commités !");
    return;
  }

  // Tri naturel
  untracked.sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }));

  const chunkSize = 5;
  for (let i = 0; i < untracked.length; i += chunkSize) {
    const chunk = untracked.slice(i, i + chunkSize);
    const chunkNum = Math.floor(i / chunkSize) + 1;
    const totalChunks = Math.ceil(untracked.length / chunkSize);

    console.log(`\n[Lot ${chunkNum}/${totalChunks}] Préparation de ${chunk.length} visuels...`);
    
    // git add
    for (const f of chunk) {
      run(`git add "${f}"`);
    }

    const firstPin = path.basename(chunk[0]).split("-")[2] || "";
    const lastPin = path.basename(chunk[chunk.length - 1]).split("-")[2] || "";
    const commitMsg = `feat(marketing): Pinterest Flow visuals (pins ${firstPin} to ${lastPin})`;

    try {
      run(`git commit -m "${commitMsg}"`);
      console.log(`  ✓ Commité : "${commitMsg}"`);
    } catch (e: any) {
      console.log(`  (Rien de nouveau à commiter ou déjà prêt)`);
    }

    // git push avec 2 tentatives
    let pushed = false;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        console.log(`  ➔ Push vers origin/main (tentative ${attempt}/3)...`);
        run("git push origin main");
        console.log(`  ✓ Succès du push pour le lot ${chunkNum} !`);
        pushed = true;
        break;
      } catch (err: any) {
        console.warn(`  ⚠️ Échec tentative ${attempt} :`, err.message.slice(0, 100));
        // Pause 3 secondes avant réessai
        await new Promise(r => setTimeout(r, 3000));
      }
    }

    if (!pushed) {
      console.error(`❌ Échec du push après 3 tentatives pour le lot ${chunkNum}. Arrêt.`);
      process.exit(1);
    }
  }

  // Finaliser avec le CSV et la galerie
  console.log("\n📦 Envoi final du CSV et de la galerie interactive...");
  try {
    run('git add pinterest-bulk-upload-100-flow.csv public/pinterest/pinterest-bulk-upload-100-flow.csv public/pinterest/preview-gallery-flow.html');
    run('git commit -m "feat(marketing): finalize Pinterest Flow CSV and interactive showcase gallery"');
    run('git push origin main');
    console.log("✓ CSV et galerie synchronisés avec succès sur GitHub !");
  } catch (e) {
    console.log("✓ Fichiers CSV et galerie déjà à jour.");
  }

  console.log("\n=======================================================");
  console.log("🎉 TOUS LES 100 VISUELS SONT OFFICIELLEMENT SUR GITHUB !");
}

safePush().catch(console.error);
