import type { APIRoute } from 'astro';
import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

function kuaPath(): string {
  const p = join(process.cwd(), 'src', 'data', 'kua.json');
  if (existsSync(p)) return p;
  throw new Error('kua.json tidak ditemukan');
}

export const POST: APIRoute = async ({ request }) => {
  // DEV ONLY — di production tolak
  if (!import.meta.env.DEV) {
    return new Response('Not found', { status: 404 });
  }
  const form = await request.formData();
  const slug = String(form.get('slug') || '');
  const back = String(form.get('back') || '/admin/kua');
  if (!slug || /[^a-z0-9-]/.test(slug)) {
    return new Response('slug tidak valid', { status: 400 });
  }
  const KUA_PATH = kuaPath();
  const kua = JSON.parse(await readFile(KUA_PATH, 'utf-8'));
  const e = kua[slug] && typeof kua[slug] === 'object' ? kua[slug] : {};
  for (const f of ['alamat', 'telepon', 'jam_layanan', 'kepala_kua', 'puskesmas_rujukan', 'patokan']) {
    e[f] = String(form.get(f) || '').trim();
  }
  e.verified = form.get('verified') === 'true';
  const today = new Date().toISOString().slice(0, 10);
  if (e.verified) e.updated = today;
  e.sumber_data = (e.sumber_data || '') + '';
  kua[slug] = e;
  await writeFile(KUA_PATH, JSON.stringify(kua, null, 2) + '\n', 'utf-8');
  return Response.redirect(new URL(back + (back.includes('?') ? '&' : '?') + 'saved=' + slug, request.url), 303);
};
