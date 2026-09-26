// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import cloudflare from '@astrojs/cloudflare';

export default defineConfig({
  site: 'https://kitchenwatcher.com',
  trailingSlash: 'always',
  output: 'static',
  adapter: cloudflare({ imageService: 'compile' }),
  integrations: [mdx(), sitemap()],
});
