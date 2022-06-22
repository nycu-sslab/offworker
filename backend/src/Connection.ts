import { v4 as uuid_v4 } from 'uuid';
import { OffWorker } from "./OffWorker";
import { EventEmitter } from 'events';
import { MessageChannel } from 'worker_threads';
import { WasmMemoryDescriptor } from "../../common/Wasm"
import axios from 'axios';
import fs from 'fs';

const logger = require('node-color-log');

class Connection {
    private _id: string;
    private _workers: Map<string, OffWorker>;
    private _buffers: Map<string, SharedArrayBuffer>;
    private _wasmModules: Map<string, WebAssembly.Module>;
    private _wasmMemorys: Map<string, WebAssembly.Memory>;
    private _ws: any;
    private _emitter: EventEmitter;

    constructor(ws: WebSocket | null) {
        this._ws = ws;
        this._id = uuid_v4();
        this._workers = new Map();
        this._buffers = new Map();
        this._wasmMemorys = new Map();
        this._wasmModules = new Map();
        this._emitter = new EventEmitter();

        this._emitter.on("worker_close", (id: string) => {
            this._workers.delete(id);
            logger.debug(`Worker ${id} has been deleted.`);
        })
    }

    id(): string {
        return this._id;
    }

    async createWorker(id: string, script: string, options: {
        mc: MessageChannel | undefined | null
        url: string | undefined | null
    } | null) {

        logger.debug(`Create worker in url: ${options?.url} with ID ${id}`);

        const worker = new OffWorker(id, script, {
            sharedMemory: null,
            ws: this._ws,
            connectionEmitter: this._emitter,
            url: options?.url,
            child_mc: options?.mc
        });
        this._workers.set(id, worker);
    }

    createBuffer(id: string, size: number): void {
        const buffer = new SharedArrayBuffer(size);
        this._buffers.set(id, buffer);
    }

    async createWasmModule(
        moduleId: string, url: string, isTest: boolean): Promise<void> {
        let wasmFile;
        if (!isTest) {
            const res = await axios.get(url, { responseType: 'arraybuffer' });
            wasmFile = await res.data;
        } else {
            wasmFile = fs.readFileSync(url, null);
        }

        try {
            const module = await WebAssembly.compile(wasmFile);
            this._wasmModules.set(moduleId, module);
        } catch (e) {
            // @todo: error handling
            logger.error(`Cannot compile wasm file ${moduleId} from ${url}.`);
            console.log(e);
        }
    }

    createWasmMemory(id: string, descriptor: WasmMemoryDescriptor) {
        const mem = new WebAssembly.Memory(descriptor);
        this._wasmMemorys.set(id, mem);

        if (descriptor.shared === true && !(mem.buffer instanceof SharedArrayBuffer)) {
            logger.error('Requested a shared WebAssembly.Memory but the returned buffer is not a SharedArrayBuffer. You may need to set flags: --experimental-wasm-threads --experimental-wasm-bulk-memory and also use a recent version');
        }
    }

    wasmMemory(id: string): WebAssembly.Memory {
        if (this._wasmMemorys.has(id)) {
            // @ts-ignore
            return this._wasmMemorys.get(id);
        }
        throw "No such wasm memory " + id;
    }

    wasmModule(id: string): WebAssembly.Module {
        if (this._wasmModules.has(id)) {
            // @ts-ignore
            return this._wasmModules.get(id);
        }
        throw "No such wasm module " + id;
    }

    buffer(id: string): SharedArrayBuffer {
        if (this._buffers.has(id)) {
            // @ts-ignore
            return this._buffers.get(id);
        }
        throw "No such buffer " + id;
    }

    bufferIds(): IterableIterator<string> {
        return this._buffers.keys();
    }

    wasmMemIds(): IterableIterator<string> {
        return this._wasmMemorys.keys();
    }

    wasmModuleIds(): IterableIterator<string> {
        return this._wasmModules.keys();
    }

    worker(id: string): OffWorker | undefined {
        if (this._workers.has(id)) {
            return this._workers.get(id);
        }
        throw "No such worker " + id;
    }

    workers_size(): number {
        return this._workers.size;
    }

    terminate(id: string): void {
        logger.debug(`worker ${id} has been terminated.`)
        this.worker(id)?.close();
        this._workers.delete(id);
    }

    close(): void {
        this._workers.forEach((v, k) => {
            v.close();
        });
    }
}

export { Connection };