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
			return htmlEscaper.escape(v)
		} catch(error) {
			console.error(`Could not parse ${v}`);
			return "";
		}
	}
};

const getSources = async () => {
	console.log("Downloading RSS feeds...")
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

	const opmlFiles = await fastglob(
		"./src/feeds/*.xml", 
		{ caseSensitiveMatch: false }
	);

	for (let feed of opmlFiles) {
		let file = fs.readFileSync(feed);
		let outlines = xmlParser.parse(file)['opml']['body']['outline'];
		if (Array.isArray(outlines)) {
			let category = 'misc';
			for (let outline of outlines) {
				let categoryFeeds = [];
				category = 'misc';
				

				// check if it's a single outline
				if (outline['@_xmlUrl']) {
					feeds.push({
						category: category,
						feeds: categoryFeeds
					})
				// Check if it's a nested outline
				} else if (outline.outline) {
					const nestedOutlines = outline.outline;

					if (outline['@_text']) {
						category = outline['@_text'];
					}
					if (Array.isArray(nestedOutlines)) {
						nestedOutlines.forEach(nestedOutline => {
							if (nestedOutline['@_xmlUrl']) {
								categoryFeeds.push(nestedOutline['@_xmlUrl']);
							}
						});
					} else {
						if (nestedOutlines['@_xmlUrl']) {
							categoryFeeds.push(nestedOutlines['@_xmlUrl']);
						}
					}
				}
				feeds.push({
					category: category,
					items: categoryFeeds
				})
			}
		} else {
			if (outlines['@_xmlUrl']) {
				feeds.push({
					category: category,
					items: [outlines['@_xmlUrl']]
				})
			}
		}
	}

	let deduplicatedFeeds = {};

	feeds.forEach(feedList => {
		const category = feedList['category'];
		
		const existingCategory = deduplicatedFeeds['category'] === category;
		if (category in deduplicatedFeeds) {
			deduplicatedFeeds[category] = [...new Set([...deduplicatedFeeds[category], ...feedList['items']])];
		} else {
			deduplicatedFeeds[category] = feedList['items'];
		}
	});

	let returnData = [];

	Object.keys(deduplicatedFeeds).forEach(key => {
		returnData.push({
			category: key,
			items: deduplicatedFeeds[key]
		});
	});

	return returnData;
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
	let feedId = url;

	return {
		title: safeString(feed.title),
		description: safeString(feed.description),
		link: sanitizeUrl(feed.link),
		author: safeString(feed.author),
		url: url,
		id: feedId,
		categories: [category],
		items: feed.items.filter((item) => {
			let date = new Date(item.pubDate);
			return date > dateLimit;
		}).map((item) => {
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
			try {
				if (!feeds[feed]) {
					console.log(feed);
					feeds[feed] = await parseFeed(feed, category);
				} else {
					console.log("*** NOT ***");
					console.log(feed);
					feeds[feed].categories.push(category);
				}
			} catch (error) {
				console.error(`Could not reach ${feed}`)
			}
		}
	}
	return {
		"all": Object.values(feeds),
		"categories": categories,
	};
};