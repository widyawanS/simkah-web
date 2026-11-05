import { defineMiddleware } from "astro:middleware";
import { COOKIE_NAME, verifySessionToken, readCookie, authConfigured } from "@lib/auth";

/**
 * Proteksi area admin di level aplikasi.
 *
 * Sebelumnya auth diserahkan ke Basic Auth Nginx/CloudPanel, tapi situs sudah
 * pindah ke Coolify sehingga proteksi itu belum tentu berlaku. Karena itu auth
 * sekarang ditangani sendiri (password env + cookie sesi HMAC).
 *
 * Aturan aman (fail-closed):
 *  - Env belum lengkap + production  -> semua rute admin ditolak 503
 *  - Env belum lengkap + dev         -> boleh masuk tanpa login (kenyamanan lokal)
 *  - Env lengkap                     -> wajib cookie sesi valid
 */
const PUBLIC_PATHS = ["/admin/login", "/api/admin/login", "/api/admin/logout"];

export const onRequest = defineMiddleware(async (context, next) => {
    const path = context.url.pathname;
    const isProtected = path.startsWith("/admin") || path.startsWith("/api/admin");
    if (!isProtected) return next();
    if (PUBLIC_PATHS.includes(path)) return next();

    if (!authConfigured()) {
        if (import.meta.env.DEV) return next();
        return new Response(
            "Area admin belum dikonfigurasi di server. Set ADMIN_PASSWORD dan ADMIN_SESSION_SECRET.",
            { status: 503 }
        );
    }

    const token = readCookie(context.request.headers.get("cookie"), COOKIE_NAME);
    if (verifySessionToken(token)) return next();

    if (path.startsWith("/api/")) {
        return new Response("unauthorized", { status: 401 });
    }
    // Location relatif — context.redirect() akan membuat URL absolut dari request.url
    // yang di balik reverse proxy berisi alamat internal (localhost:4321).
    return new Response(null, {
        status: 303,
        headers: { Location: "/admin/login?next=" + encodeURIComponent(path) },
    });
});
