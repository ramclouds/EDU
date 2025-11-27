# Edu Payroll Starter (Flask)

This project is a Flask-based implementation of the Basic Education Management System payroll features.

Features included:
- Backend: Flask + JWT auth + SQLAlchemy (MySQL)
  - JWT auth (login returns token)
  - Employee endpoints with pagination
  - Run payroll: creates payslips and enqueues PDF generation
  - Worker queue (in-process) for PDF generation
  - PDF generation using reportlab (pure Python)
  - OpenAPI (docs/openapi.yaml)

- Frontend: React + Vite
  - Login (JWT)
  - Employee list, Run payroll, Payslip view

Quick start:
1. Create MySQL database and run `backend/db/schema.sql`.
2. Configure `backend/.env` (MYSQL_DSN, JWT_SECRET) or export env vars.
3. Install backend deps: `pip install -r backend/requirements.txt`
4. Start backend: `python backend/app.py`
5. Start frontend: `cd frontend && npm install && npm run dev`

