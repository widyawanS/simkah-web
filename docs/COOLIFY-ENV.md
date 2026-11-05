# Environment Variables - SIMKAH

Panduan setting env di Coolify v4.6.0.

## Lokasi setting

Semua variabel ada di tempat yang sama:

1. Buka **Coolify Dashboard**
2. Klik **Project** kamu
3. Klik **App** simkah-web
4. Tab **Settings**
5. Cari bagian **Environment Variables** (di bawah NIXPACKS_NODE_VERSION dan PROXY_URLS yang sudah ada)
6. Add variable satu per satu
7. Klik **Save / Deploy**

> Coolify v4.6 punya dua grup: **Production** dan **Preview**. Group preview hanya untuk
> deploy preview (URL preview.xxx.com). Untuk prod, tambah di **Production group**
> saja. Tidak perlu salin ke preview.

## Variabel yang harus ditambah (4)

### 1. `ADMIN_PASSWORD`
- **Group:** Production
- **Value:** password kuat yang kamu pilih (mis. `KuaAdmin!2026x`)
- **Persist:** centang

Kode membaca via `process.env.ADMIN_PASSWORD`. Tanpa ini, middleware tolak
`/admin/*` (503), sengaja *fail-closed*.

### 2. `ADMIN_SESSION_SECRET`
- **Group:** Production
- **Value:** string acak 64 karakter (hasil `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`)

Kode pakai untuk HMAC-SHA256 cookie sesi (`src/lib/auth.ts`). Tanpa ini, login tidak
bisa terverifikasi — semua akses ditolak.

### 3. `GITHUB_TOKEN`
- **Group:** Production
- **Value:** fine-grained Personal Access Token (lihat cara buat di bawah)

Kode pakai untuk `PUT /repos/widyawanS/simkah-web/contents/...` saat kamu klik
Simpan dari production. Tanpa token ini, admin production tetap bisa membuka
halaman (memakai snapshot build) tapi tombol Simpan akan tolak dengan pesan
"GITHUB_TOKEN belum diset".

#### Cara membuat fine-grained PAT:
1. GitHub → Settings → Developer settings → **Fine-grained personal access tokens**
2. Generate new token
3. Name: `coolify-admin-kua`
4. Expiration: 90 hari (atau sesuai kebijakanmu)
5. Repository access: **Only select repositories** → pilih `widyawanS/simkah-web`
6. Permissions → Repository permissions:
   - **Contents: Read and write**
   - (sisanya No access)
7. Generate → salin token (`github_pat_...`) → tempel di Coolify

> Catatan UI Coolify v4.6: kolom yang kamu temui hanya **Key, Value, Persists,
> Build, Runtime** — tidak ada pilihan "Value type" maupun "Encrypted". Itu normal:
> value selalu plain text, dan enkripsi di sisi client ditangani otomatis oleh
> Coolify (token/secret yang dipersist akan dienkripsi di database-nya). Jadi cukup
> isi **Value** + centang **Persists** + centang **Runtime** (build dikecualikan).

### 4. `GITHUB_BRANCH` (opsional)
- **Group:** Production
- **Value:** `main`
- **Encrypted:** kosong

Sudah default `main`, jadi bisa dilewati. Tambah hanya jika kamu pindah ke branch
lain.

## Kenapa bukan `ADMIN_USERNAME`?

Coolify v4.6 sudah punya `ADMIN_USERNAME` + `ADMIN_PASSWORD` bawaan (itu untuk
Keystatic / admin CMS). Kode kamu tidak memakainya — admin KUA pakai
`ADMIN_PASSWORD` versi sendiri (lihat `src/lib/auth.ts`). Nama variabelnya sama
tapi konteksnya beda: Coolify otomatis, kamu pakai versi aplikasi.

**Saran:** ganti value `ADMIN_PASSWORD` bawaan Coolify dengan yang sama persis
dengan yang kamu set untuk admin KUA, supaya tidak bingung. Atau biarkan
dua-duanya, tidak saling ganggu (yang bawaan memang hanya Keystatic).

## Setelah setting

1. Klik **Save** / **Deploy** di Coolify
2. Tunggu deploy selesai (±1-3 menit)
3. Buka `https://simkah.web.id/admin/login`
4. Login dengan `ADMIN_PASSWORD` yang kamu set
5. Uji Simpan → cek GitHub, harusnya ada commit baru di `main`
