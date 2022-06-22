import { OffWorkerManager } from '../OffWorkerManager';
import { v4 as uuid_v4 } from 'uuid';

interface InstantiatedSource {
    instance: WebAssembly.Instance;
    module: WebAssembly.Module;
}

async function instantiateStreaming(
    response: PromiseLike<any>,
    importObject?: any,
    manager?: OffWorkerManager
): Promise<InstantiatedSource> {
    // @ts-ignore global is for browsers
    manager = manager || global.OWM;

    const moduleId = uuid_v4();

    // This implementation falls back to use `instantiate`, which may increase overhead
    // Assume `response` is a `fetch` promise of WASM file
    return await response.then(res => {
        const url = res.url;

        //@ts-ignore manager must be defined
        manager.createWasmModule(moduleId, url);

        /// #if !RELEASE
        return res; // dev
        /// #else
        return res.arrayBuffer();
        /// #endif
    }).then(async buffer => {
        const source = await WebAssembly.instantiate(buffer, importObject);
        Object.defineProperty(source.module, "_id", { value: moduleId });

        return new Promise(resolve => { resolve(source); });
    });
}

export { instantiateStreaming }