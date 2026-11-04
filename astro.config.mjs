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
  // Artikel lama yang digabung → redirect permanen agar tidak jadi thin/duplicate
  redirects: {
    "/blog/rekomendasi-nikah-sudah-terkirim-tapi-belum-terbaca-di-kua-tujuan-ini-yang-harus-dicek":
      "/blog/rekomendasi-nikah-belum-terbaca-solusi",
    "/blog/viral-penghulu-ini-pimpin-akad-nikah-pakai-bahasa-inggris-ternyata-ada-alasannya":
      "/blog/lagi-penghulu-viral-pimpin-akad-nikah-dengan-3-bahasa",
  },
  prefetch: true,
  image: {
    service: {
      entrypoint: "astro/assets/services/sharp",
    },
  },
  integrations: [
    sitemap({
      filter: (page) =>
        !page.includes('/keystatic/') &&
        !page.includes('/api/') &&
        !page.includes('/test-'),
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

