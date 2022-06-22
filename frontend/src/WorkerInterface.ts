import { OffWorkerManager } from "./OffWorkerManager"
import { v4 as uuid_v4 } from 'uuid';
import { DecisionMakerSingleton } from "./DecisionMaker";

const logger = require("node-color-log");
logger.setLevelNoColor();

let workerCounter = 0;

class NewWorker {

  public onmessage: any;

  private _worker: any;

  constructor(url: string, shouldOffload: boolean) {

    this._worker = undefined;
    this.onmessage = undefined;

    (async () => {
      if (shouldOffload == true) {
        logger.debug("[Decision] force offloaded");
        logger.debug("Create an offworker!");
        this._worker = new WorkerInterface(url);

      } else if (shouldOffload == false) {
        logger.debug("[Decision] force local");
        logger.debug("Create a local worker!")
        //@ts-ignore global
        this._worker = new global._Worker(url);
      } else if (await DecisionMakerSingleton.run(workerCounter++)) {
        logger.debug("Create an offworker!")
        this._worker = new WorkerInterface(url);

      } else {
        logger.debug("Create a local worker!")
        //@ts-ignore global
        this._worker = new global._Worker(url);
      }

      let timeoutCnt = 5; // just prevent the worker haven't constructed yet
      while (this.onmessage == undefined && timeoutCnt-- > 0) {
        await wait();
      }

      this._worker.onmessage = this.onmessage;
    })();
  }

  public async postMessage(...args: any) {
    while (this._worker == undefined) {
      await wait();
    }
    this._worker.postMessage(...args);
  }

  public terminate() {
    this._worker.terminate();
  }

  addEventListener(...args: any) {
    this._worker.addEventListener(...args);
  }

}

class WorkerInterface {
  public onerror: Function | null;
  public onmessage: Function | null;
  public onmessageerror: Function | null;
  // Channel between WorkerInterface and WorkerConnection
  protected _channel: MessageChannel;
  private _id: string = "";
  private _manager: OffWorkerManager;

  protected _tmp_message: any;
  protected _tmp_transfer: any;
  protected _tmp_data: any;

  constructor(
    url: string,
    manager?: OffWorkerManager, // remain empty for frontend, just for testing
    channel?: MessageChannel    // remain empty for frontend, just for testing
  ) {
    this._id = uuid_v4();
    // @ts-ignore global is for browsers
    this._manager = manager || global.OWM;
    this._channel = channel || new MessageChannel();

    this._manager.createWorker(this._id, url, this._channel.port2);

    // transparent pass message
    this.onerror = null;
    this.onmessage = null;
    this.onmessageerror = null;

    // start listening at the very beginning
    this.addEventListener("message", function () { }, false);
  }

  id(): string {
    return this._id;
  }

  postMessage(message: any, transfer: any) {
    this._tmp_transfer = transfer;

    const newData = message;
    if (typeof newData === 'object') {
      const iterate = (obj: any) => {
        for (const key in obj) {
          if (obj[key].toString() === '[object SharedArrayBuffer]' ||
            obj[key].toString() === '[object WebAssembly.Module]' ||
            obj[key].toString() === '[object WebAssembly.Memory]'
          ) {

            if (obj[key].id !== undefined) {
              obj[key] = obj[key].id();
            } else if (obj[key]._id !== undefined) {
              obj[key] = obj[key]._id;
            } else {
              logger.warn(`${key} is ${obj[key].toString()}, but it has no ID.`);
            }

            if (typeof obj[key] === 'object') {
              iterate(obj[key]);
            }
          }
        }
      }

      iterate(newData);
    }
    this._tmp_message = newData;

    // transparent pass message to WorkerConnection
    this._channel.port1.postMessage(newData, transfer);
  }

  terminate(): void {
    this._channel.port1.close();
    this._channel.port2.close();
  }

  addEventListener(name: string, fn: Function, option: boolean | any): void {
    if (name == "message") {

      // replace the reference of the function
      this.onmessage = fn;

      this._channel.port1.onmessage = data => {
        this._tmp_data = data;

        // @ts-ignore no possible is null
        this.onmessage.apply(undefined, [data]);
      }
    }
  }

  removeEventListener(name: string, fn: Function, option: boolean | any) {

  }
}

async function wait() {
  await new Promise(resolve => setTimeout(resolve, 10));
}

export { NewWorker, WorkerInterface }