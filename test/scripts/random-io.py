#!/usr/bin/env python3
"""
ANTI-PATTERN: Random I/O instead of sequential
Resume: "Prefer Sequential I/O" - Random seeks are slow (HDD seeks, SSD FTL).
Creates a temp file and reads at random offsets.

Run: python random-io.py
Measure: iostat -x 1
"""

import os
import random
import tempfile
import time

SIZE_MB = 20
READS = 5000
CHUNK = 4096


def main():
    print("ANTI-PATTERN: Random I/O")
    print(f"Creating {SIZE_MB}MB file, then {READS} random reads of {CHUNK} bytes")

    with tempfile.NamedTemporaryFile(delete=False, suffix='.dat') as f:
        path = f.name
    try:
        # Create file
        with open(path, 'wb') as f:
            f.write(os.urandom(SIZE_MB * 1024 * 1024))

        # BAD: Random reads
        start = time.perf_counter()
        total = 0
        max_offset = (SIZE_MB * 1024 * 1024) - CHUNK
        with open(path, 'rb') as f:
            for _ in range(READS):
                pos = random.randint(0, max_offset)
                f.seek(pos)
                total += len(f.read(CHUNK))
        t1 = time.perf_counter() - start

        # GOOD: Sequential reads
        start = time.perf_counter()
        total2 = 0
        with open(path, 'rb') as f:
            for _ in range(READS):
                total2 += len(f.read(CHUNK))
        t2 = time.perf_counter() - start

        print(f"Random I/O:   {t1*1000:.0f} ms")
        print(f"Sequential:   {t2*1000:.0f} ms")
        print(f"Sequential is {t1/t2:.1f}x faster")
    finally:
        os.unlink(path)


if __name__ == "__main__":
    main()
