#!/usr/bin/env python3
"""Scoring proxy KD Blue Ocean + filtre 2/3 (CIBLER / SURVEILLER / IGNORER)."""

import argparse
import csv
import json
from pathlib import Path
import re
import sys

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")


AFRICA_PAYS_TERMS = {
    "cameroun": "cm",
    "douala": "cm",
    "yaounde": "cm",
    ".cm": "cm",
    "cote d'ivoire": "ci",
    "abidjan": "ci",
    ".ci": "ci",
    "senegal": "sn",
    "dakar": "sn",
    ".sn": "sn",
    "fcfa": "afrique",
    "orange money": "afrique",
    "mtn": "afrique",
    "momo": "afrique",
    "wave": "afrique",
    "mobile money": "afrique",
    "afrique": "afrique",
}

NICHE_BLUE_OCEAN_TERMS = (
    "n8n",
    "ollama",
    "open webui",
    "coolify",
    "dify",
    "lovable",
    "bolt",
    "cursor",
    "v0",
    "vercel",
    "supabase",
    "orange money",
    "mobile money",
    "momo",
    "wave",
    "fcfa",
    "sans carte",
    "renouvellement",
    "vrai cout",
    "quitter",
    "annuler",
    "migrer",
    "alternative",
    "black friday",
    "cyber monday",
    "code promo",
    "email pro",
    "spf",
    "dkim",
    "dmarc",
    "en panne",
    "panne",
    "down",
    "ecole",
    "église",
    "eglise",
    "ong",
    "agence",
    "multi-sites",
    "white label",
    "clients",
    "marge",
    "vps",
    "hostinger",
    "ovh",
    "o2switch",
    "contabo",
    "cloudways",
    "kinsta",
    "nindohost",
)

AIO_RESISTANT_SIGNALS = (
    "installer",
    "deployer",
    "déployer",
    "mettre en ligne",
    "configurer",
    "migrer",
    "quitter",
    "annuler",
    "en panne",
    "panne",
    "down",
    "orange money",
    "momo",
    "wave",
    "sans carte",
    "renouvellement",
    "prix",
    "cout",
    "coût",
    "marge",
    "black friday",
    "code promo",
    "creer",
    "créer",
    "email pro",
    "ecole",
    "école",
    "clients",
    "comparatif",
    "calcul",
)

AFFILIATION_SIGNALS = (
    "hebergeur",
    "hébergeur",
    "heberger",
    "héberger",
    "vps",
    "hostinger",
    "contabo",
    "o2switch",
    "ovh",
    "cloudways",
    "kinsta",
    "nindohost",
    "vercel",
    "n8n",
    "lovable",
    "bolt",
    "orange money",
    "mobile money",
    "email pro",
    "domaine",
    "black friday",
    "promo",
    "renouvellement",
    "quitter",
    "migrer",
    "alternative",
    "agence",
    "clients",
    "ecole",
    "école",
    "site web",
)


def strip_accents(s: str) -> str:
    rep = str.maketrans("éèêëàâäîïôöùûüç", "eeeeaaaiioouuuc")
    return s.lower().translate(rep)


def score_query(requete: str, angle: int, programme: str, variants_count: int) -> dict:
    norm = strip_accents(requete.strip())
    words = [w for w in re.split(r"\s+", norm) if w]
    n_words = len(words)

    pays_hits = sorted({code for term, code in AFRICA_PAYS_TERMS.items() if term in norm})
    if not pays_hits:
        pays_hits = ["fr"]

    # Score de difficulté proxy (0 = très facile, 100 = ultra compétitif)
    kd = 56
    if n_words >= 5:
        kd -= 22
    elif n_words >= 3:
        kd -= 14
    elif n_words == 2:
        kd -= 6
    else:
        kd += 18

    niche_matches = sum(1 for t in NICHE_BLUE_OCEAN_TERMS if strip_accents(t) in norm)
    if niche_matches >= 2:
        kd -= 18
    elif niche_matches == 1:
        kd -= 11

    if any(c in pays_hits for c in ("cm", "ci", "sn", "afrique")):
        kd -= 10
    if any(q in norm for q in ("comment ", "pourquoi ", "combien ", "sans ")):
        kd -= 6
    if 1 <= angle <= 10 and niche_matches >= 1:
        kd -= 4

    kd = max(8, min(92, kd))

    # Résistance AI Overviews (tutos pas-à-pas, prix datés, outils, Afrique, pannes)
    aio_hits = sum(1 for t in AIO_RESISTANT_SIGNALS if strip_accents(t) in norm)
    if aio_hits >= 1 or n_words >= 4 or any(c in pays_hits for c in ("cm", "ci", "sn", "afrique")):
        resistance_aio = "fort"
    elif n_words >= 2 and niche_matches >= 1:
        resistance_aio = "moyen"
    else:
        resistance_aio = "faible"

    # Potentiel d'affiliation
    aff_hits = sum(1 for t in AFFILIATION_SIGNALS if strip_accents(t) in norm)
    if aff_hits >= 1 or bool(programme.strip()):
        potentiel = "fort"
    elif n_words >= 3:
        potentiel = "moyen"
    else:
        potentiel = "faible"

    # Classe d'ordre de grandeur (jamais de volume exact inventé)
    if n_words <= 2 and niche_matches >= 1:
        classe_volume = "élevée"
    elif n_words <= 4 or variants_count >= 2 or niche_matches >= 1:
        classe_volume = "moyenne"
    else:
        classe_volume = "basse"

    # Filtre cahier des charges : >= 2 conditions sur 3 -> CIBLER
    conds = 0
    if kd < 38:
        conds += 1
    if resistance_aio == "fort":
        conds += 1
    if potentiel == "fort":
        conds += 1

    if conds >= 2:
        verdict = "CIBLER"
    elif conds == 1:
        verdict = "SURVEILLER"
    else:
        verdict = "IGNORER"

    return {
        "requete": requete.strip().lower(),
        "longueur_mots": n_words,
        "pays_detectes": "|".join(pays_hits),
        "nb_variantes": variants_count,
        "classes_volume": classe_volume,
        "score_difficulte": kd,
        "resistance_aio": resistance_aio,
        "potentiel_affiliation": potentiel,
        "verdict": verdict,
    }


def extract_queries(raw_items: object) -> dict[str, int]:
    counts: dict[str, int] = {}
    items = raw_items if isinstance(raw_items, list) else [raw_items]
    for entry in items:
        if not isinstance(entry, dict):
            continue
        sugg = entry.get("suggestions", {})
        candidates: list[str] = []
        if isinstance(sugg, dict):
            for vals in sugg.values():
                if isinstance(vals, list):
                    candidates.extend(str(v) for v in vals)
        elif isinstance(sugg, list):
            candidates.extend(str(v) for v in sugg)
        graine = entry.get("graine")
        if isinstance(graine, str) and graine.strip():
            candidates.append(graine.strip())
        for q in candidates:
            key = q.strip().lower()
            if key:
                counts[key] = counts.get(key, 0) + 1
    return counts


def main() -> int:
    parser = argparse.ArgumentParser(description="Scoring proxy KD Blue Ocean")
    parser.add_argument("--entree", required=True, help="Fichier JSON d'entrée")
    parser.add_argument("--angle", type=int, default=1, help="Angle 1-10")
    parser.add_argument("--programme", default="", help="Programme d'affiliation visé")
    parser.add_argument("--sortie", required=True, help="Fichier CSV de sortie")
    args = parser.parse_args()

    in_path = Path(args.entree)
    raw = json.loads(in_path.read_text(encoding="utf-8"))
    queries = extract_queries(raw)

    rows = [score_query(q, args.angle, args.programme, cnt) for q, cnt in queries.items()]
    order_rank = {"CIBLER": 0, "SURVEILLER": 1, "IGNORER": 2}
    rows.sort(key=lambda r: (order_rank.get(r["verdict"], 9), r["score_difficulte"], r["requete"]))

    out_path = Path(args.sortie)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    fieldnames = [
        "requete",
        "longueur_mots",
        "pays_detectes",
        "nb_variantes",
        "classes_volume",
        "score_difficulte",
        "resistance_aio",
        "potentiel_affiliation",
        "verdict",
    ]
    with out_path.open("w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames, lineterminator="\n")
        writer.writeheader()
        writer.writerows(rows)

    cibler = sum(1 for r in rows if r["verdict"] == "CIBLER")
    surveiller = sum(1 for r in rows if r["verdict"] == "SURVEILLER")
    ignorer = sum(1 for r in rows if r["verdict"] == "IGNORER")
    print(f"CIBLER : {cibler} | SURVEILLER : {surveiller} | IGNORER : {ignorer}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
