// @ts-check

import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
	site: 'https://www.totallyfootballgame.co.uk',
	integrations: [
		mdx(), 
		sitemap({
		filter: (page) =>
			page !== 'https://www.totallyfootballgame.co.uk/success/'
		})
	],
	fonts: [],
});
