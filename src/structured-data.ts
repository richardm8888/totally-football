// Schema.org data that tells search engines who makes Totally Football and what it is.
import { KICKSTARTER_URL, SITE_DESCRIPTION } from './consts';

const SITE_URL = 'https://www.totallyfootballgame.co.uk/';
const ORGANIZATION_ID = `${SITE_URL}#organization`;
const GAME_ID = `${SITE_URL}#game`;

export const organization = {
	'@type': 'Organization',
	'@id': ORGANIZATION_ID,
	name: 'Double Time Games',
	url: SITE_URL,
	founders: [
		{ '@type': 'Person', name: 'Sean Moss' },
		{ '@type': 'Person', name: 'Richard Moss' },
	],
	sameAs: [
		'http://www.doubletimegames.co.uk',
		'https://www.instagram.com/totallyfootballgame',
		'https://www.facebook.com/totallyfootballgame',
		'https://x.com/TFBoardGame',
		'https://www.tiktok.com/@totallyfootballgame',
	],
};

export const website = {
	'@type': 'WebSite',
	'@id': `${SITE_URL}#website`,
	name: 'Totally Football',
	url: SITE_URL,
	publisher: { '@id': ORGANIZATION_ID },
};

export const game = (image: string) => ({
	'@type': 'Game',
	'@id': GAME_ID,
	name: 'Totally Football',
	description: SITE_DESCRIPTION,
	url: SITE_URL,
	image,
	genre: 'Football board game',
	numberOfPlayers: { '@type': 'QuantitativeValue', minValue: 2, maxValue: 4 },
	publisher: { '@id': ORGANIZATION_ID },
	sameAs: [
		KICKSTARTER_URL,
		'https://boardgamegeek.com/boardgame/475887',
		'https://www.youtube.com/watch?v=_7mviL_i4nE',
	],
});

export const article = (post: {
	title: string;
	description: string;
	url: string;
	image: string;
	pubDate: Date;
	updatedDate?: Date;
}) => ({
	'@type': 'BlogPosting',
	headline: post.title,
	description: post.description,
	url: post.url,
	mainEntityOfPage: post.url,
	image: post.image,
	datePublished: post.pubDate.toISOString(),
	dateModified: (post.updatedDate ?? post.pubDate).toISOString(),
	author: { '@id': ORGANIZATION_ID },
	publisher: { '@id': ORGANIZATION_ID },
	about: { '@id': GAME_ID },
});

export const graph = (...nodes: object[]) =>
	JSON.stringify({ '@context': 'https://schema.org', '@graph': nodes });
