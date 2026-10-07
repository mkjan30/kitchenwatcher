// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';

// Fully static build. Deployed as Cloudflare Workers static assets (see wrangler.jsonc).
export default defineConfig({
  site: 'https://kitchenwatcher.com',
  trailingSlash: 'always',
  output: 'static',
  integrations: [mdx(), sitemap({ filter: (page) => !page.endsWith('/search/') && !page.includes('/subscribe/') })],
});
