# Flask Backend (Edu Payroll)

Requirements:
- Python 3.10+
- MySQL server (non-docker)
- Install deps: `pip install -r requirements.txt`

Setup:
1. Create database: run `db/schema.sql` using mysql client:
   `mysql -u root -p < db/schema.sql`
2. Configure `.env` with `MYSQL_DSN` and `JWT_SECRET`
3. Run backend:
   `python app.py`

Notes:
- The worker starts in-process and handles PDF generation using reportlab.
- PDFs are stored in `static/pdfs/`.
