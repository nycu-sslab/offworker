
import { assert } from 'chai';
import { OffWorkerManager } from '../src/OffWorkerManager';
import { SharedArrayBufferInterface } from '../src/SharedArrayBufferInterface';


class MockManager extends OffWorkerManager {
    mockConnect() {
        this._isConnected = true;
        // @ts-ignore
        this._socket = { send: function () { } };
    }
}

describe('SharedArrayBufferInterface Test', () => {
    it('basic constructor', done => {
        const manager = new MockManager("fake_server_url");
        manager.mockConnect();

        const buffer = new SharedArrayBufferInterface(1024, manager);
        const array = new Int32Array(buffer);

        done();
    });
});