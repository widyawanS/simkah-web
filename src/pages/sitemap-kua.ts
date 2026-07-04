/**
 * src/pages/sitemap-kua.ts
 * Sitemap khusus pSEO - Versi Optimasi GSC
 */

import type { APIRoute } from 'astro';
import wilayahDataRaw from '../data/wilayah.json';

export const GET: APIRoute = () => {
  const wilayah = wilayahDataRaw as Array<{ slug: string }>;
  const baseUrl = 'https://simkah.web.id';
  const lastmod = new Date().toISOString().split('T')[0];

  const urls = wilayah
    .map(
      (item) => `  <url>
    <loc>${baseUrl}/panduan-nikah-di-KUA/${item.slug}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>`
    )
    .join('\n');

  // Pastikan TIDAK ADA spasi atau newline sebelum <?xml
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`.trim();

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
