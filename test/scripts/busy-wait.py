#!/usr/bin/env python3
"""
ANTI-PATTERN: Busy-wait loop
Resume: "Avoid Busy-Wait Loops" - Continuously consumes CPU while waiting,
never yields to scheduler. Check vmstat: high %user, high context switches.

Run: python busy-wait.py
Measure: top, vmstat 1
"""

import threading
import time

DURATION_SEC = 3
NUM_WAITERS = 4  # Multiple threads busy-waiting


def busy_wait_until(deadline):
    """BAD: Spin loop - burns CPU, never yields."""
    while time.perf_counter() < deadline:
        pass  # Busy-wait: 100% CPU, no sleep


def main():
    print("ANTI-PATTERN: Busy-wait (spin loop)")
    print(f"Running {NUM_WAITERS} threads busy-waiting for {DURATION_SEC}s")
    print("Run: top -p $(pgrep -f busy-wait) -> high %CPU")

    deadline = time.perf_counter() + DURATION_SEC
    threads = [threading.Thread(target=busy_wait_until, args=(deadline,)) for _ in range(NUM_WAITERS)]

    start = time.perf_counter()
    for t in threads:
        t.start()
    for t in threads:
        t.join()
    elapsed = time.perf_counter() - start

    print(f"Done in {elapsed:.2f}s - CPU was maxed during entire wait")
    print("Fix: use time.sleep() or threading.Event.wait()")


if __name__ == "__main__":
    main()
