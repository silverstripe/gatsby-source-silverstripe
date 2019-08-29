

const createMenuBuilder = (allDataObjects) => {
    const siteTrees = allDataObjects.filter(isSiteTree)
    
    return (currentNode, menuLevel = 1) => {
        if (menuLevel === 1) {
            return siteTrees.filter(
                ({ SilverStripeSiteTree: { parentID, showInMenus }}) => !parentID && showInMenus
            );
        }

        let parent = currentNode;
        const stack = [parent];
        if (parent) {
            while (
                (parent = siteTrees.find(n => n.id === parent.SilverStripeSiteTree.parentID))
                && parent.id
            ) {
                stack.unshift(parent);
            }
        }
        const childrenOf = stack[menuLevel - 2];
        if (childrenOf) {
            return siteTrees.filter(n => n.SilverStripeSiteTree.parentID === childrenOf.id);
        }

        return [];

    };
};

export {
    canonicalName,
    isFile,
    isSiteTree,
    createMenuBuilder
}