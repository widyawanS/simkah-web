# Admin KUA — verifikasi manual data 7.285 kecamatan

## Ringkas

Admin di `/admin/kua` dipakai untuk memverifikasi data KUA hasil scrape: alamat,
telepon, jam layanan, kepala KUA, puskesmas rujukan, patokan, koordinat, daftar
desa, deskripsi wilayah, foto gedung, dan **centang `verified`**.

`verified: true` punya dua efek di halaman publik `/panduan-nikah-di-KUA/<slug>`:

1. Blok **Profil KUA** ditampilkan (sebelumnya disembunyikan).
2. **`noindex` dilepas** — halaman boleh diindex Google. Tanpa verified, halaman
   tetap `noindex, follow` karena dianggap thin content.

## Arsitektur penyimpanan

Ada **dua file**, sengaja dipisah:

| File | Isi | Siapa yang menulis |
|---|---|---|
| `src/data/kua.json` (5,5 MB) | Baseline hasil scrape OSM + Wikipedia + Kemendagri | Hanya `scripts/enrich_kua.py` (lokal) |
| `src/data/kua-manual.json` (kecil) | Override hasil verifikasi manusia | Admin (lokal **atau** production) |

Saat dibaca, field di `kua-manual.json` **menimpa** baseline per-field
(`src/lib/wilayah.ts` → `resolveKua`). Yang disimpan di override hanya field yang
**berbeda dari baseline**, supaya file tetap kecil.

### Kenapa tidak menulis `kua.json` langsung dari admin?

1. **Batas API GitHub.** Endpoint *create or update file contents* andal untuk
   file ≤ 1 MB. `kua.json` 5,5 MB → harus pakai Git Data API yang jauh lebih rumit.
2. **Riwayat git membengkak.** Setiap commit menyimpan blob baru. Commit
   `kua.json` per verifikasi = +5,5 MB tiap kali. 100 verifikasi ≈ +550 MB,
   1.000 verifikasi ≈ +5,5 GB → clone & deploy Coolify jadi sangat lambat.
3. Dengan override, satu commit hanya beberapa ratus byte.

## Menjawab: "kalau ada update manual di lokal, apakah di server tertimpa?"

**Tidak.** Git adalah satu-satunya sumber kebenaran:

- **Simpan dari production** → admin melakukan **commit langsung ke GitHub**
  (branch `main`) via API → Coolify auto-deploy. Tidak ada data yang disimpan di
  container, jadi deploy ulang tidak bisa menghapus apa pun.
- **Simpan dari lokal (dev)** → menulis `src/data/kua-manual.json` di disk kamu.
  Kamu commit & push sendiri.
- **Edit lokal vs edit server** → keduanya berakhir sebagai commit di branch yang
  sama. Kalau kamu edit lokal **setelah** admin server commit, cukup `git pull`
  dulu sebelum push — git yang menggabungkan, bukan saling menimpa.
  Karena file override kecil dan kamu satu-satunya admin, konflik praktis tidak terjadi.

## Setup production (Coolify)

Set empat environment variable ini di Coolify → aplikasi → **Environment Variables**:

```
ADMIN_PASSWORD=<password kuat>
ADMIN_SESSION_SECRET=<64 karakter acak>
GITHUB_TOKEN=<fine-grained PAT>
GITHUB_BRANCH=main          # opsional, default main
```

Buat `ADMIN_SESSION_SECRET`:

```
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Buat `GITHUB_TOKEN` (fine-grained PAT):

1. GitHub → Settings → Developer settings → **Fine-grained personal access tokens**
2. Repository access: **Only select repositories** → `widyawanS/simkah-web`
3. Permissions → Repository permissions → **Contents: Read and write**
4. Generate, salin token ke `GITHUB_TOKEN`

Tanpa `GITHUB_TOKEN`, admin production tetap bisa **dibaca** (memakai snapshot
hasil build) tetapi tombol Simpan menolak dengan pesan yang jelas. Tanpa
`ADMIN_PASSWORD`/`ADMIN_SESSION_SECRET`, seluruh area admin **menolak akses (503)**
— sengaja *fail-closed* agar tidak pernah terbuka tanpa proteksi.

## Alur kerja yang disarankan

**Verifikasi massal → pakai lokal.** Jalankan `npm run dev`, buka
`http://localhost:4322/admin/kua`, filter `missing`/`progress`, isi puluhan entri.
Semua masuk `kua-manual.json` tanpa commit. Setelah selesai:

```
git add src/data/kua-manual.json
git commit -m "Verifikasi KUA <nama daerah>"
git push
```

Satu push = satu deploy. Ini jauh lebih hemat daripada 50 commit terpisah.

**Verifikasi satuan di jalan → pakai production.** Buka
`https://simkah.web.id/admin/login`, edit, simpan. Tiap simpan = 1 commit +
auto-deploy (±1-3 menit).

## Keamanan

- Auth ditangani **di level aplikasi** (`src/lib/auth.ts` + `src/middleware.ts`),
  bukan mengandalkan Basic Auth Nginx/CloudPanel yang belum tentu masih berlaku
  setelah pindah ke Coolify.
- Cookie sesi: HMAC-SHA256, `HttpOnly`, `Secure`, `SameSite=Lax`, kedaluwarsa 12 jam.
- Perbandingan password memakai `timingSafeEqual` (tahan timing attack).
- `/admin` dan `/api/admin` diblokir middleware; hanya `/admin/login`,
  `/api/admin/login`, `/api/admin/logout` yang publik.
- Halaman admin mengirim `noindex, nofollow`.

## Berkas terkait

```
src/lib/auth.ts                       password + cookie sesi HMAC
src/lib/github.ts                     GitHub Contents API (baca/tulis file kecil)
src/lib/kuaStore.ts                   lapisan penyimpanan (dev: file, prod: GitHub)
src/lib/geo.ts                        haversine + jarak ke pusat kota/kabupaten
src/lib/wilayah.ts                    merge baseline + override
src/lib/adminKua.ts                   statistik & filter daftar untuk UI admin
src/middleware.ts                     proteksi rute /admin & /api/admin
src/pages/admin/login.astro           form login
src/pages/admin/kua.astro             editor
src/pages/api/admin/login.ts          set cookie sesi
src/pages/api/admin/logout.ts         hapus cookie
src/pages/api/admin/kua.ts            simpan satu entri (diff terhadap baseline)
src/data/kua.json                     baseline scrape (jangan ditulis admin)
src/data/kua-manual.json              override verifikasi manual
```

## Troubleshooting

| Gejala | Sebab & solusi |
|---|---|
| Admin production balas 503 | `ADMIN_PASSWORD` / `ADMIN_SESSION_SECRET` belum diset di Coolify |
| Simpan gagal: "GITHUB_TOKEN belum diset" | Tambahkan `GITHUB_TOKEN` di Coolify, lalu redeploy |
| Simpan gagal: `403` dari GitHub | Token kurang permission **Contents: Read and write**, atau repo access tidak mencakup `simkah-web` |
| Simpan gagal: `409 Conflict` | Ada commit lain yang masuk bersamaan — ulangi simpan (kode selalu mengambil SHA terbaru sebelum commit) |
| Halaman publik belum berubah setelah simpan | Tunggu auto-deploy Coolify selesai (±1-3 menit), lalu hard refresh |
| Daftar admin terlihat basi | Cache override 15 detik; reload halaman |
