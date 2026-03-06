#!/usr/bin/env python3
"""
ANTI-PATTERN: Excessive allocations (no pooling)
Resume: "Use Memory Pooling" - Many allocations cause GC pressure,
fragmentation, and overhead.

Run: python memory-allocation.py
Measure: memory_profiler, tracemalloc
"""

import time

N = 500_000


def main():
    print("ANTI-PATTERN: Excessive allocations (no pooling)")
    print(f"Allocating {N} small objects")

    # BAD: New list/dict per iteration
    start = time.perf_counter()
    items = []
    for i in range(N):
        items.append({"id": i, "value": str(i) * 10})
    elapsed = time.perf_counter() - start

    total = sum(x["id"] for x in items)
    print(f"No pooling: {elapsed*1000:.0f} ms, {N} allocations, sum={total}")

    # With reuse (fewer allocations) - just for comparison
    start = time.perf_counter()
    items2 = []
    buf = {}
    for i in range(N):
        buf["id"] = i
        buf["value"] = str(i) * 10
        items2.append(buf.copy())  # Still allocates copy
    elapsed2 = time.perf_counter() - start
    print(f"With copy:  {elapsed2*1000:.0f} ms")
    print("Fix: use ObjectPool, ArrayPool, or reuse buffers")


if __name__ == "__main__":
    main()
