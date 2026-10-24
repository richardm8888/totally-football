// @ts-check

import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
	site: 'https://www.totallyfootballgame.co.uk',
	// GitHub Pages serves every page at its slash URL, so link there directly instead of through a redirect.
	trailingSlash: 'always',
	integrations: [
		mdx(), 
		sitemap({
		filter: (page) =>
			page !== 'https://www.totallyfootballgame.co.uk/success/' &&
			page !== 'https://www.totallyfootballgame.co.uk/the-cards/'
		})
	],
	fonts: [],
});
