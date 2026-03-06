#!/usr/bin/env python3
"""
ANTI-PATTERN: Closures in hot path causing allocations
Resume: "Avoid Closures in Hot Paths" - Lambdas capturing variables
create heap-allocated objects (closure cells).

Run: python closures-allocations.py
"""

import time

N = 1_000_000


def main():
    print("ANTI-PATTERN: Closures in hot path")
    print(f"Processing {N} items with closure")

    threshold = 50

    # BAD: Closure captures threshold
    data = list(range(100))
    start = time.perf_counter()
    total = 0
    for _ in range(N):
        filtered = [x for x in data if x > threshold]  # closure over threshold
        total += sum(filtered)
    t1 = time.perf_counter() - start

    # GOOD: No closure - threshold in scope but listcomp avoids extra closure
    start = time.perf_counter()
    total2 = 0
    for _ in range(N):
        filtered = []
        for x in data:
            if x > threshold:
                filtered.append(x)
        total2 += sum(filtered)
    t2 = time.perf_counter() - start

    print(f"With closure (listcomp): {t1*1000:.0f} ms")
    print(f"Without (explicit loop):  {t2*1000:.0f} ms")
    print(f"Ratio: {t1/t2:.2f}x")


if __name__ == "__main__":
    main()
