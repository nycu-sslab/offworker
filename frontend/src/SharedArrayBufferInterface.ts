import { OffWorkerManager } from './OffWorkerManager';
import { v4 as uuid_v4 } from 'uuid';

class SharedArrayBufferInterface extends SharedArrayBuffer {
  private _id: string = "";
  private _manager: OffWorkerManager;

  constructor(
    size: number,
    manager: OffWorkerManager, // remain empty for frontend, just for testing
  ) {
    super(size);

    // @ts-ignore global is for browsers
    this._manager = manager || global.OWM;

    this._id = uuid_v4();

    this._manager.createSharedBuffer(this._id, size);
  }

  id(): string {
    return this._id;
  }

  acquireLockWithSync() {
    this.connection()?.acquireLockWithSync();
  }

  private connection() {
    return this._manager.buffer(this._id);
  }
}

export { SharedArrayBufferInterface }