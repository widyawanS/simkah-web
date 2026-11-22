import type { APIRoute } from 'astro';
import { getViewCounts, incrementView } from '../../../lib/views';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });

export const POST: APIRoute = async ({ params }) => {
  const slug = params.slug;
  if (!slug) return json({ error: 'missing slug' }, 400);
  const count = await incrementView(slug);
  return json({ slug, count });
};

export const GET: APIRoute = async () => json(getViewCounts());
