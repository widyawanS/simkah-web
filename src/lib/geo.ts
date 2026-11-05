/**
 * src/lib/geo.ts
 * Perhitungan jarak untuk data KUA.
 *
 * Rumus dan pembulatan disamakan dengan scripts/enrich_kua.py (haversine, r=6371,
 * 1 desimal) supaya angka hasil koreksi manual konsisten dengan hasil scrape.
 *
 * Cache ibu kota kota/kabupaten di-import saat build agar tetap tersedia di
 * container production (folder scripts/ tidak ikut ter-deploy).
 */
import wilayahData from '../data/wilayah.json';
import capitalsRaw from '../../scripts/.capitals.json';

interface Capital {
  lat: number;
  lon: number;
}

const wilayah = wilayahData as Array<{ slug: string; id_kota: string }>;
const bySlug = new Map(wilayah.map((w) => [w.slug, w]));
const capitals = capitalsRaw as Record<string, Capital>;

/** Jarak dua titik dalam km, dibulatkan 1 desimal. */
export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const r = 6371.0;
  const p1 = (lat1 * Math.PI) / 180;
  const p2 = (lat2 * Math.PI) / 180;
  const d =
    Math.sin((p2 - p1) / 2) ** 2 +
    Math.cos(p1) * Math.cos(p2) * Math.sin(((lon2 - lon1) * Math.PI / 180) / 2) ** 2;
  return Math.round(2 * r * Math.asin(Math.sqrt(d)) * 10) / 10;
}

/**
 * Jarak dari titik KUA ke pusat kota/kabupaten.
 * Return null bila slug tidak dikenal atau cache ibu kotanya belum ada.
 */
export function jarakKePusatKota(slug: string, lat: number, lon: number): number | null {
  const w = bySlug.get(slug);
  if (!w) return null;
  const cap = capitals[w.id_kota];
  if (!cap || typeof cap.lat !== 'number' || typeof cap.lon !== 'number') return null;
  return haversineKm(lat, lon, cap.lat, cap.lon);
}
