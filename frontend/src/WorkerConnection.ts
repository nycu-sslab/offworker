import { messageEncode } from '../../common/Message';
import { ConnectionState } from '../../common/ConnectionState';
import { BufferConnection } from './BufferConnection';

const logger = require("node-color-log");
logger.setLevelNoColor();

const enum WorkerState {
    Created,
    LocalReady,
    RemoteReady,
}

class WorkerConnection {
    private _id: string;
    private _state: WorkerState;
    private _port: MessagePort;
    private _socket: WebSocket;
    private _buffers: Map<string, BufferConnection>;
    protected _data: any; // testing only

    constructor(id: string, listenPort: MessagePort, socket: WebSocket, buffers: Map<string, BufferConnection>) {
        this._id = id;
        this._state = WorkerState.Created;
        this._port = listenPort;
        this._socket = socket;
        this._buffers = buffers;

        // receive data from WorkerInterface
        this._port.onmessage = (data) => {
            this.send(data.data);
        }
    }

    id() {
        return this._id;
    }

    localReady() {
        this._state = WorkerState.LocalReady;
        logger.info(`Worker ${this._id} set as LocalReady`);
    }

    remoteReady() {
        this._state = WorkerState.RemoteReady;
        logger.info(`Worker ${this._id} set as RemoteReady`);
    }

    isLocalReady(): boolean {
        return this._state === WorkerState.LocalReady;
    }

    isRemoteReady(): boolean {
        return this._state === WorkerState.RemoteReady;
    }

    // send data to server
    private async send(data: any): Promise<void> {

        const message = messageEncode(ConnectionState.PostMessage, {
            workerId: this._id,
            message: data
        }, null);

        this._data = data;

        // we send the message once the worker is localReady, but at this
        // moment, the remote worker probably has not set yet. Hence, the
        // blocking machenism is set at the backend.
        while (!this.isLocalReady() && !this.isRemoteReady()) {
            await wait();
        }
        /// #if !RELEASE
        logger.debug(`worker ${this._id} sent data ${JSON.stringify(data)}`);
        /// #else
        logger.debug(`worker ${this._id} sent data. (See in DEV mode)`);
        /// #endif
        this._socket.send(message);
    }

    // receive data from server
    receive(message: any, transfer: any) {
        // send data to WorkerConnection
        this._port.postMessage(message, transfer);
    }

}

async function wait() {
    await new Promise(resolve => setTimeout(resolve, 10));
    return;
}

export { WorkerConnection }
