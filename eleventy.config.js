module.exports = function(eleventyConfig) {
	eleventyConfig.addWatchTarget("./src/assets/_styles/");
	eleventyConfig.addPassthroughCopy("./src/assets/");
	return {
		dir: {
			input: "src",
			output: "_site"
		}
	}
};