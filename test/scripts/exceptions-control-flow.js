#!/usr/bin/env node
/**
 * ANTI-PATTERN: Using exceptions for control flow
 * Resume: "Avoid Exceptions for Control Flow" - try/catch is 100x-10000x slower.
 *
 * Run: node exceptions-control-flow.js
 */

const N = 100_000;
const DATA = Array.from({ length: N }, (_, i) =>
  i % 5 === 0 ? 'invalid' : String(i)
);

function parseBad(s) {
  try {
    return parseInt(s, 10);
  } catch (e) {
    return NaN;
  }
}

function parseGood(s) {
  const n = parseInt(s, 10);
  return isNaN(n) ? NaN : n;
}

// Actually for NaN we need: parseInt returns NaN, not throw. So use a case that throws.
function parseBadReal(s) {
  try {
    return JSON.parse(s);
  } catch (e) {
    return null;
  }
}

function parseGoodReal(s) {
  if (s.startsWith('{') || s.startsWith('[')) {
    return JSON.parse(s);
  }
  return null;
}

const DATA_JSON = Array.from({ length: N }, (_, i) =>
  i % 5 === 0 ? 'not-json' : JSON.stringify({ x: i })
);

console.log('ANTI-PATTERN: Exceptions for control flow');
console.log(`Parsing ${N} strings, ~20% invalid JSON`);

let start = process.hrtime.bigint();
let total = 0;
for (const s of DATA_JSON) {
  const v = parseBadReal(s);
  if (v) total += v.x;
}
let t1 = Number(process.hrtime.bigint() - start) / 1e6;

start = process.hrtime.bigint();
total = 0;
for (const s of DATA_JSON) {
  const v = parseGoodReal(s);
  if (v) total += v.x;
}
let t2 = Number(process.hrtime.bigint() - start) / 1e6;

console.log(`With try/catch: ${t1.toFixed(0)} ms`);
console.log(`With validation: ${t2.toFixed(0)} ms`);
console.log(`Speedup: ${(t1 / t2).toFixed(1)}x`);
