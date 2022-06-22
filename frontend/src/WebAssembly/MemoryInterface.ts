import { v4 as uuid_v4 } from 'uuid';
import { OffWorkerManager } from '../OffWorkerManager';
import { WasmMemoryDescriptor } from "../../../common/Wasm"

class WasmMemoryInterface extends WebAssembly.Memory {
    public id: Function;
    private _id: string;

    constructor(descriptor: WasmMemoryDescriptor, manager: OffWorkerManager) {
        super(descriptor);
        this._id = uuid_v4();

        // @ts-ignore global is for browsers
        manager = manager || global.OWM;

        // Only manage Memory that is shared
        if (descriptor.shared === true) {
            manager.createWasmMemory(this._id, descriptor);
        }

        // don't know why cannot define as proto function
        this.id = function () {
            return this._id;
        }
    }
}

export { WasmMemoryDescriptor, WasmMemoryInterface }