import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import icon from "astro-icon";
import react from "@astrojs/react";
import markdoc from "@astrojs/markdoc";
import mdx from "@astrojs/mdx";
import keystatic from "@keystatic/astro";
import node from "@astrojs/node";

// https://astro.build/config
export default defineConfig({
  output: "server",
  adapter: node({
    mode: "standalone",
  }),
  site: "https://simkah.web.id",
  // Satu URL kanonik per halaman (tanpa trailing slash) agar tidak duplicate content
  trailingSlash: "never",
  // Artikel lama yang digabung → redirect permanen agar tidak jadi thin/duplicate
  redirects: {
    "/blog/rekomendasi-nikah-sudah-terkirim-tapi-belum-terbaca-di-kua-tujuan-ini-yang-harus-dicek":
      "/blog/rekomendasi-nikah-belum-terbaca-solusi",
    "/blog/viral-penghulu-ini-pimpin-akad-nikah-pakai-bahasa-inggris-ternyata-ada-alasannya":
      "/blog/lagi-penghulu-viral-pimpin-akad-nikah-dengan-3-bahasa",
    // Halaman uji lama yang masih terindeks → arahkan ke /blog
    "/blog/test-image-resolution": "/blog",
    "/blog/test-post-1": "/blog",
    "/blog/hello-world": "/blog",
    "/test-images": "/",
    "/redbubble": "/",
    // Konsolidasi & pembersihan tool non-relevan
    "/tools/calculator": "/tools/calculators",
    "/tools/converter": "/tools",
    "/tools/konten-medsos": "/tools",
    "/tools/prompt-generator": "/tools",
  },
  prefetch: true,
  image: {
    service: {
      entrypoint: "astro/assets/services/sharp",
    },
  },
  integrations: [
    sitemap({
      filter: (page) => {
        const path = new URL(page).pathname;
        // Buang route internal, halaman uji, dan konten afiliasi
        if (["/keystatic/", "/api/", "/admin/", "/test-", "/redbubble"].some((p) => path.startsWith(p) || path.includes(p))) {
          return false;
        }
        // Buang varian trailing slash agar tidak dobel (kecuali root)
        if (path !== "/" && path.endsWith("/")) return false;
        return true;
      },
      changefreq: 'weekly',
      priority: 0.7,
      lastmod: new Date(),
      customPages: [
        'https://simkah.web.id/',
        'https://simkah.web.id/about',
        'https://simkah.web.id/blog',
        'https://simkah.web.id/contact',
        'https://simkah.web.id/tools',
      ],
    }),
    icon(),
    react(),
    markdoc(),
    mdx(),
    keystatic(),
  ],
});

