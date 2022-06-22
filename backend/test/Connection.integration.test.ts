import { assert } from 'chai';
import { Connection } from '../src/Connection';
import { initSnapshot } from '../src/functions';

initSnapshot();

describe('Connection Integration Test', () => {
    it('Test Sum with OffWorker, SharedArrayBuffer and Atomics', done => {
        // @ts-ignore
        const conn = new Connection(null);
        const script = `
            addEventListener('message', function (e) {
                const u32Arr = new Uint32Array(e.data.buf);

                Atomics.add(u32Arr, 1, 1);

                close()
            }, false);
        `;

        for (let i = 0; i < 100; i++) {
            conn.createWorker(`id${i}`, script, null);
        }

        const bufferId = "b001";
        conn.createBuffer(bufferId, 1024);

        const message = { data: { msg: "hello", buf: conn.buffer(bufferId) } };

        // @ts-ignore
        const u32Arr = new Uint32Array(conn.buffer(bufferId));

        setTimeout(() => {
            for (let i = 0; i < 100; i++) {
                // all workers receive onmessage at the same time, so expect data racing
                conn.worker(`id${i}`)?.eventEmit("onmessage", message);

                if (i == 99) {
                    setTimeout(() => {
                        assert.equal(u32Arr[1], 100);
                        done();
                    }, 20);
                }
            }
        }, 10);
    });

    it('Test Wasm Memory + Wasm Module + Worker instantiate', done => {
        (async () => {
            const conn = new Connection(null);

            // client create wasm memory
            const des = { initial: 1, maximum: 1, shared: true };
            const wasmMemId = "id111";
            conn.createWasmMemory(wasmMemId, des);

            // client init memory
            const arr = new Uint32Array(conn.wasmMemory(wasmMemId).buffer);
            for (let i = 0; i < 10; i++) {
                arr[i] = i;
            }

            // client compile wasm module
            const url = "./test/assets/accumulate.wasm";
            const wasmModuleId = "id222";
            await conn.createWasmModule(wasmModuleId, url, true);

            const script = `
                addEventListener('message', function (e) {
                    const wasmMem = e.data.wasmMem;
                    const wasmModule = e.data.wasmModule;

                    const importObj = {
                        env: {
                            memory: wasmMem,
                            __memory_base: 0,
                            g$arr: () => {}
                        }
                    };
        
                    WebAssembly.instantiate(wasmModule, importObj)
                        .then(instance => {
                            const sum = instance.exports.accumulate(0, 10);
                            postMessage(sum);
                        }).catch(e=>{});
                }, false);
            `;

            // client create a worker
            const workerId = "id333";
            conn.createWorker(workerId, script, null);

            // client postMsg to worker
            setTimeout(() => {
                const message = {
                    data: {
                        wasmMem: conn.wasmMemory(wasmMemId),
                        wasmModule: conn.wasmModule(wasmModuleId)
                    }
                }
                conn.worker(workerId)?.eventEmit("onmessage", message);
            }, 10);

            // receive worker's message
            setTimeout(() => {
                // @ts-ignore exploit private field for testing
                assert.equal(45, conn.worker(workerId)?._postMsgData);
                done();
            }, 20);
        })()

    });

});