import { assert } from 'chai';
import { Connection } from '../src/Connection';
import { initSnapshot } from '../src/functions';

initSnapshot();

describe('Connection Test', () => {
    it('Basic construction', () => {
        const conn = new Connection(null);
    });

    it('Create Worker', () => {
        const conn = new Connection(null);
        const script = `
            addEventListener('message', function (e) {
                const u32Arr = new Uint32Array(e.data.buf);

                Atomics.add(u32Arr, 1, 1);

                close();
            }, false);
        `;
        conn.createWorker("id001", script, null);
    });

    it('Worker Close', done => {
        const conn = new Connection(null);

        const script = `
            close();
        `;
        conn.createWorker("id001", script, null);

        conn.createWorker("id002", "/*no op*/", null);

        setTimeout(() => {
            assert.exists(conn.worker("id002"));
            assert.throws(() => { conn.worker("id001") });
            done();
        }, 10);
    });

    it('Create Buffer', () => {
        const conn = new Connection(null);
        conn.createBuffer("id001", 1024);
    });

    it('Create Wasm Memory', () => {
        const conn = new Connection(null);
        const des = { initial: 10, maximum: 100 };
        conn.createWasmMemory("id123", des);
        assert.exists(conn.wasmMemory("id123"));
    });

    it('Create Wasm Module', done => {
        const conn = new Connection(null);

        // use mdn's wasm file
        const url = "./test/assets/accumulate.wasm";

        (async () => {
            await conn.createWasmModule("id001", url, true);
            assert.exists(conn.wasmModule("id001"));
            done();
        })();
    });
});