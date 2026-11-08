/**
 * Parseur du catalogue CATALOGUE_INTEGRAL_112_SERVICES_COMEUP.md
 * Extrait les 112 services (12 fondateurs + 100 complémentaires) en JSON structuré.
 */
import { readFileSync, writeFileSync } from "fs";

const SRC = "/home/z/my-project/upload/CATALOGUE_INTEGRAL_112_SERVICES_COMEUP.md";
const OUT = "/home/z/my-project/data/catalog.json";

const raw = readFileSync(SRC, "utf-8").replace(/\r\n/g, "\n");
const lines = raw.split("\n");

interface ParsedOption {
  name: string;
  priceExtra: number;
  daysExtra: number;
  monthly: boolean;
  description: string;
}
interface ParsedService {
  code: string; // "F-01" ou "#01"
  name: string;
  comeupTitle: string;
  category: string;
  pole: string;
  basePrice: number;
  deliveryDays: number;
  description: string;
  options: ParsedOption[];
  instructions: string;
  isFounder: boolean;
}

// Mapping des services fondateurs vers les pôles (catégories principales)
const founderPoleMap: Record<string, string> = {
  "F-01": "Pôle 3 · IA, RAG & Data Engineering",
  "F-02": "Pôle 2 · E-commerce & Pricing Intelligence",
  "F-03": "Pôle 1 · B2B Sales Intelligence",
  "F-04": "Pôle 7 · Événementiel & Marchés Publics",
  "F-05": "Pôle 1 · B2B Sales Intelligence",
  "F-06": "Pôle 5 · Social Media & Influence",
  "F-07": "Pôle 5 · Social Media & Influence",
  "F-08": "Pôle 12 · SEO, GEO & Médias",
  "F-09": "Pôle 4 · Immobilier & Commerce Local",
  "F-10": "Pôle 9 · Hôtellerie, Restauration & Tourisme",
  "F-11": "Pôle 7 · Événementiel & Marchés Publics",
  "F-12": "Pôle 1 · B2B Sales Intelligence",
};

function cleanText(t: string): string {
  return t.replace(/\s+/g, " ").trim();
}

function parsePrice(s: string): number {
  const m = s.match(/(\d+(?:[.,]\d+)?)/);
  return m ? parseFloat(m[1].replace(",", ".")) : 0;
}

function parseDays(s: string): number {
  const m = s.match(/(\d+)\s*j/i);
  return m ? parseInt(m[1], 10) : 0;
}

const services: ParsedService[] = [];
let currentPole = "Services Fondateurs";
let i = 0;

function parseOptionLine(line: string): ParsedOption | null {
  // Format: - **Name (+35 € | +1j) :** Description
  const m = line.match(/^\s*-\s*\*\*(.+?)\s*\(\+(\d+(?:[.,]\d+)?)\s*€\s*(?:\/mois)?\s*(?:\|\s*\+(\d+)\s*j)?\s*\)\s*:?\*\*\s*(.*)$/);
  if (m) {
    const monthly = /\+.*€\s*\/mois/.test(line) || /mois/.test(m[1] + line);
    return {
      name: cleanText(m[1]),
      priceExtra: parsePrice(m[2]),
      daysExtra: m[3] ? parseInt(m[3], 10) : 0,
      monthly: /mois/.test(line),
      description: cleanText(m[4] || ""),
    };
  }
  return null;
}

function parseInlineOptions(line: string): ParsedOption[] {
  // Format: * **Options :** Pack 3 Concurrents (+30 €), Pack 5 Concurrents (+55 €), ...
  const m = line.match(/\*\*\s*Options\s*:?\*\*\s*:?\s*(.+)$/);
  if (!m) return [];
  const parts = m[1].split(/(?<=\(\+\d+\s*€(?:\s*\/mois)?\)),\s*/);
  const opts: ParsedOption[] = [];
  for (const part of parts) {
    const om = part.match(/^(.+?)\s*\(\+(\d+(?:[.,]\d+)?)\s*€(\/mois)?\)\s*[,]?\s*(.*)$/);
    if (om) {
      opts.push({
        name: cleanText(om[1].replace(/^[-•]\s*/, "")),
        priceExtra: parsePrice(om[2]),
        daysExtra: 0,
        monthly: Boolean(om[3]),
        description: cleanText(om[4] || ""),
      });
    }
  }
  return opts;
}

while (i < lines.length) {
  const line = lines[i];

  // Détection du pôle courant
  const poleMatch = line.match(/^##\s+.+PÔLE\s+(\d+)\s*:\s*(.+)$/);
  if (poleMatch) {
    const fullName = cleanText(poleMatch[2]).replace(/\s*\(Services[^)]*\)\s*$/i, "");
    currentPole = `Pôle ${poleMatch[1]} · ${fullName}`;
    i++;
    continue;
  }

  // Détection d'un service
  const svcMatch = line.match(/^###\s+Service\s+(F-\d+|#\d+)\s*:\s*(.+)$/);
  if (svcMatch) {
    const code = svcMatch[1];
    const name = cleanText(svcMatch[2]).replace(/\s*\[✅.*\]\s*$/, "");
    const isFounder = code.startsWith("F-");
    const svc: ParsedService = {
      code,
      name,
      comeupTitle: "",
      category: "",
      pole: isFounder ? founderPoleMap[code] || "Services Fondateurs" : currentPole,
      basePrice: 0,
      deliveryDays: 0,
      description: "",
      options: [],
      instructions: "",
      isFounder,
    };

    i++;
    // Lecture des champs jusqu'au prochain service ou volume
    let descStarted = false;
    let descLines: string[] = [];
    while (i < lines.length) {
      const l = lines[i];
      if (/^###\s+Service\s+/.test(l) || /^#\s+/.test(l) || /^##\s+/.test(l)) break;

      if (!descStarted) {
        const titleM = l.match(/\*\*Titre ComeUp[^:]*:\*\*\s*`?(.+?)`?\s*$/);
        if (titleM) { svc.comeupTitle = cleanText(titleM[1]); i++; continue; }
        const catM = l.match(/\*\*Catégorie\s*:\*\*\s*(.+)$/);
        if (catM) { svc.category = cleanText(catM[1]); i++; continue; }
        const priceM = l.match(/\*\*Prix de base\s*:\*\*\s*\*\*(.+?)\*\*\s*\|\s*\*\*Délai\s*:\*\*\s*\*\*(.+?)\*\*/);
        if (priceM) {
          svc.basePrice = parsePrice(priceM[1]);
          svc.deliveryDays = parseDays(priceM[2]);
          i++; continue;
        }
        if (/^\s*-\s*\*\*.+\(\+/.test(l)) {
          const opt = parseOptionLine(l);
          if (opt) { svc.options.push(opt); i++; continue; }
        }
        const inlineOpts = parseInlineOptions(l);
        if (inlineOpts.length) { svc.options.push(...inlineOpts); i++; continue; }
        const consM = l.match(/\*\*(?:Consignes?|Consignes de commande)\s*:?\*\*\s*:?\s*(.+)$/);
        if (consM) { svc.instructions = cleanText(consM[1]); i++; continue; }
        if (/^\s*```markdown/.test(l)) { descStarted = true; i++; continue; }
        if (/^\s*```/.test(l)) { i++; continue; }
        // Résumé pour services avec fiche externe (F-03, F-07)
        const resM = l.match(/\*\*Résumé\s*:\*\*\s*(.+)$/);
        if (resM) {
          svc.description = cleanText(resM[1]);
          i++; continue;
        }
        i++; continue;
      } else {
        if (/^\s*```/.test(l)) { descStarted = false; i++; continue; }
        descLines.push(l);
        i++; continue;
      }
    }
    if (descLines.length) {
      svc.description = descLines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
    }
    services.push(svc);
    continue;
  }
  i++;
}

// Statistiques
const founders = services.filter((s) => s.isFounder);
const others = services.filter((s) => !s.isFounder);
console.log(`Total services: ${services.length}`);
console.log(`Fondateurs: ${founders.length}`);
console.log(`Complémentaires: ${others.length}`);
console.log(`Sans prix: ${services.filter((s) => !s.basePrice).length}`);
console.log(`Sans description: ${services.filter((s) => !s.description).map((s) => s.code).join(", ")}`);
console.log(`Sans options: ${services.filter((s) => s.options.length === 0).map((s) => s.code).join(", ")}`);
console.log(`Sans titre comeup: ${services.filter((s) => !s.comeupTitle).map((s) => s.code).join(", ")}`);

// Pôles détectés
const poles = new Map<string, number>();
for (const s of services) poles.set(s.pole, (poles.get(s.pole) || 0) + 1);
console.log("Pôles:", JSON.stringify(Object.fromEntries(poles), null, 2));

writeFileSync(OUT, JSON.stringify(services, null, 2), "utf-8");
console.log(`Écrit dans ${OUT}`);
