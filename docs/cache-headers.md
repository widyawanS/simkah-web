# Header cache aset statis

## Masalah yang terukur

`https://simkah.web.id/_astro/*` mengirim:

```
Cache-Control: public, max-age=0
```

Padahal nama file aset Astro sudah memuat hash konten (`Layout.Cwmc6e0y.css`,
`page.tougUCvb.js`). Artinya isi untuk nama yang sama tidak pernah berubah,
sehingga `max-age=0` hanya memaksa browser melakukan revalidasi di setiap
kunjungan ulang — satu round-trip tambahan per aset pada koneksi 150 ms RTT.

Ini **tidak** terlihat pada skor Lighthouse (lab selalu cold load), tetapi
memengaruhi **field data / CrUX** untuk pengunjung berulang, dan CrUX-lah yang
dipakai Google untuk penilaian Core Web Vitals.

## Kenapa bukan lewat middleware Astro

Sudah diuji: `@astrojs/node` (`mode: "standalone"`) melayani `/_astro/*` dan
file di `public/` **sebelum** pipeline middleware Astro. Menambahkan
`Cache-Control` di `src/middleware.ts` untuk path `/_astro/` tidak berpengaruh
apa pun — header tetap `public, max-age=0`. Jadi perbaikan harus di lapisan
reverse proxy / CDN.

## Opsi A — Cloudflare Cache Rules (disarankan)

Situs sudah melewati Cloudflare (respons mengirim `Alt-Svc: h3`).

1. Dashboard Cloudflare → **Caching → Cache Rules → Create rule**
2. **Rule name:** `Aset Astro immutable`
3. **When incoming requests match** — Custom filter expression:

   ```
   (starts_with(http.request.uri.path, "/_astro/"))
   ```

4. **Then:**
   - Cache eligibility: **Eligible for cache**
   - Edge TTL: **Override origin** → 1 tahun
   - Browser TTL: **Override origin** → 1 tahun
5. Simpan, lalu **Purge Everything** sekali.

Efek: browser tidak lagi menghubungi origin untuk aset yang sama.

## Opsi B — Coolify / Traefik

Jika trafik tidak lewat Cloudflare, tambahkan middleware Traefik pada service
Coolify (menu **Labels**):

```yaml
traefik.http.middlewares.simkah-assets.headers.customresponseheaders.Cache-Control=public, max-age=31536000, immutable
traefik.http.routers.simkah.rule=Host(`simkah.web.id`)
traefik.http.routers.simkah.middlewares=simkah-assets
```

Catatan: label di atas menempel ke seluruh router. Kalau ingin dibatasi ke
`/_astro/` saja, buat router terpisah dengan
`PathPrefix('/_astro/')` sebelum router utama.

## Opsi C — nginx (jika kembali ke VPS + nginx)

Sisipkan **sebelum** `location /` yang mem-proxy ke Node:

```nginx
location ^~ /_astro/ {
    alias /path/ke/dist/client/_astro/;
    add_header Cache-Control "public, max-age=31536000, immutable";
    access_log off;
    try_files $uri =404;
}
```

Sekaligus aktifkan kompresi untuk teks (saat ini CSS/JS baru terkompresi
karena Cloudflare, bukan origin):

```nginx
gzip on;
gzip_types text/css application/javascript application/json image/svg+xml;
```

## Yang TIDAK boleh di-cache lama

| Path | Alasan |
|---|---|
| `/sw.js` | Service worker: perlu diperbarui segera |
| `/favicon.svg`, `/logo-simkah.png` | Nama tetap, isi bisa berubah |
| dokumen HTML | Hasil SSR, bisa berubah per request |

## Verifikasi

```bash
curl -sI https://simkah.web.id/_astro/$(curl -s https://simkah.web.id/ \
  | grep -o '_astro/[^"]*\.css' | head -1 | cut -d/ -f2) \
  | grep -i cache-control
```

Harapan: `public, max-age=31536000, immutable`.
