// @ts-nocheck
// This file will be embedded in isolates at the beginning.

let performance = {
    now: function () { return __performance_now__.applySync(undefined, []); }
}

self = this;

function importScripts(...args) {
    function func(script) {
        log("Running importScript ...");

        try {
            eval.apply(global, [script]);
        } catch (e) {
            log("importScripts Eval Error");
            throw (e.toString());
        }
    }
    __importScripts__
        .applySync(undefined,
            [new __ivm__.Reference(func), ...args]);
}

function fetch(...args) {
    log("Running fetch ...");

    let url = args[0];
    if (url.slice(0, 4) != "http") {
        url = __url__ + `/${url}`;
    }

    const content = __downloadSync__.applySync(undefined, [url]);
    return {
        _content: content,
        text: function () {
            return this._content;
        }
    }
}

// self-defined fetch, which is slower but support buffer
function fetch2(...args) {
    log("Running fetch2 ...");

    let url = args[0];
    if (url.slice(0, 4) != "http") {
        url = __url__ + `/${url}`;
    }

    const r = __fetch2__.applySync(undefined, [url]);
    return {
        _r : {...r},
        text: function () {
            return this._r.text;
        },
        arrayBuffer: function () {
            return this._r.buf;
        }
    }
}

function setTimeout(fn, time) {
    __setTimeout__.apply(undefined, [new __ivm__.Reference(fn), time]);
}

function close() {
    __close__.apply(undefined, [__workerEmitter__]);
}
this.close = close;

function postMessage(message, transfer) {
    const data = new __ivm__
        .ExternalCopy(message, { transferList: transfer })
        .copyInto({ release: true, transferIn: true });
    __postMessage__.apply(undefined, [__workerEmitter__, data]);
}
this.postMessage = postMessage;

onmessage = null;
this.onmessage = onmessage;

function addEventListener(name, func, options) {
    if (name == "message") {
        __onmessage__.apply(
            undefined, [
            __workerEmitter__,
            new __ivm__.Reference(func),
            __onmessage_ready__]);
    } else {
        throw (new Error(`Error: addEventListener not supports "${name}"`));
    }
}
this.addEventListener = addEventListener;


var __workers__ = [];

class Worker {
    // default usage is as the same as the standard Worker(url)
    // only when doing testing, use Worker(url, true) 
    constructor(urlOrScript, isTest) {
        // init attributes
        this.onerror = null;
        this.onmessage = null;
        this.onmessageerror = null;

        __workers__.push(this);

        let url;

        if (!isTest) {
            if (urlOrScript.slice(0, 4) != "http") {
                url = __url__ + `/${urlOrScript}`;
            }
            else {
                url = urlOrScript
            }
            this._id = __createWorker__.applySync(undefined, [url, __workerEmitter__, __mcs__, isTest]);
        } else {
            this._id = __createWorker__.applySync(undefined, [urlOrScript, __workerEmitter__, __mcs__, isTest]);
        }

    }

    postMessage(message, transfer) {

        const new_msg = {
            id: this._id,
            data: message
        };

        const data = new __ivm__
            .ExternalCopy(new_msg, { transferList: transfer })
            .copyInto({ release: true, transferIn: true });
        __workerPostMessage__.apply(undefined, [__workerEmitter__, data]);
    }

    addEventListener(name, fn, option) {
        if (name == "message") {
            __workerOnmessage__.apply(
                undefined, [__workerEmitter__, new __ivm__.Reference(fn), this._id]);
        } else {
            throw (new Error(`Error: worker's addEventListener not supports "${name}"`));
        }
    }

    terminate() {
        __workerTerminate__.apply(undefined, [this._id]);
    }
}
