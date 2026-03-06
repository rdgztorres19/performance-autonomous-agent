#!/usr/bin/env node
/**
 * ANTI-PATTERN: Excessive allocations (no pooling)
 * Resume: "Use Memory Pooling" - Many allocations cause GC pressure.
 *
 * Run: node memory-allocation.js
 * Measure: node --expose-gc memory-allocation.js, or --trace-gc
 */

const N = 500_000;

console.log('ANTI-PATTERN: Excessive allocations (no pooling)');
console.log(`Allocating ${N} small objects`);

// BAD: New object per iteration
let start = process.hrtime.bigint();
const items = [];
for (let i = 0; i < N; i++) {
  items.push({ id: i, value: String(i).repeat(10) });
}
let elapsed = Number(process.hrtime.bigint() - start) / 1e6;

const total = items.reduce((s, x) => s + x.id, 0);
console.log(`No pooling: ${elapsed.toFixed(0)} ms, ${N} allocations, sum=${total}`);
console.log('Fix: use object pooling, reuse buffers, avoid allocations in hot path');
