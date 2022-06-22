import { assert } from 'chai';
import { SharedArrayBufferInterface } from '../src/SharedArrayBufferInterface';
import { OffWorkerManager } from '../src/OffWorkerManager';
import { NewWebAssembly } from '../src/WebAssembly';
import { WorkerInterface } from '../src/WorkerInterface';
import { MessageChannel } from 'worker_threads';
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

class MockWorker extends WorkerInterface {
    data() {
        return this._tmp_data;
    }

    message() {
        return this._tmp_message;
    }

    transfer() {
        return this._tmp_transfer;
    }
}

describe('WorkerInterface Test', () => {
    it('basic constructor', done => {
        const manager = new MockManager("fake_server_url");
        manager.mockConnect();

        const channel = new MessageChannel();

        //@ts-ignore type is wrong since we use Node to test browser code
        const worker = new MockWorker("fake_worker_url", manager, channel);

        worker.terminate();
        done();
    });

    it('test postMessage()', done => {
        const manager = new MockManager("fake_server_url");
        manager.mockConnect();

        const channel = new MessageChannel();

        //@ts-ignore type is wrong since we use Node to test browser code
        const worker = new MockWorker("fake_worker_url", manager, channel);

        worker.postMessage("hello", []);
        assert.equal("hello", worker.message());

        worker.terminate();
        done();
    });

    it('test postMessage() shared memory', done => {
        const manager = new MockManager("fake_server_url");
        manager.mockConnect();

        const channel = new MessageChannel();

        //@ts-ignore type is wrong since we use Node to test browser code
        const worker = new MockWorker("fake_worker_url", manager, channel);

        const buffer = new SharedArrayBufferInterface(10, manager);

        worker.postMessage({
            msg: "hello", buf: buffer
        }, []);

        assert.deepEqual({ msg: "hello", buf: buffer.id() }, worker.message());
        worker.terminate();
        done();
    });

    it('test postMessage() wasm memory', done => {
        const manager = new MockManager("fake_server_url");
        manager.mockConnect();

        const channel = new MessageChannel();

        //@ts-ignore type is wrong since we use Node to test browser code
        const worker = new MockWorker("fake_worker_url", manager, channel);

        const memory = new NewWebAssembly.Memory({
            initial: 1,
            maximum: 1,
            //@ts-ignore
            shared: true
        }, manager);

        worker.postMessage({
            msg: "hello", mem: memory
        }, []);

        assert.deepEqual({ msg: "hello", mem: memory.id() }, worker.message());
        worker.terminate();
        done();
    });

    it('test postMessage() wasm', done => {
        const manager = new MockManager("fake_server_url");
        manager.mockConnect();

        const channel = new MessageChannel();

        //@ts-ignore type is wrong since we use Node to test browser code
        const worker = new MockWorker("fake_worker_url", manager, channel);

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
            worker.postMessage({
                msg: "hello", module: source.module
            }, []);

            // @ts-ignore
            assert.deepEqual({ msg: "hello", module: source.module._id }, worker.message());
            worker.terminate();
            done();
        });
    });

    it('test onmessage() string', done => {
        const manager = new MockManager("fake_server_url");
        manager.mockConnect();

        const channel = new MessageChannel();

        //@ts-ignore type is wrong since we use Node to test browser code
        const worker = new MockWorker("fake_worker_url", manager, channel);

        setTimeout(() => {
            channel.port2.postMessage("hello");
            setTimeout(() => {
                assert.equal("hello", worker.data().data);
                worker.terminate();
                done();
            }, 15)
        }, 15)
    });

    it('test onmessage() transfer', done => {
        const manager = new MockManager("fake_server_url");
        manager.mockConnect();

        const channel = new MessageChannel();

        //@ts-ignore type is wrong since we use Node to test browser code
        const worker = new MockWorker("fake_worker_url", manager, channel);


        const buf = new ArrayBuffer(Int32Array.BYTES_PER_ELEMENT);
        const arr = new Int32Array(buf);
        arr[0] = 99;
        const obj = { msg: "done", arr: arr };

        setTimeout(() => {
            channel.port2.postMessage(obj, [buf]);
            setTimeout(() => {
                assert.equal("done", worker.data().data.msg);
                assert.equal(99, worker.data().data.arr[0]);

                // has transferred
                assert.equal(arr.length, 0);

                worker.terminate();
                done();
            }, 15)
        }, 15)
    });
});
