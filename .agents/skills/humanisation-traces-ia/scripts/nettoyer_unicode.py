#!/usr/bin/env python3
"""Détection et nettoyage déterministe des traces Unicode invisibles et homoglyphes."""

import argparse
from pathlib import Path
import re
import sys

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")


ZERO_WIDTH_CHARS = {
    "\u200B", "\u200C", "\u200D", "\uFEFF", "\u00AD", "\u2060", "\u180E",
}
BIDI_CHARS = {
    "\u200E", "\u200F",
    "\u202A", "\u202B", "\u202C", "\u202D", "\u202E",
    "\u2066", "\u2067", "\u2068", "\u2069",
}
EXOTIC_SPACES = {
    "\u00A0", "\u2000", "\u2001", "\u2002", "\u2003", "\u2004",
    "\u2005", "\u2006", "\u2007", "\u2008", "\u2009", "\u200A",
    "\u202F", "\u205F", "\u3000",
}

HOMOGLYPH_MAP = {
    "а": "a", "А": "A",
    "е": "e", "Е": "E",
    "о": "o", "О": "O",
    "р": "p", "Р": "P",
    "с": "c", "С": "C",
    "х": "x", "Х": "X",
    "і": "i", "І": "I",
    "у": "y", "У": "Y",
    "к": "k", "К": "K",
    "м": "m", "М": "M",
    "н": "h", "Н": "H",
    "т": "t", "Т": "T",
    "в": "b", "В": "B",
    "\u0391": "A", "\u0392": "B", "\u0395": "E", "\u0396": "Z",
    "\u0397": "H", "\u0399": "I", "\u039A": "K", "\u039C": "M",
    "\u039D": "N", "\u039F": "O", "\u03A1": "P", "\u03A4": "T",
    "\u03A7": "X", "\u03BF": "o",
}


def is_tag_char(ch: str) -> bool:
    code = ord(ch)
    return 0xE0000 <= code <= 0xE007F


def inspect_and_clean(text: str) -> tuple[str, dict[str, int]]:
    stats = {"zero_width": 0, "bidi": 0, "tags": 0, "exotic_space": 0, "homoglyph": 0}
    out: list[str] = []

    for ch in text:
        if ch in ZERO_WIDTH_CHARS:
            stats["zero_width"] += 1
            continue
        if ch in BIDI_CHARS:
            stats["bidi"] += 1
            continue
        if is_tag_char(ch):
            stats["tags"] += 1
            continue
        if ch in EXOTIC_SPACES:
            stats["exotic_space"] += 1
            out.append(" ")
            continue
        if ch in HOMOGLYPH_MAP:
            stats["homoglyph"] += 1
            out.append(HOMOGLYPH_MAP[ch])
            continue
        out.append(ch)

    cleaned = "".join(out)
    # Normalise retours chariot sans toucher aux blocs de texte légitimes
    cleaned = re.sub(r"\r\n", "\n", cleaned)
    return cleaned, stats


def main() -> int:
    parser = argparse.ArgumentParser(description="Nettoyage Unicode anti-traces IA")
    parser.add_argument("file", help="Fichier à inspecter ou nettoyer")
    parser.add_argument("--inspecter", action="store_true", help="Inspecter sans écrire .clean")
    args = parser.parse_args()

    path = Path(args.file)
    raw = path.read_text(encoding="utf-8", errors="replace")
    cleaned, stats = inspect_and_clean(raw)
    total = sum(stats.values())

    if args.inspecter:
        if total == 0:
            print(f"aucun caractère suspect détecté ({len(raw)} caractères analysés)")
        else:
            print(f"=== {total} caractère(s) suspect(s) ({len(raw)} caractères analysés) ===")
            for k, v in stats.items():
                if v > 0:
                    print(f"  - {k}: {v}")
        return 0

    clean_path = Path(f"{path}.clean")
    clean_path.write_text(cleaned, encoding="utf-8")
    print(f"Fichier nettoyé écrit -> {clean_path} ({total} caractère(s) corrigé(s))")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
