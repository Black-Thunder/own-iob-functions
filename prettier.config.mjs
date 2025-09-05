// iobroker prettier configuration file
import prettierConfig from "@iobroker/eslint-config/prettier.config.mjs";

export default {
	...prettierConfig,
	useTabs: true, // Tabs statt Spaces
	singleQuote: false, // Double quotes
};
