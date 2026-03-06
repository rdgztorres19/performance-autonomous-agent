#!/usr/bin/env python3
"""
ANTI-PATTERN: Per-item processing instead of batching
Resume: "Process Data in Batches" - Function call overhead, poor cache
locality, many small operations instead of bulk.

Run: python per-item-batching.py
Measure: perf stat -e instructions,cache-misses
"""

import time

N = 100_000


def process_item(x):
    """Called N times - overhead adds up."""
    return x * 2 + 1


def main():
    print("ANTI-PATTERN: Per-item processing (no batching)")
    print(f"Processing {N} items with separate function call each")

    # BAD: Function call per item
    start = time.perf_counter()
    result = 0
    for i in range(N):
        result += process_item(i)
    elapsed = time.perf_counter() - start

    print(f"Per-item: {elapsed*1000:.1f} ms, result={result}")

    # GOOD: Batched (inline loop)
    start = time.perf_counter()
    result2 = 0
    for i in range(N):
        result2 += i * 2 + 1
    elapsed2 = time.perf_counter() - start

    print(f"Batched:  {elapsed2*1000:.1f} ms, result={result2}")
    print(f"Speedup: {elapsed/elapsed2:.1f}x from batching")


if __name__ == "__main__":
    main()
