import type { APIRoute } from 'astro';
import kuaBaseline from '../../../data/kua.json';
import { loadManual, saveManual } from '@lib/kuaStore';

const OSM_PREFIX = 'PROGRESS-OSM: ';

export const POST: APIRoute = async ({ request }) => {
  const form = await request.formData();
  const confirm = String(form.get('confirm') || '');
  if (confirm !== 'yes') {
    return new Response('confirm wajib = yes', { status: 400 });
  }

  // 1) Ambil baseline kua.json (hasil scrape) dan override manual saat ini
  const kuaRaw = kuaBaseline as Record<string, any>;
  const manual = await loadManual();

  // 2) Cari entri yang alamat efektif (baseline + override) masih awalan OSM
  const toClean: Record<string, any> = {};
  let scanned = 0;
  for (const [slug, base] of Object.entries(kuaRaw)) {
    if (slug.startsWith('_')) continue;
    scanned++;
    const ov = manual[slug] && typeof manual[slug] === 'object' ? manual[slug] : {};
    const effective = (ov.alamat ?? base.alamat ?? '') as string;
    if (effective.startsWith(OSM_PREFIX)) {
      const cleaned = effective.slice(OSM_PREFIX.length);
      const patch: Record<string, any> = {};
      if (ov.alamat !== cleaned) patch.alamat = cleaned;
      // Ikuti field override lain yang sudah ada agar tidak hilang
      for (const k of Object.keys(ov)) {
        if (k === 'alamat') continue;
        patch[k] = ov[k];
      }
      if (Object.keys(patch).length) {
        toClean[slug] = patch;
      }
    }
  }

  // 3) Simpan semua patch (setiap slug = 1 commit ke GitHub, atau file lokal di dev)
  let saved = 0;
  for (const [slug, patch] of Object.entries(toClean)) {
    await saveManual(slug, patch, `Admin: bulk bersihkan awalan OSM alamat`);
    saved++;
  }

  const msg = `Bersihkan awalan OSM pada ${saved} entri dari ${scanned} yang dipindai.`;
  // Location relatif agar tidak dilempar ke localhost di balik reverse proxy
  return new Response(null, {
    status: 303,
    headers: { Location: '/admin/kua?' + new URLSearchParams({ bulk: String(saved), scanned: String(scanned) }) },
  });
};
