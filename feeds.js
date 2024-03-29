// @link https://www.npmjs.com/package/feedparser
const RssParser = require('rss-parser');
const EleventyFetch = require("@11ty/eleventy-fetch");
const fastglob = require("fast-glob");
const fs = require("fs");
const TurndownService = require('@joplin/turndown');
const turndownPluginGfm = require('@joplin/turndown-plugin-gfm');
const createDOMPurify = require('dompurify');
const { JSDOM } = require('jsdom');
const sanitizeUrl = require("@braintree/sanitize-url").sanitizeUrl;
var htmlEscaper = require('html-escaper');

const turndownService = new TurndownService();
turndownService.use(turndownPluginGfm.gfm);

const window = new JSDOM('').window;
const DOMPurify = createDOMPurify(window);

const safeContent = (v) => {
	let sanitize = DOMPurify.sanitize(v);
	turndownService.remove(['script', 'noscript', 'style', 'head', 'button']);
	return turndownService.turndown(v);
};

const safeString = (v) => {
	if (v == null || v == undefined) {
		return null;
	} else {
		return htmlEscaper.escape(v)
	}
};

const getSources = async () => {
	// Create a "glob" of all feed json files
	const feedFiles = await fastglob(
		"./src/feeds/*.json", 
		{ caseSensitiveMatch: false }
	);

	// Loop through those files and add their content to our `feeds` Set
	let feeds = [];
	for (let feed of feedFiles) {
		const feedData = JSON.parse(fs.readFileSync(feed));
		feeds.push(feedData);
	}

	// Return the feeds Set of objects within an array
	return feeds;
};

const filterAuthor = (s) => {
	if (s) {
		s = s.replace("hello@smashingmagazine.com", "")
		s = s.trim();
		if (s.charAt(0) == "(") {
			s = s.slice(1);
		}

		if (s.charAt(s.length-1) == ")") {
			s = s.substring(0, s.length - 1);
		}
	}
	return s;
}

const parseFeed = async (url, category) => {

	let rawFeed = await EleventyFetch(url, {
		duration: "1d",
		type: "text"
	});

	let feed = await new RssParser().parseString(rawFeed);
	let feedId = new URL(url).hostname.replace('www.','');

	return {
		title: safeString(feed.title),
		description: safeString(feed.description),
		link: sanitizeUrl(feed.link),
		author: safeString(feed.author),
		url: url,
		id: feedId,
		categories: [category],
		items: feed.items.map((item) => {
			return {
				title: safeString(item.title),
				date: new Date(item.pubDate),
				content: safeContent(item['content:encoded'] || item.content || item.description),
				link: sanitizeUrl(item.link),
				author: filterAuthor(safeString(item.author || feed.author))
			};
		})
	};
};

module.exports = async () => {
	const feedSources = await getSources();
	const feeds = {};
	const categories = [];

	for (const categorySource of feedSources) {
		let category = categorySource.category;
		categories.push(category);
		for (const feed of categorySource.items) {
			const feedData = await parseFeed(feed, category);
			if (!feeds[feedData.url]) {
				feeds[feedData.url] = feedData;
			} else {
				feeds[feedData.url].categories.push(category);
			}
		}
	}
	return {
		"all": Object.values(feeds),
		"categories": categories,
	};
};