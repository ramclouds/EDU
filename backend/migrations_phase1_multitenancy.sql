-- ============================================================
-- Phase 1 multi-tenancy migration
-- Run this once against your existing database before starting
-- the backend with the new code.
-- ============================================================

-- 1. New tenant table
CREATE TABLE IF NOT EXISTS schools (
    id INT AUTO_INCREMENT PRIMARY KEY,
    school_code VARCHAR(20) NOT NULL UNIQUE,
    name VARCHAR(200) NOT NULL,
    contact_email VARCHAR(120),
    contact_phone VARCHAR(20),
    address TEXT,
    logo_url VARCHAR(255),
    plan ENUM('Trial','Basic','Pro','Enterprise') NOT NULL DEFAULT 'Trial',
    status ENUM('Trial','Active','Suspended','Expired') NOT NULL DEFAULT 'Trial',
    max_students INT DEFAULT 200,
    max_staff INT DEFAULT 30,
    trial_ends_at DATETIME NULL,
    subscription_ends_at DATETIME NULL,
    is_archived BOOLEAN NOT NULL DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. Platform owner table
CREATE TABLE IF NOT EXISTS developers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    developer_id VARCHAR(50) NOT NULL UNIQUE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100),
    email VARCHAR(120) NOT NULL UNIQUE,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    auth_token VARCHAR(255),
    token_expires_at DATETIME NULL,
    status ENUM('Active','Inactive') DEFAULT 'Active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 3. school_id on the identity tables (nullable — existing rows stay
--    NULL, meaning "not yet migrated to a school", and the backend's
--    /api/login falls back to its old unscoped behavior for them)
ALTER TABLE admins ADD COLUMN school_id INT NULL,
    ADD CONSTRAINT fk_admins_school FOREIGN KEY (school_id) REFERENCES schools(id);
ALTER TABLE students ADD COLUMN school_id INT NULL,
    ADD CONSTRAINT fk_students_school FOREIGN KEY (school_id) REFERENCES schools(id);
ALTER TABLE teachers ADD COLUMN school_id INT NULL,
    ADD CONSTRAINT fk_teachers_school FOREIGN KEY (school_id) REFERENCES schools(id);
ALTER TABLE non_teaching_staff ADD COLUMN school_id INT NULL,
    ADD CONSTRAINT fk_staff_school FOREIGN KEY (school_id) REFERENCES schools(id);

CREATE INDEX idx_admins_school ON admins(school_id);
CREATE INDEX idx_students_school ON students(school_id);
CREATE INDEX idx_teachers_school ON teachers(school_id);
CREATE INDEX idx_staff_school ON non_teaching_staff(school_id);

-- 4. If you're converting your EXISTING single school into the first
--    tenant (recommended, rather than leaving its users unscoped
--    forever), run something like this and then backfill:
--
-- INSERT INTO schools (school_code, name, status, plan)
--   VALUES ('SCH-ORIGIN', 'Your School Name', 'Active', 'Enterprise');
--
-- UPDATE admins SET school_id = (SELECT id FROM schools WHERE school_code = 'SCH-ORIGIN');
-- UPDATE students SET school_id = (SELECT id FROM schools WHERE school_code = 'SCH-ORIGIN');
-- UPDATE teachers SET school_id = (SELECT id FROM schools WHERE school_code = 'SCH-ORIGIN');
-- UPDATE non_teaching_staff SET school_id = (SELECT id FROM schools WHERE school_code = 'SCH-ORIGIN');
--
-- After backfilling, everyone at your original school will need to
-- start entering 'SCH-ORIGIN' at login (or you keep the school_code
-- field optional in the frontend and only enforce it for new
-- multi-school customers — your call).

-- 5. First platform-owner (Developer) account — you.
--    Password must be a bcrypt hash, not plaintext. Generate one with:
--    python -c "from flask_bcrypt import Bcrypt; print(Bcrypt().generate_password_hash('yourpassword').decode())"
--
-- INSERT INTO developers (developer_id, first_name, last_name, email, username, password, status)
--   VALUES ('DEV-001', 'Your', 'Name', 'you@yourcompany.com', 'youradmin', '<bcrypt-hash-here>', 'Active');

-- ============================================================
-- Phase 2 (partial) — core academic tables
-- Run after Phase 1 above. Covers: batches, divisions, sections,
-- academic_classes, subjects. This is NOT the full Phase 2 — the
-- other ~65 tables (attendance, exams, assignments, library, hostel,
-- payroll, timetable, notifications, RBAC roles, etc.) still need the
-- same treatment in follow-up passes.
-- ============================================================

-- batches: was globally unique on batch_name — two schools could
-- never both have a "2024-2025" batch. Now unique per school.
ALTER TABLE batches ADD COLUMN school_id INT NULL,
    ADD CONSTRAINT fk_batches_school FOREIGN KEY (school_id) REFERENCES schools(id);
CREATE INDEX idx_batches_school ON batches(school_id);
ALTER TABLE batches DROP INDEX batch_name;  -- drop the old global-unique index (name may differ — check with SHOW INDEX FROM batches;)
ALTER TABLE batches ADD CONSTRAINT uq_school_batch_name UNIQUE (school_id, batch_name);

-- divisions
ALTER TABLE divisions ADD COLUMN school_id INT NULL,
    ADD CONSTRAINT fk_divisions_school FOREIGN KEY (school_id) REFERENCES schools(id);
CREATE INDEX idx_divisions_school ON divisions(school_id);
ALTER TABLE divisions DROP INDEX division_name;
ALTER TABLE divisions ADD CONSTRAINT uq_school_division_name UNIQUE (school_id, division_name);

-- sections
ALTER TABLE sections ADD COLUMN school_id INT NULL,
    ADD CONSTRAINT fk_sections_school FOREIGN KEY (school_id) REFERENCES schools(id);
CREATE INDEX idx_sections_school ON sections(school_id);
ALTER TABLE sections DROP INDEX section_name;
ALTER TABLE sections ADD CONSTRAINT uq_school_section_name UNIQUE (school_id, section_name);

-- academic_classes (denormalized school_id — set from the creating
-- admin, not derived via join, so every query can filter directly)
ALTER TABLE academic_classes ADD COLUMN school_id INT NULL,
    ADD CONSTRAINT fk_academic_classes_school FOREIGN KEY (school_id) REFERENCES schools(id);
CREATE INDEX idx_academic_classes_school ON academic_classes(school_id);

-- subjects
ALTER TABLE subjects ADD COLUMN school_id INT NULL,
    ADD CONSTRAINT fk_subjects_school FOREIGN KEY (school_id) REFERENCES schools(id);
CREATE INDEX idx_subjects_school ON subjects(school_id);
ALTER TABLE subjects DROP INDEX subject_code;   -- check actual index names first
ALTER TABLE subjects DROP INDEX subject_name;
ALTER TABLE subjects ADD CONSTRAINT uq_school_subject_code UNIQUE (school_id, subject_code);
ALTER TABLE subjects ADD CONSTRAINT uq_school_subject_name UNIQUE (school_id, subject_name);

-- If you're converting your existing single school's data (same
-- SCH-ORIGIN pattern as Phase 1), backfill these five tables too:
-- UPDATE batches SET school_id = (SELECT id FROM schools WHERE school_code = 'SCH-ORIGIN');
-- UPDATE divisions SET school_id = (SELECT id FROM schools WHERE school_code = 'SCH-ORIGIN');
-- UPDATE sections SET school_id = (SELECT id FROM schools WHERE school_code = 'SCH-ORIGIN');
-- UPDATE academic_classes SET school_id = (SELECT id FROM schools WHERE school_code = 'SCH-ORIGIN');
-- UPDATE subjects SET school_id = (SELECT id FROM schools WHERE school_code = 'SCH-ORIGIN');

-- ============================================================
-- Phase 2 (partial, continued) — student enrollment
-- ============================================================

ALTER TABLE student_academic_records ADD COLUMN school_id INT NULL,
    ADD CONSTRAINT fk_sar_school FOREIGN KEY (school_id) REFERENCES schools(id);
CREATE INDEX idx_sar_school ON student_academic_records(school_id);

-- Backfill (same SCH-ORIGIN pattern as above):
-- UPDATE student_academic_records SET school_id = (SELECT id FROM schools WHERE school_code = 'SCH-ORIGIN');

-- ============================================================
-- Phase 2 (partial, continued) — attendance
-- ============================================================

ALTER TABLE teacher_attendance ADD COLUMN school_id INT NULL,
    ADD CONSTRAINT fk_teacher_attendance_school FOREIGN KEY (school_id) REFERENCES schools(id);
CREATE INDEX idx_teacher_attendance_school ON teacher_attendance(school_id);

ALTER TABLE attendance_sessions ADD COLUMN school_id INT NULL,
    ADD CONSTRAINT fk_attendance_sessions_school FOREIGN KEY (school_id) REFERENCES schools(id);
CREATE INDEX idx_attendance_sessions_school ON attendance_sessions(school_id);

ALTER TABLE attendance_records ADD COLUMN school_id INT NULL,
    ADD CONSTRAINT fk_attendance_records_school FOREIGN KEY (school_id) REFERENCES schools(id);
CREATE INDEX idx_attendance_records_school ON attendance_records(school_id);

-- Backfill:
-- UPDATE teacher_attendance SET school_id = (SELECT id FROM schools WHERE school_code = 'SCH-ORIGIN');
-- UPDATE attendance_sessions SET school_id = (SELECT id FROM schools WHERE school_code = 'SCH-ORIGIN');
-- UPDATE attendance_records SET school_id = (SELECT id FROM schools WHERE school_code = 'SCH-ORIGIN');

-- ============================================================
-- Phase 2 (partial, continued) — RBAC
-- ============================================================

-- rbac_roles: school_id NULL = shared system default role (the 6 seeded
-- ones); a value = that school's own custom role. `code` was globally
-- unique, which would have blocked two schools from both having a custom
-- "department-head" role. Uniqueness for custom roles is now enforced in
-- the application (RBACRoleListAPI), not by a DB constraint, because a
-- composite (school_id, code) unique index doesn't reliably catch
-- duplicate system roles (NULL != NULL in a UNIQUE index).
ALTER TABLE rbac_roles ADD COLUMN school_id INT NULL,
    ADD CONSTRAINT fk_rbac_roles_school FOREIGN KEY (school_id) REFERENCES schools(id);
CREATE INDEX idx_rbac_roles_school ON rbac_roles(school_id);
-- Drop the old global-unique index on code (check the real name first:
-- SHOW INDEX FROM rbac_roles;) and keep a plain non-unique one.
ALTER TABLE rbac_roles DROP INDEX code;          -- name may differ, e.g. ix_rbac_roles_code
CREATE INDEX ix_rbac_roles_code ON rbac_roles(code);

-- rbac_audit_logs: record which school each action happened in
ALTER TABLE rbac_audit_logs ADD COLUMN school_id INT NULL,
    ADD CONSTRAINT fk_rbac_audit_school FOREIGN KEY (school_id) REFERENCES schools(id);
CREATE INDEX idx_rbac_audit_school ON rbac_audit_logs(school_id);

-- Do NOT backfill rbac_roles.school_id for the 6 default roles — they
-- must stay NULL (shared). Only backfill audit logs if you want history
-- attributed to your original school:
-- UPDATE rbac_audit_logs SET school_id = (SELECT id FROM schools WHERE school_code = 'SCH-ORIGIN');

-- ============================================================
-- Phase 2 (partial, continued) — exams
-- ============================================================

ALTER TABLE exams ADD COLUMN school_id INT NULL,
    ADD CONSTRAINT fk_exams_school FOREIGN KEY (school_id) REFERENCES schools(id);
CREATE INDEX idx_exams_school ON exams(school_id);

ALTER TABLE exam_results ADD COLUMN school_id INT NULL,
    ADD CONSTRAINT fk_exam_results_school FOREIGN KEY (school_id) REFERENCES schools(id);
CREATE INDEX idx_exam_results_school ON exam_results(school_id);

-- Backfill:
-- UPDATE exams SET school_id = (SELECT id FROM schools WHERE school_code = 'SCH-ORIGIN');
-- UPDATE exam_results SET school_id = (SELECT id FROM schools WHERE school_code = 'SCH-ORIGIN');

-- ============================================================
-- Phase 2 (partial, continued) — teacher/staff management
-- ============================================================
-- No new columns needed this slice — teachers (school_id), admins
-- (school_id), and non_teaching_staff (school_id) were all already
-- added in Phase 1. This slice was entirely about scoping QUERIES
-- that had never applied those columns as a filter (teacher roster,
-- staff directory, teacher options dropdowns, and several IDOR fixes
-- on teacher detail/password/status/assignments endpoints).

-- ============================================================
-- Phase 2 (partial, continued) — assignments
-- ============================================================
ALTER TABLE assignments ADD COLUMN school_id INT NULL,
    ADD CONSTRAINT fk_assignments_school FOREIGN KEY (school_id) REFERENCES schools(id);
CREATE INDEX idx_assignments_school ON assignments(school_id);

-- Backfill:
-- UPDATE assignments SET school_id = (SELECT id FROM schools WHERE school_code = 'SCH-ORIGIN');
-- (assignment_submissions and assignment_files inherit scope through their parent assignment.)

-- ============================================================
-- Phase 2 (partial, continued) — timetable
-- ============================================================
ALTER TABLE timetable_lectures ADD COLUMN school_id INT NULL,
    ADD CONSTRAINT fk_timetable_lectures_school FOREIGN KEY (school_id) REFERENCES schools(id);
CREATE INDEX idx_timetable_lectures_school ON timetable_lectures(school_id);

ALTER TABLE timetable ADD COLUMN school_id INT NULL,
    ADD CONSTRAINT fk_timetable_school FOREIGN KEY (school_id) REFERENCES schools(id);
CREATE INDEX idx_timetable_school ON timetable(school_id);

-- Backfill:
-- UPDATE timetable_lectures SET school_id = (SELECT id FROM schools WHERE school_code = 'SCH-ORIGIN');
-- UPDATE timetable SET school_id = (SELECT id FROM schools WHERE school_code = 'SCH-ORIGIN');

-- ============================================================
-- Phase 2 (partial, continued) — notifications & activity logs
-- ============================================================
ALTER TABLE notifications ADD COLUMN school_id INT NULL,
    ADD CONSTRAINT fk_notifications_school FOREIGN KEY (school_id) REFERENCES schools(id);
CREATE INDEX idx_notifications_school ON notifications(school_id);

ALTER TABLE activity_logs ADD COLUMN school_id INT NULL,
    ADD CONSTRAINT fk_activity_logs_school FOREIGN KEY (school_id) REFERENCES schools(id);
CREATE INDEX idx_activity_logs_school ON activity_logs(school_id);

-- Backfill (existing rows stay NULL = legacy, visible only to legacy installs):
-- UPDATE notifications SET school_id = (SELECT id FROM schools WHERE school_code = 'SCH-ORIGIN');
-- UPDATE activity_logs SET school_id = (SELECT id FROM schools WHERE school_code = 'SCH-ORIGIN');

-- ============================================================
-- Phase 2 (partial, continued) — leaves
-- ============================================================
ALTER TABLE teacher_leaves ADD COLUMN school_id INT NULL,
    ADD CONSTRAINT fk_teacher_leaves_school FOREIGN KEY (school_id) REFERENCES schools(id);
CREATE INDEX idx_teacher_leaves_school ON teacher_leaves(school_id);

ALTER TABLE student_leaves ADD COLUMN school_id INT NULL,
    ADD CONSTRAINT fk_student_leaves_school FOREIGN KEY (school_id) REFERENCES schools(id);
CREATE INDEX idx_student_leaves_school ON student_leaves(school_id);

-- Backfill. Leaves inherit their owner's school. Without this, existing
-- leaves at a real school stay NULL and disappear from the scoped admin
-- views, so run these before going live:
-- UPDATE teacher_leaves tl JOIN teachers t ON t.id = tl.teacher_id SET tl.school_id = t.school_id;
-- UPDATE student_leaves sl JOIN students s ON s.id = sl.student_id SET sl.school_id = s.school_id;

-- ============================================================
-- Phase 2 (partial, continued) — payroll & accounts
-- ============================================================
ALTER TABLE fee_structures ADD COLUMN school_id INT NULL,
    ADD CONSTRAINT fk_fee_structures_school FOREIGN KEY (school_id) REFERENCES schools(id);
ALTER TABLE fee_installments ADD COLUMN school_id INT NULL,
    ADD CONSTRAINT fk_fee_installments_school FOREIGN KEY (school_id) REFERENCES schools(id);
ALTER TABLE fee_payments ADD COLUMN school_id INT NULL,
    ADD CONSTRAINT fk_fee_payments_school FOREIGN KEY (school_id) REFERENCES schools(id);
ALTER TABLE salary_structures ADD COLUMN school_id INT NULL,
    ADD CONSTRAINT fk_salary_structures_school FOREIGN KEY (school_id) REFERENCES schools(id);
ALTER TABLE payslips ADD COLUMN school_id INT NULL,
    ADD CONSTRAINT fk_payslips_school FOREIGN KEY (school_id) REFERENCES schools(id);
ALTER TABLE accounts_transactions ADD COLUMN school_id INT NULL,
    ADD CONSTRAINT fk_accounts_transactions_school FOREIGN KEY (school_id) REFERENCES schools(id);
ALTER TABLE bank_accounts ADD COLUMN school_id INT NULL,
    ADD CONSTRAINT fk_bank_accounts_school FOREIGN KEY (school_id) REFERENCES schools(id);
ALTER TABLE expense_categories ADD COLUMN school_id INT NULL,
    ADD CONSTRAINT fk_expense_categories_school FOREIGN KEY (school_id) REFERENCES schools(id);

-- Uniqueness that was global and must become per school:
-- receipt numbers (fee_payments) and expense category names.
-- Find the existing unique index names first: SHOW INDEX FROM fee_payments; SHOW INDEX FROM expense_categories;
ALTER TABLE fee_payments ADD CONSTRAINT uq_school_receipt UNIQUE (school_id, receipt_number);
ALTER TABLE expense_categories ADD CONSTRAINT uq_school_category_name UNIQUE (school_id, name);
-- Then drop the old single-column uniques (names vary by DB; check SHOW INDEX first):
-- ALTER TABLE fee_payments DROP INDEX receipt_number;
-- ALTER TABLE expense_categories DROP INDEX name;

-- Backfill from the owning student / staff / bank row where one exists,
-- otherwise from the school you're converting. Run before go-live:
-- UPDATE fee_installments fi JOIN students s ON s.id = fi.student_id SET fi.school_id = s.school_id;
-- UPDATE fee_payments fp JOIN students s ON s.id = fp.student_id SET fp.school_id = s.school_id;
-- UPDATE fee_structures SET school_id = (SELECT id FROM schools WHERE school_code = 'SCH-ORIGIN');
-- UPDATE expense_categories SET school_id = (SELECT id FROM schools WHERE school_code = 'SCH-ORIGIN');
-- UPDATE bank_accounts SET school_id = (SELECT id FROM schools WHERE school_code = 'SCH-ORIGIN');
-- UPDATE accounts_transactions SET school_id = (SELECT id FROM schools WHERE school_code = 'SCH-ORIGIN');
-- UPDATE salary_structures SET school_id = (SELECT id FROM schools WHERE school_code = 'SCH-ORIGIN');
-- UPDATE payslips SET school_id = (SELECT id FROM schools WHERE school_code = 'SCH-ORIGIN');

-- ============================================================
-- Phase 2 (partial, continued) — library
-- ============================================================
ALTER TABLE book_categories ADD COLUMN school_id INT NULL,
    ADD CONSTRAINT fk_book_categories_school FOREIGN KEY (school_id) REFERENCES schools(id);
ALTER TABLE book_authors ADD COLUMN school_id INT NULL,
    ADD CONSTRAINT fk_book_authors_school FOREIGN KEY (school_id) REFERENCES schools(id);
ALTER TABLE books ADD COLUMN school_id INT NULL,
    ADD CONSTRAINT fk_books_school FOREIGN KEY (school_id) REFERENCES schools(id);
ALTER TABLE book_issues ADD COLUMN school_id INT NULL,
    ADD CONSTRAINT fk_book_issues_school FOREIGN KEY (school_id) REFERENCES schools(id);
ALTER TABLE library_fine_payments ADD COLUMN school_id INT NULL,
    ADD CONSTRAINT fk_library_fine_payments_school FOREIGN KEY (school_id) REFERENCES schools(id);
ALTER TABLE teacher_book_issues ADD COLUMN school_id INT NULL,
    ADD CONSTRAINT fk_teacher_book_issues_school FOREIGN KEY (school_id) REFERENCES schools(id);
ALTER TABLE teacher_library_fine_payments ADD COLUMN school_id INT NULL,
    ADD CONSTRAINT fk_teacher_library_fine_payments_school FOREIGN KEY (school_id) REFERENCES schools(id);
ALTER TABLE staff_book_issues ADD COLUMN school_id INT NULL,
    ADD CONSTRAINT fk_staff_book_issues_school FOREIGN KEY (school_id) REFERENCES schools(id);
ALTER TABLE admin_book_issues ADD COLUMN school_id INT NULL,
    ADD CONSTRAINT fk_admin_book_issues_school FOREIGN KEY (school_id) REFERENCES schools(id);
ALTER TABLE staff_library_fine_payments ADD COLUMN school_id INT NULL,
    ADD CONSTRAINT fk_staff_library_fine_payments_school FOREIGN KEY (school_id) REFERENCES schools(id);

-- Per-school uniqueness that was global before. Check the real index names
-- first with SHOW INDEX, since they vary by how the table was created.
ALTER TABLE book_categories ADD CONSTRAINT uq_school_category_name UNIQUE (school_id, name);
ALTER TABLE book_categories ADD CONSTRAINT uq_school_category_slug UNIQUE (school_id, slug);
ALTER TABLE book_authors ADD CONSTRAINT uq_school_author_name UNIQUE (school_id, name);
ALTER TABLE book_authors ADD CONSTRAINT uq_school_author_slug UNIQUE (school_id, slug);
ALTER TABLE books ADD CONSTRAINT uq_school_book_code UNIQUE (school_id, book_code);
ALTER TABLE books ADD CONSTRAINT uq_school_isbn UNIQUE (school_id, isbn);
-- Drop the old single-column uniques first (names vary; check SHOW INDEX):
-- ALTER TABLE book_categories DROP INDEX name;  ALTER TABLE book_categories DROP INDEX slug;
-- ALTER TABLE book_authors DROP INDEX name;     ALTER TABLE book_authors DROP INDEX slug;
-- ALTER TABLE books DROP INDEX book_code;       ALTER TABLE books DROP INDEX isbn;

-- Backfill. Loans and payments inherit from the member; catalogue rows
-- from the school being converted. Run before go-live:
-- UPDATE book_issues bi JOIN students s ON s.id = bi.student_id SET bi.school_id = s.school_id;
-- UPDATE teacher_book_issues tbi JOIN teachers t ON t.id = tbi.teacher_id SET tbi.school_id = t.school_id;
-- UPDATE book_categories SET school_id = (SELECT id FROM schools WHERE school_code = 'SCH-ORIGIN');
-- UPDATE book_authors SET school_id = (SELECT id FROM schools WHERE school_code = 'SCH-ORIGIN');
-- UPDATE books SET school_id = (SELECT id FROM schools WHERE school_code = 'SCH-ORIGIN');

-- ============================================================
-- Phase 2 (partial, continued) — hostel
-- ============================================================
-- school_id on every hostel table (21).
ALTER TABLE hostels ADD COLUMN school_id INT NULL,
    ADD CONSTRAINT fk_hostels_school FOREIGN KEY (school_id) REFERENCES schools(id);
ALTER TABLE hostel_blocks ADD COLUMN school_id INT NULL,
    ADD CONSTRAINT fk_hostel_blocks_school FOREIGN KEY (school_id) REFERENCES schools(id);
ALTER TABLE hostel_floors ADD COLUMN school_id INT NULL,
    ADD CONSTRAINT fk_hostel_floors_school FOREIGN KEY (school_id) REFERENCES schools(id);
ALTER TABLE rooms ADD COLUMN school_id INT NULL,
    ADD CONSTRAINT fk_rooms_school FOREIGN KEY (school_id) REFERENCES schools(id);
ALTER TABLE beds ADD COLUMN school_id INT NULL,
    ADD CONSTRAINT fk_beds_school FOREIGN KEY (school_id) REFERENCES schools(id);
ALTER TABLE wardens ADD COLUMN school_id INT NULL,
    ADD CONSTRAINT fk_wardens_school FOREIGN KEY (school_id) REFERENCES schools(id);
ALTER TABLE room_wardens ADD COLUMN school_id INT NULL,
    ADD CONSTRAINT fk_room_wardens_school FOREIGN KEY (school_id) REFERENCES schools(id);
ALTER TABLE hostel_allocations ADD COLUMN school_id INT NULL,
    ADD CONSTRAINT fk_hostel_allocations_school FOREIGN KEY (school_id) REFERENCES schools(id);
ALTER TABLE hostel_fee_structures ADD COLUMN school_id INT NULL,
    ADD CONSTRAINT fk_hostel_fee_structures_school FOREIGN KEY (school_id) REFERENCES schools(id);
ALTER TABLE hostel_fees ADD COLUMN school_id INT NULL,
    ADD CONSTRAINT fk_hostel_fees_school FOREIGN KEY (school_id) REFERENCES schools(id);
ALTER TABLE hostel_fee_payments ADD COLUMN school_id INT NULL,
    ADD CONSTRAINT fk_hostel_fee_payments_school FOREIGN KEY (school_id) REFERENCES schools(id);
ALTER TABLE hostel_activity_logs ADD COLUMN school_id INT NULL,
    ADD CONSTRAINT fk_hostel_activity_logs_school FOREIGN KEY (school_id) REFERENCES schools(id);
ALTER TABLE hostel_complaints ADD COLUMN school_id INT NULL,
    ADD CONSTRAINT fk_hostel_complaints_school FOREIGN KEY (school_id) REFERENCES schools(id);
ALTER TABLE hostel_maintenance_requests ADD COLUMN school_id INT NULL,
    ADD CONSTRAINT fk_hostel_maintenance_requests_school FOREIGN KEY (school_id) REFERENCES schools(id);
ALTER TABLE hostel_staff ADD COLUMN school_id INT NULL,
    ADD CONSTRAINT fk_hostel_staff_school FOREIGN KEY (school_id) REFERENCES schools(id);
ALTER TABLE hostel_visitors ADD COLUMN school_id INT NULL,
    ADD CONSTRAINT fk_hostel_visitors_school FOREIGN KEY (school_id) REFERENCES schools(id);
ALTER TABLE hostel_attendance ADD COLUMN school_id INT NULL,
    ADD CONSTRAINT fk_hostel_attendance_school FOREIGN KEY (school_id) REFERENCES schools(id);
ALTER TABLE hostel_movements ADD COLUMN school_id INT NULL,
    ADD CONSTRAINT fk_hostel_movements_school FOREIGN KEY (school_id) REFERENCES schools(id);
ALTER TABLE hostel_leave_requests ADD COLUMN school_id INT NULL,
    ADD CONSTRAINT fk_hostel_leave_requests_school FOREIGN KEY (school_id) REFERENCES schools(id);
ALTER TABLE hostel_mess_menu ADD COLUMN school_id INT NULL,
    ADD CONSTRAINT fk_hostel_mess_menu_school FOREIGN KEY (school_id) REFERENCES schools(id);
ALTER TABLE hostel_meal_attendance ADD COLUMN school_id INT NULL,
    ADD CONSTRAINT fk_hostel_meal_attendance_school FOREIGN KEY (school_id) REFERENCES schools(id);

-- Per-school uniqueness that was global. Check index names with SHOW INDEX first.
ALTER TABLE hostels ADD CONSTRAINT uq_school_hostel_name UNIQUE (school_id, hostel_name);
ALTER TABLE hostel_staff ADD CONSTRAINT uq_school_staff_code UNIQUE (school_id, staff_code);
ALTER TABLE hostel_visitors ADD CONSTRAINT uq_school_visitor_code UNIQUE (school_id, visitor_code);
ALTER TABLE hostel_mess_menu ADD CONSTRAINT uq_school_mess_menu_day_meal UNIQUE (school_id, day_of_week, meal_type);
-- Drop the old single-column uniques first (names vary; check SHOW INDEX):
-- ALTER TABLE hostels DROP INDEX hostel_name;
-- ALTER TABLE hostel_staff DROP INDEX staff_code;
-- ALTER TABLE hostel_visitors DROP INDEX visitor_code;
-- ALTER TABLE hostel_mess_menu DROP INDEX uq_mess_menu_day_meal;

-- Backfill. Structure from the school being converted; people-linked rows
-- from their student. Run before go-live:
-- UPDATE hostels SET school_id = (SELECT id FROM schools WHERE school_code = 'SCH-ORIGIN');
-- UPDATE hostel_allocations ha JOIN students s ON s.id = ha.student_id SET ha.school_id = s.school_id;
-- UPDATE hostel_fees hf JOIN students s ON s.id = hf.student_id SET hf.school_id = s.school_id;
-- UPDATE hostel_leave_requests lr JOIN students s ON s.id = lr.student_id SET lr.school_id = s.school_id;

-- ============================================================
-- Phase 2 (partial, continued) — assets
-- ============================================================
ALTER TABLE assets ADD COLUMN school_id INT NULL,
    ADD CONSTRAINT fk_assets_school FOREIGN KEY (school_id) REFERENCES schools(id);
CREATE INDEX idx_assets_school ON assets(school_id);

ALTER TABLE asset_history ADD COLUMN school_id INT NULL,
    ADD CONSTRAINT fk_asset_history_school FOREIGN KEY (school_id) REFERENCES schools(id);
CREATE INDEX idx_asset_history_school ON asset_history(school_id);

-- Per-school uniqueness that was global. Check index names with SHOW INDEX first.
ALTER TABLE assets ADD CONSTRAINT uq_school_asset_id UNIQUE (school_id, asset_id);
ALTER TABLE assets ADD CONSTRAINT uq_school_asset_code UNIQUE (school_id, asset_code);
ALTER TABLE assets ADD CONSTRAINT uq_school_serial_number UNIQUE (school_id, serial_number);
-- Drop the old single-column uniques first (names vary; check SHOW INDEX):
-- ALTER TABLE assets DROP INDEX asset_id;
-- ALTER TABLE assets DROP INDEX asset_code;
-- ALTER TABLE assets DROP INDEX serial_number;

-- Backfill. Assets come from the school being converted; history rows
-- inherit from the asset they describe. Run before go-live:
-- UPDATE assets SET school_id = (SELECT id FROM schools WHERE school_code = 'SCH-ORIGIN');
-- UPDATE asset_history ah JOIN assets a ON a.asset_id = ah.asset_id SET ah.school_id = a.school_id;

-- Role grant for the new RBAC module. Existing admins without it are refused
-- until a Super Admin grants 'assets' through Roles & Permissions.

-- ============================================================
-- Super Admin sections — notices scope and school events
-- ============================================================
ALTER TABLE announcements ADD COLUMN school_id INT NULL,
    ADD CONSTRAINT fk_announcements_school FOREIGN KEY (school_id) REFERENCES schools(id);
CREATE INDEX idx_announcements_school ON announcements(school_id);
-- Backfill existing notices to the school being converted. Until this runs,
-- existing notices stay NULL and disappear from every school's notice views.
-- UPDATE announcements SET school_id = (SELECT id FROM schools WHERE school_code = 'SCH-ORIGIN');

CREATE TABLE IF NOT EXISTS school_events (
    id INT AUTO_INCREMENT PRIMARY KEY,
    school_id INT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    event_date DATE NOT NULL,
    location VARCHAR(200),
    category VARCHAR(30) NOT NULL DEFAULT 'Other',
    created_by INT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_school_events_school FOREIGN KEY (school_id) REFERENCES schools(id),
    INDEX idx_school_events_school (school_id)
);

-- ============================================================
-- Developer console — tenant database names and audit trail
-- ============================================================
ALTER TABLE schools ADD COLUMN database_name VARCHAR(64) NULL,
    ADD CONSTRAINT uq_schools_database_name UNIQUE (database_name);
-- Backfill existing schools (edu_ is the default TENANT_DB_PREFIX):
-- UPDATE schools SET database_name = CONCAT('edu_', LOWER(REPLACE(school_code, '-', '_'))) WHERE database_name IS NULL;

CREATE TABLE IF NOT EXISTS developer_audit_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    developer_id INT NULL,
    developer_username VARCHAR(50) NULL,
    action VARCHAR(60) NOT NULL,
    school_id INT NULL,
    school_name VARCHAR(200) NULL,
    detail TEXT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_dev_audit_school FOREIGN KEY (school_id) REFERENCES schools(id),
    INDEX idx_dev_audit_action (action),
    INDEX idx_dev_audit_school (school_id),
    INDEX idx_dev_audit_created (created_at)
);
-- (No schema change for the exam role gate: it uses existing RBAC grants.
--  Confirm the 'academic' module is granted to every role that should
--  publish or verify results before go-live.)
