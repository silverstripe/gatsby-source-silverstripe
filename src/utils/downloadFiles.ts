import { ParentSpanPluginArgs } from "gatsby";
import { PluginConfig, ProcessedFileTuple } from "../types";
import PQueue from "p-queue"
import { createRemoteFileNode, createFileNodeFromBuffer } from "gatsby-source-filesystem"
import { getHardCacheDir } from "../buildState";
import fs from "fs-extra";
import v8 from 'v8';
import path from 'path';
import chalk from 'chalk';

export const downloadFiles = async (
    files: Map<string, ProcessedFileTuple>,
    args: ParentSpanPluginArgs,
    pluginConfig: PluginConfig
): Promise<void> => {
    const { reporter, cache, store } = args;
    const { createNode } = args.actions;
    const { apiKey, concurrentRequests, hardCacheAssets } = pluginConfig;

    const manifestFile = getHardCacheDir(`.assets-manifest.json`);
    let manifest: Map<string, string> = new Map();
    if (fs.existsSync(manifestFile)) {
        manifest = v8.deserialize(fs.readFileSync(manifestFile));
    }

    const queue = new PQueue({ concurrency: concurrentRequests })
    let cacheHits = 0;
    let cacheMisses = 0;
    const cachedHandler = (tuple: Array<string>, id: string) => {
        const [url, hash, filename] = tuple;
        queue.add(async () => {
            try {
                const cachedResult = manifest.get(filename);
                const hardCachedPath = getHardCacheDir(filename);

                // If the file is recorded in the manifest with the same hash, we
                // can skip the download and just copy it.
                if (cachedResult && cachedResult === hash) {
                    const buffer = await fs.readFile(hardCachedPath)
                    await createFileNodeFromBuffer({
                      buffer,
                      name: filename,
                      cache,
                      createNode,
                      createNodeId() {
                        return id
                      },
                      store,
                    })
                    cacheHits++;    
                } else {        
                    const remoteFileNode = await createRemoteFileNode({
                        url,
                        cache,
                        createNode,
                        createNodeId() {
                            return id
                        },
                        reporter,
                        store,
                        httpHeaders: { 'X-API-KEY': apiKey },
                    })
                    // Put the downloaded file on ice
                    const dir = path.dirname(hardCachedPath);
                    if (!fs.existsSync(dir)) {
                        fs.mkdirSync(dir, { recursive: true });
                    }
                    await fs.copyFile(remoteFileNode.absolutePath, hardCachedPath)
                    
                    cacheMisses++;
                    
                    // Update the manifest
                    manifest.set(filename, hash)
                }
            } catch (e) {
                reporter.warn(`Failed to fetch file ${url}. Got error ${e}`);
            }
            Promise.resolve(url);
        })
    };

    const standardHandler = (tuple: Array<string>, id: string) => {
        const [url] = tuple;
        queue.add(async () => {
            try {
                await createRemoteFileNode({
                  url,
                  cache,
                  createNode,
                  createNodeId() {
                    return id
                  },
                  reporter,
                  store,
                  httpHeaders: { 'X-API-KEY': apiKey },
                })
            } catch (e) {
                reporter.warn(`Failed to fetch file ${url}. Got error ${e}`);
            }
            Promise.resolve(url);
        })
    };

    const handler = hardCacheAssets ? cachedHandler : standardHandler
    files.forEach(handler);

    const progress = reporter.createProgress(
        `Downloading files ${hardCacheAssets && '(hard caching enabled)' }`,
        files.size,
        0
    );
    progress.start();
    
    queue.on(`active`, (url) => {
        progress.tick();
    })
    await queue.onIdle()
    progress.setStatus(`Done!`)
    progress.done();

    hardCacheAssets && reporter.info(reporter.stripIndent`
        ${chalk.magentaBright(`*** File migration complete ***`)}
        ${chalk.green(`Cache hits: [${cacheHits}]`)}
        ${chalk.blue(`Downloads: [${cacheMisses}]`)}
    `)
    fs.writeFileSync(manifestFile, v8.serialize(manifest));
};
