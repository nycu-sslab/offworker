import { assert } from 'chai';
import { NewWebAssembly } from '../src/WebAssembly';
import { OffWorkerManager } from '../src/OffWorkerManager';
import fs from "fs";
import { promisify } from "util";

const readFile = promisify(fs.readFile);

class MockManager extends OffWorkerManager {
    mockConnect() {
        this._isConnected = true;
        // @ts-ignore
        this._socket = {
            send: function () { }
        };
    }
}

describe('WebAssembly Function Test', () => {
    it('WebAssembly.instantiateStreaming', done => {
        const manager = new MockManager("fake_server_url");
        manager.mockConnect();

        const memory = new WebAssembly.Memory({
            initial: 1,
            maximum: 1,
            // @ts-ignore ts don't know `shared`
            shared: true,
        });

        const res = readFile("./test/accumulate.wasm");

        NewWebAssembly.instantiateStreaming(res, {
            env: {
                memory: memory,
                __memory_base: 0,
                g$arr: () => { }
            }
        }, manager).then(source => {
            // @ts-ignore
            assert.exists(source.module._id);
            done();
        });
    });
});