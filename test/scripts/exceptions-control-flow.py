#!/usr/bin/env python3
"""
ANTI-PATTERN: Using exceptions for control flow
Resume: "Avoid Exceptions for Control Flow" - try/except is 100x-10000x
slower than normal flow (stack unwinding, object creation).

Run: python exceptions-control-flow.py
"""

import time

N = 100_000
DATA = ["42", "invalid", "17", "bad", "99"] * (N // 5)  # 20% invalid


def parse_bad(s):
    """BAD: Exception for expected case."""
    try:
        return int(s)
    except ValueError:
        return None


def parse_good(s):
    """GOOD: Check first."""
    if s.isdigit() or (s.startswith('-') and s[1:].isdigit()):
        return int(s)
    return None


def main():
    print("ANTI-PATTERN: Exceptions for control flow")
    print(f"Parsing {N} strings, ~20% invalid")

    # BAD
    start = time.perf_counter()
    total = 0
    for s in DATA:
        v = parse_bad(s)
        if v is not None:
            total += v
    t1 = time.perf_counter() - start

    # GOOD
    start = time.perf_counter()
    total2 = 0
    for s in DATA:
        v = parse_good(s)
        if v is not None:
            total2 += v
    t2 = time.perf_counter() - start

    print(f"With try/except: {t1*1000:.0f} ms")
    print(f"With validation: {t2*1000:.0f} ms")
    print(f"Speedup: {t1/t2:.1f}x")


if __name__ == "__main__":
    main()
