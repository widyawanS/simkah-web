import type { APIRoute } from "astro";
import { getPosts } from "@lib/content";
import { SITE, AUTHOR } from "@lib/site";

function escapeXml(value = ""): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export const GET: APIRoute = async () => {
  const posts = await getPosts();
  const lastBuildDate = (posts[0]?.pubDate ?? new Date()).toUTCString();

  const items = posts
    .map((post) => {
      const url = `${SITE.url}/blog/${post.slug}`;
      return `    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <description>${escapeXml(post.description)}</description>
      <pubDate>${post.pubDate.toUTCString()}</pubDate>
      <author>noreply@simkah.web.id (${escapeXml(post.author)})</author>
      <category>${escapeXml(post.category)}</category>
    </item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(SITE.name)}</title>
    <link>${SITE.url}/</link>
    <description>${escapeXml(SITE.description)}</description>
    <language>${SITE.language}</language>
    <managingEditor>noreply@simkah.web.id (${escapeXml(AUTHOR.name)})</managingEditor>
    <webMaster>noreply@simkah.web.id (${escapeXml(AUTHOR.name)})</webMaster>
    <lastBuildDate>${lastBuildDate}</lastBuildDate>
    <atom:link href="${SITE.url}/rss.xml" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
};
