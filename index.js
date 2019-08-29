const nodePath = require('path');
const fs = require('fs');
const isFile = node => node.ancestry.includes(
	'SilverStripe\\Assets\\File'
);
const canonicalName = (className) => (
    className.substr(className.lastIndexOf('\\') + 1)
);

const createTemplateChooser = () => {
    const templateCache = new Map();
    return ({ ancestry }) => {
        const identifier = `${JSON.stringify(ancestry)}`;
        const cached = templateCache.get(identifier);
        if (cached) {
            return cached;
        }

        let templatePath;
        const candidates = [...ancestry];
        let candidate = candidates.pop();
        while(candidate) {
            const templateName = canonicalName(candidate);
            const path = nodePath.resolve(`src/templates/Layout/${templateName}.js`);
            if(fs.existsSync(path)) {
                console.log(`Matched template ${path} for ${candidate}`);
                templatePath = path;
                templateCache.set(identifier, templatePath);
                break;
            } else {
                console.log(`${path} does not exist`);
            }       
            candidate = candidates.pop();
        }
        if (!templatePath) {
            console.error(`No template matched for ${ancestry[ancestry.length-1]}`);
        } 
        return templatePath;
    };
}

const defaultTemplateChooser = createTemplateChooser();

const buildSiteTree = async ({ graphql, actions, filter, chooseTemplate = defaultTemplateChooser}) => {
    const filterArg = filter ? `(filter: ${filter})` : ``;
    const results = await graphql(`
            {
            allSilverStripeDataObject${filterArg} {
                nodes {
                    id
                    link
                    ancestry
                }
            }
        }
    `);
    const linkableNodes = results.data.allSilverStripeDataObject.nodes.filter(n => n.link && !isFile(n));
    return new Promise((resolve, reject) => {
        linkableNodes.forEach(node => {
            const layoutTemplate = chooseTemplate(node);
            if (layoutTemplate) {
                actions.createPage({
                    path: node.link,
                    component: layoutTemplate,
                    context: {
                        link: node.link,
                    }
                });
            } else {
                console.error('No template found. Skipping');
            }
        });
        resolve();
    })
};


module.exports = {
    buildSiteTree,
    canonicalName,
    createTemplateChooser,
};