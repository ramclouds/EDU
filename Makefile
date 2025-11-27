.PHONY: run-backend run-frontend migrate

run-backend:
	cd backend && python app.py

run-frontend:
	cd frontend && npm install && npm run dev

migrate:
	@echo "Make sure MYSQL_DSN is set and MySQL is reachable."
	cd backend && mysql --default-character-set=utf8mb4 -u root -p < db/schema.sql
