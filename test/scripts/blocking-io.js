#!/usr/bin/env node
/**
 * ANTI-PATTERN: Blocking I/O (sync) instead of async
 * Resume: "Use Asynchronous I/O" - Sync blocks the event loop.
 *
 * Run: node blocking-io.js
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const NUM_READS = 100;
const FILE_SIZE_KB = 100;

async function main() {
  const tmp = path.join(os.tmpdir(), `perf-blocking-io-${Date.now()}.dat`);
  fs.writeFileSync(tmp, Buffer.alloc(FILE_SIZE_KB * 1024));

  console.log('ANTI-PATTERN: Blocking I/O (sync)');
  console.log(`${NUM_READS} sync file reads (blocks event loop)`);

  const start = Date.now();
  for (let i = 0; i < NUM_READS; i++) {
    fs.readFileSync(tmp);
  }
  const elapsed = Date.now() - start;

  fs.unlinkSync(tmp);
  console.log(`Sync reads: ${elapsed} ms`);
  console.log('Fix: use fs.promises.readFile or fs.readFile with callback');
}

main().catch(console.error);
