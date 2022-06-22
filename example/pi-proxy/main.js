addEventListener('message', function (e) {
    main();
}, false);

function main() {
    const thread = 4;

    const magnification = 3e9;
    const step = 1.0 / magnification;
    const part = magnification / thread;

    const buf = new SharedArrayBuffer(16); // 4: lock, 4: barrier, 8: pi

    for (let i = 0; i < thread; i++) {
        const worker = new Worker("worker.js");

        worker.postMessage({
            thread: thread,
            start: part * i,
            end: part * (i + 1),
            step: step,
            buf: buf,
        });

        worker.addEventListener("message", function (e) {

            if (e.data.done == true) {
                const pi = e.data.pi;

                console.log(`proxy get: ${pi}`);

                postMessage(pi);
            }
        }, false);
    }
}
