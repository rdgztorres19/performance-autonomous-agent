const { workerData } = require('worker_threads');
const { sab, index } = workerData;
const view = new Int32Array(sab);

for (let i = 0; i < 2_000_000; i++) {
  Atomics.add(view, index, 1);
}
