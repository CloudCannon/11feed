// @link https://www.npmjs.com/package/feedparser
const RssParser = require('rss-parser');
const EleventyFetch = require("@11ty/eleventy-fetch");
const fastglob = require("fast-glob");
const fs = require("fs");
const dateLimit = require("./dateLimit.js");
const TurndownService = require('@joplin/turndown');
const turndownPluginGfm = require('@joplin/turndown-plugin-gfm')

// https://github.com/harttle/liquidjs/blob/306b07050726c9f07d4325850a3efc7215c38406/src/filters/html.ts#L3C1-L9C2
const escapeMap = {
	'&': '&amp;',
	'<': '&lt;',
	'>': '&gt;',
	'"': '&#34;',
	"'": '&#39;'
}

const turndownService = new TurndownService();
turndownService.use(turndownPluginGfm.gfm);

const stripHTML = (v) => {
	if (v) {
		// https://github.com/harttle/liquidjs/blob/306b07050726c9f07d4325850a3efc7215c38406/src/filters/html.ts#L33
		return String(v).replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<.*?>|<!--[\s\S]*?-->/g, '');
	} else {
		return v;
	}
};


const escape = (v) => {
	if (v) {
		// https://github.com/harttle/liquidjs/blob/306b07050726c9f07d4325850a3efc7215c38406/src/filters/html.ts#L18
		return String(v).replace(/&|<|>|"|'/g, m => escapeMap[m])
	} else {	
		return v;
	}
};

const safeString = (v) => {
	return escape(stripHTML(v));
}

const safeContent = (v) => {
	turndownService.remove(['script', 'noscript', 'style', 'head', 'button', 'iframe']);
	return turndownService.turndown(v);
}

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
		title: safeString(feed.title) || null,
		description: safeString(feed.description) || null,
		link: stripHTML(feed.link) || null,
		author: safeString(feed.author)|| null,
		url: url,
		id: feedId,
		categories: [category],
		items: feed.items.map((item) => {
			return {
				title: safeString(item.title) || null,
				date: new Date(item.pubDate) || null,
				content: safeContent(item['content:encoded'] || item.content || item.description) || null,
				link: item.link || null,
				author: filterAuthor(safeString(item.author || feed.author)) || null
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