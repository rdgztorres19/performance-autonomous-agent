#!/usr/bin/env node
/**
 * ANTI-PATTERN: Heavy lock contention (Worker threads)
 * Resume: "Minimize Lock Contention" - Many workers competing for one lock.
 *
 * Run: node lock-contention.js
 */

const { Worker, isMainThread, workerData } = require('worker_threads');

const NUM_WORKERS = 8;
const ITERATIONS = 50_000;

if (isMainThread) {
  const sab = new SharedArrayBuffer(8);
  const arr = new Int32Array(sab);

  console.log('ANTI-PATTERN: Lock contention');
  console.log(`${NUM_WORKERS} workers, ${ITERATIONS} increments each`);

  const start = Date.now();
  const workers = [];
  for (let i = 0; i < NUM_WORKERS; i++) {
    workers.push(new Promise((resolve) => {
      const w = new Worker(__filename, { workerData: { sab } });
      w.on('exit', resolve);
    }));
  }

  Promise.all(workers).then(() => {
    const elapsed = (Date.now() - start) / 1000;
    console.log(`Done in ${(elapsed * 1000).toFixed(0)} ms, counter=${arr[1]}`);
    console.log('Fix: use lock-free (Atomics.add) or per-worker counters');
  });
} else {
  const { sab } = workerData;
  const arr = new Int32Array(sab);
  for (let i = 0; i < ITERATIONS; i++) {
    while (Atomics.compareExchange(arr, 0, 0, 1) !== 0) {}
    arr[1]++;
    Atomics.store(arr, 0, 0);
  }
}
