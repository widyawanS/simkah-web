/**
 * src/lib/github.ts
 * Akses GitHub Contents API untuk baca/tulis file kecil di repo.
 *
 * Dipakai admin di production: setiap "Simpan" = 1 commit ke branch main.
 * Karena git adalah satu-satunya sumber kebenaran, hasil verifikasi tidak
 * mungkin hilang atau tertimpa saat Coolify deploy ulang (container ephemeral).
 *
 * Batas penting: endpoint PUT contents andal untuk file <= 1 MB.
 * Karena itu yang ditulis hanya kua-manual.json (kecil), bukan kua.json (5,5 MB).
 */

const API = 'https://api.github.com';

export interface GhConfig {
  owner: string;
  repo: string;
  branch: string;
  token: string;
}

/** Ambil konfigurasi dari env. Return null bila GITHUB_TOKEN belum diset. */
export function ghConfig(): GhConfig | null {
  const token = process.env.GITHUB_TOKEN || '';
  if (!token) return null;
  return {
    owner: process.env.GITHUB_OWNER || 'widyawanS',
    repo: process.env.GITHUB_REPO || 'simkah-web',
    branch: process.env.GITHUB_BRANCH || 'main',
    token,
  };
}

async function gh(cfg: GhConfig, path: string, init: RequestInit = {}): Promise<Response> {
  return fetch(`${API}${path}`, {
    ...init,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${cfg.token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'simkah.web.id-admin',
      ...(init.headers as Record<string, string> | undefined),
    },
  });
}

export interface GhFile {
  /** Isi file sebagai teks */
  content: string;
  /** Blob SHA — wajib dikirim balik saat update */
  sha: string;
}

function safeParseJson(text: string): Record<string, any> {
  try {
    const parsed = JSON.parse(text);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

/**
 * Ambil isi file + sha. Return null bila file belum ada (404).
 * File <=1MB: content base64 ikut terbalas. File 1-100MB: harus via raw media type.
 */
export async function ghGetFile(cfg: GhConfig, filePath: string): Promise<GhFile | null> {
  const url = `/repos/${cfg.owner}/${cfg.repo}/contents/${filePath}?ref=${cfg.branch}`;
  const res = await gh(cfg, url);
  if (res.status === 404) return null;
  if (!res.ok) {
    throw new Error(`GitHub GET ${filePath} gagal: ${res.status} ${(await res.text()).slice(0, 300)}`);
  }
  const data: any = await res.json();
  const sha = String(data.sha || '');
  if (typeof data.content === 'string' && data.content.length) {
    return { content: Buffer.from(data.content, 'base64').toString('utf-8'), sha };
  }
  const raw = await gh(cfg, url, { headers: { Accept: 'application/vnd.github.raw+json' } });
  if (!raw.ok) throw new Error(`GitHub raw ${filePath} gagal: ${raw.status}`);
  return { content: await raw.text(), sha };
}

/** Tulis file (buat baru bila belum ada) sebagai satu commit. Return SHA commit. */
export async function ghPutFile(
  cfg: GhConfig,
  filePath: string,
  content: string,
  message: string,
  sha?: string
): Promise<string> {
  const body: Record<string, unknown> = {
    message,
    content: Buffer.from(content, 'utf-8').toString('base64'),
    branch: cfg.branch,
  };
  if (sha) body.sha = sha;
  const res = await gh(cfg, `/repos/${cfg.owner}/${cfg.repo}/contents/${filePath}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`GitHub PUT ${filePath} gagal: ${res.status} ${(await res.text()).slice(0, 300)}`);
  }
  const data: any = await res.json();
  return String(data?.commit?.sha || '');
}

export { safeParseJson };
