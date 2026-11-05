import type { APIRoute } from 'astro';
import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();

function dataPath(rel: string): string {
  const p = join(ROOT, rel);
  if (existsSync(p)) return p;
  throw new Error(`${rel} tidak ditemukan`);
}

/** Jarak dua titik (km), bulatkan 1 desimal — konsisten dengan scripts/enrich_kua.py */
function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const r = 6371.0;
  const p1 = (lat1 * Math.PI) / 180;
  const p2 = (lat2 * Math.PI) / 180;
  const d = Math.sin((p2 - p1) / 2) ** 2
    + Math.cos(p1) * Math.cos(p2) * Math.sin((((lon2 - lon1) * Math.PI) / 180) / 2) ** 2;
  return Math.round(2 * r * Math.asin(Math.sqrt(d)) * 10) / 10;
}

/** Terima "−6,2" maupun "-6.2" */
function parseNum(v: unknown): number | null {
  const s = String(v ?? '').trim().replace(',', '.');
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

const TEXT_FIELDS = [
  'alamat', 'telepon', 'jam_layanan', 'kepala_kua',
  'puskesmas_rujukan', 'patokan', 'deskripsi_wilayah', 'foto_gedung',
];

export const POST: APIRoute = async ({ request }) => {
  // DEV ONLY — penyimpanan production belum diputuskan (menunggu pilihan
  // Decap CMS / git write-back / persistent volume). Jangan dibuka ke
  // production sebelum arsitektur + auth ditentukan.
  if (!import.meta.env.DEV) {
    return new Response('Not found', { status: 404 });
  }
  const form = await request.formData();
  const slug = String(form.get('slug') || '');
  const back = String(form.get('back') || '/admin/kua');
  if (!slug || /[^a-z0-9-]/.test(slug)) {
    return new Response('slug tidak valid', { status: 400 });
  }

  const KUA_PATH = dataPath('src/data/kua.json');
  const kua = JSON.parse(await readFile(KUA_PATH, 'utf-8'));
  const e = kua[slug] && typeof kua[slug] === 'object' ? kua[slug] : {};

  // 1) Field teks
  for (const f of TEXT_FIELDS) {
    e[f] = String(form.get(f) ?? '').trim();
  }

  // 2) Desa/kelurahan dilayani — satu nama per baris
  const desa = String(form.get('desa_dilayani') ?? '')
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (desa.length) e.desa_dilayani = desa;

  // 3) Koordinat + hitung ulang jarak ke pusat kota/kabupaten
  const lat = parseNum(form.get('lat'));
  const lon = parseNum(form.get('lon'));
  if (lat !== null && lon !== null && Math.abs(lat) <= 90 && Math.abs(lon) <= 180) {
    e.koordinat = { lat, lon };
    try {
      const wilayah = JSON.parse(await readFile(dataPath('src/data/wilayah.json'), 'utf-8'));
      const capsPath = join(ROOT, 'scripts', '.capitals.json');
      const caps = existsSync(capsPath) ? JSON.parse(await readFile(capsPath, 'utf-8')) : {};
      const w = wilayah.find((x: any) => x.slug === slug);
      const cap = w ? caps[w.id_kota] : null;
      if (cap) e.jarak_pusat_kota_km = haversineKm(lat, lon, cap.lat, cap.lon);
    } catch {
      // jarak bersifat opsional; jangan gagalkan penyimpanan
    }
  } else {
    e.koordinat = '';
    e.jarak_pusat_kota_km = '';
  }

  // 4) Status verifikasi + provenance
  e.verified = form.get('verified') === 'true';
  const today = new Date().toISOString().slice(0, 10);
  if (e.verified) {
    e.updated = today;
    const basis = String(e.sumber_data || '')
      .replace(/^Verifikasi manual penghulu \([\d-]+\)\.\s*Basis data:\s*/, '');
    e.sumber_data = `Verifikasi manual penghulu (${today}). Basis data: ${basis || '-'}`;
  }

  kua[slug] = e;
  await writeFile(KUA_PATH, JSON.stringify(kua, null, 2) + '\n', 'utf-8');
  return Response.redirect(
    new URL(back + (back.includes('?') ? '&' : '?') + 'saved=' + slug, request.url),
    303
  );
};
