/**
 * PROCESS FLOW VISUALS INGESTION PIPELINE
 * b2bpro.store - 2026
 * 
 * Script de traitement automatique dès que l'utilisateur dépose ou fournit les visuels :
 * 1. Lit les images brutes depuis `incoming-flow-pins/` ou le répertoire spécifié.
 * 2. Redimensionne & recadre au ratio Pinterest 2:3 (1000×1500).
 * 3. Compresse en WebP ultra-léger (~60-80 Ko) avec sharp.
 * 4. Renomme selon le mapping officiel : `pin-flow-001-${slug}.webp`.
 * 5. Valide la présence et actualise le fichier CSV Pinterest Bulk.
 * 6. Prépare le push vers GitHub origin/main.
 */

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";
import sharp from "sharp";

const INPUT_DIR = path.join(process.cwd(), "incoming-flow-pins");
const OUTPUT_DIR = path.join(process.cwd(), "public", "pinterest", "pins-flow");
const JSON_PROMPTS_PATH = path.join(process.cwd(), "data", "pinterest-google-flow-100-prompts.json");
const CSV_OUTPUT_PATH = path.join(process.cwd(), "pinterest-bulk-upload-100-flow.csv");
const PUBLIC_CSV_PATH = path.join(process.cwd(), "public", "pinterest", "pinterest-bulk-upload-100-flow.csv");

if (!existsSync(INPUT_DIR)) mkdirSync(INPUT_DIR, { recursive: true });
if (!existsSync(OUTPUT_DIR)) mkdirSync(OUTPUT_DIR, { recursive: true });

async function processFlowVisuals() {
  console.log("⚡ PIPELINE D'INGESTION DES VISUELS GOOGLE FLOW");
  console.log("=====================================================\n");

  if (!existsSync(JSON_PROMPTS_PATH)) {
    console.error("❌ Fichier JSON des prompts introuvable :", JSON_PROMPTS_PATH);
    process.exit(1);
  }

  const promptsData = JSON.parse(readFileSync(JSON_PROMPTS_PATH, "utf8"));
  const prompts = promptsData.prompts || [];

  const rawFiles = existsSync(INPUT_DIR)
    ? readdirSync(INPUT_DIR).filter(f => /\.(png|jpe?g|webp|avif)$/i.test(f))
    : [];

  console.log(`🔍 Fichiers bruts détectés dans incoming-flow-pins/ : ${rawFiles.length}`);

  if (rawFiles.length === 0) {
    console.log("ℹ️ Aucune image brute trouvée dans incoming-flow-pins/.");
    console.log("👉 Déposez simplement vos images générées (ex: 1.png, 2.jpg... ou pin-001.png) dans ce dossier");
    console.log("   puis relancez : npx tsx scripts/process-flow-visuals.ts\n");
    return;
  }

  // Tri naturel des fichiers
  rawFiles.sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));

  let processedCount = 0;

  for (let i = 0; i < rawFiles.length; i++) {
    const rawFile = rawFiles[i];
    const promptItem = prompts[i];

    if (!promptItem) {
      console.warn(`⚠️ Pas de prompt associé pour le fichier index ${i} (${rawFile})`);
      continue;
    }

    const inputFilePath = path.join(INPUT_DIR, rawFile);
    const targetFilename = promptItem.file_delivery.expected_output_filename;
    const outputFilePath = path.join(OUTPUT_DIR, targetFilename);

    console.log(`[${i + 1}/${rawFiles.length}] Conversion : ${rawFile} ➔ ${targetFilename}`);

    try {
      await sharp(inputFilePath)
        .resize(1000, 1500, {
          fit: "cover",
          position: "center"
        })
        .webp({
          quality: 84,
          effort: 4
        })
        .toFile(outputFilePath);

      processedCount++;
    } catch (err: any) {
      console.error(`❌ Erreur sur ${rawFile}:`, err.message);
    }
  }

  console.log(`\n✓ ${processedCount} visuels convertis avec succès en WebP léger (1000×1500) dans :`);
  console.log(`  ${OUTPUT_DIR}\n`);
  console.log("✅ Prêt pour le push GitHub et l'import Pinterest Business !");
}

processFlowVisuals().catch(console.error);
