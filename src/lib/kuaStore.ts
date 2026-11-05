/**
 * src/lib/kuaStore.ts
 * Lapisan penyimpanan untuk override manual data KUA.
 *
 * DEV  : baca/tulis file lokal src/data/kua-manual.json. Kamu commit sendiri,
 *        jadi bisa verifikasi puluhan entri lalu push sekali (1 deploy).
 * PROD : baca/tulis lewat GitHub API — setiap simpan jadi 1 commit ke branch main.
 *        Tidak ada data yang disimpan di container, sehingga deploy ulang Coolify
 *        tidak mungkin menimpa/menghilangkan hasil verifikasi.
 *
 * kua.json (5,5 MB, baseline scrape) TIDAK PERNAH ditulis di sini. Yang disimpan
 * hanya field yang berbeda dari baseline, supaya file tetap kecil (<1 MB) dan
 * riwayat git tidak membengkak.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { ghConfig, ghGetFile, ghPutFile, safeParseJson } from './github';
import manualSnapshot from '../data/kua-manual.json';

const REL_PATH = 'src/data/kua-manual.json';
const CACHE_MS = 15_000;

interface Cache {
  at: number;
  data: Record<string, any>;
  sha: string;
}
let cache: Cache | null = null;

export function isDev(): boolean {
  return !!import.meta.env.DEV;
}

/** Mode penyimpanan yang sedang aktif, untuk ditampilkan di UI admin */
export function storageMode(): 'lokal (dev)' | 'github' | 'snapshot build (token belum diset)' {
  if (isDev()) return 'lokal (dev)';
  return ghConfig() ? 'github' : 'snapshot build (token belum diset)';
}

function localPath(): string {
  return join(process.cwd(), REL_PATH);
}

async function readLocal(): Promise<Record<string, any>> {
  const p = localPath();
  if (!existsSync(p)) return {};
  return safeParseJson(await readFile(p, 'utf-8'));
}

/**
 * Ambil seluruh override manual.
 * @param fresh lewati cache (dipakai sebelum menulis, agar tidak menimpa edit lain)
 */
export async function loadManual(opts: { fresh?: boolean } = {}): Promise<Record<string, any>> {
  if (isDev()) return readLocal();

  if (!opts.fresh && cache && Date.now() - cache.at < CACHE_MS) return cache.data;

  const cfg = ghConfig();
  if (cfg) {
    try {
      const file = await ghGetFile(cfg, REL_PATH);
      const data = file ? safeParseJson(file.content) : {};
      cache = { at: Date.now(), data, sha: file?.sha || '' };
      return data;
    } catch (err) {
      console.error('[kuaStore] GitHub gagal dibaca, pakai snapshot build:', err);
    }
  }
  return (manualSnapshot as Record<string, any>) || {};
}

/** Gabungkan patch ke override sebuah slug. Nilai null = hapus field (kembali ke baseline). */
function applyPatch(current: Record<string, any>, patch: Record<string, any>): Record<string, any> {
  const next: Record<string, any> = { ...current };
  for (const [k, v] of Object.entries(patch)) {
    if (v === null || v === undefined) delete next[k];
    else next[k] = v;
  }
  return next;
}

export interface SaveResult {
  mode: 'local' | 'github';
  commit?: string;
}

/**
 * Simpan override satu slug.
 * @param patch hanya field yang berbeda dari baseline
 */
export async function saveManual(
  slug: string,
  patch: Record<string, any>,
  message?: string
): Promise<SaveResult> {
  if (isDev()) {
    const data = await readLocal();
    const existing = data[slug] && typeof data[slug] === 'object' ? data[slug] : {};
    const merged = applyPatch(existing, patch);
    if (Object.keys(merged).length) data[slug] = merged;
    else delete data[slug];
    await writeFile(localPath(), JSON.stringify(data, null, 2) + '\n', 'utf-8');
    return { mode: 'local' };
  }

  const cfg = ghConfig();
  if (!cfg) {
    throw new Error('GITHUB_TOKEN belum diset di environment server — simpan dari production dinonaktifkan.');
  }
  // Ambil versi terbaru + sha supaya commit tidak bentrok (409)
  const file = await ghGetFile(cfg, REL_PATH);
  const data = file ? safeParseJson(file.content) : {};
  const existing = data[slug] && typeof data[slug] === 'object' ? data[slug] : {};
  const merged = applyPatch(existing, patch);
  if (Object.keys(merged).length) data[slug] = merged;
  else delete data[slug];

  const content = JSON.stringify(data, null, 2) + '\n';
  const commit = await ghPutFile(
    cfg,
    REL_PATH,
    content,
    message || `Admin: verifikasi KUA ${slug}`,
    file?.sha
  );
  cache = { at: Date.now(), data, sha: '' };
  return { mode: 'github', commit };
}
