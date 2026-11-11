# Going live: school addresses, TLS and upkeep

Replace `example.com` with your domain throughout. `deploy/nginx.conf` is the web server template.

Addresses: sign-in `https://<tenant id>.example.com/Login`; dashboards `https://<tenant id>.example.com/<dashboard>/<user id>`;
API `https://<tenant id>.example.com/y26/...`. The platform's common sign-in page is `https://example.com/Login`.

## 1. DNS and certificates
- Point these at your server: `example.com` and `*.example.com` (every school lives at `<tenant id>.example.com`).
- One certificate covering `example.com` and `*.example.com` (wildcards need DNS validation, e.g. certbot with your DNS provider).
- A school's own domain (`portal.theirschool.edu`) needs its own certificate. Add it after the school
  verifies the domain in the developer console.

## 2. Backend settings (`backend/.env`)
| Setting | Value |
|---|---|
| `FLASK_ENV` | `production` (the app refuses to start without `TENANT_BASE_DOMAIN` then) |
| `TENANT_BASE_DOMAIN` | `example.com` |
| `TRUSTED_PROXY_COUNT` | `1` when nginx is in front (so the real host, https and client address are used) |
| `APP_SECRET_KEY` | a long random value |
| `CORS_ORIGINS` | only extra origins. Each school's own address is allowed automatically |
| `TENANT_DB_PREFIX` | `edu` (database names become `edu_sch_xxxxxx`) |

Frontend build: set `VITE_TENANT_BASE_DOMAIN=example.com` and `VITE_API_VERSION=y26`, leave
`VITE_API_BASE_URL` empty, then `npm run build`. One build serves every school. Each school's app and API
are on its own address, so no CORS setting is needed for them.

## 3. MySQL user
The app's MySQL user needs full rights on the platform database and permission to create school databases:

    GRANT ALL PRIVILEGES ON `edu\_%`.* TO 'edu_app'@'%';        -- every school database
    GRANT ALL PRIVILEGES ON `edu_platform`.* TO 'edu_app'@'%';  -- your platform database name

Size `max_connections` for: workers x active schools x (`TENANT_POOL_SIZE` + `TENANT_MAX_OVERFLOW`).
Lower the pool sizes or put ProxySQL in front when schools are many.

## 4. First deployment, in order
1. Back up everything.
2. `backend/migrations_phase3_database_per_tenant.sql`, then `migrations_phase4_tenant_creation.sql`, then `migrations_phase5_sign_in_branding.sql`, on the platform database.
3. Give each existing school a tenant ID (see the phase 3 file).
4. Stop the app, run `python scripts/migrate_to_tenant_databases.py --dry-run`, then for real. Verify, restart.
5. `python scripts/update_school_databases.py` (adds the new columns to every school database).
6. Start gunicorn (`wsgi.py`, `gunicorn_conf.py`), reload nginx.

## 5. After every release
Run `python scripts/update_school_databases.py` (or "Update database" in the developer console for one school).
It adds new tables and columns to every school database. It never removes anything.

## 6. Monitoring
- `GET /healthz` is liveness (no database). `GET /readyz` is readiness (checks the platform database). Use them for your load balancer and uptime monitor.
- Every response has an `X-Request-ID` header. Pass it in your nginx access log format to trace a request.

## 7. Backups (this is what protects you from losing every school)
- Back up the platform database AND every `edu_sch_*` database, on a schedule, and test a restore.
- The platform database is the map to all schools. If it is lost the data still exists but cannot be found, so give it the strongest backups and replication.

## 8. Good to know
- Logins are limited after repeated failures (HTTP 429). With several gunicorn workers each counts separately; use Redis if you need one shared limit.
- A change in the developer console (suspend a school, remove a domain) applies at once on the worker that handled it, and on the others within `TENANT_CACHE_SECONDS` (30 s by default).
- Deleting is deliberately not available from the console. Archive a school instead; its database is kept.
