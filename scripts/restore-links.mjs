#!/usr/bin/env node
/**
 * restore-links.mjs
 *
 * Memeriksa artikel-artikel yang sudah tayang (pubDate sudah lewat)
 * dan memulihkan internal link yang sebelumnya dihapus untuk mencegah 404.
 *
 * Cara pakai:
 *   node scripts/restore-links.mjs
 *   node scripts/restore-links.mjs --dry-run   (cek saja, tidak edit file)
 *
 * Setelah selesai, commit hasilnya ke git.
 */

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const dryRun = process.argv.includes('--dry-run');
const now = new Date();

// Baca database link yang dihapus
const pendingLinks = JSON.parse(
  readFileSync(join(__dirname, 'pending-links.json'), 'utf-8')
);

let restored = 0;
let skipped = 0;
const remaining = [];

for (const entry of pendingLinks) {
  const targetDate = new Date(entry.targetPubDate);

  // Belum tayang → skip
  if (targetDate > now) {
    console.log(`⏳ SKIP  [${entry.targetPubDate}] ${entry.sourceSlug} → /blog/${entry.targetSlug}`);
    remaining.push(entry);
    skipped++;
    continue;
  }

  // Sudah tayang → pulihkan link
  const filePath = join(ROOT, 'src', 'content', 'blog', entry.sourceSlug, 'index.mdx');
  let content;
  try {
    content = readFileSync(filePath, 'utf-8');
  } catch (e) {
    console.error(`❌ ERROR membaca file: ${filePath}`);
    remaining.push(entry);
    continue;
  }

  if (!content.includes(entry.newText)) {
    console.warn(`⚠️  WARN  teks tidak ditemukan di ${entry.sourceSlug} — mungkin sudah dipulihkan manual?`);
    // Tidak masukkan ke remaining karena sudah beres
    continue;
  }

  if (dryRun) {
    console.log(`🔍 DRY   ${entry.sourceSlug} → /blog/${entry.targetSlug} (akan dipulihkan)`);
    remaining.push(entry); // dry-run: tidak hapus dari database
    restored++;
    continue;
  }

  const updated = content.replace(entry.newText, entry.oldText);
  writeFileSync(filePath, updated, 'utf-8');
  console.log(`✅ DONE  ${entry.sourceSlug} → /blog/${entry.targetSlug}`);
  restored++;
}

// Tulis ulang database hanya dengan yang belum dipulihkan
if (!dryRun) {
  writeFileSync(
    join(__dirname, 'pending-links.json'),
    JSON.stringify(remaining, null, 2) + '\n',
    'utf-8'
  );
}

console.log(`\nSelesai: ${restored} dipulihkan, ${skipped} belum tayang, ${remaining.length - (dryRun ? restored : 0)} tersisa di database.`);
if (remaining.length > 0 && !dryRun) {
  console.log('Jalankan lagi setelah artikel berikutnya tayang.');
}

