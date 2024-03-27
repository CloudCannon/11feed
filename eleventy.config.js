const markdownIt = require("markdown-it");
const svgContents = require("eleventy-plugin-svg-contents");
const util = require("node:util");
const exec = util.promisify(require("node:child_process").exec);

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

	eleventyConfig.on("eleventy.after", async ({ dir }) => {
		await exec(`npx pagefind --site=${dir.output} --output-subdir=./pagefind`);
	});

	return {
		dir: {
			input: "src",
			output: "_site"
		}
	}
};