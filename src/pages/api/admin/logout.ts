import type { APIRoute } from 'astro';
import { COOKIE_NAME } from '@lib/auth';

// Location relatif — lihat catatan di api/admin/login.ts
const handler: APIRoute = (context) => {
  context.cookies.delete(COOKIE_NAME, { path: '/' });
  return new Response(null, { status: 303, headers: { Location: '/admin/login' } });
};

export const GET = handler;
export const POST = handler;
