import type { APIRoute } from 'astro';
import { COOKIE_NAME, checkPassword, createSessionToken, authConfigured } from '@lib/auth';

/**
 * Redirect dengan Location RELATIF.
 * Astro's context.redirect() membangun URL absolut dari request.url, yang di balik
 * reverse proxy (Coolify/Traefik) berisi alamat internal container
 * (mis. http://localhost:4321) — akibatnya browser dilempar ke localhost.
 * Location relatif selalu diselesaikan browser terhadap origin yang sedang dibuka.
 */
function rel(path: string): Response {
  return new Response(null, { status: 303, headers: { Location: path } });
}

export const POST: APIRoute = async (context) => {
  // Dev tanpa env auth: langsung boleh masuk (middleware juga meloloskan)
  if (!authConfigured()) {
    if (import.meta.env.DEV) return rel('/admin/kua');
    return new Response('Admin belum dikonfigurasi di server.', { status: 503 });
  }

  const form = await context.request.formData();
  const password = String(form.get('password') || '');
  const rawNext = String(form.get('next') || '/admin/kua');
  // Cegah open redirect: hanya boleh path internal yang diawali /admin
  const next = rawNext.startsWith('/admin') ? rawNext : '/admin/kua';

  if (!checkPassword(password)) {
    return rel('/admin/login?error=1&next=' + encodeURIComponent(next));
  }

  context.cookies.set(COOKIE_NAME, createSessionToken(), {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: !import.meta.env.DEV,
    maxAge: 60 * 60 * 12,
  });
  return rel(next);
};
