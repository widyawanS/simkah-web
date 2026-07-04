/**
 * src/lib/wilayah.ts
 * Helper functions untuk query data wilayah Indonesia
 */

// Import JSON secara langsung agar Astro mempaketkannya (bundle) saat build
import wilayahDataRaw from '../data/wilayah.json';

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
