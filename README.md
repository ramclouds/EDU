# EDU System: Developer, School & Dashboard Guide

EDU System is a multi-school (multi-tenant) school management platform.

| Role | What they do | Where they log in |
|---|---|---|
| **Developer** (platform owner, you) | Creates and manages schools | `/developer/login` |
| **Super Admin** (one per school) | Runs one school and creates its other staff | `/` (school code + email) |
| Other admins, teachers, students | Day-to-day school work | `/` (school code + email) |

---

## 1. Run the project

### Backend (Flask, port 5000)

```bash
cd backend
python -m venv venv
venv\Scripts\activate            # Windows   (Mac/Linux: source venv/bin/activate)
pip install -r requirements.txt
copy .env.example .env           # Mac/Linux: cp .env.example .env
```

Edit `backend/.env`:

```env
MYSQL_DSN=mysql+pymysql://USER:PASSWORD@localhost:3306/edu_school
FLASK_ENV=development
APP_SECRET_KEY=any-long-random-string
TOKEN_EXPIRY_HOURS=12
CORS_ORIGINS=http://localhost:5173
```

Create an empty MySQL database named `edu_school`, then start the server:

```bash
python app.py
```

In development mode, `app.py` runs `db.create_all()` automatically, so tables (including `schools` and `developers`) are created on first start. The API is served at **http://localhost:5000/api**.

> **Existing database?** If you created your tables with an older schema, run
> `backend/migrations_fix_admin_role_enum.sql` once. Without it, creating a
> school fails with `Data truncated for column 'role'`, because the old `role`
> column does not accept `super_admin`.

### Frontend (React + Vite, port 5173)

```bash
cd frontend
npm install
copy .env.example .env
npm run dev
```

`frontend/.env`:

```env
VITE_API_BASE_URL=http://localhost:5000
```

The app opens at **http://localhost:5173**.

---

## 2. Create the Developer ID and password

The Developer account lives in the `developers` table. There is **no signup page** for it, so you create it once.

### Option A: Python script (recommended)

Save this as `backend/create_developer.py`:

```python
from app import app
from utils.auth import db, bcrypt
from utils.platform import Developer

DEV_ID     = "DEV-001"
FIRST_NAME = "Your"
LAST_NAME  = "Name"
EMAIL      = "you@yourcompany.com"
USERNAME   = "developer"
PASSWORD   = "ChangeThisPassword@123"

with app.app_context():
    db.create_all()
    if Developer.query.filter(
        (Developer.username == USERNAME) | (Developer.email == EMAIL)
    ).first():
        print("Developer already exists.")
    else:
        db.session.add(Developer(
            developer_id=DEV_ID,
            first_name=FIRST_NAME,
            last_name=LAST_NAME,
            email=EMAIL,
            username=USERNAME,
            password=bcrypt.generate_password_hash(PASSWORD).decode("utf-8"),
            status="Active",
        ))
        db.session.commit()
        print("Developer created:", USERNAME)
```

Run it from the `backend` folder (venv active):

```bash
python create_developer.py
```

### Option B: SQL

Passwords must be **bcrypt hashes**, never plain text. Generate one:

```bash
python -c "from flask_bcrypt import Bcrypt; print(Bcrypt().generate_password_hash('yourpassword').decode())"
```

Then insert it:

```sql
INSERT INTO developers (developer_id, first_name, last_name, email, username, password, status)
VALUES ('DEV-001', 'Your', 'Name', 'you@yourcompany.com', 'developer', '<bcrypt-hash-here>', 'Active');
```

**Developer login credentials:** username **or** email, plus the password you set above.

---

## 3. Developer login page and dashboard

| Page | URL |
|---|---|
| Developer login ("Platform Console") | `http://localhost:5173/developer/login` |
| Developer dashboard | `http://localhost:5173/developer/dashboard` |

1. Open `/developer/login`.
2. Enter the Developer username (or email) and password.
3. On success you are redirected to `/developer/dashboard`.
4. The session lasts `TOKEN_EXPIRY_HOURS` (default 12 h) and renews while you are active. An expired session sends you back to the login page.

The Developer login is separate from the normal school login. A school's Super Admin cannot use `/developer/*`, and a Developer token cannot be used on school dashboards.

---

## 4. Create a school (and its Super Admin)

From `/developer/dashboard`, open the create-school form and fill it in.

**School details**

| Field | Required | Notes |
|---|---|---|
| Name | Yes | School name |
| Contact email / phone / address | No | |
| Plan | No | `Trial` (default, 14 days), `Basic`, `Pro` or `Enterprise` |
| Max students / Max staff | No | Defaults: 200 / 30 |

**First Super Admin of that school**

| Field | Required | Notes |
|---|---|---|
| First name | Yes | |
| Last name | No | |
| Admin email | Yes | Must not already be used by another admin |
| Temporary password | Yes | Share it with the school and ask them to change it after first login |

When you submit, **one step creates both** the school and its Super Admin:

- A unique **school code** is generated, in the format `SCH-XXXXXX` (e.g. `SCH-A1B2C3`).
- The Super Admin is created with role `super_admin`, type **Super Admin**, and full access to every dashboard.
- A `Trial` plan is active for 14 days. Other plans start as `Active`.

**Give the school these three things:**

| Item | Example |
|---|---|
| School code | `SCH-A1B2C3` |
| Username | email prefix + `_` + last 4 characters of the code, e.g. `principal_B2C3` (or the admin email) |
| Password | the temporary password you entered |

You can also manage schools from the dashboard: view the list with student and staff counts, edit details, and suspend, activate or archive a school. A suspended, archived or expired school cannot log in.

### API reference (all need `Authorization: Bearer <developer-token>`)

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/developer/login` | Developer login |
| POST | `/api/developer/logout` | Developer logout |
| GET | `/api/developer/schools` | List schools |
| POST | `/api/developer/schools` | Create school and Super Admin |
| GET / PUT | `/api/developer/schools/<id>` | View or edit a school |
| POST | `/api/developer/schools/<id>/status` | Change school status |
| GET | `/api/developer/stats` | Platform statistics |

---

## 5. Log in to a school dashboard

All school users (admins, teachers, students, staff) sign in on the main page:

**`http://localhost:5173/`**

1. Enter the **School code** (e.g. `SCH-A1B2C3`).
2. Enter the **email or username** and **password**.
3. You are redirected automatically to the dashboard for your role.

### Dashboard routes

| Who | Route |
|---|---|
| Student | `/student-dashboard` |
| Teacher | `/teacher-dashboard` |
| **Super Admin** | `/super-admin-dashboard` |
| Library Admin | `/library-admin-dashboard` |
| Academic Admin | `/academic-admin-dashboard` |
| Accounts Admin | `/accounts-admin-dashboard` |
| Hostel Admin | `/hostel-admin-dashboard` |
| HR Admin | `/hr-admin-dashboard` |

Other routes:

| Route | Purpose |
|---|---|
| `/` | School login |
| `/signup` | Sign-up page |
| `/developer/login` | Developer login |
| `/developer/dashboard` | Developer dashboard |

The **Super Admin** has full access to every dashboard by default: open `/academic-admin-dashboard`, `/library-admin-dashboard`, `/hostel-admin-dashboard` and so on, and no read-only banner appears. Other admins only see the modules assigned to them through roles and permissions.

---

## 6. Typical onboarding flow

```
1. Create Developer account          → python create_developer.py
2. Open /developer/login             → sign in
3. Create a school                   → note the school code + admin email + temp password
4. Give those to the school
5. School Super Admin opens /        → school code + email + password
   → lands on /super-admin-dashboard
6. Super Admin creates the other admins, teachers and students
```

---

## 7. Troubleshooting

| Problem | Fix |
|---|---|
| `Data truncated for column 'role'` when creating a school | Run `backend/migrations_fix_admin_role_enum.sql` |
| `Data truncated for column 'blood_group'` when enrolling a student | Update to the latest backend (blank blood group is now stored as `NULL`) |
| `Invalid school code` | Check the code, including the `SCH-` prefix; it is case-insensitive in the form (uppercased automatically) |
| "suspended or expired" on login | Check the school's status and trial/subscription dates in the Developer dashboard |
| New Super Admin is sent back to the login page | Update to the latest frontend (route guard now accepts `super_admin`) |
| Browser CORS errors | Make sure `CORS_ORIGINS` in `backend/.env` matches your frontend URL |
| `[BABEL] ... exceeds the max of 500KB` | Informational only; the app works. Silenced in `vite.config.js` |
