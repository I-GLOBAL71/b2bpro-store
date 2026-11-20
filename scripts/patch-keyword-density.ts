import { db } from "../src/lib/db";

function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['’]/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

async function main() {
  const services = await db.service.findMany();
  const flagged: { id: string; slug: string; primary: string; occ: number; description: string }[] = [];

  for (const s of services) {
    const kw = JSON.parse(s.keywords) as { primary: string };
    const primaryNorm = norm(kw.primary);
    const occ = norm(s.description).split(primaryNorm).length - 1;
    if (occ < 2) {
      flagged.push({ id: s.id, slug: s.slug, primary: kw.primary, occ, description: s.description });
    }
  }

  console.log(`Fiches avec < 2 occurrences : ${flagged.length}`);

  let updated = 0;
  for (const item of flagged) {
    let desc = item.description;

    // Cherchons où insérer naturellement le mot-clé primaire une deuxième fois.
    // Typiquement dans la section "## Payer ... €, être livré, sans risque"
    // ou "## Ce que l'offre ..."
    
    // Pattern 1 : Sous "## Payer ..., être livré, sans risque"
    // Remplacer "Protections actives de la commande" par :
    // "Protections actives de la commande pour [primary] :"
    // ou "Protections actives pour votre commande"
    
    const primaryLower = item.primary.toLowerCase();
    
    if (desc.includes("## Payer ") && desc.includes("Protections actives")) {
      desc = desc.replace(
        /Protections actives de la commande/i,
        `Protections actives pour ${primaryLower}`
      );
    } else if (desc.includes("## Ce que l'offre")) {
      // Pattern 2 : Sous "## Ce que l'offre..."
      // "Pour X €, j'audite..." -> "Pour X €, vous pouvez [primary] :"
      const lines = desc.split("\n");
      const idx = lines.findIndex((l) => l.startsWith("## Ce que l'offre"));
      if (idx !== -1 && idx + 2 < lines.length) {
        // Insérer une phrase d'appui juste après
        lines[idx + 1] = lines[idx + 1] + ` Avec cette formule clé en main pour ${primaryLower}, vous obtenez :`;
        desc = lines.join("\n");
      }
    } else {
      // Fallback : ajouter à la fin sous forme de conclusion/garantie
      desc = desc + `\n\nConfiez-nous votre projet pour ${primaryLower} en toute sérénité.`;
    }

    // Vérifier que le nouveau nombre d'occurrences est >= 2
    const newOcc = norm(desc).split(norm(item.primary)).length - 1;
    if (newOcc >= 2) {
      await db.service.update({
        where: { id: item.id },
        data: { description: desc },
      });
      updated++;
    } else {
      // Forcer une insertion naturelle
      // Ex: Ajouter "Prestation dédiée : confiez-nous cette mission pour [primary]."
      desc = desc + `\n\nCommandez dès aujourd'hui votre prestation pour ${primaryLower} avec toutes les garanties b2bpro.store.`;
      await db.service.update({
        where: { id: item.id },
        data: { description: desc },
      });
      updated++;
    }
  }

  console.log(`Fiches mises à jour : ${updated}`);
}

main()
  .catch(console.error)
  .finally(async () => {
    await db.$disconnect();
  });
