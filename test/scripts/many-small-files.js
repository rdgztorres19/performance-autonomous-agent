#!/usr/bin/env node
/**
 * ANTI-PATTERN: Creating many small files
 * Resume: "Avoid Many Small Files" - Metadata overhead, inode pressure.
 *
 * Run: node many-small-files.js
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const NUM_FILES = 5000;

async function main() {
  const tmpdir = path.join(os.tmpdir(), `perf-many-small-${Date.now()}`);
  fs.mkdirSync(tmpdir, { recursive: true });

  console.log('ANTI-PATTERN: Many small files');
  console.log(`Creating ${NUM_FILES} small files`);

  const startWrite = Date.now();
  for (let i = 0; i < NUM_FILES; i++) {
    fs.writeFileSync(path.join(tmpdir, `${i}.json`), `{"id":${i}}`);
  }
  const writeTime = Date.now() - startWrite;

  const startRead = Date.now();
  let total = 0;
  for (let i = 0; i < NUM_FILES; i++) {
    total += fs.readFileSync(path.join(tmpdir, `${i}.json`)).length;
  }
  const readTime = Date.now() - startRead;

  for (let i = 0; i < NUM_FILES; i++) {
    fs.unlinkSync(path.join(tmpdir, `${i}.json`));
  }
  fs.rmdirSync(tmpdir);

  console.log(`Write: ${writeTime} ms`);
  console.log(`Read:  ${readTime} ms`);
  console.log('Fix: consolidate into fewer larger files');
}

main().catch(console.error);
