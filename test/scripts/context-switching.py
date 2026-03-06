#!/usr/bin/env python3
"""
ANTI-PATTERN: Excessive context switching
Resume: "Reduce Context Switching" - More threads than CPU cores causes
constant rotation, cache eviction, and scheduler overhead.

Run: python context-switching.py
Measure: vmstat 1, pidstat -w
"""

import threading
import multiprocessing
import time

NUM_THREADS = 500  # Way more than typical CPU cores (8-16)
ITERATIONS = 100_000


def cpu_busy_work():
    """Small CPU-bound task that gets interrupted often."""
    total = 0
    for i in range(ITERATIONS):
        total += i * (i + 1)  # Pure CPU work
    return total


def main():
    num_cores = multiprocessing.cpu_count()
    print(f"CPU cores: {num_cores}")
    print(f"Creating {NUM_THREADS} threads (>> cores) -> context switch storm")
    print("Run: vmstat 1  or  pidstat -w -p $(pgrep -f context-switching) 1")

    start = time.perf_counter()
    threads = []
    for _ in range(NUM_THREADS):
        t = threading.Thread(target=cpu_busy_work)
        threads.append(t)
        t.start()

    for t in threads:
        t.join()

    elapsed = time.perf_counter() - start
    print(f"Done in {elapsed:.2f}s (with {NUM_THREADS} threads)")
    print("Compare with: NUM_THREADS=8 for ~num_cores -> much faster")


if __name__ == "__main__":
    main()
