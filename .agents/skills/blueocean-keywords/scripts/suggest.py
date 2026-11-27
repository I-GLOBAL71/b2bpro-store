#!/usr/bin/env python3
"""Collecte réelle d'autocomplete Google/Bing sans clé API pour blueocean-keywords."""

import argparse
from datetime import datetime, timezone
import json
from pathlib import Path
import sys
import urllib.parse
import urllib.request

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")


MODIFIERS_PROFONDEUR_2 = ["prix", "comment", "alternative", "cameroun", "vps"]


def fetch_google_suggest(query: str, hl: str, gl: str, timeout: float = 5.0) -> list[str]:
    params = urllib.parse.urlencode({"client": "chrome", "hl": hl, "gl": gl, "q": query})
    url = f"https://suggestqueries.google.com/complete/search?{params}"
    req = urllib.request.Request(
        url,
        headers={"User-Agent": "Mozilla/5.0 (compatible; AmensKeywords/2.0)"},
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            data = json.loads(resp.read().decode("utf-8", errors="replace"))
        if isinstance(data, list) and len(data) > 1 and isinstance(data[1], list):
            return [str(x).strip() for x in data[1] if str(x).strip()]
    except Exception:
        pass
    return []


def fetch_bing_suggest(query: str, timeout: float = 5.0) -> list[str]:
    params = urllib.parse.urlencode({"query": query})
    url = f"https://api.bing.com/osjson.aspx?{params}"
    req = urllib.request.Request(
        url,
        headers={"User-Agent": "Mozilla/5.0 (compatible; AmensKeywords/2.0)"},
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            data = json.loads(resp.read().decode("utf-8", errors="replace"))
        if isinstance(data, list) and len(data) > 1 and isinstance(data[1], list):
            return [str(x).strip() for x in data[1] if str(x).strip()]
    except Exception:
        pass
    return []


def main() -> int:
    parser = argparse.ArgumentParser(description="Collecte autocomplete Blue Ocean")
    parser.add_argument("--graine", required=True, help="Requête graine")
    parser.add_argument("--hl", default="fr", help="Langue")
    parser.add_argument("--pays", default="fr,ci,cm,sn", help="Codes pays séparés par virgule")
    parser.add_argument("--profondeur", type=int, default=1, help="1 ou 2")
    parser.add_argument("--sortie", required=True, help="Fichier JSON de sortie")
    args = parser.parse_args()

    graine = args.graine.strip()
    pays_list = [p.strip().lower() for p in args.pays.split(",") if p.strip()] or ["fr"]
    now_iso = datetime.now(timezone.utc).isoformat()
    records: list[dict] = []

    for gl in pays_list:
        g_hits = fetch_google_suggest(graine, args.hl, gl)
        b_hits = fetch_bing_suggest(graine) if gl == pays_list[0] else []
        merged = list(dict.fromkeys([graine, *g_hits, *b_hits]))

        if args.profondeur >= 2:
            for mod in MODIFIERS_PROFONDEUR_2:
                extra = fetch_google_suggest(f"{graine} {mod}", args.hl, gl)
                for item in extra:
                    if item not in merged:
                        merged.append(item)

        records.append(
            {
                "graine": graine,
                "hl": args.hl,
                "gl": gl,
                "source": "autocomplete",
                "suggestions": {"direct": merged},
                "collecte_le": now_iso,
            }
        )

    out_path = Path(args.sortie)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(records, ensure_ascii=False, indent=2), encoding="utf-8")
    total = sum(len(r["suggestions"]["direct"]) for r in records)
    print(f"Autocomplete collecté : {total} suggestion(s) sur {len(records)} pays -> {out_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
