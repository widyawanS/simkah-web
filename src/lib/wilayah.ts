/**
 * src/lib/wilayah.ts
 * Helper functions untuk query data wilayah Indonesia
 */

// Import JSON secara langsung agar Astro mempaketkannya (bundle) saat build
import wilayahDataRaw from '../data/wilayah.json';
import kuaDataRaw from '../data/kua.json';
// Override hasil verifikasi manual penghulu (file kecil, menimpa baseline per field)
import kuaManualRaw from '../data/kua-manual.json';

export interface KecamatanData {
  id_provinsi: string;
  provinsi: string;
  slug_provinsi: string;
  id_kota: string;
  kota: string;
  slug_kota: string;
  id_kecamatan: string;
  kecamatan: string;
  slug: string;
}

// Gunakan data yang sudah di-import
const _allData = wilayahDataRaw as KecamatanData[];
const _cache = new Map(_allData.map((item) => [item.slug, item]));

// ── Public API (Sync) ─────────────────────────────────────────────────────────

/** Cari satu kecamatan berdasarkan slug URL */
export function getKecamatanBySlug(slug: string): KecamatanData | null {
  return _cache.get(slug) ?? null;
}

/** Ambil semua kecamatan dalam satu kota/kabupaten yang sama */
export function getKecamatanByKota(idKota: string): KecamatanData[] {
  return _allData.filter((k) => k.id_kota === idKota);
}

/** Ambil N kecamatan tetangga (ekskluding diri sendiri) */
export function getTetangga(item: KecamatanData, limit = 5): KecamatanData[] {
  return getKecamatanByKota(item.id_kota)
    .filter((k) => k.slug !== item.slug)
    .slice(0, limit);
}

/** Pilih variasi kalimat pembuka secara konsisten berdasarkan nama kecamatan */
export function getVariasiPembuka(kecamatan: string, kota: string): string {
  const variants = [
    `Kabar gembira untuk warga <strong>${kecamatan}</strong>! Panduan lengkap dan terbaru pendaftaran nikah di KUA Kecamatan ${kecamatan}, ${kota} kini tersedia di sini.`,
    `Sedang mengurus pernikahan di <strong>${kecamatan}</strong>? Berikut panduan resmi dan lengkap yang perlu Anda ketahui sebelum mendaftar ke KUA.`,
    `Bagi pasangan di wilayah <strong>${kecamatan}</strong>, ${kota} yang hendak menikah — inilah informasi terlengkap seputar persyaratan dan alur pendaftaran nikah.`,
    `Panduan nikah di KUA <strong>${kecamatan}</strong> terbaru sesuai Peraturan Menteri Agama No. 30 Tahun 2024. Simak selengkapnya agar proses Anda lancar.`,
    `<strong>${kecamatan}</strong>, ${kota} — Temukan informasi resmi syarat dan tata cara pendaftaran pernikahan di KUA setempat di halaman ini.`,
  ];

  let hash = 0;
  for (let i = 0; i < kecamatan.length; i++) {
    hash = (hash * 31 + kecamatan.charCodeAt(i)) & 0xffff;
  }
  return variants[hash % variants.length];
}

export function shortKota(kota: string): string {
  return kota.replace(/^(Kota|Kabupaten)\s+/i, '');
}

export interface KUAData {
  id_kecamatan: string;
  alamat: string;
  telepon: string;
  jam_layanan: string;
  kepala_kua: string;
  desa_dilayani: string[];
  puskesmas_rujukan: string;
  patokan: string;
  foto_gedung: string;
  sumber_data: string;
  verified: boolean;
  updated: string;
  koordinat?: { lat: number; lon: number };
  jarak_pusat_kota_km?: number;
  deskripsi_wilayah?: string;
}

const _kuaBase = kuaDataRaw as Record<string, unknown>;
const _kuaManual = kuaManualRaw as Record<string, unknown>;

/** Baseline hasil scrape (kua.json) apa adanya, tanpa override manual. Dipakai admin untuk menghitung diff. */
export function getKUABaseline(slug: string): KUAData | null {
  return (_kuaBase[slug] as KUAData | undefined) ?? null;
}

/** Gabungkan baseline + override manual; field di kua-manual.json menang. */
function resolveKua(slug: string): KUAData | null {
  const base = _kuaBase[slug] as KUAData | undefined;
  const ov = _kuaManual[slug];
  if (!base && !ov) return null;
  if (!ov || typeof ov !== 'object') return base ?? null;
  return { ...(base ?? {}), ...(ov as Partial<KUAData>) } as KUAData;
}

/** Ambil data KUA (baseline + override manual, termasuk progress/OSM). Untuk publikasi gate tetap getKUAData */
export function getKUARaw(slug: string): KUAData | null {
  return resolveKua(slug);
}
/** Data unik KUA: verified:true + alamat asli + daftar desa (telepon opsional, KUA umumnya tanpa call center) */
export function getKUAData(slug: string): KUAData | null {
  const raw = resolveKua(slug);
  if (!raw || raw.verified !== true) return null;
  if (!raw.alamat || raw.alamat.startsWith('CONTOH') || raw.alamat.startsWith('PROGRESS')) return null;
  if (!raw.desa_dilayani || raw.desa_dilayani.length === 0 || raw.desa_dilayani[0].startsWith('CONTOH')) return null;
  return raw;
}
