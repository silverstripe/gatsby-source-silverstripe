const createTemplateChooser = require('../utils/createTemplateChooser');
const generateArtefact = require('../utils/generateArtefact');
const path = require('path');

const buildElemental = ({ getNodesByType }) => {

    const elementalNodes = getNodesByType(`SilverStripeDataObject`)
        .filter(node => node.ancestry.includes("DNADesign\\Elemental\\Models\\BaseElement"))
    if (!elementalNodes.length) {
        return;
    }
    
    const map = {};
    const blocksPath = `src/templates/Blocks`;
    const chooseTemplate = createTemplateChooser([blocksPath]);
        
    elementalNodes.forEach(node => {
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