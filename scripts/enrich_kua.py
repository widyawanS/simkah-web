"""Enrich kua.json dari sumber legal: Wikipedia ID (deskripsi) + OpenStreetMap
Nominatim (alamat KUA, koordinat, jarak ke pusat kota/kabupaten).

- Hormati kebijakan Nominatim: max 1 req/detik + User-Agent identitas.
- TIDAK menyentuh entry verified:true. Hasil selalu verified:false
  (tetap noindex) sampai manusia verifikasi alamat+telepon.
- Lanjut otomatis (skip slug yang sudah ada koordinat).

Contoh: python scripts/enrich_kua.py --kota 3404 --limit 20
         python scripts/enrich_kua.py --slug depok-kabupaten-sleman
"""
import argparse
import json
import math
import re
import time
from pathlib import Path

import requests

BASE = Path(__file__).resolve().parent.parent
WILAYAH = BASE / "src" / "data" / "wilayah.json"
KUA = BASE / "src" / "data" / "kua.json"
CAP_CACHE = BASE / "scripts" / ".capitals.json"

UA = {"User-Agent": "simkah.web.id enrichment (kontak WA 6285228890161)"}

FIELDS = ["alamat", "telepon", "jam_layanan", "kepala_kua", "desa_dilayani",
          "puskesmas_rujukan", "patokan", "foto_gedung", "sumber_data",
          "verified", "updated", "koordinat", "jarak_pusat_kota_km",
          "deskripsi_wilayah"]


def haversine(lat1, lon1, lat2, lon2):
    r = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    d = math.sin((p2 - p1) / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(math.radians(lon2 - lon1) / 2) ** 2
    return round(2 * r * math.asin(math.sqrt(d)), 1)


def osm_search(query):
    time.sleep(1.1)
    r = requests.get("https://nominatim.openstreetmap.org/search",
                      params={"q": query, "format": "json", "limit": 5,
                              "addressdetails": 1, "countrycodes": "id"},
                      headers=UA, timeout=30)
    r.raise_for_status()
    return r.json()


def wiki_summary(title):
    time.sleep(0.2)
    r = requests.get("https://id.wikipedia.org/w/api.php",
                      params={"action": "query", "prop": "extracts",
                              "exintro": 1, "explaintext": 1,
                              "titles": title, "format": "json"},
                      headers=UA, timeout=30)
    if r.status_code != 200:
        return ""
    pages = r.json().get("query", {}).get("pages", {}).values()
    extract = next(iter(pages), {}).get("extract", "") if pages else ""
    if not extract or "may refer to" in extract.lower():
        return ""
    first = re.sub(r"\([^)]*\)", "", extract)
    first = first.split(". ")[0]
    first = re.sub(r"\s+", " ", first).strip().rstrip(".")
    return first + "." if first else ""


def dotted6(code6):
    return f"{code6[:2]}.{code6[2:4]}.{code6[4:6]}"


def fetch_desa(code6):
    """Daftar nama desa/kelurahan dari API statis emsifa (Kemendagri)."""
    time.sleep(0.2)
    r = requests.get(
        f"https://www.emsifa.com/api-wilayah-indonesia/v2/villages/{dotted6(code6)}.json",
        headers=UA, timeout=30)
    if r.status_code != 200:
        return []
    return [v["name"] for v in r.json().get("data", [])]


def pick_kua(results, kecamatan):
    for res in results:
        cls, typ = res.get("class", ""), res.get("type", "")
        name = (res.get("name", "") + " " + res.get("display_name", "")).lower()
        if cls in ("amenity", "office", "building") and ("kua" in name or "urusan agama" in name):
            return res
    for res in results:
        if "kua" in (res.get("name", "") + res.get("display_name", "")).lower():
            return res
    return None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--kota", default="", help="filter id_kota, mis. 3404")
    ap.add_argument("--slug", default="", help="satu slug saja")
    ap.add_argument("--limit", type=int, default=20)
    args = ap.parse_args()

    wilayah = json.loads(WILAYAH.read_text(encoding="utf-8"))
    kua = json.loads(KUA.read_text(encoding="utf-8"))
    caps = json.loads(CAP_CACHE.read_text(encoding="utf-8")) if CAP_CACHE.exists() else {}

    targets = [w for w in wilayah
               if (not args.kota or w["id_kota"] == args.kota)
               and (not args.slug or w["slug"] == args.slug)]
    if args.slug and not targets:
        print("slug tidak ditemukan di wilayah.json")
        return

    done = 0
    for w in targets:
        if done >= args.limit:
            break
        slug = w["slug"]
        entry = kua.get(slug)
        if isinstance(entry, dict) and entry.get("verified") is True:
            continue
        if (isinstance(entry, dict) and entry.get("koordinat")
                and entry.get("desa_dilayani")
                and not entry["desa_dilayani"][0].startswith("CONTOH")):
            continue

        print(f"... {slug} ({w['kecamatan']}, {w['kota']})")
        entry = entry if isinstance(entry, dict) else {}
        for f in FIELDS:
            entry.setdefault(f, [] if f == "desa_dilayani" else (False if f == "verified" else ""))

        # 1) Titik KUA dari OSM
        try:
            res = osm_search(f"KUA {w['kecamatan']}, {w['kota']}, Indonesia")
            hit = pick_kua(res, w["kecamatan"])
            if hit:
                addr = hit.get("address", {})
                jalan = " ".join(x for x in [addr.get("road"), addr.get("house_number")] if x)
                entry["alamat"] = f"PROGRESS-OSM: {jalan + ', ' if jalan else ''}{hit.get('display_name', '')}"
                entry["koordinat"] = {"lat": float(hit["lat"]), "lon": float(hit["lon"])}
        except Exception as e:
            print("  osm kua gagal:", e)

        # 2) Koordinat + jarak ke pusat kota/kabupaten
        try:
            if w["id_kota"] not in caps:
                res = osm_search(f"{w['kota']}, Indonesia")
                admin = next((r for r in res if r.get("class") in ("boundary", "place")), res[0] if res else None)
                if admin:
                    caps[w["id_kota"]] = {"lat": float(admin["lat"]), "lon": float(admin["lon"])}
                    CAP_CACHE.write_text(json.dumps(caps, ensure_ascii=False, indent=1), encoding="utf-8")
            cap = caps.get(w["id_kota"])
            if cap and entry.get("koordinat"):
                entry["jarak_pusat_kota_km"] = haversine(
                    entry["koordinat"]["lat"], entry["koordinat"]["lon"], cap["lat"], cap["lon"])
        except Exception as e:
            print("  jarak gagal:", e)

        # 3) Deskripsi dari Wikipedia ID
        try:
            kota_short = w["kota"].replace("Kabupaten ", "").replace("Kota ", "")
            desc = wiki_summary(f"{w['kecamatan']}, {kota_short}") or wiki_summary(w["kecamatan"])
            if desc and "may refer to" not in desc.lower():
                entry["deskripsi_wilayah"] = desc
        except Exception as e:
            print("  wiki gagal:", e)

        entry["sumber_data"] = "OpenStreetMap + Wikipedia ID + API Wilayah Kemendagri (progress, belum verifikasi lapangan)"
        entry["verified"] = False

        # 4) Daftar desa/kelurahan dilayani (data Kemendagri, pasti per kecamatan)
        if not entry.get("desa_dilayani") or entry["desa_dilayani"][0].startswith("CONTOH"):
            try:
                desa = fetch_desa(w["id_kecamatan"])
                if desa:
                    entry["desa_dilayani"] = desa
            except Exception as e:
                print("  desa gagal:", e)

        kua[slug] = entry
        done += 1

    tmp = KUA.with_suffix(".json.tmp")
    tmp.write_text(json.dumps(kua, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    tmp.replace(KUA)
    print(f"selesai: {done} entri diproses")


if __name__ == "__main__":
    main()
