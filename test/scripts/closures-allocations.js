#!/usr/bin/env node
/**
 * ANTI-PATTERN: Closures in hot path causing allocations
 * Resume: "Avoid Closures in Hot Paths" - Callbacks capturing variables.
 *
 * Run: node closures-allocations.js
 */

const N = 500_000;

console.log('ANTI-PATTERN: Closures in hot path');
console.log(`Processing ${N} iterations with closure`);

const threshold = 50;
const data = Array.from({ length: 100 }, (_, i) => i);

// BAD: Closure in filter (creates new fn per iteration in some impls)
let start = process.hrtime.bigint();
let total = 0;
for (let i = 0; i < N; i++) {
  const filtered = data.filter(x => x > threshold);
  total += filtered.reduce((a, b) => a + b, 0);
}
let t1 = Number(process.hrtime.bigint() - start) / 1e6;

// GOOD: Inline loop
start = process.hrtime.bigint();
total = 0;
for (let i = 0; i < N; i++) {
  let sum = 0;
  for (const x of data) {
    if (x > threshold) sum += x;
  }
  total += sum;
}
let t2 = Number(process.hrtime.bigint() - start) / 1e6;

console.log(`With filter (closure): ${t1.toFixed(0)} ms`);
console.log(`Inline loop:           ${t2.toFixed(0)} ms`);
console.log(`Speedup: ${(t1 / t2).toFixed(2)}x`);
