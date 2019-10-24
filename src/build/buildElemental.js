const createTemplateChooser = require('../utils/createTemplateChooser');
const generateArtefact = require('../utils/generateArtefact');
const path = require('path');

const blocksPath = `src/templates/Blocks`;
const chooseTemplate = createTemplateChooser([blocksPath]);

const buildElemental = ({ getNodesByType }) => {
    const map = {};
    getNodesByType(`SilverStripeDataObject`)
        .filter(node => node.ancestry.includes("DNADesign\\Elemental\\Models\\BaseElement"))
        .forEach(node => {
            if (!map[node.className]) {
                console.log(`Block ${node.className} matched to ${chooseTemplate(node)}`);
                const blockPath = chooseTemplate(node);
                if (blockPath) {
                    map[node.className] = path.relative(path.resolve(`./src`), blockPath);
                }
                
            }
        });
    const jsonPath = path.join(__dirname, `../../.manifest/elemental.js`);
    const jsonContent = `export default ${JSON.stringify(map, null, 2)}`;
    generateArtefact(jsonPath, jsonContent);
};

module.exports = buildElemental;