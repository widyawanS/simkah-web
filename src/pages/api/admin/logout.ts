import type { APIRoute } from 'astro';
import { COOKIE_NAME } from '@lib/auth';

const handler: APIRoute = (context) => {
  context.cookies.delete(COOKIE_NAME, { path: '/' });
  return context.redirect('/admin/login', 303);
};

export const GET = handler;
export const POST = handler;
