import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import { SITE_URL } from './src/config.ts';

export default defineConfig({
  site: SITE_URL,
  output: 'static',
  trailingSlash: 'never',
  build: { format: 'directory' },
  // Pin the tsconfig: without this, Vite walks up to the Expo app's tsconfig at the repo root.
  vite: { tsconfig: './tsconfig.json' },
  integrations: [mdx(), sitemap({ filter: (page) => !page.includes('/404') })],
});
