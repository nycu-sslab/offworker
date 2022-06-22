addEventListener('message', function (e) {
  const data = e.data;
  const thread = data.thread;
  const start = data.start;
  const end = data.end;
  const step = data.step;

  const f64Arr = new Float64Array(data.buf);
  const u32Arr = new Uint32Array(data.buf);

  let x;
  let sum = 0.0;

  for (let i = start; i < end; i++) {
    x = (i + 0.5) * step;
    sum = sum + 4.0 / (1.0 + x * x);
  }

  sum = sum * step;

  while (Atomics.load(u32Arr, 0) != 0) { } // lock

  Atomics.add(u32Arr, 0, 1);
  f64Arr[1] += sum;
  Atomics.add(u32Arr, 0, -1);

  Atomics.add(u32Arr, 1, 1);

  if (Atomics.load(u32Arr, 1) === thread) { // barrier
    console.log(`worker all done and get: ${f64Arr[1]}`);
    postMessage({ "done": true, "pi": f64Arr[1] });
  }

  close();

}, false);