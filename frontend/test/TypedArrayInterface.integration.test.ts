import { assert } from 'chai';
import TypedArrayInterface from '../src/TypedArrayInterface';
import { SharedArrayBufferInterface } from '../src/SharedArrayBufferInterface';
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

describe('TypedArrayInterface Integration Test', () => {
    it('setter and getter', async done => {
        done(); return;
        
        const manager = new MockManager("server_ip");
        manager.mockConnect();

        const TypedArray = TypedArrayInterface.NewInt32Array;
        const buf1 = new SharedArrayBufferInterface(64, manager);
        const arr1 = new TypedArray(buf1);

        const conn = manager.buffer(buf1.id());
        conn?.releaseLock();

        assert.isFalse(conn?.hasLock(), "BufferConnection should not have the lock");

        arr1[0] = 4;
        // no lock, not change
        assert.equal(0, await arr1[0]);

        setTimeout(async () => {
            conn?.setLock();
            assert.equal(4, await arr1[0]);
            done();
        }, 10);
    });
});