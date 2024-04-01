const markdownIt = require("markdown-it");
const svgContents = require("eleventy-plugin-svg-contents");
const util = require("node:util");
const exec = util.promisify(require("node:child_process").exec);
const { DateTime } = require("luxon");
const path = require('path');

module.exports = async function(eleventyConfig) {
	const pagefind = await import(
		"pagefind"
	);

	const md = new markdownIt({
		html: true,
	});

	eleventyConfig.addWatchTarget("./src/assets/style.css");
	eleventyConfig.addPassthroughCopy("./src/assets/");
	eleventyConfig.addPlugin(svgContents);

	eleventyConfig.addFilter("markdownify", (content) => {
		return md.render(content);
	});

	eleventyConfig.addFilter("postDate", (dateObj) => {
		return DateTime.fromJSDate(dateObj).toLocaleString(DateTime.DATE_MED);
	});

	await require('./feeds.js')().then(async (data) => {
		eleventyConfig.addCollection("feedPosts", async (collection) => {
			const { index } = await pagefind.createIndex();
			const feedData = data['all'];
			let posts = [];
			feedData.forEach(async (feed) => {
				feed.items.forEach(async (item) => {

					const { errors, file } = await index.addHTMLFile({
						url: `/posts/${item.id}/`,
						content: `<html lang='en'><body><h1 data-pagefind-filter="category:${feed.categories.join(', ')}">${item.title}</h1><main>${ md.render(item.content)}</main></body></html>`
					});

					console.log(errors);
					console.log(file);

					// await index.addCustomRecord({
					// 	url: `/posts/${item.id}`,
					// 	content: md.render(item.content),
					// 	language: "en",
					// 	meta: {
					// 		title: item.title,
					// 	},
					// 	filters: {
					// 		tags: feed.categories
					// 	}
					// });

					posts.push({
						id: item.id,
						content: item.content,
						title: item.title,
						date: new Date(item.date),
						link: item.link,
						author: item.author,
						feed: {
							title: feed.title,
							url: feed.url,
							description: feed.description,
							author: feed.author,
							id: feed.id,
							categories: feed.categories
						}
					});
				});
			});

			const { errors } = await index.writeFiles({
				outputPath: "./_site/pagefind"
			});

			// Remove duplicate posts and sort by date
			return posts.filter((value, index, self) => {
				return self.findIndex(v => v.link === value.link) === index;
			  }).sort(function(a, b) {
				return b.date - a.date;
			});
		});
	
		eleventyConfig.addCollection('feedCategories', (collection) => {
			return data.categories.map(category => {
				return {
					name: category
				}
			});
		});
	
	
		data.categories.forEach(function(category) {
			eleventyConfig.addCollection(`category_${category.toLowerCase()}`, (collection) => {
				let posts = [];
				return collection.getFilteredByTag("posts").filter((post) => {
					return post.data.categories.includes(category);
				});
			});
		});
	
		eleventyConfig.addCollection("feedsList", (collection) => {
			const feedData = data['all'];
			let f = [];
			feedData.forEach(function(feed) {
				f.push({
					title: feed.title,
					url: feed.url,
					description: feed.description,
					author: feed.author,
					id: feed.id,
					categories: feed.categories
				});
			});
	
			return f;
		});
	
		eleventyConfig.addCollection("categorizedFeedsList", (collection) => {
			let returnData = {};
	
			data.categories.forEach(function(category) {
				returnData[category] = [];
			});
			
			const feedData = data['all'];
			feedData.forEach(function(feed) {
				feed.categories.forEach(function(category) {
					returnData[category].push({
						title: feed.title,
						url: feed.url,
						description: feed.description,
						author: feed.author,
						id: feed.id,
						link: feed.link
					})
				});
			});
	
			return returnData;
		});
	
		data['all'].forEach(function(feed) {
			eleventyConfig.addCollection(`feed_${feed.id}`, (collection) => {
				let posts = [];
				return collection.getFilteredByTag("posts").filter((post) => {
					return feed.id == post.data.feedId;
				});
			});
		});
	});
		
	

	eleventyConfig.addGlobalData('build_date', () => {
		return new Date();
	});

	return {
		dir: {
			input: "src",
			output: "_site"
		}
	}
};