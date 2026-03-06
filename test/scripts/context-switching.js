#!/usr/bin/env node
/**
 * ANTI-PATTERN: Excessive context switching (Worker threads)
 * Resume: "Reduce Context Switching" - More worker threads than CPU cores
 * causes constant rotation and scheduler overhead.
 *
 * Run: node context-switching.js
 * Measure: vmstat 1, pidstat -w
 */

const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
const os = require('os');

const NUM_WORKERS = 64;  // Way more than cores
const ITERATIONS = 10_000_000;

if (isMainThread) {
  const numCores = os.cpus().length;
  console.log('CPU cores:', numCores);
  console.log(`Creating ${NUM_WORKERS} workers (>> cores) -> context switch storm`);
  console.log('Run: vmstat 1  or  pidstat -w -p <pid> 1');

  const start = Date.now();
  const workers = [];

  for (let i = 0; i < NUM_WORKERS; i++) {
    workers.push(new Promise((resolve) => {
      const w = new Worker(__filename, { workerData: { id: i } });
      w.on('message', () => {});
      w.on('exit', resolve);
    }));
  }

  Promise.all(workers).then(() => {
    const elapsed = (Date.now() - start) / 1000;
    console.log(`Done in ${elapsed.toFixed(2)}s (with ${NUM_WORKERS} workers)`);
    console.log('Compare with NUM_WORKERS=numCores for better performance');
  });
} else {
  let total = 0;
  for (let i = 0; i < ITERATIONS; i++) {
    total += i * (i + 1);
  }
  parentPort.postMessage(total);
}
