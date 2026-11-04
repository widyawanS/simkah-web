export interface KuaRow {
  slug: string;
  kecamatan: string;
  kota: string;
  entry: Record<string, any>;
  status: string;
}

export function entryStatus(e: any): string {
  if (e && e.verified === true) return "verified";
  if (e && (e.koordinat || (e.desa_dilayani && e.desa_dilayani.length))) return "progress";
  return "missing";
}

export function kuaStats(kua: Record<string, any>): Record<string, number> {
  const total: Record<string, number> = { all: 0, verified: 0, progress: 0, missing: 0 };
  for (const s of Object.keys(kua)) {
    if (s.charAt(0) === "_") continue;
    total.all = total.all + 1;
    const st = entryStatus(kua[s]);
    total[st] = total[st] + 1;
  }
  return total;
}

export function kuaRows(
  kua: Record<string, any>,
  bySlug: Map<string, { kecamatan: string; kota: string }>,
  q: string,
  status: string,
  limit: number
): { rows: KuaRow[]; count: number } {
  const ql = (q || "").toLowerCase();
  let slugs = Object.keys(kua).filter((s) => s.charAt(0) !== "_");
  if (status !== "all") slugs = slugs.filter((s) => entryStatus(kua[s]) === status);
  if (ql) {
    slugs = slugs.filter((s) => {
      const w = bySlug.get(s);
      if (s.indexOf(ql) !== -1) return true;
      if (!w) return false;
      return w.kecamatan.toLowerCase().indexOf(ql) !== -1 || w.kota.toLowerCase().indexOf(ql) !== -1;
    });
  }
  const rows: KuaRow[] = slugs.slice(0, limit).map((s) => {
    const w = bySlug.get(s);
    return { slug: s, kecamatan: w ? w.kecamatan : s, kota: w ? w.kota : "", entry: kua[s] || {}, status: entryStatus(kua[s]) };
  });
  return { rows, count: slugs.length };
}
