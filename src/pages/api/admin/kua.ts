import type { APIRoute } from 'astro';
import { getKUABaseline } from '@lib/wilayah';
import { saveManual } from '@lib/kuaStore';
import { jarakKePusatKota } from '@lib/geo';

/**
 * Simpan edit manual satu entri KUA.
 *
 * Auth ditangani src/middleware.ts (cookie sesi). Penyimpanan ditangani
 * src/lib/kuaStore.ts: dev menulis file lokal, production commit ke GitHub.
 *
 * Yang disimpan HANYA field yang berbeda dari baseline kua.json, supaya
 * kua-manual.json tetap kecil dan riwayat git tidak membengkak.
 */

const TEXT_FIELDS = [
  'alamat',
  'telepon',
  'jam_layanan',
  'kepala_kua',
  'puskesmas_rujukan',
  'patokan',
  'deskripsi_wilayah',
  'foto_gedung',
];

/** Terima "-6,2" (format Indonesia) maupun "-6.2" */
function parseNum(v: unknown): number | null {
  const s = String(v ?? '').trim().replace(',', '.');
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function sameValue(a: unknown, b: unknown): boolean {
  return JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
}

/** Bandingkan koordinat secara numerik agar urutan key/format tidak bikin diff palsu */
function sameKoordinat(a: any, b: any): boolean {
  const ao = a && typeof a === 'object' ? a : null;
  const bo = b && typeof b === 'object' ? b : null;
  if (!ao || !bo) {
    if (ao || bo) return false;
    return String(a ?? '') === String(b ?? '');
  }
  return Number(ao.lat) === Number(bo.lat) && Number(ao.lon) === Number(bo.lon);
}

export const POST: APIRoute = async ({ request }) => {
  const form = await request.formData();
  const slug = String(form.get('slug') || '');
  const back = String(form.get('back') || '/admin/kua');
  // Sanitasi back: harus relatif, dimulai /admin, tidak boleh mengandung host/protokol
  const safeBack = back.replace(/^[a-zA-Z]+:\/\//, '');
  const safePath = safeBack.startsWith('/admin') ? safeBack : '/admin/kua';
  // PENTING: kirim Location RELATIF, jangan dibungkus new URL(..., request.url).
  // Di balik reverse proxy (Coolify/Traefik), request.url berisi alamat internal
  // container (mis. http://localhost:4321), sehingga redirect absolut akan
  // melempar browser ke localhost. Location relatif selalu diselesaikan browser
  // terhadap origin yang sedang dibuka.
  const redirect = (extra: string) =>
    new Response(null, {
      status: 303,
      headers: {
        Location: safePath + (safePath.includes('?') ? '&' : '?') + extra,
      },
    });

  if (!slug || /[^a-z0-9-]/.test(slug)) {
    return new Response('slug tidak valid', { status: 400 });
  }

  const base = (getKUABaseline(slug) ?? {}) as Record<string, any>;
  const candidate: Record<string, any> = {};

  // 1) Field teks
  for (const f of TEXT_FIELDS) {
    candidate[f] = String(form.get(f) ?? '').trim();
  }

  // 2) Desa/kelurahan — satu nama per baris
  const desa = String(form.get('desa_dilayani') ?? '')
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (desa.length) candidate.desa_dilayani = desa;

  // 3) Koordinat; jarak dihitung ulang hanya bila koordinatnya benar-benar berubah
  const lat = parseNum(form.get('lat'));
  const lon = parseNum(form.get('lon'));
  if (lat !== null && lon !== null && Math.abs(lat) <= 90 && Math.abs(lon) <= 180) {
    candidate.koordinat = { lat, lon };
  } else {
    candidate.koordinat = '';
  }
  if (!sameKoordinat(candidate.koordinat, base.koordinat)) {
    const jarak =
      candidate.koordinat && typeof candidate.koordinat === 'object'
        ? jarakKePusatKota(slug, candidate.koordinat.lat, candidate.koordinat.lon)
        : null;
    candidate.jarak_pusat_kota_km = jarak ?? '';
  }

  // 4) Status verifikasi + provenance (provenance scrape tetap dicantumkan)
  const verified = form.get('verified') === 'true';
  candidate.verified = verified;
  const today = new Date().toISOString().slice(0, 10);
  if (verified) {
    candidate.updated = today;
    const basis = String(base.sumber_data || '').replace(
      /^Verifikasi manual penghulu \([\d-]+\)\.\s*Basis data:\s*/,
      ''
    );
    candidate.sumber_data = `Verifikasi manual penghulu (${today}). Basis data: ${basis || '-'}`;
  }

  // 5) Ambil selisihnya saja terhadap baseline
  const patch: Record<string, any> = {};
  for (const [k, v] of Object.entries(candidate)) {
    const equal = k === 'koordinat' ? sameKoordinat(v, base[k]) : sameValue(v, base[k]);
    if (!equal) patch[k] = v;
  }

  if (!Object.keys(patch).length) {
    return redirect('saved=' + encodeURIComponent(slug) + '&noop=1');
  }

  try {
    const res = await saveManual(slug, patch, `Admin: verifikasi KUA ${slug}`);
    return redirect(
      'saved=' + encodeURIComponent(slug) + (res.commit ? '&commit=' + res.commit : '')
    );
  } catch (err: any) {
    const msg = String(err?.message || err).slice(0, 200);
    return redirect('error=' + encodeURIComponent(msg));
  }
};
