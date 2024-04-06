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
const htmlEscaper = require('html-escaper');
const { XMLParser } = require("fast-xml-parser");
const CategoryStore = require("./category-store.js");
const slugify = require('slugify');

const turndownService = new TurndownService();
turndownService.use(turndownPluginGfm.gfm);

const window = new JSDOM('').window;
const DOMPurify = createDOMPurify(window);
const xmlParser = new XMLParser({
	ignoreAttributes : false
});

const d = new Date();
d.setDate(d.getDate() - 120);
const dateLimit = new Date(d).getTime();

const safeContent = (v) => {
	try {
		if (v === null || v === undefined) {
			return "";
		}
		let sanitize = DOMPurify.sanitize(v);
		turndownService.remove(['script', 'noscript', 'style', 'head', 'button']);
		return turndownService.turndown(v);
	} catch(error) {
		console.error(`Could not parse ${v}`)
	}
};

const safeString = (v) => {
	if (v === null || v === undefined) {
		return null;
	} else {
		try {
			v = htmlEscaper.unescape(v);
			v = v.replaceAll('&#8217;', '’');
			return htmlEscaper.escape(v);
		} catch(error) {
			console.error(`Could not parse ${v}`);
			return "";
		}
	}
};

const processOutline = async (outline, categoryStore) => {
	let category = 'Misc';
	if (outline['@_xmlUrl']) {
		categoryStore.add(category, outline['@_xmlUrl']);

	// Check if it's a nested outline
	} else if (outline.outline) {
		const nestedOutlines = outline.outline;

		if (outline['@_text']) {
			category = outline['@_text'];
		}
		if (Array.isArray(nestedOutlines)) {
			nestedOutlines.forEach(nestedOutline => {
				if (nestedOutline['@_xmlUrl']) {
					categoryStore.add(category, nestedOutline['@_xmlUrl']);
				}
			});
		} else {
			if (nestedOutlines['@_xmlUrl']) {
				categoryStore.add(category, nestedOutlines['@_xmlUrl']);
			}
		}
	}
};

const getSources = async () => {
	console.log("Downloading RSS feeds...")

	const categoryStore = new CategoryStore();

	// Create a "glob" of all feed json files
	const feedFiles = await fastglob(
		"./src/_feeds/*.json", 
		{ caseSensitiveMatch: false }
	);

	// Loop through those files and add their content to our `feeds` Set
	let feeds = {};
	for (let feed of feedFiles) {
		const feedData = JSON.parse(fs.readFileSync(feed));
		categoryStore.add(feedData.category, feedData.items);
	}

	const opmlFiles = await fastglob(
		"./src/_feeds/*.xml", 
		{ caseSensitiveMatch: false }
	);

	for (let feed of opmlFiles) {
		let file = fs.readFileSync(feed);
		let outlines = xmlParser.parse(file)['opml']['body']['outline'];
		if (Array.isArray(outlines)) {
			for (let outline of outlines) {
				processOutline(outline, categoryStore);
			}
		} else {
			processOutline(outlines, categoryStore);
		}
	}

	return categoryStore;
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

const parseFeed = async (url) => {

	let rawFeed = await EleventyFetch(url, {
		duration: "1d",
		type: "text"
	});


	let feed = await new RssParser({
		timeout: 10000,
	}).parseString(rawFeed);

	let feedId = slugify(url);

	return {
		title: safeString(feed.title),
		description: safeString(feed.description),
		link: sanitizeUrl(feed.link),
		author: safeString(feed.author),
		url: url,
		id: feedId,
		items: feed.items.filter((item) => {
			let date = new Date(item.pubDate);
			return date > dateLimit;
		}).map((item) => {
			return {
				id: slugify(item.link),
				title: safeString((item.title || item.description || item.summary || item['content:encoded'] || item.content || item.link).replace(/(<([^>]+)>)/gi, "")).substring(0, 50),
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
	const parseFeedPromises = [];
	const feedSourcesFlat = feedSources.listFlat();

	for (const feed of Object.keys(feedSourcesFlat)) {
		const feedPromise = parseFeed(feed).then(parsedFeed => {
			console.log(`Processing ${feed}`);
			parsedFeed.categories = feedSourcesFlat[feed];
			feeds[feed] = parsedFeed;
		}).catch(error => {
			console.error(error);
			console.error(`Could not reach ${feed}`);
		});
		parseFeedPromises.push(feedPromise);
	}

	await Promise.allSettled(parseFeedPromises);

	return {
		"all": Object.values(feeds),
		"categories": Object.keys(feedSources.list()),
	};
};