import { assert } from 'chai';
import { NewWebAssembly } from '../src/WebAssembly';
import { OffWorkerManager } from '../src/OffWorkerManager';


class MockManager extends OffWorkerManager {
    mockConnect() {
        this._isConnected = true;
        // @ts-ignore
        this._socket = {
            send: function () { }
        };
    }
}

describe('WebAssembly WasmMemoryInterface Test', () => {
    it('shared constructor', () => {
        const manager = new MockManager("fake_server_url");
        manager.mockConnect();

        const memory = new NewWebAssembly.Memory({
            initial: 1,
            maximum: 1,
            shared: true
        }, manager);

        assert.exists(manager.wasmMem(memory.id()));
    });

    it('not shared constructor', () => {
        const manager = new MockManager("fake_server_url");
        manager.mockConnect();

        const memory = new NewWebAssembly.Memory({
            initial: 1,
            maximum: 1,
        }, manager);

        try {
            manager.wasmMem(memory.id());
        } catch (e) { 
            assert(e.includes("No such Wasm Memory"));
        }
    });
});