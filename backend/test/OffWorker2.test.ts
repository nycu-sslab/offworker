import { assert } from 'chai';
import { Connection } from '../src/Connection';
import { initSnapshot } from '../src/functions';

initSnapshot();

describe('OffWorker2 Test', () => {
    it('Worker creates worker', done => {
        const conn = new Connection(null);
        // @ts-ignore js global
        global.connection = conn;

        conn.createWorker("id001", "/*no op*/", null);

        assert.equal(1, conn.workers_size());

        const worker1 = conn.worker("id001");

        worker1?.runSync(`
            console.log('hi in level 1 worker');
            const a = new Worker("console.log('hi in level 2 worker');", true); 
            console.log("finish in level 1 worker");      
        `);

        setTimeout(() => {
            assert.equal(2, conn.workers_size());
            conn.close();
            done();
        }, 15);
    });

    it('close() in worker\'s worker', done => {
        const conn = new Connection(null);
        // @ts-ignore js global
        global.connection = conn;

        conn.createWorker("id001", "/*no op*/", null);

        assert.equal(1, conn.workers_size());

        const worker1 = conn.worker("id001");

        worker1?.runSync(`
            console.log('hi in level 1 worker');
            const a = new Worker("console.log('hi in level 2 worker'); close();", true); 
            console.log("finish in level 1 worker");
        `);

        setTimeout(() => {
            assert.equal(1, conn.workers_size());

            worker1?.runSync(`close();`);

            setTimeout(() => {

                assert.equal(0, conn.workers_size());
                done();
            }, 10);
        }, 10);
    });

    it('postMessage() inside worker\'s worker, onmessage inside worker, where message is string', done => {

        const conn = new Connection(null);
        // @ts-ignore js global
        global.connection = conn;

        const worker2_script = `
            postMessage('worker2');
        `;

        const worker1_script = `
            const a = new Worker(\`${worker2_script}\`, true);

            var ans = null;

            a.onmessage = function(e) {
                ans = e.data;
            }
        `;

        conn.createWorker("id001", worker1_script, null);

        const worker1 = conn.worker("id001");

        setTimeout(() => {
            // @ts-ignore bad. FIXME: don't expose protected member
            const ans: any = worker1?._env.global.getSync("ans");

            assert.equal("worker2", ans);
            conn.close();
            done();
        }, 20);
    });

    it('postMessage() inside worker\'s worker, onmessage inside worker, where message is object', done => {

        const conn = new Connection(null);
        // @ts-ignore js global
        global.connection = conn;

        const worker2_script = `
            postMessage({
                a: 1
            });
        `;

        const worker1_script = `
            const a = new Worker(\`${worker2_script}\`, true);

            var ans = null;

            a.onmessage = function(e) {
                ans = e.data.a;
            }
        `;


        conn.createWorker("id001", worker1_script, null);

        const worker1 = conn.worker("id001");

        setTimeout(() => {
            // @ts-ignore bad. FIXME: don't expose protected member
            const ans: any = worker1?._env.global.getSync("ans");

            assert.equal(1, ans);
            conn.close();
            done();
        }, 20);
    });

    it('postMessage() inside worker\'s worker, onmessage inside worker, where message is shared memory', done => {

        const conn = new Connection(null);
        // @ts-ignore js global
        global.connection = conn;

        const worker2_script = `
            const buf = new SharedArrayBuffer(4);
            const arr = new Int32Array(buf);
            arr[0] = 9;

            postMessage({
                buf: buf
            });
        `;

        const worker1_script = `
            const a = new Worker(\`${worker2_script}\`, true);

            var ans = null;

            a.onmessage = function(e) {
                const arr = new Int32Array(e.data.buf);

                if(arr[0] != 9) {
                    ans = false;
                    throw new Error("worker.onmessage got wrong message.");
                } else {
                    ans = true;
                }
            }
        `;


        conn.createWorker("id001", worker1_script, null);

        const worker1 = conn.worker("id001");

        setTimeout(() => {
            // @ts-ignore bad. FIXME: don't expose protected member
            const ans: any = worker1?._env.global.getSync("ans");

            assert.equal(true, ans);
            conn.close();
            done();
        }, 20);
    });

    it('Multiple postMessage() inside worker\'s worker, onmessage inside worker', done => {

        const conn = new Connection(null);
        // @ts-ignore js global
        global.connection = conn;

        const child_script1 = `
            postMessage('test1');
        `;

        const parent_script1 = `
            const a = new Worker(\`${child_script1}\`, true);

            var ans = null;
            
            a.onmessage = function(e) {
                ans = e.data;
            }
        `;

        const child_script2 = `
            postMessage('test2');
        `;

        const parent_script2 = `
            const a = new Worker(\`${child_script2}\`, true);

            var ans = null;
            
            a.onmessage = function(e) {
                ans = e.data;
            }
        `;

        conn.createWorker("id001", parent_script1, null);
        conn.createWorker("id002", parent_script2, null);

        const worker1 = conn.worker("id001");
        const worker2 = conn.worker("id002");

        setTimeout(() => {
            // @ts-ignore bad. FIXME: don't expose protected member
            const ans1: any = worker1?._env.global.getSync("ans");
            // @ts-ignore bad. FIXME: don't expose protected member
            const ans2: any = worker2?._env.global.getSync("ans");

            assert.equal("test1", ans1);
            assert.equal("test2", ans2);
            conn.close();
            done();
        }, 20);
    });

    it('postMessage() inside worker, onmessage inside worker\'s worker, where message is object', done => {

        const conn = new Connection(null);
        // @ts-ignore js global
        global.connection = conn;

        const worker2_script = `
            var ans = undefined;
            this.addEventListener('message', function (e) {
                if(e.data.msg != "hi") {
                    ans = false;
                    throw new Error("onmessage got wrong message.");
                } else {
                    ans = true;
                }
            }, false);
        `;

        const worker1_script = `
            const a = new Worker(\`${worker2_script}\`, true);

            a.postMessage({ msg: "hi"});
        `;

        conn.createWorker("id001", worker1_script, null);

        setTimeout(() => {
            let id = "";

            // Since the worker ID is not available directly, we need to find it.
            // @ts-ignore FIXME: do not expose protected member
            conn._workers.forEach((v, k) => {
                if (k != "id001") {
                    id = k;
                }
            });

            const worker2 = conn.worker(id);

            // @ts-ignore bad. FIXME: don't expose protected member
            const ans: any = worker2._env.global.getSync("ans");

            assert.isTrue(ans);
            conn.close();
            done();
        }, 20);
    });


    it('postMessage() inside worker, onmessage inside worker\'s worker, where message is shared memory', done => {

        const conn = new Connection(null);
        // @ts-ignore js global
        global.connection = conn;

        const worker2_script = `
            var ans = undefined;
            this.addEventListener('message', function (e) {

                const arr = new Int32Array(e.data.buf);

                if(arr[0] != 7) {
                    ans = false;
                    throw new Error("onmessage got wrong message.");
                } else {
                    ans = true;
                }
            }, false);
        `;

        const worker1_script = `
            const a = new Worker(\`${worker2_script}\`, true);

            const buf = new SharedArrayBuffer(4);
            const arr = new Int32Array(buf);
            arr[0] = 7;

            a.postMessage({ buf: buf});
        `;

        conn.createWorker("id001", worker1_script, null);

        setTimeout(() => {
            let id = "";

            // Since the worker ID is not available directly, we need to find it.
            // @ts-ignore FIXME: do not expose protected member
            conn._workers.forEach((v, k) => {
                if (k != "id001") {
                    id = k;
                }
            });

            const worker2 = conn.worker(id);

            // @ts-ignore bad. FIXME: don't expose protected member
            const ans: any = worker2._env.global.getSync("ans");

            assert.isTrue(ans);
            conn.close();
            done();
        }, 20);
    });
});


