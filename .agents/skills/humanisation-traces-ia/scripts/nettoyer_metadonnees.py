#!/usr/bin/env python3
"""Nettoyage des métadonnées et artefacts de génération IA dans un fichier Markdown/HTML."""

import argparse
from pathlib import Path
import re
import sys

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")


ARTIFACT_PATTERNS = [
    re.compile(r":?contentReference\[oaicite:\d+\]\{[^}]*\}", re.I),
    re.compile(r"<!--\s*(?:generated\s+by|chatgpt|claude|openai|anthropic)[^>]*-->", re.I),
    re.compile(r"<meta\s+name=[\"']generator[\"'][^>]*>", re.I),
    re.compile(r"\?utm_source=chatgpt\.com\b", re.I),
]


def clean_metadata(text: str) -> tuple[str, int]:
    hits = 0
    cleaned = text
    for pat in ARTIFACT_PATTERNS:
        cleaned, n = pat.subn("", cleaned)
        hits += n
    return cleaned, hits


def main() -> int:
    parser = argparse.ArgumentParser(description="Nettoyage métadonnées de génération IA")
    parser.add_argument("file", help="Fichier à inspecter ou nettoyer")
    parser.add_argument("--inspecter", action="store_true", help="Inspecter sans écrire .clean")
    args = parser.parse_args()

    path = Path(args.file)
    raw = path.read_text(encoding="utf-8", errors="replace")
    cleaned, hits = clean_metadata(raw)

    if args.inspecter:
        print(f"Métadonnées IA détectées : {hits}")
        return 0

    clean_path = Path(f"{path}.clean")
    clean_path.write_text(cleaned, encoding="utf-8")
    print(f"Métadonnées nettoyées -> {clean_path} ({hits} artefact(s) retiré(s))")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
