import { ConnectionState } from '../../../common/ConnectionState';
import { messageEncode } from '../../../common/Message';

const logger = require("node-color-log");
logger.setLevelNoColor();

const enum WasmMemoryState {
    Created,
    RemoteReady,
}

class WasmMemoryConnection {
    private _id: string;
    private _state: WasmMemoryState;
    private _isSync: boolean;
    private _socket: WebSocket;
    private _hasLock: boolean;

    constructor(id: string, socket: WebSocket) {
        this._id = id;
        this._state = WasmMemoryState.Created;
        this._isSync = false;
        this._socket = socket;
        // give frontend the lock at first
        this._hasLock = true;
    }

    id() {
        return this._id;
    }

    ready() {
        this._state = WasmMemoryState.RemoteReady;
    }

    isReady(): boolean {
        return this._state === WasmMemoryState.RemoteReady;
    }

}

export { WasmMemoryConnection }
