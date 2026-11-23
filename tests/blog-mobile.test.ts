import { describe, expect, it } from "bun:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Markdown } from "../src/components/site/markdown";
import { readdirSync, readFileSync } from "fs";
import path from "path";

describe("Blog Mobile Responsiveness & Anti-Overflow Protection", () => {
  it("enveloppe les blocs de code sans langage dans un conteneur défilable tactile", () => {
    const rawMd = [
      "```",
      "Requête décisionnaire ➔ Synthèse RAG (Retrieval-Augmented Generation) ➔ Filtrage de confiance ➔ Top 3 marques citées",
      "      [Si votre marque est absente du consensus IA, vous êtes invisible pour l'acheteur moderne]",
      "```",
    ].join("\n");

    const html = renderToStaticMarkup(React.createElement(Markdown, { content: rawMd }));

    // Vérifie la présence du conteneur sécurisé anti-débordement
    expect(html).toContain("overflow-hidden");
    expect(html).toContain("min-w-0");
    expect(html).toContain("max-w-full");
    expect(html).toContain("overflow-x-auto");
    expect(html).toContain("touch-pan-x");
    expect(html).toContain("Extrait de code");
  });

  it("enveloppe les blocs de code avec langage dans le conteneur défilable tactile", () => {
    const rawMd = [
      "```typescript",
      "const extremelyLongConfigNameForEnterpriseRagPipeline = { version: '2.0.0', mode: 'strict' };",
      "```",
    ].join("\n");

    const html = renderToStaticMarkup(React.createElement(Markdown, { content: rawMd }));

    expect(html).toContain("overflow-x-auto");
    expect(html).toContain("touch-pan-x");
    expect(html).toContain("language-typescript");
  });

  it("génère des tableaux GFM avec conteneur défilable horizontalement et largeur minimale", () => {
    const rawTable = [
      "| Critère IA | Algorithme | Impact | Action |",
      "| :--- | :--- | :--- | :--- |",
      "| Cohérence d'entité | Wikidata verification | 35 % | JSON-LD |",
      "| Avis tiers | Trustpilot scraping | 28 % | Collecter avis |",
    ].join("\n");

    const html = renderToStaticMarkup(React.createElement(Markdown, { content: rawTable }));

    expect(html).toContain("overflow-x-auto");
    expect(html).toContain("touch-pan-x");
    expect(html).toContain("min-w-[560px]");
    expect(html).toContain("Tableau comparatif");
    expect(html).toContain("Glisser horizontalement ↔");
  });

  it("applique le wrapping de texte partout (break-words) sur les titres et paragraphes", () => {
    const md = [
      "# TitreExtremementLongSansEspacesQuiPourraitFaireDeborderLecranSurMobile",
      "## SousTitreAvecDesMotsTechniquesSupercalifragilisticexpialidocious",
      "Texte avec un lien très long : [Lien](https://b2bpro.store/services/je-vais-auditer-si-votre-marque-est-recommandee-par-les-moteurs-ia)",
      "`code_inline_tres_long_sans_espaces_qui_doit_casser_sur_mobile`",
    ].join("\n\n");

    const html = renderToStaticMarkup(React.createElement(Markdown, { content: md }));

    expect(html).toContain("break-words");
    expect(html).toContain("prose-b2b");
  });

  it("rend les images de markdown responsives avec max-w-full et object-cover", () => {
    const md = "![Image descriptive](/img/blog/test.webp)";
    const html = renderToStaticMarkup(React.createElement(Markdown, { content: md }));

    expect(html).toContain("max-w-full");
    expect(html).toContain("loading=\"lazy\"");
  });

  it("garantit que tous les 54+ articles du blog se compilent sans erreur et sans balises cassées", () => {
    const blogDir = path.join(process.cwd(), "data", "blog");
    const files = readdirSync(blogDir).filter((f) => f.endsWith(".md"));

    expect(files.length).toBeGreaterThanOrEqual(54);

    for (const file of files) {
      const content = readFileSync(path.join(blogDir, file), "utf-8");
      // Retire le frontmatter
      const body = content.replace(/^---[\s\S]*?---\n/, "");

      // Le rendu ReactMarkdown ne doit pas lever d'erreur
      const html = renderToStaticMarkup(React.createElement(Markdown, { content: body }));
      expect(typeof html).toBe("string");
      expect(html.length).toBeGreaterThan(100);

      // Si l'article contient un tableau, vérifier la présence du wrapper responsive
      if (body.includes("| ---")) {
        expect(html).toContain("overflow-x-auto");
        expect(html).toContain("min-w-[560px]");
      }

      // Si l'article contient un bloc de code, vérifier la présence du wrapper responsive
      if (body.includes("```")) {
        expect(html).toContain("overflow-x-auto");
        expect(html).toContain("touch-pan-x");
      }
    }
  }, 30000);

  it("vérifie que le layout public et la page article contiennent les garde-fous anti-débordement", () => {
    const layoutContent = readFileSync(
      path.join(process.cwd(), "src", "app", "(public)", "layout.tsx"),
      "utf-8"
    );
    expect(layoutContent).toContain("overflow-x-clip");
    expect(layoutContent).toContain("min-w-0");
    expect(layoutContent).toContain("w-full");

    const articlePageContent = readFileSync(
      path.join(process.cwd(), "src", "app", "(public)", "blog", "[slug]", "page.tsx"),
      "utf-8"
    );
    expect(articlePageContent).toContain("min-w-0");
    expect(articlePageContent).toContain("w-full");
    expect(articlePageContent).toContain("max-w-3xl");

    const rootLayoutContent = readFileSync(
      path.join(process.cwd(), "src", "app", "layout.tsx"),
      "utf-8"
    );
    expect(rootLayoutContent).toContain("overflow-x-hidden");
    expect(rootLayoutContent).toContain("max-w-full");
  });
});
