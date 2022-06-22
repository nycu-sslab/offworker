import ivm from 'isolated-vm';
import { EventEmitter } from 'events';
import WebSocket from 'ws';
import { performance } from 'perf_hooks';
import { MessageChannel, MessagePort } from 'worker_threads';
import { messageEncode } from '../../common/Message';
import { ConnectionState } from '../../common/ConnectionState';
import { v4 as uuid_v4 } from 'uuid';
import { analyzeScript } from './functions';

const logger = require('node-color-log');

const enum OffworkerState {
    Created,
    Ready,
}

interface OffWorkerOptions {
    sharedMemory: Array<SharedMemory> | null | undefined,
    ws: WebSocket | null | undefined,
    connectionEmitter: EventEmitter | null | undefined,
    child_mc: MessageChannel | null | undefined,
    url: string | null | undefined,
}

const FileCache = new Map<string, string>();

class OffWorker {
    private _id: string;
    protected _env: Env;
    private _state: OffworkerState;
    // momnitor everything happened in the worker's script 
    private _workerEmitter: EventEmitter;
    // the channel b/t the worker and te Connenction
    private _connectionEmitter: EventEmitter | null | undefined;
    private _ws: WebSocket | null | undefined;

    // the map of the given message channels from the current worker for the communication
    // with the child workers if needed
    private _parent_mcs: Map<string, MessageChannel>;
    // the received message channel from the parent worker for the communication
    // with the parent worker if needed
    private _child_mc: MessageChannel | null | undefined;
    // the url of this worker
    private _url: string | null | undefined;
    // only the onmessage is ready in the worker, we can give it data
    private _onmessage_ready: any;

    // test only
    protected _postMsgData: any;
    protected _workerPostMsgData: any;

    constructor(
        id: string,
        script: string | null,
        options: OffWorkerOptions | null
    ) {
        this._state = OffworkerState.Created;
        this._id = id;
        this._ws = options?.ws;
        this._env = createEnv();
        this._workerEmitter = new WorkerEmitter();
        this._connectionEmitter = options?.connectionEmitter;
        this._parent_mcs = new Map();
        this._child_mc = options?.child_mc;
        this._url = options?.url;
        this._onmessage_ready = {
            val: false
        };

        // transfer `ivm` to the isolate
        this._env.global.setSync('__ivm__', ivm);

        const sharedMemory = options?.sharedMemory;
        if (sharedMemory !== undefined && sharedMemory !== null && sharedMemory.length > 0) {
            sharedMemory.forEach(shm => {
                if (shm.arrBufName !== null && shm.arrBuf !== null) {
                    // transfer the shared memory
                    this._env.global
                        .setSync(shm.arrBufName, new ivm.ExternalCopy(shm.arrBuf)
                            .copyInto({ release: true }));
                }
            });
        }

        this.setIsolateLog();
        this.setUpBuiltIn();
        this.setUpEvent();

        if (script !== null) {
            // only proxy needs to modify the source code
            if (!this._child_mc) {
                const newScript = analyzeScript(script);
                this.runSync(newScript);
            } else {
                this.runSync(script);
            }
        }

        this.setUpBuiltInEnd();

        this._state = OffworkerState.Ready;
    }

    isReady() {
        return this._state == OffworkerState.Ready;
    }

    runSync(script: string): void {
        this._env.isolate.compileScriptSync(script).runSync(this._env.context);
    }

    async eventEmit(eventName: string, data: any): Promise<void> {
        logger.debug(`WorkerEmitter emits "${eventName}"!`);

        // prevent the condition that the onmessage is not set in the worker
        if (eventName == "onmessage") {
            while (!this._onmessage_ready?.val) {
                await wait();
            }
        }

        this._workerEmitter.emit(eventName, data);
    }

    // Debugging purpose. Create a basic `log` function for the new isolate to use.
    private setIsolateLog(): void {
        const globalRef = this._env.global;

        globalRef.setSync('global', globalRef.derefInto());

        const logCallback = function (...args: any[]) {
            logger.info("[Isolate] ", ...args);
        };
        this._env.context.evalClosureSync(`
            global.log = function(...args) {
                $0.applyIgnored(undefined, args, { arguments: { copy: true } });
            }
        `, [logCallback], { arguments: { reference: true } });
    }

    private setUpBuiltIn(): void {
        this.runSync("console.log = log;");

        this._env.global.setSync('__mcs__', new ivm.Reference(this._parent_mcs));
        this._env.global.setSync('__id__', this._id);
        this._env.global.setSync('__url__', getPrefixUrl(this._url));
        this._env.global.setSync('__close__', new ivm.Reference(insideClose));
        this._env.global.setSync('__postMessage__', new ivm.Reference(insidePostMessage));
        this._env.global.setSync('__onmessage__', new ivm.Reference(insideOnMessage));
        this._env.global.setSync("__onmessage_ready__", new ivm.Reference(this._onmessage_ready));
        this._env.global.setSync(
            '__fetch2__', new ivm.Reference(fetch2));
        this._env.global.setSync(
            '__downloadSync__', new ivm.Reference(downloadSync));
        this._env.global.setSync(
            '__importScripts__', new ivm.Reference(this.insideImportScripts));
        this._env.global.setSync(
            '__createWorker__', new ivm.Reference(insideCreateWorker));
        this._env.global.setSync(
            '__workerPostMessage__', new ivm.Reference(insideWorkerPostMessage));
        this._env.global.setSync(
            '__workerOnmessage__', new ivm.Reference(insideWorkerOnMessage));
        this._env.global.setSync(
            '__workerTerminate__', new ivm.Reference(insideWorkerTerminate));
        this._env.global.setSync(
            '__performance_now__', new ivm.Reference(insidePerformanceNow));
        this._env.global.setSync(
            '__setTimeout__', new ivm.Reference(insideSetTimeout));
    }

    private setUpBuiltInEnd(): void {
        this.runSync(`
            if(onmessage !== null || this.onmessage !== null) {
                if(this.onmessage !== null) {
                    onmessage = this.onmessage;
                }
                __onmessage__.apply(
                    undefined, [
                        __workerEmitter__,
                        new __ivm__.Reference(onmessage),
                        __onmessage_ready__]);
            }

            __workers__.forEach(w => {
                if(w.onmessage != null) {
                    __workerOnmessage__.apply(
                        undefined, [__workerEmitter__, new __ivm__.Reference(w.onmessage), w._id]);
                }
            })
        `);
    }

    // handle the communication b/t (1) the frontend interface to the backend instance or
    // (2) the parent worker to the child worker.
    private setUpEvent(): void {
        this._env.global.setSync('__workerEmitter__', new ivm.Reference(this._workerEmitter));

        this._workerEmitter.on('close', () => {
            logger.debug("worker emitter receive close()");

            this.close();

            this._connectionEmitter?.emit("worker_close", this._id);
        });

        this._workerEmitter.on('postMessage', (data) => {
            logger.debug("worker emitter receive postMessage()");

            if (this._child_mc) {
                logger.debug("child worker postMessage to parent worker");

                this._child_mc.port2.postMessage(data);
            } else {
                logger.debug("backend worker postMessage to frontend interface");

                this._postMsgData = data;

                const newData = {
                    id: this._id,
                    message: data
                };

                const msg = messageEncode(ConnectionState.PostMessage, newData, null);
                if (this._ws) {
                    this._ws.send(msg);
                } else {
                    logger.warn(`WebSocket not in the worker`);
                }
            }
        });

        this._workerEmitter.on('workerPostMessage', (data) => {
            logger.debug("worker emitter receive worker.postMessage()");
            logger.debug("parent worker postMessage to child worker");

            this._workerPostMsgData = data;

            const worker_id = data.id;
            // fit the standard, where message is in `data` attribute
            const worker_data = {
                data: data.data
            };

            const mc = this._parent_mcs.get(worker_id);

            if (mc) {
                mc.port1.postMessage(worker_data);
            } else {
                logger.warn(`${worker_id} is not in the channel map.`);
            }
        });

        if (this._child_mc) {
            this._child_mc.port2.on("message", (data) => {
                this.eventEmit("onmessage", data);
            });
        }

    }

    insideImportScripts(
        fnRef: ivm.Reference<Function>, ...urls: string[]): void {
        logger.debug("worker triggers `importScripts`!");

        for (const url of urls) {
            logger.debug(`downloading ${url}`);
            const script = downloadSync(url);
            // logger.debug(`script:\n${script.slice(0, 100)} ...`);
            try {
                fnRef.applySync(undefined, [script]);
            } catch (e) {
                logger.error("Error in insideImportScripts");
                console.log(e);
            }
        }
    }

    close() {
        this._parent_mcs.forEach(mc => {
            mc.port1.close();
            mc.port2.close();
        })

        setTimeout(() => {
            try {
                if (!this._env.isolate.isDisposed)
                    this._env.isolate.dispose();
            } catch (e) {
                logger.log("Failed to dispose isolate", this._id);
            }
        }, 3000);
    }
}

interface Env {
    isolate: ivm.Isolate;
    context: ivm.Context;
    global: ivm.Reference<Record<string | number | symbol, any>>;
}

interface SharedMemory {
    arrBufName: string | null,
    arrBuf: any | null
};

function createEnv(): Env {

    // @ts-ignore js global
    let snapshot: ivm.ExternalCopy<any> = global.snapshot;

    let isolate = new ivm.Isolate({
        snapshot: snapshot,
        memoryLimit: 700,
    });
    let context = isolate.createContextSync();
    let context_global = context.global;
    return { isolate, context, global: context_global };
}

class WorkerEmitter extends EventEmitter { }

function insideClose(emitterRef: ivm.Reference<EventEmitter>): void {
    logger.debug("worker calls `close()`!");

    const emitter = emitterRef.deref();
    emitter.emit.apply(emitter, ['close']);
}

function insidePostMessage(emitterRef: ivm.Reference<EventEmitter>,
    data: ivm.Copy<any>): void {
    logger.debug("worker calls `postMessage()`!");

    const emitter = emitterRef.deref();
    emitter.emit.apply(emitter, ['postMessage', data]);
}

function insideOnMessage(emitterRef: ivm.Reference<EventEmitter>,
    fnRef: ivm.Reference<Function>, isReadyRef: ivm.Reference<any>): void {
    logger.debug("worker triggers `onmessage`!");

    function fn(data: any) {
        const data_ = new ivm.ExternalCopy(data)
            .copyInto({ release: true, transferIn: true });
        try {
            fnRef.apply(undefined, [data_]);
        } catch (e) {
            logger.error("Error in insideOnMessage");
            console.log(e);
        }
    }

    const emitter = emitterRef.deref();
    emitter.on.apply(emitter, ['onmessage', fn]);

    let isReady = isReadyRef.deref();
    isReady.val = true;
}

function insideWorkerPostMessage(emitterRef: ivm.Reference<EventEmitter>,
    data: ivm.Copy<any>): void {
    logger.debug("worker calls `worker.postMessage()`!");
    logger.debug("child worker postMessage to parent worker");

    const emitter = emitterRef.deref();
    emitter.emit.apply(emitter, ['workerPostMessage', data]);
}

function insideWorkerOnMessage(emitterRef: ivm.Reference<EventEmitter>,
    fnRef: ivm.Reference<Function>, id: string): void {
    logger.debug(`worker ${id} triggers \`worker.onmessage\`!`);

    function fn(data: any) {
        // fit the standard, where message is in `data` attribute
        const newData = {
            data: data
        }
        const data_ = new ivm.ExternalCopy(newData)
            .copyInto({ release: true, transferIn: true });
        try {
            fnRef.apply(undefined, [data_]);
        } catch (e) {
            logger.error("Error in insideWorkerOnMessage");
            console.log(e);
        }
    }

    const emitter = emitterRef.deref();

    emitter.removeAllListeners('workerOnmessage' + id);
    emitter.on.apply(emitter, ['workerOnmessage' + id, fn]);
}

function insideCreateWorker(urlOrScript: string, emitterRef: ivm.Reference<EventEmitter>,
    mcsRef: ivm.Reference<Map<string, MessageChannel>>, isTest: boolean) {
    logger.debug("worker try to create a new worker!");

    let script;

    if (!isTest) {
        logger.debug(`downloading ${urlOrScript}`);
        script = downloadSync(urlOrScript);
    } else {
        script = urlOrScript;
    }

    try {
        const id = uuid_v4();

        const mc = new MessageChannel();

        const mcs = mcsRef.deref();
        mcs.set(id, mc);

        const emitter = emitterRef.deref();

        mc.port1.on("message", data => {
            emitter.emit("workerOnmessage" + id, data);
        });

        // @ts-ignore js global
        global.connection.createWorker(id, script, { mc: mc, url: urlOrScript });

        return id;
    } catch (e) {
        logger.error("Error in insideCreateWorker");
        console.log(e);
    }

    return null;
}

function insideWorkerTerminate(id: string) {
    // @ts-ignore js global
    global.connection.terminate(id);
}

function toArrayBuffer(buf: any) {
    var ab = new ArrayBuffer(buf.length);
    var view = new Uint8Array(ab);
    for (var i = 0; i < buf.length; ++i) {
        view[i] = buf[i];
    }
    return ab;
}

function fetch2(url: string) {
    const buf = require('child_process')
        .execFileSync('curl',
            ['--silent', '-L', url],
            { maxBuffer: Infinity });
    const result = {
        buf: toArrayBuffer(buf),
        text: buf.toString('utf-8')
    };

    return new ivm
        // @ts-ignore
        .ExternalCopy(result, { transferList: [result.buf] })
        .copyInto({ release: true, transferIn: true });
}

function downloadSync(url: string) {
    if (FileCache.has(url))
        return FileCache.get(url);

    if (!url.includes("http")) {
        const file = require('fs').readFileSync(url, "utf8");
        FileCache.set(url, file)
        setTimeout(() => { FileCache.delete(url) }, 500);
        return file;
    }

    const file = require('child_process')
        .execFileSync('curl',
            ['--silent', '-L', url],
            { encoding: 'utf8', maxBuffer: Infinity });
    FileCache.set(url, file)
    setTimeout(() => { FileCache.delete(url) }, 500);
    return file;
}

function getPrefixUrl(url: string | undefined | null) {
    if (!url)
        return undefined;

    let stop = 0;
    for (let i = url.length; i > 0; i--) {
        if (url[i] == '/') {
            stop = i;
            break;
        }
    }

    return url.slice(0, stop + 1);
}

function insidePerformanceNow() {
    return performance.now();
}

function insideSetTimeout(fnRef: ivm.Reference<Function>, time: number) {
    return setTimeout(() => {
        fnRef.apply(undefined, [])
    }, time);
}

async function wait() {
    await new Promise(resolve => setTimeout(resolve, 10));
    return;
}

export { OffWorker, Env, SharedMemory }