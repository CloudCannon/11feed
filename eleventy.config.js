const markdownIt = require("markdown-it");
const svgContents = require("eleventy-plugin-svg-contents");

module.exports = function(eleventyConfig) {
	const md = new markdownIt({
		html: true,
	});

	eleventyConfig.addWatchTarget("./src/assets/style.css");
	eleventyConfig.addPassthroughCopy("./src/assets/");
	eleventyConfig.addPlugin(svgContents);
	eleventyConfig.addFilter("markdownify", (content) => {
		return md.render(content);
	});

	return {
		dir: {
			input: "src",
			output: "_site"
		}
	}
};