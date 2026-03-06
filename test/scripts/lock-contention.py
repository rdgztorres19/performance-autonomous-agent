#!/usr/bin/env python3
"""
ANTI-PATTERN: Heavy lock contention
Resume: "Reduce Context Switching", "Minimize Lock Contention" - Many
threads competing for one lock causes blocking and context switches.

Run: python lock-contention.py
Measure: pidstat -w
"""

import threading
import time

NUM_THREADS = 32
ITERATIONS = 50_000

lock = threading.Lock()
counter = 0


def increment():
    global counter
    for _ in range(ITERATIONS):
        with lock:  # All threads fight for same lock
            counter += 1


def main():
    print("ANTI-PATTERN: Lock contention")
    print(f"{NUM_THREADS} threads, {ITERATIONS} increments each, single lock")

    start = time.perf_counter()
    threads = [threading.Thread(target=increment) for _ in range(NUM_THREADS)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()
    elapsed = time.perf_counter() - start

    print(f"With lock: {elapsed*1000:.0f} ms, counter={counter}")
    print("Fix: use ThreadLocal, lock-free (atomic), or reduce critical section")


if __name__ == "__main__":
    main()
