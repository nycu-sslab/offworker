import { assert } from 'chai';
import { OffWorker, SharedMemory } from '../src/OffWorker';
import { TestOffWorker } from './TestOffWorker';
import path from 'path';
import { initSnapshot } from '../src/functions';

initSnapshot();

describe('OffWorker Test', () => {
    it('Basic construction', () => {
        const worker1 = new OffWorker("id", null, null);
        const worker2 = new OffWorker("id", "/*no op*/", null);
    });

    it('Isolate Logger', () => {
        const worker1 = new OffWorker("id", null, null);
        worker1.runSync(`
            log("hi"); // only see in "npm run test-dev"
        `);
    });

    it('Shared Memory', () => {
        const buffer1 = new SharedArrayBuffer(1024 * 1024);
        const array = new Uint32Array(buffer1);

        const shm: SharedMemory = {
            arrBufName: 'buffer',
            arrBuf: buffer1
        };
        const worker1 = new OffWorker(
            "id", null, {
            sharedMemory: [shm], ws: null, connectionEmitter: null,
            url: null, child_mc: null
        });
        const worker2 = new OffWorker(
            "id", null, {
            sharedMemory: [shm], ws: null, connectionEmitter: null,
            url: null, child_mc: null
        });

        // step 1: master changes
        array[1] = 123;
        assert.equal(array[1], 123);

        worker1.runSync(`
            let foo = new Uint32Array(buffer);
            foo[1] = 234;
        `);

        assert.equal(array[1], 234);

        worker2.runSync(`
            let bar = new Uint32Array(buffer);
            bar[1] = 345;
        `);

        assert.equal(array[1], 345);
    });

    it('Shared Memory Many', () => {
        const buffer1 = new SharedArrayBuffer(1024 * 1024);
        const array1 = new Uint32Array(buffer1);
        const shm1: SharedMemory = {
            arrBufName: 'buffer1',
            arrBuf: buffer1
        };

        const buffer2 = new SharedArrayBuffer(1024 * 1024);
        const array2 = new Uint32Array(buffer2);
        const shm2: SharedMemory = {
            arrBufName: 'buffer2',
            arrBuf: buffer2
        };

        const worker1 = new OffWorker(
            "id", null, {
            sharedMemory: [shm1, shm2], ws: null,
            url: null, connectionEmitter: null, child_mc: null
        });
        const worker2 = new OffWorker(
            "id", null, {
            sharedMemory: [shm1, shm2], ws: null, connectionEmitter: null,
            url: null, child_mc: null
        });

        // step 1: master changes
        array1[1] = 123;
        array2[1] = 789;
        assert.equal(array1[1], 123);
        assert.equal(array2[1], 789);

        worker1.runSync(`
            let foo = new Uint32Array(buffer1);
            foo[1] = 234;

            let foo2 = new Uint32Array(buffer2);
            foo2[1] = 987;
        `);
        assert.equal(array1[1], 234);
        assert.equal(array2[1], 987);

        worker2.runSync(`
            let bar = new Uint32Array(buffer1);
            bar[1] = 345;
            let bar2 = new Uint32Array(buffer2);
            bar2[1] = 555;
        `);
        assert.equal(array1[1], 345);
        assert.equal(array2[1], 555);
    });

    it('close() inside worker', () => {
        const worker1 = new OffWorker("id", null, null);

        worker1.runSync(`
            close();
        `);

        const worker2 = new OffWorker("id", null, null);

        worker2.runSync(`
            this.close();
        `);

        const worker3 = new OffWorker("id", null, null);

        worker3.runSync(`
            self.close();
        `);
    });

    it('postMessage() inside worker, message is string', done => {
        const worker1 = new TestOffWorker("id", null, null);
        worker1.runSync(`
            const data = "done";
            postMessage(data);
        `);
        setTimeout(() => {
            assert.equal(worker1.postMsgData(), "done");
        }, 15);

        const worker2 = new TestOffWorker("id", null, null);
        worker2.runSync(`
            const data = "done";
            this.postMessage(data);
        `);
        setTimeout(() => {
            assert.equal(worker2.postMsgData(), "done");
        }, 15);

        const worker3 = new TestOffWorker("id", null, null);
        worker3.runSync(`
            const data = "done";
            self.postMessage(data);
        `);
        setTimeout(() => {
            assert.equal(worker3.postMsgData(), "done");
            done();
        }, 15);
    });

    it('postMessage() inside worker, message is object', done => {
        const worker1 = new TestOffWorker("id", null, null);
        worker1.runSync(`
            const data = { msg: "done"};
            postMessage(data);
        `);
        setTimeout(() => {
            assert.deepEqual(worker1.postMsgData(), { msg: "done" });
        }, 15);


        const worker2 = new TestOffWorker("id", null, null);
        worker2.runSync(`
            const data = { msg: "done"};
            this.postMessage(data);
        `);
        setTimeout(() => {
            assert.deepEqual(worker2.postMsgData(), { msg: "done" });
        }, 15);


        const worker3 = new TestOffWorker("id", null, null);
        worker3.runSync(`
            const data = { msg: "done"};
            self.postMessage(data);
        `);
        setTimeout(() => {
            assert.deepEqual(worker3.postMsgData(), { msg: "done" });
            done();
        }, 15);
    });

    it('onmessage() inside worker, called by addEventListener', done => {
        const worker1 = new TestOffWorker("id", null, null);
        worker1.runSync(`
            ans = undefined;
            addEventListener('message', function (e) {
                if(e.msg != "hello") {
                    ans = false;
                    throw new Error("onmessage got wrong message.");
                } else {
                    ans = true;
                }
            }, false);
        `);
        setTimeout(() => {
            worker1.eventEmit("onmessage", { msg: "hello" });
            setTimeout(() => {
                const ans: any = worker1.env().global.getSync("ans");
                assert.isTrue(ans, "onmessage got wrong message.")
            }, 15);
        }, 15);

        const worker2 = new TestOffWorker("id", null, null);
        worker2.runSync(`
            ans = undefined;
            this.addEventListener('message', function (e) {
                if(e.msg != "hi") {
                    ans = false;
                    throw new Error("onmessage got wrong message.");
                } else {
                    ans = true;
                }
            }, false);
        `);
        setTimeout(() => {
            worker2.eventEmit("onmessage", { msg: "hi" });
            setTimeout(() => {
                const ans: any = worker2.env().global.getSync("ans");
                assert.isTrue(ans, "onmessage got wrong message.")
            }, 15);
        }, 15);

        const worker3 = new TestOffWorker("id", null, null);
        worker3.runSync(`
            ans = undefined;
            self.addEventListener('message', function (e) {
                if(e.data.arr[1] != 123) {
                    ans = false;
                    throw new Error("onmessage got wrong message.");
                } else {
                    ans = true;
                }
            }, false);
        `);
        setTimeout(() => {
            const arr = new Uint32Array(2 * Uint32Array.BYTES_PER_ELEMENT);
            arr[1] = 123;
            worker3.eventEmit("onmessage", { data: { arr: arr } });
            setTimeout(() => {
                const ans: any = worker3.env().global.getSync("ans");
                assert.equal(true, ans, "onmessage got wrong message.")
            }, 15);
        }, 15);

        const worker4 = new TestOffWorker("id", null, null);
        worker4.runSync(`
            ans = undefined;
            self.addEventListener('message', function (e) {
                if(e.data.arr[1] != 1233) {
                    ans = false;
                } else {
                    ans = true;
                }
            }, false);
        `);
        setTimeout(() => {
            const arr = new Uint32Array(2 * Uint32Array.BYTES_PER_ELEMENT);
            arr[1] = 123;
            worker4.eventEmit("onmessage", { data: { arr: arr } });
            setTimeout(() => {
                const ans: any = worker4.env().global.getSync("ans");
                assert.isFalse(ans, "onmessage got wrong message.");
                done();
            }, 15);
        }, 15);
    });

    it('onmessage() inside worker, set by onmessage', done => {
        const worker1 = new TestOffWorker("id", `
            ans = undefined;
            onmessage = function (e) {
                if(e.msg != "helloooo") {
                    ans = false;
                    throw new Error("onmessage got wrong message.");
                } else {
                    ans = true;
                }
            };
        `, null);

        setTimeout(() => {
            worker1.eventEmit("onmessage", { msg: "helloooo" });
            setTimeout(() => {
                const ans: any = worker1.env().global.getSync("ans");
                assert.isTrue(ans, "onmessage got wrong message.")
            }, 15);
        }, 15);

        const worker2 = new TestOffWorker("id", `
            ans = undefined;
            this.onmessage = function (e) {
                if(e.msg != "hiiiiii") {
                    ans = false;
                    throw new Error("onmessage got wrong message.");
                } else {
                    ans = true;
                }
            };
        `, null);
        setTimeout(() => {
            worker2.eventEmit("onmessage", { msg: "hiiiiii" });
            setTimeout(() => {
                const ans: any = worker2.env().global.getSync("ans");
                assert.isTrue(ans, "onmessage got wrong message.")
            }, 15);
        }, 15);

        const worker3 = new TestOffWorker("id", `
            ans = undefined;
            self.onmessage = function (e) {
                if(e.data.arr[1] != 5553) {
                    ans = false;
                    throw new Error("onmessage got wrong message.");
                } else {
                    ans = true;
                }
            };
        `, null);
        setTimeout(() => {
            const arr = new Uint32Array(2 * Uint32Array.BYTES_PER_ELEMENT);
            arr[1] = 5553;
            worker3.eventEmit("onmessage", { data: { arr: arr } });
            setTimeout(() => {
                const ans: any = worker3.env().global.getSync("ans");
                assert.equal(true, ans, "onmessage got wrong message.")
            }, 15);
        }, 15);

        const worker4 = new TestOffWorker("id", `
            ans = undefined;
            self.onmessage = function (e) {
                if(e.data.arr[1] != 1111) {
                    ans = false;
                } else {
                    ans = true;
                }
            };
        `, null);
        setTimeout(() => {
            const arr = new Uint32Array(2 * Uint32Array.BYTES_PER_ELEMENT);
            arr[1] = 4555;
            worker4.eventEmit("onmessage", { data: { arr: arr } });
            setTimeout(() => {
                const ans: any = worker4.env().global.getSync("ans");
                assert.isFalse(ans, "onmessage got wrong message.");
                done();
            }, 15);
        }, 15);
    });

    it('test addEventListener() with unknown event', () => {
        const worker1 = new TestOffWorker("id", null, null);
        worker1.runSync(`
            addEventListener('message', function (e) {}, false);
        `); // 'message' should be OK

        function fn() {
            const worker2 = new TestOffWorker("id", null, null);
            worker2.runSync(`
                addEventListener('unknown', function (e) {}, false);
            `); // 'unknown' is not OK
        }

        assert.throws(fn, "addEventListener not supports");
    });

    it('test importScripts()', done => {
        const worker1 = new TestOffWorker("id", null, null);

        const file1 = path.join(__dirname, "../../../test/assets/testImportScripts.js");
        const file2 = path.join(__dirname, "../../../test/assets/testImportScripts2.js");
        worker1.runSync(`
            importScripts("${file1}", "${file2}");
            if(a != 5)
                throw(new Error("cannot read a"));

            if(foo() != 789)
                throw(new Error("cannot read foo()"));
        `)

        done();
    });

    it('test importScripts() 2', done => {
        const worker1 = new TestOffWorker("id", null, null);

        const file1 = path.join(__dirname, "../../../test/assets/testImportScripts3.js");
        worker1.runSync(`
            importScripts("${file1}");
            if(Module['foo']() != 123)
                throw(new Error());
        `)

        done();
    });
});