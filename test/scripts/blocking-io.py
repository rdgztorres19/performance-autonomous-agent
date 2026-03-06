#!/usr/bin/env python3
"""
ANTI-PATTERN: Blocking I/O instead of async
Resume: "Use Asynchronous I/O" - Blocking ties up threads; with many
concurrent ops you need many threads or poor scalability.

Run: python blocking-io.py
(Simulates blocking by doing sync file reads in threads)
"""

import concurrent.futures
import tempfile
import time
import os

NUM_READS = 100
FILE_SIZE_KB = 100


def main():
    print("ANTI-PATTERN: Blocking I/O (sync in threads)")
    print(f"{NUM_READS} concurrent sync file reads")

    with tempfile.NamedTemporaryFile(delete=False, suffix='.dat') as f:
        f.write(os.urandom(FILE_SIZE_KB * 1024))
        path = f.name

    try:
        def blocking_read():
            with open(path, 'rb') as f:
                return len(f.read(FILE_SIZE_KB * 1024))

        # BAD: Many threads doing blocking I/O
        start = time.perf_counter()
        with concurrent.futures.ThreadPoolExecutor(max_workers=NUM_READS) as ex:
            list(ex.map(lambda _: blocking_read(), range(NUM_READS)))
        elapsed = time.perf_counter() - start

        print(f"Blocking (many threads): {elapsed*1000:.0f} ms")
        print("Fix: use asyncio + aiofiles or ThreadPool for I/O-bound")
    finally:
        os.unlink(path)


if __name__ == "__main__":
    main()
