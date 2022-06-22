import { assert } from 'chai';
import { OffWorkerManager } from '../src/OffWorkerManager';
import { MessageChannel } from 'worker_threads';
import { WorkerConnection } from '../src/WorkerConnection';
import { BufferConnection } from '../src/BufferConnection';

class MockWorkerConnection extends WorkerConnection {
    data() {
        return this._data;
    }
}

class MockManager extends OffWorkerManager {
    mockConnect() {
        this._isConnected = true;
        // @ts-ignore
        this._socket = {
            send: function () { }
        };
    }

    mockCreateWorker(id: string, url: string, listenPort: MessagePort): void {
        const worker = new MockWorkerConnection(
            id, listenPort, this._socket, this._buffers);

        this._workers.set(worker.id(), worker);
    }

    worker(id: string) {
        return this._workers.get(id);
    };

    mockSetBuffer(id: string) {
        // @ts-ignore
        this._buffers.set(id, new BufferConnection(1, null));
    }
}

describe('WorkerConnection Test', () => {
    it('basic constructor', done => {
        const manager = new MockManager("fake_server_url");
        manager.mockConnect();

        const channel = new MessageChannel();

        //@ts-ignore type is wrong since we use Node to test browser code
        manager.mockCreateWorker("id004", "fake_worker_url", channel.port2);

        manager.worker("id004")?.remoteReady();

        channel.port1.close();
        channel.port2.close();
        done();
    });

    it('test worker postMessage() string', done => {
        const manager = new MockManager("fake_server_url");
        manager.mockConnect();

        const channel = new MessageChannel();

        //@ts-ignore type is wrong since we use Node to test browser code
        const id = manager.mockCreateWorker("id001", "fake_worker_url", channel.port2);

        const workerConn = manager.worker("id001");
        // @ts-ignore
        workerConn?.remoteReady();

        channel.port1.postMessage("hello", []);

        setTimeout(() => {
            // @ts-ignore
            assert.equal("hello", workerConn.data());
            channel.port1.close();
            channel.port2.close();
            done();
        }, 15)

    });

    it('test worker onmessage() string', done => {
        const manager = new MockManager("fake_server_url");
        manager.mockConnect();

        const channel = new MessageChannel();

        //@ts-ignore type is wrong since we use Node to test browser code
        manager.mockCreateWorker("id001", "fake_worker_url", channel.port2);

        const workerConn = manager.worker("id001");
        // @ts-ignore
        workerConn?.remoteReady();

        // @ts-ignore
        workerConn.receive('hello', []);


        let data = "";
        channel.port1.on("message", _data => {
            data = _data;
        });

        setTimeout(() => {
            assert.equal("hello", data);
            channel.port1.close();
            channel.port2.close();
            done();
        }, 15);

    });
});
