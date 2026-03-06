#!/usr/bin/env node
/**
 * ANTI-PATTERN: Per-item processing instead of batching
 * Resume: "Process Data in Batches" - Function call overhead, many small ops.
 *
 * Run: node per-item-batching.js
 */

const N = 500_000;

function processItem(x) {
  return x * 2 + 1;
}

console.log('ANTI-PATTERN: Per-item processing (no batching)');
console.log(`Processing ${N} items with separate function call each`);

// BAD: Function call per item
let start = process.hrtime.bigint();
let result = 0;
for (let i = 0; i < N; i++) {
  result += processItem(i);
}
let elapsed = Number(process.hrtime.bigint() - start) / 1e6;
console.log(`Per-item: ${elapsed.toFixed(1)} ms, result=${result}`);

// GOOD: Batched (inline)
start = process.hrtime.bigint();
result = 0;
for (let i = 0; i < N; i++) {
  result += i * 2 + 1;
}
let elapsed2 = Number(process.hrtime.bigint() - start) / 1e6;
console.log(`Batched:  ${elapsed2.toFixed(1)} ms, result=${result}`);
console.log(`Speedup: ${(elapsed / elapsed2).toFixed(1)}x from batching`);
