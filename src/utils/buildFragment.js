const exportFragment = (name, fragmentStr) => (`
export const ${name}Fields = graphql\`
    ${fragmentStr}
\`;`
);

const buildFragment = ({ shortName, fields, typeName, baseName }) => (
    exportFragment(shortName, `
    fragment ${shortName}Fields on ${baseName}${typeName !== undefined ? typeName : shortName} {
        ${fields.join("\n\t\t")}
    }`
    )
);

module.exports = {
    buildFragment,
    exportFragment
};