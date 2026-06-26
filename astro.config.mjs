import { defineConfig } from 'astro/config';
import netlify from '@astrojs/netlify';

export default defineConfig({
  site: 'https://ezcommerce.example.com',
  adapter: netlify(),
});
