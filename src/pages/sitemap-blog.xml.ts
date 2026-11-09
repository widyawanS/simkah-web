/**
 * src/pages/sitemap-blog.xml.ts
 * Sitemap artikel blog (dynamic route tidak ikut @astrojs/sitemap saat SSR).
 */

import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { isPublished } from '@lib/content';

/** "a/b/SLUG/index.mdx" -> "SLUG" */
function dirSlug(id: string): string {
  const parts = id.split('/');
  return parts.length >= 2 ? parts[parts.length - 2] : id;
}

export const GET: APIRoute = async () => {
  const baseUrl = 'https://simkah.web.id';
  const posts = await getCollection('blog', ({ data }) => isPublished(data));

  const urls = posts
    .map((post) => ({
      slug: dirSlug(post.id),
      lastmod: (post.data.updatedDate ?? post.data.pubDate ?? new Date()).toISOString().split('T')[0],
    }))
    // Jangan masukkan halaman uji lama
    .filter(({ slug }) => !/^(test-|hello-world)/.test(slug))
    .sort((a, b) => b.lastmod.localeCompare(a.lastmod))
    .map(
      ({ slug, lastmod }) => `  <url>
    <loc>${baseUrl}/blog/${slug}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>`
    )
    .join('\n');

  // Halaman kategori (hanya halaman 1; arsip >1 di-noindex)
  const categories = Array.from(
    new Set(
      posts
        .map((post) => post.data.category)
        .filter((category): category is string => Boolean(category))
        .map((category) => category.toLowerCase().trim().replace(/\s+/g, "-"))
    )
  );

  const categoryUrls = categories
    .map(
      (slug) => `  <url>
    <loc>${baseUrl}/category/${slug}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.5</priority>
  </url>`
    )
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
${categoryUrls}
</urlset>`.trim();

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
