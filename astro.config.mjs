import { defineConfig } from "astro/config";
import tailwind from "@astrojs/tailwind";
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
  prefetch: true,
  image: {
    service: {
      entrypoint: "astro/assets/services/sharp",
    },
  },
  integrations: [
    tailwind(),
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

