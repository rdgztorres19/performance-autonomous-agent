#!/usr/bin/env node
/**
 * ANTI-PATTERN: Random I/O instead of sequential
 * Resume: "Prefer Sequential I/O" - Random seeks are slow.
 *
 * Run: node random-io.js
 * Measure: iostat -x 1
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const SIZE_MB = 20;
const READS = 5000;
const CHUNK = 4096;

async function main() {
  const tmp = path.join(os.tmpdir(), `perf-random-io-${Date.now()}.dat`);

  console.log('ANTI-PATTERN: Random I/O');
  console.log(`Creating ${SIZE_MB}MB file, then ${READS} random reads of ${CHUNK} bytes`);

  // Create file
  const buf = Buffer.alloc(SIZE_MB * 1024 * 1024);
  fs.writeFileSync(tmp, buf);

  const fd = fs.openSync(tmp, 'r');
  const maxOffset = (SIZE_MB * 1024 * 1024) - CHUNK;

  // BAD: Random reads
  const start1 = Date.now();
  let total = 0;
  for (let i = 0; i < READS; i++) {
    const pos = Math.floor(Math.random() * maxOffset);
    const b = Buffer.alloc(CHUNK);
    fs.readSync(fd, b, 0, CHUNK, pos);
    total += b.length;
  }
  const t1 = Date.now() - start1;

  // GOOD: Sequential (reopen to reset position)
  fs.closeSync(fd);
  const fd2 = fs.openSync(tmp, 'r');
  const start2 = Date.now();
  total = 0;
  for (let i = 0; i < READS; i++) {
    const b = Buffer.alloc(CHUNK);
    fs.readSync(fd2, b, 0, CHUNK);
    total += b.length;
  }
  const t2 = Date.now() - start2;

  fs.closeSync(fd2);
  fs.unlinkSync(tmp);

  console.log(`Random I/O:   ${t1} ms`);
  console.log(`Sequential:   ${t2} ms`);
  console.log(`Sequential is ${(t1 / t2).toFixed(1)}x faster`);
}

main().catch(console.error);
