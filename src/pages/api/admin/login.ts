import type { APIRoute } from 'astro';
import { COOKIE_NAME, checkPassword, createSessionToken, authConfigured } from '@lib/auth';

export const POST: APIRoute = async (context) => {
  // Dev tanpa env auth: langsung boleh masuk (middleware juga meloloskan)
  if (!authConfigured()) {
    if (import.meta.env.DEV) return context.redirect('/admin/kua', 303);
    return new Response('Admin belum dikonfigurasi di server.', { status: 503 });
  }

  const form = await context.request.formData();
  const password = String(form.get('password') || '');
  const rawNext = String(form.get('next') || '/admin/kua');
  // Cegah open redirect: hanya boleh path internal yang diawali /admin
  const next = rawNext.startsWith('/admin') ? rawNext : '/admin/kua';

  if (!checkPassword(password)) {
    return context.redirect('/admin/login?error=1&next=' + encodeURIComponent(next), 303);
  }

  context.cookies.set(COOKIE_NAME, createSessionToken(), {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: !import.meta.env.DEV,
    maxAge: 60 * 60 * 12,
  });
  return context.redirect(next, 303);
};
