#!/usr/bin/env python3
"""
ANTI-PATTERN: Unpredictable branches in hot loop
Resume: "Branch Prediction" - Random/50-50 branches cause pipeline flushes.
Measure: perf stat -e branches,branch-misses

Run: python branch-misprediction.py
"""

import random
import time

N = 5_000_000


def sum_with_unpredictable_branch(data):
    """BAD: ~50% branch miss rate - CPU cannot predict."""
    total = 0
    for x in data:
        if x % 2 == 0:  # Unpredictable
            total += x
        else:
            total -= x
    return total


def sum_with_predictable_branch(data):
    """BETTER: Sorted data -> predictable (all even then all odd)."""
    total = 0
    for x in data:
        if x % 2 == 0:
            total += x
        else:
            total -= x
    return total


def main():
    print("ANTI-PATTERN: Branch misprediction")
    print(f"Processing {N} items")

    # Unpredictable: random order
    data_random = [random.randint(0, 99) for _ in range(N)]
    start = time.perf_counter()
    r1 = sum_with_unpredictable_branch(data_random)
    t1 = time.perf_counter() - start

    # Predictable: sorted
    data_sorted = sorted(data_random)
    start = time.perf_counter()
    r2 = sum_with_predictable_branch(data_sorted)
    t2 = time.perf_counter() - start

    print(f"Unpredictable (random): {t1*1000:.0f} ms")
    print(f"Predictable (sorted):   {t2*1000:.0f} ms")
    print(f"Speedup: {t1/t2:.2f}x")
    print("Run: perf stat -e branches,branch-misses python branch-misprediction.py")


if __name__ == "__main__":
    main()
