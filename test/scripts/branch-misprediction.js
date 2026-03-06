#!/usr/bin/env node
/**
 * ANTI-PATTERN: Unpredictable branches in hot loop
 * Resume: "Branch Prediction" - Random branches cause pipeline flushes.
 *
 * Run: node branch-misprediction.js
 * Measure: perf stat -e branches,branch-misses node branch-misprediction.js
 */

const N = 5_000_000;

function sumWithUnpredictableBranch(data) {
  let total = 0;
  for (const x of data) {
    if (x % 2 === 0) total += x;
    else total -= x;
  }
  return total;
}

console.log('ANTI-PATTERN: Branch misprediction');
console.log(`Processing ${N} items`);

// Unpredictable: random order
const dataRandom = Array.from({ length: N }, () => Math.floor(Math.random() * 100));
let start = process.hrtime.bigint();
sumWithUnpredictableBranch(dataRandom);
let t1 = Number(process.hrtime.bigint() - start) / 1e6;

// Predictable: sorted
const dataSorted = [...dataRandom].sort((a, b) => a - b);
start = process.hrtime.bigint();
sumWithUnpredictableBranch(dataSorted);
let t2 = Number(process.hrtime.bigint() - start) / 1e6;

console.log(`Unpredictable (random): ${t1.toFixed(0)} ms`);
console.log(`Predictable (sorted):   ${t2.toFixed(0)} ms`);
console.log(`Speedup: ${(t1 / t2).toFixed(2)}x`);
