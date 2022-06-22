// @ts-nocheck
import { OffWorkerManager } from "./OffWorkerManager"
import { DecisionEarlyMakerSingleton } from "./DecisionMaker";
import { NewWorker } from "./WorkerInterface";
// import { SharedArrayBufferInterface } from "./SharedArrayBufferInterface"
// import { NewWebAssembly } from "./WebAssembly/index"

const logger = require("node-color-log");

/// #if !RELEASE
logger.setLevel("debug");
/// #else
logger.setLevel("info");
/// #endif

// Current usage: http://<App_url>/?host=&offload=
// where `host` is <ip:port>, `offload` is true of false
const urlParams = new URLSearchParams(window.location.search);
const isOffload = urlParams.get("offload");

if (isOffload != "false") {

    logger.info("Use Offworker!")

    // Store the references of the native APIs
    global._Worker = globalThis.Worker;

    // Future Features
    // global._SharedArrayBuffer = globalThis.SharedArrayBuffer;
    // global._WebAssembly = globalThis.WebAssembly;

    const host = urlParams.get("host");
    const manager = new OffWorkerManager(host ? "ws://" + host : 'ws://localhost:8080');
    // const manager = new OffWorkerManager('ws://140.113.193.198:8080');
    // const manager = new OffWorkerManager('ws://45.33.132.110:8080');
    // const manager = new OffWorkerManager('ws://140.113.193.210:8080/');

    global.OWM = manager;
    manager.connect();

    DecisionEarlyMakerSingleton.run();

    // Change the APIs to ours
    global.Worker = NewWorker;
    // Future Features
    // global.SharedArrayBuffer = SharedArrayBufferInterface;
    // global.WebAssembly.Memory = NewWebAssembly.Memory;
    // global.WebAssembly.instantiateStreaming = NewWebAssembly.instantiateStreaming;

    global.OFFWORKER = {
        EnableAll: false,
    }

} else {
    logger.info("Not Use Offworker!")
}
