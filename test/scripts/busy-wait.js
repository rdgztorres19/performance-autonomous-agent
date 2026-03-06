#!/usr/bin/env node
/**
 * ANTI-PATTERN: Busy-wait loop
 * Resume: "Avoid Busy-Wait Loops" - Continuously consumes CPU while waiting.
 *
 * Run: node busy-wait.js
 * Measure: top, vmstat 1
 */

const DURATION_MS = 3000;
const NUM_WAITERS = 4;

function busyWaitUntil(deadline) {
  while (Date.now() < deadline) {
    // Busy-wait: 100% CPU, no setTimeout/setImmediate
  }
}

console.log('ANTI-PATTERN: Busy-wait (spin loop)');
console.log(`Running ${NUM_WAITERS} "threads" (setInterval) busy-waiting for ${DURATION_MS}ms`);
console.log('Run: top -p $(pgrep -f busy-wait) -> high %CPU');

const deadline = Date.now() + DURATION_MS;
const start = Date.now();

// Simulate multiple busy-wait loops (Node is single-threaded, so one loop maxes CPU)
let completed = 0;
const check = () => {
  busyWaitUntil(deadline);
  completed++;
  if (completed < NUM_WAITERS) {
    setImmediate(check);
  } else {
    const elapsed = (Date.now() - start) / 1000;
    console.log(`Done in ${elapsed.toFixed(2)}s - CPU was maxed`);
    console.log('Fix: use setTimeout or Promise + async/await');
  }
};
check();
