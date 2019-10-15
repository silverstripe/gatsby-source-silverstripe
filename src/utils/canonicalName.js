const canonicalName = (className) => (
    className.substr(className.lastIndexOf('\\') + 1)
);

module.exports = canonicalName;