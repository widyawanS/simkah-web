#!/usr/bin/env node
/**
 * Menghasilkan varian responsif untuk gambar blog + manifest untuk template.
 *
 * Latar belakang: gambar blog disimpan di public/ (bukan src/assets), sehingga
 * komponen <Image> astro:assets tidak bisa memprosesnya. Akibatnya satu file
 * 1920x1280 (~370-550 KB) dikirim utuh ke layar 412 px.
 *
 * Skrip ini dijalankan sebelum `astro build` (lihat package.json) dan:
 *   1. membuat <nama>-<lebar>.webp untuk tiap lebar di WIDTHS
 *   2. menulis src/data/blog-images.ts agar template bisa membangun srcset
 *
 * Tidak pernah menggagalkan build: error per file hanya dicatat.
 */
import { readdir, stat, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const SRC_DIR = path.resolve("public/images/blog");
const OUT_MODULE = path.resolve("src/data/blog-images.ts");

const WIDTHS = [480, 768, 1200, 1600];
const QUALITY = 78;
const SRC_RE = /\.(webp|jpe?g|png)$/i;
// Jangan pernah memproses file hasil generate sebagai sumber (mencegah rekursi).
const VARIANT_RE = /-\d{3,4}\.(webp|jpe?g|png)$/i;

async function walk(dir) {
  const found = [];
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return found;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) found.push(...(await walk(full)));
    else if (SRC_RE.test(entry.name) && !VARIANT_RE.test(entry.name)) found.push(full);
  }
  return found;
}

async function isUpToDate(outPath, srcMtimeMs) {
  try {
    const s = await stat(outPath);
    return s.mtimeMs >= srcMtimeMs;
  } catch {
    return false;
  }
}

const files = await walk(SRC_DIR);
const manifest = new Map();
let created = 0;
let skipped = 0;
let failed = 0;

for (const file of files) {
  try {
    const srcStat = await stat(file);
    const meta = await sharp(file).metadata();
    const w = meta.width ?? 0;
    const h = meta.height ?? 0;
    if (!w || !h) continue;

    const variants = [];
    for (const target of WIDTHS) {
      if (target >= w) continue; // jangan pernah upscale
      const out = file.replace(SRC_RE, `-${target}.webp`);
      if (await isUpToDate(out, srcStat.mtimeMs)) {
        variants.push(target);
        skipped++;
        continue;
      }
      await sharp(file)
        .resize({ width: target, withoutEnlargement: true })
        .webp({ quality: QUALITY, effort: 5 })
        .toFile(out);
      variants.push(target);
      created++;
    }

    const url =
      "/" + path.relative(path.resolve("public"), file).split(path.sep).join("/");
    manifest.set(url, { w, h, variants });
  } catch (err) {
    failed++;
    console.warn(`[img] gagal: ${path.basename(file)} — ${err.message}`);
  }
}

const lines = [
  "// DIHASILKAN OTOMATIS oleh scripts/gen-responsive-images.mjs — jangan diedit manual.",
  "// Jalankan: node scripts/gen-responsive-images.mjs",
  "export type BlogImageMeta = { w: number; h: number; variants: number[] };",
  "",
  "const manifest: Record<string, BlogImageMeta> = {",
];
for (const [url, m] of [...manifest.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
  lines.push(`  ${JSON.stringify(url)}: { w: ${m.w}, h: ${m.h}, variants: [${m.variants.join(", ")}] },`);
}
lines.push("};", "", "export default manifest;", "");

await mkdir(path.dirname(OUT_MODULE), { recursive: true });
await writeFile(OUT_MODULE, lines.join("\n"), "utf8");

console.log(
  `[img] sumber=${files.length} varian_baru=${created} dilewati=${skipped} ` +
    `gagal=${failed} entri_manifest=${manifest.size}`
);
