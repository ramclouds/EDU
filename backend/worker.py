import threading, queue, time, os
from pdf_gen import generate_payslip_pdf

payslip_queue = queue.Queue(maxsize=200)

def init_worker():
    t = threading.Thread(target=_worker_loop, daemon=True)
    t.start()

def _worker_loop():
    while True:
        pid = payslip_queue.get()
        try:
            print(f"Worker processing payslip {pid}")
            generate_payslip_pdf(pid)
        except Exception as e:
            print(f"Error generating PDF for {pid}: {e}")
        time.sleep(0.1)
        payslip_queue.task_done()

def enqueue_payslip(pid):
    try:
        payslip_queue.put(pid, block=False)
    except queue.Full:
        # fallback: spawn thread to retry
        threading.Thread(target=lambda: payslip_queue.put(pid), daemon=True).start()
