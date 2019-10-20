const fs = require('fs');
const canonicalName = require('./canonicalName');
const nodePath = require('path');

const createTemplateChooser = () => {
    const templateCache = new Map();
    [`src/templates`, `src/templates/Layout`].forEach(dir => {
        if (!fs.existsSync(nodePath.resolve(dir))) {
            throw new Error(`You do not have a ${dir} directory. Please create one, or use a custom template choosing function.`);
        }
    });
    
    return ({ ancestry }) => {
        const identifier = `${JSON.stringify(ancestry)}`;
        const cached = templateCache.get(identifier);
        if (cached) {
            return cached;
        }

        let templatePath;
        const candidates = [...ancestry]
        let candidate = candidates.pop();
        while(candidate) {
            const templateName = canonicalName(candidate);
            if (templateName === 'DataObject') break;
            
            const path = nodePath.resolve(`src/templates/Layout/${templateName}.js`);
            if(fs.existsSync(path)) {
                templatePath = path;
                templateCache.set(identifier, templatePath);
                break;
            }       
            candidate = candidates.pop();
        }
        return templatePath;
    };
};

module.exports = createTemplateChooser;
