#!/usr/bin/env python3
"""
ANTI-PATTERN: False sharing
Resume: "Avoid False Sharing" - Multiple counters in same cache line,
threads on different cores invalidate each other's cache.

Run: python false-sharing.py
(Uses multiprocessing - threads have GIL; multiprocessing shares less but
 we simulate with shared arrays. For real false-sharing use C/ctypes.)
"""

import multiprocessing as mp
import time

# Simulate: multiple threads/processes incrementing adjacent counters
# In real C/Java: counters next to each other = same cache line
NUM_PROCS = 4
ITERATIONS = 2_000_000


def worker(shared_arr, index):
    """Each process hits a different index - but if adjacent, false sharing."""
    for _ in range(ITERATIONS):
        shared_arr[index] += 1


def main():
    print("ANTI-PATTERN: False sharing (simulated with shared array)")
    print(f"{NUM_PROCS} processes, {ITERATIONS} increments each")

    # BAD: Adjacent indices (could be same cache line)
    arr = mp.Array('i', [0] * 4)  # 4 ints = 16 bytes, might share 64-byte line
    procs = [mp.Process(target=worker, args=(arr, i)) for i in range(NUM_PROCS)]

    start = time.perf_counter()
    for p in procs:
        p.start()
    for p in procs:
        p.join()
    elapsed = time.perf_counter() - start

    print(f"Adjacent counters: {elapsed*1000:.0f} ms")
    print("Fix: pad counters to separate cache lines (64 bytes)")


if __name__ == "__main__":
    main()
