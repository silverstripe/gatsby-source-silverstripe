import { Hash } from './types';

type TypeNameFunction = (type: string) => string;

export type FetchFunction = (query: string, variables?: Hash ) => Promise<Hash>;

let typenameHandler: TypeNameFunction;
let fetchHandler: FetchFunction | null;

interface StateCache {
    types: Array<string>;
    files: Array<string>;
    schema: string;
}



typenameHandler = (type: string): string => type;

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

/**
 * Sets the Fetcher function
 * @param func FetchFunction
 */
export function setFetch(func: FetchFunction): void {
    fetchHandler = func;
}

/**
 * Gets the build state
 * @returns StateCache
 */
export function getState(): StateCache {
    return cache;
}