const createTemplateChooser = require('./createTemplateChooser');
const isFile = require('../utils/isFile');

const defaultTemplateChooser = createTemplateChooser();

const buildSiteTree = async ({ graphql, actions, filter, chooseTemplate = defaultTemplateChooser}) => {    
    const filterArg = filter ? `(filter: ${filter})` : ``;
    const results = await graphql(`
            {
            allSilverStripeDataObject${filterArg} {
                nodes {
                    id
                    link
                    parentUUID
                    ancestry
                    silverstripe_id
                    className
                }
            }
        }
    `);
    const linkableNodes = results.data.allSilverStripeDataObject.nodes.filter(n => n.link && !isFile(n));
    const map = new Map();
    linkableNodes.filter(n => n.parentUUID === null).forEach(n => {
        map.set(n.className, true);
    });
    for(let className in map) {
        console.warn(`
            Some or all objects of class ${className} do not have a null "parentUUID" field.
            If this is a dataobject being used as a page, it will not be able to show in navigation
            unless it declares a Parent() function that points back to a page in the site tree.
        `);
    }
    return new Promise((resolve, reject) => {
        const notFound = {};
        linkableNodes.forEach(node => {
            const layoutTemplate = chooseTemplate(node);
            if (layoutTemplate) {
                actions.createPage({
                    path: node.link,
                    component: layoutTemplate,
                    context: {
                        link: node.link,
                        uuid: node.uuid,
                        silverstripe_id: `${node.silverstripe_id}`,
                        id: `${node.id}`
                    }
                });
                console.log(`create page ${node.link} with ${layoutTemplate}`);
            } else {
                notFound[node.ancestry[node.ancestry.length-1]] = true;
            }
        });
        const missing = Object.keys(notFound);
        if (missing.length) {
            console.warn(`The following dataobjects are missing templates. Maybe you want to create them?`);
            console.log(`* ${missing.join('\n*')}`);
        }
        resolve();
    })
};

module.exports = buildSiteTree;