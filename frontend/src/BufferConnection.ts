import { ConnectionState } from '../../common/ConnectionState';
import { messageEncode } from '../../common/Message';

const logger = require("node-color-log");
logger.setLevelNoColor();

const enum BufferState {
    Created,
    RemoteReady,
}

class BufferConnection {
    private _id: string;
    private _state: BufferState;
    private _size: number;
    private _isSync: boolean;
    private _socket: WebSocket;
    private _hasLock: boolean;

    constructor(id: string, size: number, socket: WebSocket) {
        this._id = id;
        this._state = BufferState.Created;
        this._size = size;
        this._isSync = false;
        this._socket = socket;
        // give frontend the lock at first
        this._hasLock = true;
    }

    id() {
        return this._id;
    }

    ready() {
        this._state = BufferState.RemoteReady;
    }

    isReady(): boolean {
        return this._state === BufferState.RemoteReady;
    }

    setLock(): void {
        this._hasLock = true;
    }

    releaseLock(): void {
        this._hasLock = false;
    }

    hasLock(): boolean {
        return this._hasLock;
    }

    async acquireLockWithSync() {
        if (!this._hasLock) {
            // todo: what data I need?
            const data = this._id;
            const message = messageEncode(
                ConnectionState.AcquireLockWithSync, data, null);
            this._socket.send(message);
            logger.info(`Buffer ${this._id} requests the lock with sync.`);
        } else {
            logger.info(`Buffer ${this._id} has already had the lock.`);
        }

        while (!this._hasLock) {
            await wait();
        }

        return this._hasLock;
    }
}

async function wait() {
    await new Promise(resolve => setTimeout(resolve, 10));
    return;
}

export { BufferConnection }

