#!/usr/bin/env python3
"""Scoreur de citabilité GEO/AIO unifié (amens.store + SGA™ b2bpro)."""

import argparse
from pathlib import Path
import re
import sys

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")


def strip_frontmatter_and_code(text: str) -> str:
    lines = text.splitlines()
    if lines and lines[0].strip() == "---":
        for idx in range(1, len(lines)):
            if lines[idx].strip() == "---":
                lines = lines[idx + 1 :]
                break
    cleaned: list[str] = []
    in_code = False
    for line in lines:
        if line.strip().startswith("```"):
            in_code = not in_code
            continue
        if not in_code:
            cleaned.append(line)
    return "\n".join(cleaned)


def extract_first_para_after_h1(text: str) -> str:
    seen_h1 = False
    buf: list[str] = []
    for line in text.splitlines():
        t = line.strip()
        if re.match(r"^#\s+", t):
            seen_h1 = True
            continue
        if seen_h1:
            if not t or t.startswith("#") or t.startswith("|") or t.startswith(">") or t.startswith("<"):
                if buf:
                    break
                continue
            buf.append(t)
    return " ".join(buf)


def extract_prose_paragraphs(text: str) -> list[str]:
    paras: list[str] = []
    buf: list[str] = []
    for line in text.splitlines():
        t = line.strip()
        if (
            not t
            or t.startswith("#")
            or t.startswith("|")
            or t.startswith(">")
            or t.startswith("<")
            or t == "---"
            or re.match(r"^[-*]\s+", t)
            or re.match(r"^\d+[.)]\s+", t)
        ):
            if buf:
                paras.append(" ".join(buf))
                buf = []
            continue
        buf.append(t)
    if buf:
        paras.append(" ".join(buf))
    return paras


def main() -> int:
    parser = argparse.ArgumentParser(description="Score de citabilité GEO/AIO")
    parser.add_argument("md_file", help="Fichier markdown à évaluer")
    args = parser.parse_args()

    raw = Path(args.md_file).read_text(encoding="utf-8", errors="replace")
    clean = strip_frontmatter_and_code(raw)
    paras = extract_prose_paragraphs(clean)
    intro = extract_first_para_after_h1(clean)
    intro_words = len(intro.split())

    score = 0
    lines_out: list[str] = []

    # 1. Conclusion en tête / Answer-First (25 pts)
    if 38 <= intro_words <= 72:
        pts1 = 25
        lines_out.append(f"✓ Conclusion en tête calibrée ({intro_words} mots, cible 40-60) (+25/25)")
    elif 25 <= intro_words <= 90:
        pts1 = 15
        lines_out.append(f"~ Conclusion en tête perfectible ({intro_words} mots, cible 40-60) (+15/25)")
    else:
        pts1 = 5 if intro_words > 0 else 0
        lines_out.append(f"✗ Conclusion en tête hors gabarit ({intro_words} mots, cible 40-60) (+{pts1}/25)")
    score += pts1

    # 2. Blocs citables auto-suffisants 134-167 mots (fenêtre 110-185) (25 pts)
    sweet_blocks = [p for p in paras if 134 <= len(p.split()) <= 167]
    near_blocks = [p for p in paras if 105 <= len(p.split()) <= 185]
    if len(sweet_blocks) >= 2:
        pts2 = 25
        lines_out.append(f"✓ {len(sweet_blocks)} bloc(s) citable(s) optimaux 134-167 mots (+25/25)")
    elif len(sweet_blocks) == 1 or len(near_blocks) >= 2:
        pts2 = 20
        lines_out.append(f"✓ {len(near_blocks)} bloc(s) auto-suffisant(s) 105-185 mots (+20/25)")
    elif len(near_blocks) == 1:
        pts2 = 12
        lines_out.append("~ 1 seul bloc dense 105-185 mots (cible ≥ 2 pour citabilité RAG maximale) (+12/25)")
    else:
        pts2 = 4
        lines_out.append("✗ Aucun bloc auto-suffisant de 134-167 mots détecté (+4/25)")
    score += pts2

    # 3. Paragraphes courts & structuration (15 pts)
    non_giant = [p for p in paras if len(p.split()) <= 190]
    ratio_clean = (len(non_giant) / len(paras)) if paras else 0
    has_lists = bool(re.search(r"^(?:[-*]|\d+[.)])\s+", clean, re.MULTILINE))
    if ratio_clean >= 0.9 and has_lists:
        pts3 = 15
        lines_out.append("✓ Paragraphes maîtrisés et listes structurées (+15/15)")
    elif ratio_clean >= 0.75:
        pts3 = 10
        lines_out.append("~ Paragraphes globalement lisibles (+10/15)")
    else:
        pts3 = 5
        lines_out.append("✗ Paragraphes trop longs ou peu structurés (+5/15)")
    score += pts3

    # 4. Chiffres datés & unités précises (15 pts)
    stats = re.findall(r"\b\d+(?:[.,]\d+)?\s*(?:%|€|FCFA|ms|Go|Mo|s|min|h|mois|ans?|jours?|\$)", clean)
    dates = re.findall(r"(?:\b\d{2}/\d{2}/202\d\b|\b202[5-9]\b)", clean)
    if len(stats) >= 8 and len(dates) >= 2:
        pts4 = 15
        lines_out.append(f"✓ Densité statistique datée élevée : {len(stats)} métriques, {len(dates)} dates (+15/15)")
    elif len(stats) >= 4 and len(dates) >= 1:
        pts4 = 11
        lines_out.append(f"~ {len(stats)} métriques, {len(dates)} date(s) (viser ≥ 8 métriques datées) (+11/15)")
    else:
        pts4 = 3
        lines_out.append(f"✗ Manque de chiffres datés ({len(stats)} métriques, {len(dates)} dates) (+3/15)")
    score += pts4

    # 5. Extractibilité SGA™ : tableaux + débuts extractibles + FAQ « Comment… » (20 pts)
    has_table = bool(re.search(r"^\|.+\|\s*$", clean, re.MULTILINE))
    faq_h3 = re.findall(r"^###\s+(.+)$", clean, re.MULTILINE)
    has_comment_faq = any(q.strip().lower().startswith("comment") for q in faq_h3)
    extractable = re.findall(
        r"(?:^|[.!?]\s+)(?:Pour |Un |Une |Le |La |Les |Chez |En |Mon verdict)",
        clean,
    )
    pts5 = 0
    if has_table:
        pts5 += 8
    if len(extractable) >= 4:
        pts5 += 7
    elif len(extractable) >= 2:
        pts5 += 4
    if has_comment_faq:
        pts5 += 5
    elif len(faq_h3) >= 3:
        pts5 += 2

    if pts5 >= 17:
        lines_out.append(
            f"✓ Extractibilité SGA™ forte (tableau={'oui' if has_table else 'non'}, FAQ Comment={'oui' if has_comment_faq else 'non'}) (+{pts5}/20)"
        )
    else:
        lines_out.append(
            f"~ Extractibilité perfectible (tableau={'oui' if has_table else 'non'}, FAQ Comment={'oui' if has_comment_faq else 'non'}) (+{pts5}/20)"
        )
    score += pts5

    print(f"Score de citabilité : {score}/100")
    for l in lines_out:
        print(l)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
