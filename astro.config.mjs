// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import cloudflare from '@astrojs/cloudflare';

export default defineConfig({
  site: 'https://kitchenwatcher.com',
  trailingSlash: 'always',
  output: 'static',
  adapter: cloudflare({
    imageService: 'compile',
    // Crawl-critical static files bypass the adapter's _worker.js entirely.
    routes: { extend: { exclude: ['/robots.txt', '/sitemap-*', '/pagefind/*', '/logo.png', '/404.html'].map((pattern) => ({ pattern })) } },
  }),
  integrations: [mdx(), sitemap({ filter: (page) => !page.endsWith('/search/') })],
});
