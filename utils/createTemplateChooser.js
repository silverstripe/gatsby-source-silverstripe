const fs = require('fs');
const nodePath = require('path');

const createTemplateChooser = (paths, prefix = '') => {
    const templateCache = new Map();
    paths.forEach(dir => {
        if (!fs.existsSync(nodePath.resolve(dir))) {
            throw new Error(`You do not have a ${dir} directory. Please create one, or use a custom template choosing function.`);
        }
    });
    
    return ({ typeAncestry }) => {
        const identifier = `${JSON.stringify(typeAncestry)}`;
        const cached = templateCache.get(identifier);
        if (cached) {
            return cached;
        }

        let templatePath;
        const candidates = typeAncestry.map(t => t[0].replace(new RegExp(`^${prefix}`), ``));
        let candidate = candidates.reverse().pop();

        const findPath = templateName => p => {
            const path = nodePath.resolve(nodePath.join(p, `${templateName}.js`));
            if(fs.existsSync(path)) {
                templatePath = path;
                templateCache.set(identifier, templatePath);
                return true;
            }
            return false;      
        };

        while(candidate) {
            paths.some(findPath(candidate));

            if (templatePath) {
                break;
            }

            candidate = candidates.pop();
        }
        return templatePath;
    };
};

module.exports = createTemplateChooser;