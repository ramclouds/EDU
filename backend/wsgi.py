"""Production WSGI entrypoint.

Run with a real WSGI server instead of `python app.py` (which uses
Flask's single-threaded dev server):

  Linux/macOS:  gunicorn -c gunicorn_conf.py wsgi:app
  Windows:      waitress-serve --host=0.0.0.0 --port=5000 wsgi:app
    (gunicorn doesn't support Windows; `pip install waitress` first)
"""

from app import create_app

app = create_app()
