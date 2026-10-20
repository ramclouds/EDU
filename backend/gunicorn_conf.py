import multiprocessing
import os

bind = f"0.0.0.0:{os.getenv('PORT', '5000')}"

# A safe default worker count; tune based on real load testing.
workers = int(os.getenv("WEB_CONCURRENCY", multiprocessing.cpu_count() * 2 + 1))
threads = int(os.getenv("WEB_THREADS", "2"))

timeout = 30
graceful_timeout = 30
keepalive = 5

accesslog = "-"  # stdout
errorlog = "-"   # stderr
loglevel = os.getenv("GUNICORN_LOG_LEVEL", "info")
