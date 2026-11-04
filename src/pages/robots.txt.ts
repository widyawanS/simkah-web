import type { APIRoute } from 'astro';

export const GET: APIRoute = ({ site }) => {
    const siteUrl = site?.toString() || 'https://simkah.web.id';

    const robotsTxt = `# https://www.robotstxt.org/robotstxt.html
User-agent: *
Allow: /

# TEMPORER AdSense: blokir crawl 7.285 halaman pSEO tipis sampai ada data unik per KUA
Disallow: /panduan-nikah-di-KUA/

# Disallow admin and API routes
Disallow: /keystatic/
Disallow: /api/
Disallow: /test-*

# Disallow search params that are for filtering/pagination
Disallow: /*?*page=
Disallow: /*?*filter=

# Sitemaps (sitemap-kua disembunyikan sementara selama pSEO di-noindex)
Sitemap: ${siteUrl}sitemap.xml

# Crawl-delay for bots (in seconds)
Crawl-delay: 1

# Specific bot configurations
User-agent: Googlebot
Allow: /
Crawl-delay: 0

User-agent: Bingbot
Allow: /
Crawl-delay: 0

User-agent: Slurp
Allow: /
Crawl-delay: 1
`;

    return new Response(robotsTxt, {
        headers: {
            'Content-Type': 'text/plain; charset=utf-8',
        },
    });
};
