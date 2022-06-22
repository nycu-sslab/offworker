import { assert } from 'chai';
import { TestOffWorker } from './TestOffWorker';
import { initSnapshot } from '../src/functions';

initSnapshot();

describe('OffWorker Integration Test', () => {
    it('shared sum without Atomic', done => {
        const script = `
            addEventListener('message', function (e) {
                const u32Arr = new Uint32Array(e.data.buf);
                u32Arr[1] += 1;
                
                if(u32Arr[1] == 2) {
                    postMessage("done");
                }
                
                close();
            }, false);
        `;

        const u32Buf =
            new SharedArrayBuffer(2 * Uint32Array.BYTES_PER_ELEMENT);
        const u32Arr = new Uint32Array(u32Buf);
        u32Arr[1] = 0;

        // one by one, so that avoid data racing
        for (let i = 0; i < 2; i++) {
            const message = {
                data: {
                    buf: u32Buf,
                }
            };

            const worker = new TestOffWorker("id", script, null);
            setTimeout(() => { worker.eventEmit("onmessage", message); }, 10);

            if (i == 1) {
                setTimeout(() => {
                    assert.equal(u32Arr[1], 2);
                    assert.equal(worker.postMsgData(), "done");
                    done();
                }, 20);
            }
        }
    });

    it('shared sum with Atomics', done => {
        const script = `
            addEventListener('message', function (e) {
                const u32Arr = new Uint32Array(e.data.buf);
                
                Atomics.add(u32Arr, 1, 1);

                close();
            }, false);
        `;

        const u32Buf =
            new SharedArrayBuffer(2 * Uint32Array.BYTES_PER_ELEMENT);
        const u32Arr = new Uint32Array(u32Buf);
        u32Arr[1] = 0;

        const message = {
            data: {
                buf: u32Buf,
            }
        };

        let workers: Array<TestOffWorker> = [];

        for (let i = 0; i < 100; i++) {
            const worker = new TestOffWorker("id", script, null);
            workers.push(worker);
        }

        setTimeout(() => {
            for (let i = 0; i < 100; i++) {
                // all workers receive onmessage at the same time, so expect data racing
                workers[i].eventEmit("onmessage", message);

                if (i == 99) {
                    setTimeout(() => {
                        assert.equal(u32Arr[1], 100);
                        done();
                    }, 20);
                }
            }
        }, 10);
    });
});
