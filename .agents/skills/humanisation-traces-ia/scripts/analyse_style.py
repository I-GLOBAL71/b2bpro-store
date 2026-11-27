#!/usr/bin/env python3
"""Analyse stylistique objective (humanisation-100 + audit-ai-traces b2bpro)."""

import argparse
from collections import Counter
import math
from pathlib import Path
import re
import sys

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")


# Marqueurs IA bloquants (tournures robotiques & tics LLM FR/EN unifiés)
AI_MARKERS: list[tuple[str, re.Pattern[str]]] = [
    ("plongeons au cœur de", re.compile(r"\bplong(?:eons|ez|er)\s+(?:au\s+c[œo]ur\s+de|dans)\b", re.I)),
    ("dans un monde en constante évolution", re.compile(r"\bdans\s+un\s+monde\s+en\s+(?:constante|perp[ée]tuelle)\s+[ée]volution\b", re.I)),
    ("à l'ère du numérique", re.compile(r"\b[àa]\s+l'[èe]re\s+(?:du\s+num[ée]rique|de\s+l'ia|digitale)\b", re.I)),
    ("il convient de noter", re.compile(r"\bil\s+convient\s+de\s+(?:noter|souligner|pr[ée]ciser|rappeler)\b", re.I)),
    ("il est crucial/primordial de", re.compile(r"\bil\s+est\s+(?:crucial|primordial|vital|essentiel)\s+de\s+(?:noter|souligner|comprendre)\b", re.I)),
    ("force est de constater", re.compile(r"\bforce\s+est\s+de\s+constater\b", re.I)),
    ("en conclusion / en somme", re.compile(r"\b(?:en\s+conclusion|en\s+somme|pour\s+conclure|en\s+guise\s+de\s+conclusion)\b", re.I)),
    ("non seulement ... mais aussi", re.compile(r"\bnon\s+seulement\b.{1,80}\bmais\s+(?:aussi|encore)\b", re.I)),
    ("mosaïque / tapisserie", re.compile(r"\b(?:mosa[ïi]que\s+complexe|tapisserie|tapestry)\b", re.I)),
    ("approche holistique", re.compile(r"\b(?:approche|vision)\s+holistique\b", re.I)),
    ("sans couture", re.compile(r"\bsans\s+couture\b", re.I)),
    ("naviguer à travers", re.compile(r"\bnaviguer\s+[àa]\s+travers\b", re.I)),
    ("véritable catalyseur", re.compile(r"\bv[ée]ritable\s+catalyseur\b", re.I)),
    ("débloquer le potentiel", re.compile(r"\bd[ée]bloquer\s+(?:tout\s+)?(?:le\s+)?potentiel\b", re.I)),
    ("repousser les limites", re.compile(r"\brepousser\s+les\s+limites\b", re.I)),
    ("anglicisme IA (delve/leverage/foster/streamline)", re.compile(r"\b(?:delve|leverage|foster|streamline|game-changer)\b", re.I)),
    ("auto-proclamation IA (100% humain / en tant qu'IA)", re.compile(r"\b(?:100\s*%\s*humain|r[ée]dig[ée]\s+sans\s+ia|z[ée]ro\s+trace\s+d'ia|en\s+tant\s+qu'ia|en\s+tant\s+qu'intelligence\s+artificielle)\b", re.I)),
]


def extract_prose(raw: str) -> tuple[str, list[str]]:
    """Extrait le texte en prose et la liste des vrais paragraphes (hors titres/code/tableaux)."""
    lines = raw.splitlines()
    if lines and lines[0].strip() == "---":
        for i in range(1, len(lines)):
            if lines[i].strip() == "---":
                lines = lines[i + 1 :]
                break

    in_code = False
    prose_lines: list[str] = []
    paragraphs: list[str] = []
    cur_para: list[str] = []

    def flush() -> None:
        nonlocal cur_para
        if cur_para:
            paragraphs.append(" ".join(cur_para))
            cur_para = []

    for line in lines:
        t = line.strip()
        if t.startswith("```"):
            in_code = not in_code
            flush()
            continue
        if in_code:
            continue
        if (
            not t
            or t.startswith("#")
            or t.startswith("|")
            or t.startswith(">")
            or t.startswith("<")
            or t == "---"
        ):
            flush()
            continue
        if re.match(r"^(?:[-*]|\d+[.)])\s+", t):
            flush()
            clean_li = re.sub(r"^(?:[-*]|\d+[.)])\s+", "", t)
            prose_lines.append(clean_li)
            continue
        cur_para.append(t)
        prose_lines.append(t)

    flush()
    return "\n".join(prose_lines), paragraphs


def main() -> int:
    parser = argparse.ArgumentParser(description="Analyse stylistique humanisation-100")
    parser.add_argument("md_file", help="Fichier markdown à analyser")
    args = parser.parse_args()

    raw = Path(args.md_file).read_text(encoding="utf-8", errors="replace")
    prose_text, paragraphs = extract_prose(raw)

    # 1. Marqueurs IA bloquants
    total_markers = 0
    found_lines: list[str] = []
    for label, pat in AI_MARKERS:
        hits = pat.findall(prose_text)
        if hits:
            total_markers += len(hits)
            found_lines.append(f"×{len(hits)} « {label} »")

    # 2. Longueurs des phrases & coefficient de variation (burstiness)
    stripped = re.sub(r"`[^`]+`", "", prose_text)
    stripped = re.sub(r"https?://\S+", "", stripped)
    sentences = [s.strip() for s in re.split(r"[.!?…]+(?:\s+|\n|$)", stripped) if len(s.strip().split()) >= 2]
    lengths = [len(s.split()) for s in sentences]
    if len(lengths) >= 3:
        mean = sum(lengths) / len(lengths)
        stdev = math.sqrt(sum((x - mean) ** 2 for x in lengths) / len(lengths))
        variation = stdev / mean if mean > 0 else 0.0
    else:
        mean = 0.0
        stdev = 0.0
        variation = 0.5

    # 3. Triptymes parallèles mécaniques (« X, Y et Z » répétés en rythme identique)
    triptymes = len(re.findall(r"\b[a-zà-ÿ]{4,18},\s+[a-zà-ÿ]{4,18}\s+et\s+[a-zà-ÿ]{4,18}\b", prose_text, re.I))

    # 4. Débuts de paragraphes répétés (>= 3x sur vrais paragraphes de prose uniquement)
    starts = []
    for p in paragraphs:
        words = [w.lower() for w in re.findall(r"[a-zA-ZÀ-ÿ0-9]+", p)[:2]]
        if len(words) == 2:
            starts.append(" ".join(words))
    rep_starts = [(k, v) for k, v in Counter(starts).items() if v >= 3]

    # 5. Tournures impersonnelles (suivi non bloquant)
    impersonnelles = len(re.findall(r"\b(?:il est|il faut|il existe|il suffit|on peut)\b", prose_text, re.I))

    # 6. Cadratins (indicateur stylistique)
    em_dashes = raw.count("—")

    verdict_ok = total_markers == 0 and variation >= 0.40 and not rep_starts
    print(f"Verdict : {'HUMAIN probable' if verdict_ok else 'style IA détectable'}")
    print(f"Marqueurs IA détectés : {total_markers}")
    for line in found_lines:
        print(f"  {line}")
    print(f"Phrases : {len(lengths)} · moyenne {mean:.1f} mots · écart-type {stdev:.2f} · variation {variation:.2f}")
    print(f"Triptymes parallèles : {triptymes}")
    print(f"Tournures impersonnelles (il est/il faut/on peut) : {impersonnelles}")
    print(f"Tirets cadratins (—) : {em_dashes}")
    if rep_starts:
        formatted = ", ".join(f"« {k} » ×{v}" for k, v in rep_starts)
        print(f"Débuts de paragraphes répétés (≥3×) : {formatted}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
