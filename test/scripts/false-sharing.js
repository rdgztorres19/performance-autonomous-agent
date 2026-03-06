#!/usr/bin/env node
/**
 * ANTI-PATTERN: False sharing (Worker threads + SharedArrayBuffer)
 * Resume: "Avoid False Sharing" - Adjacent counters in same cache line.
 *
 * Run: node false-sharing.js
 */

const { Worker } = require('worker_threads');
const path = require('path');

const NUM_WORKERS = 4;
const ITERATIONS = 2_000_000;

const workerPath = path.join(__dirname, 'false-sharing-worker.js');

console.log('ANTI-PATTERN: False sharing (SharedArrayBuffer)');
console.log(`${NUM_WORKERS} workers, ${ITERATIONS} increments each`);

const sab = new SharedArrayBuffer(4 * 4);
const view = new Int32Array(sab);

const start = Date.now();
const workers = [];
for (let i = 0; i < NUM_WORKERS; i++) {
  workers.push(new Promise((resolve) => {
    const w = new Worker(workerPath, {
      workerData: { sab, index: i }
    });
    w.on('exit', resolve);
  }));
}

Promise.all(workers).then(() => {
  const elapsed = (Date.now() - start) / 1000;
  console.log(`Adjacent counters: ${(elapsed * 1000).toFixed(0)} ms`);
  console.log('Fix: pad counters to separate cache lines (64 bytes)');
});
