const isFile = node => node.ancestry.includes(
	'SilverStripe\\Assets\\File'
);

module.exports = isFile;