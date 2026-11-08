/**
 * CLI : `bun run guard`
 * Exécute la garde d'intégrité complète (voir src/lib/guard.ts et
 * docs/REGRESSION-GUARD.md). Code sortie 1 si régression détectée —
 * à utiliser comme porte de qualité AVANT et APRÈS chaque implémentation.
 */
import { runIntegrityChecks, formatReportText } from "../src/lib/guard";

const report = await runIntegrityChecks();
console.log(formatReportText(report));
process.exit(report.ok ? 0 : 1);
