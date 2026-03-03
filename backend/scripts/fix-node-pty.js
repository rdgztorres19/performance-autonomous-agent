#!/usr/bin/env node
/**
 * Workaround for node-pty issue #850: spawn-helper on macOS is published with 644
 * instead of 755, causing "posix_spawnp failed". This script fixes permissions.
 * @see https://github.com/microsoft/node-pty/issues/850
 */
const fs = require('fs');
const path = require('path');

const base = path.join(__dirname, '..', 'node_modules', 'node-pty', 'prebuilds');
const dirs = ['darwin-arm64', 'darwin-x64'];
for (const dir of dirs) {
  const file = path.join(base, dir, 'spawn-helper');
  try {
    fs.chmodSync(file, 0o755);
    console.log('Fixed spawn-helper:', file);
  } catch {
    /* file may not exist on this platform */
  }
}
