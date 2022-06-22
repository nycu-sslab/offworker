import { ConnectionState } from '../../common/ConnectionState';
import { Message, messageEncode, messageDecode } from '../../common/Message';
import { WorkerConnection } from './WorkerConnection';
import { BufferConnection } from './BufferConnection';
import { WasmMemoryDescriptor } from './WebAssembly/MemoryInterface'
import { WasmMemoryConnection } from './WebAssembly/MemoryConnection'

const logger = require("node-color-log");
logger.setLevelNoColor();

const DEFAULT_ADDRESS = "ws://localhost:8080";
const DEFAULT_THREAD_NUMBER = 4;

class OffWorkerManager {
  protected _isConnected: boolean;
  private _serverAddress: string;
  private _threadNumber: number;
  // @ts-ignore // TS: should initialize at first ,where we initialize it when connecting.
  protected _socket: WebSocket;
  protected _workers: Map<string, WorkerConnection>;
  protected _buffers: Map<string, BufferConnection>;
  protected _wasmMems: Map<string, WasmMemoryConnection>;

  constructor(serverAddress: string) {
    this._serverAddress = serverAddress || DEFAULT_ADDRESS;
    this._threadNumber = DEFAULT_THREAD_NUMBER;
    this._workers = new Map();
    this._buffers = new Map();
    this._wasmMems = new Map();
    this._isConnected = false;

    logger.info("OffWorker manager created!");
  }

  connect() {

    try {
      this._socket = new WebSocket(this._serverAddress);

      this._socket.addEventListener('open', () => {
        // @ts-ignore
        global.OFFWORKER.Connection_Open_Time = performance.now();

        this._isConnected = true;
        const helloMsg = messageEncode(ConnectionState.Message, "Hello Server!", null);
        this._socket.send(helloMsg);
        logger.info(`Socket constructed on ${this._serverAddress}.`);
      });

      this._socket.addEventListener('message', (event: any) => {
        const msg = messageDecode(event.data);
        this.workDispatch(msg);
      });

    } catch (e) {
      logger.error("Error: Cannot connect to server." + e)
    }

  }

  disconnect() {
    this._socket.close();
    logger.info(`Socket closed from ${this._serverAddress}.`);
  }

  async createSharedBuffer(id: string, size: number): Promise<void> {
    const buffer = new BufferConnection(id, size, this._socket);
    this._buffers.set(buffer.id(), buffer);

    const urlMsg = messageEncode(
      ConnectionState.CreateBuffer, {
      size: size,
      id: id
    }, null);

    while (!this.isReady()) {
      await wait();
    }
    this._socket.send(urlMsg);

    logger.info(`SharedArrayBuffer ${id} requests creating.`);

    return;
  }

  async createWorker(id: string, url: string, listenPort: MessagePort): Promise<void> {
    const worker = new WorkerConnection(
      id, listenPort, this._socket, this._buffers);

    this._workers.set(id, worker);

    const urlMsg = messageEncode(
      ConnectionState.CreateWorker, {
      id: id,
      url: getAbsoluteUrl(url)
    }, null);

    while (!this.isReady()) {
      await wait();
    }
    this._socket.send(urlMsg);

    worker.localReady();

    logger.info(`Worker ${id} requests creating.`);

    return;
  }

  async createWasmModule(moduleId: string, url: string): Promise<void> {

    const msg = messageEncode(
      ConnectionState.CreateWasmModule, {
      moduleId: moduleId,
      url: url
    }, null);

    while (!this.isReady()) {
      await wait();
    }
    this._socket.send(msg);

    logger.info(`Create wasm module ${moduleId} requests creating.`);

    return;
  }

  async createWasmMemory(id: string, descriptor: WasmMemoryDescriptor) {
    const mem = new WasmMemoryConnection(id, this._socket);
    this._wasmMems.set(mem.id(), mem);

    const msg = messageEncode(
      ConnectionState.CreateWasmMemory, {
      descriptor: descriptor,
      id: id
    }, null);

    while (!this.isReady()) {
      await wait();
    }
    this._socket.send(msg);

    logger.info(`Wasm Memory ${id} requests creating.`);

    return;
  }

  isReady(): boolean {
    return this._isConnected;
  }

  buffer(id: string): BufferConnection | undefined {
    if (this._buffers.has(id)) {
      return this._buffers.get(id);
    }
    throw "No such buffer " + id;
  }

  wasmMem(id: string): WasmMemoryConnection | undefined {
    if (this._wasmMems.has(id)) {
      return this._wasmMems.get(id);
    }
    throw "No such Wasm Memory " + id;
  }

  private workDispatch(message: Message) {
    const data = message.data;
    switch (message.state) {
      case ConnectionState.BufferReady: {
        const id = data;
        if (this._buffers.has(id)) {
          this._buffers.get(id)?.ready();
          logger.info(`Buffer ${id} set as ready`)
        } else {
          logger.warn(
            `Server created a buffer ${id} which is missed in the frontend.`);
        }
        break;
      }
      case ConnectionState.GetLockWithSync: {
        const id = data;
        if (this._buffers.has(id)) {
          this.buffer(id)?.setLock();
          logger.info(`Buffer ${id} get the lock with sync.`)
        } else {
          logger.warn(
            `Server give the lock to the buffer ${id} which is missed in the frontend.`);
        }
        break;
      }
      case ConnectionState.Message: {
        logger.info("server: " + data);
        break;
      }
      case ConnectionState.WorkerReady: {
        const id = data;
        if (this._workers.has(id)) {
          this._workers.get(id)?.remoteReady();
        } else {
          logger.warn(
            `Server start a worker ${id} which is missed in the frontend.`);
        }
        break;
      }
      case ConnectionState.PostMessage: {
        const workerId = data.id;
        const msg = data.message;

        /// #if !RELEASE
        logger.debug(`Worker ${workerId} sent messages ${JSON.stringify(msg)} from server`);
        /// #else
        logger.debug(`Worker ${workerId} sent messages from server. (See in DEV mode)`);
        /// #endif

        if (this._workers.has(workerId)) {
          const worker = this._workers.get(workerId);
          worker?.receive(msg, []);
        } else {
          logger.warn(
            `Server start a worker ${workerId} which is missed in the frontend.`);
        }
        break;
      }
      case ConnectionState.WasmMemoryReady: {
        const id = data;
        if (this._wasmMems.has(id)) {
          this._wasmMems.get(id)?.ready();
          logger.info(`Wasm memory ${id} set as ready`);
        } else {
          logger.warn(
            `Server created a wasm memory ${id} which is missed in the frontend.`);
        }
        break;
      }
      case ConnectionState.WasmModuleReady: {
        const id = data;
        logger.info(`Wasm module ${id} set as ready`);
        break;
      }
      default:
        break;
    }
  }

}

async function wait() {
  await new Promise(resolve => setTimeout(resolve, 10));
  return;
}

function getAbsoluteUrl(url: string): string {
  try {
    let a: any = document.createElement('A');
    a.href = url;
    url = a.href;
    return url;
  } catch (e) {
    return url;
  }
}

export { OffWorkerManager };