#!/usr/bin/env python3
"""
ANTI-PATTERN: Creating many small files
Resume: "Avoid Many Small Files" - Metadata overhead, inode pressure,
directory traversal cost.

Run: python many-small-files.py
Measure: iostat, time
"""

import os
import tempfile
import time

NUM_FILES = 5000


def main():
    tmpdir = tempfile.mkdtemp(prefix='perf-many-small-')
    print("ANTI-PATTERN: Many small files")
    print(f"Creating {NUM_FILES} small files in {tmpdir}")

    # BAD: One file per item
    start = time.perf_counter()
    for i in range(NUM_FILES):
        path = os.path.join(tmpdir, f"{i}.json")
        with open(path, 'w') as f:
            f.write('{"id":' + str(i) + '}')
    write_time = time.perf_counter() - start

    start = time.perf_counter()
    total = 0
    for i in range(NUM_FILES):
        path = os.path.join(tmpdir, f"{i}.json")
        with open(path, 'r') as f:
            total += len(f.read())
    read_time = time.perf_counter() - start

    # Cleanup
    for i in range(NUM_FILES):
        os.unlink(os.path.join(tmpdir, f"{i}.json"))
    os.rmdir(tmpdir)

    print(f"Write: {write_time*1000:.0f} ms ({NUM_FILES} files)")
    print(f"Read:  {read_time*1000:.0f} ms")
    print("Fix: consolidate into fewer larger files (e.g. one JSONL)")

if __name__ == "__main__":
    main()
