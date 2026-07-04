import type { APIRoute } from 'astro';

export const GET: APIRoute = ({ site }) => {
    const siteUrl = site?.toString() || 'https://simkah.web.id';

    const robotsTxt = `# https://www.robotstxt.org/robotstxt.html
User-agent: *
Allow: /

# Allow pSEO KUA pages explicitly
Allow: /panduan-nikah-di-KUA/

# Disallow admin and API routes
Disallow: /keystatic/
Disallow: /api/
Disallow: /test-*

# Disallow search params that are for filtering/pagination
Disallow: /*?*page=
Disallow: /*?*filter=

# Sitemaps
Sitemap: ${siteUrl}sitemap.xml
Sitemap: ${siteUrl}sitemap-kua

# Crawl-delay for bots (in seconds)
Crawl-delay: 1

# Specific bot configurations
User-agent: Googlebot
Allow: /
Allow: /panduan-nikah-di-KUA/
Crawl-delay: 0

User-agent: Bingbot
Allow: /
Allow: /panduan-nikah-di-KUA/
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
