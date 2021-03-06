import { Hash, NodeResult } from './types';
import { chooserFn } from './utils/createTemplateChooser';
import path from 'path';

type TypeNameFunction = (type: string) => string;

export type FetchFunction = (query: string, variables?: Hash ) => Promise<Hash>;

let typenameHandler: TypeNameFunction;
let fetchHandler: FetchFunction | null;
let templateChooser: chooserFn | null;

interface StateCache {
    types: Array<string>;
    files: Array<string>;
    schema: string;
}


typenameHandler = (type: string): string => type;
templateChooser = null;
fetchHandler = null;

const cache: StateCache = {
    types: [],
    files: [],
    schema: '',    
};


/**
 * Helper to map the SS typename to Gatsby typename
 * @param type 
 * @returns 
 */
export function __typename(type: string): string {
    return typenameHandler(type);
};

/**
 * Sets the typename function
 * @param func 
 */
export function setTypenameHandler(func: TypeNameFunction): void {
    typenameHandler = func;
};

/**
 * Perform a network fetch
 * @param query 
 * @param variables 
 * @returns 
 */
export const fetch: FetchFunction = (query: string, variables?: Hash): Promise<Hash> => {
    if (!fetchHandler) {
        throw new Error(`Fetcher is not defined. Please use setFetcher(createFetch())`);
    }
    return fetchHandler(query, variables);
}

export const chooseTemplate: chooserFn = (page: NodeResult) => {
    if (!templateChooser) {
        throw new Error(`Template chooser is not defined. Please use setTemplateChooser(createTemplateChooser())`);
    }
    return templateChooser(page)

}

/**
 * Sets the Fetcher function
 * @param func FetchFunction
 */
export function setFetch(func: FetchFunction): void {
    fetchHandler = func;
}

/**
 * Sets the template chooser
 * @param func 
 */
export function setTemplateChooser(func: chooserFn): void {
    templateChooser = func;
}

/**
 * Gets the build state
 * @returns StateCache
 */
export function getState(): StateCache {
    return cache;
}

export function getHardCacheDir(subdir?: string): string {
    return path.join(process.cwd(), `.silverstripe-cache`, subdir ?? ``);
}
