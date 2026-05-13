-- SCHOOL ERP DATABASE (PRODUCTION READY)
CREATE DATABASE IF NOT EXISTS edu_school;
USE edu_school;

-- 1. BATCHES
CREATE TABLE batches (
    id INT PRIMARY KEY AUTO_INCREMENT,
    batch_name VARCHAR(20) NOT NULL UNIQUE,
    start_date DATE,
    end_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_batch_name (batch_name)
);

-- 2. DIVISIONS (Classes)
CREATE TABLE divisions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    division_name VARCHAR(20) NOT NULL UNIQUE
);

-- 3. SECTIONS
CREATE TABLE sections (
    id INT PRIMARY KEY AUTO_INCREMENT,
    section_name VARCHAR(10) NOT NULL UNIQUE
);

-- 4. ACADEMIC CLASS (NO DUPLICATES)
CREATE TABLE academic_classes (
    id INT PRIMARY KEY AUTO_INCREMENT,
    batch_id INT NOT NULL,
    division_id INT NOT NULL,
    section_id INT NOT NULL,

    UNIQUE KEY unique_class (batch_id, division_id, section_id),

    FOREIGN KEY (batch_id) REFERENCES batches(id) ON DELETE CASCADE,
    FOREIGN KEY (division_id) REFERENCES divisions(id) ON DELETE CASCADE,
    FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE CASCADE
);

-- 5. STUDENTS
CREATE TABLE students (
    id INT PRIMARY KEY AUTO_INCREMENT,
    student_id VARCHAR(20) UNIQUE NOT NULL,
    user_id VARCHAR(20) UNIQUE NOT NULL,

    first_name VARCHAR(100) NOT NULL,
    middle_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,

    email VARCHAR(100) UNIQUE,
    mobile VARCHAR(15) UNIQUE,

    -- Parent Details
    father_name VARCHAR(100),
    father_mobile VARCHAR(15),
    father_email VARCHAR(100),

    mother_name VARCHAR(100),
    mother_mobile VARCHAR(15),
    mother_email VARCHAR(100),

    parent_name VARCHAR(100),
    parent_mobile VARCHAR(15),
    parent_email VARCHAR(100),

    -- Emergency Contact
    emergency_contact_name VARCHAR(100),
    emergency_contact_number VARCHAR(15),
    emergency_contact_relation VARCHAR(50),

    -- Personal Info
    gender ENUM('Male','Female','Other'),
    date_of_birth DATE,
    blood_group ENUM('A+','A-','B+','B-','AB+','AB-','O+','O-'),

    address TEXT,

    -- Academic Info
    admission_date DATE,
    previous_school VARCHAR(150),

    -- Medical Info
    medical_conditions TEXT,
    allergies TEXT,

    -- System Fields
    role ENUM('student', 'teacher', 'admin') NOT NULL,
    password VARCHAR(255) NOT NULL,
    status ENUM('Active','Inactive') DEFAULT 'Active',
    auth_token VARCHAR(255),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_student_id (student_id),
    INDEX idx_user_id (user_id)
);

-- 6. STUDENT ACADEMIC RECORDS
CREATE TABLE student_academic_records (
    id INT PRIMARY KEY AUTO_INCREMENT,
    student_id INT NOT NULL,
    academic_class_id INT NOT NULL,
    roll_number INT,
    is_current BOOLEAN DEFAULT TRUE,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (academic_class_id) REFERENCES academic_classes(id) ON DELETE CASCADE,

    -- ONE CURRENT CLASS ONLY
    UNIQUE KEY unique_current (student_id, is_current),

    -- NO DUPLICATE ROLL NUMBER IN SAME CLASS
    UNIQUE KEY unique_roll (academic_class_id, roll_number)
);

-- 7. ATTENDANCE
-- Represents a lecture/period.
CREATE TABLE attendance_sessions (
    id INT PRIMARY KEY AUTO_INCREMENT,

    academic_class_id INT NOT NULL,
    subject_id INT NOT NULL,

    session_date DATE NOT NULL,
    period_no INT,

    teacher_id INT,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (academic_class_id) REFERENCES academic_classes(id),
    FOREIGN KEY (subject_id) REFERENCES subjects(id)
);

-- attendance_records
-- Stores each student’s attendance for that session.
CREATE TABLE attendance_records (
    id INT PRIMARY KEY AUTO_INCREMENT,

    session_id INT NOT NULL,
    student_id INT NOT NULL,

    status ENUM('Present','Absent','Late') NOT NULL,

    remarks VARCHAR(255),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (session_id)
        REFERENCES attendance_sessions(id)
        ON DELETE CASCADE,

    FOREIGN KEY (student_id)
        REFERENCES students(id)
        ON DELETE CASCADE,

    UNIQUE KEY unique_student_session (
        session_id,
        student_id
    )
);

-- 8. TIMETABLE
CREATE TABLE timetable (
    id INT PRIMARY KEY AUTO_INCREMENT,

    academic_class_id INT NOT NULL,

    day ENUM('Monday','Tuesday','Wednesday','Thursday','Friday','Saturday') NOT NULL,

    start_time TIME NOT NULL,
    end_time TIME NOT NULL,

    subject_name VARCHAR(50) NOT NULL,

    teacher_id INT, -- optional (if you add teachers later)

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (academic_class_id) REFERENCES academic_classes(id) ON DELETE CASCADE,

    -- prevent duplicate slot for same class
    UNIQUE KEY unique_slot (academic_class_id, day, start_time)
);

-- 9. Exams Table
CREATE TABLE exams (
    id INT PRIMARY KEY AUTO_INCREMENT,
    academic_class_id INT NOT NULL, -- Which class this exam is for
    academic_year VARCHAR(20) NOT NULL, -- e.g., 2023-2024
    exam_name VARCHAR(50) NOT NULL, -- e.g., Midterm, Final
    exam_date DATE NOT NULL,
    start_time TIME,
    end_time TIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (academic_class_id) REFERENCES academic_classes(id) ON DELETE CASCADE
);

-- 1o. Subjects Table
CREATE TABLE subjects (
    id INT PRIMARY KEY AUTO_INCREMENT,
    subject_name VARCHAR(50) UNIQUE NOT NULL
);

-- 11. Exam Results Table
CREATE TABLE exam_results (
    id INT PRIMARY KEY AUTO_INCREMENT,

    student_id INT NOT NULL,
    exam_id INT NOT NULL,
    subject_id INT NOT NULL, -- or subject_name VARCHAR(50) if not using subjects table
    academic_year VARCHAR(20) NOT NULL,

    marks DECIMAL(5,2) NOT NULL, -- e.g., 95.50
    grade VARCHAR(5),            -- e.g., A+, B
    remarks VARCHAR(255),        -- optional, e.g., "Excellent", "Needs Improvement"

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE,
    FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,

    UNIQUE KEY unique_student_exam_subject (student_id, exam_id, subject_id)
);

-- 12.HOSTELS
CREATE TABLE hostels (
    id INT PRIMARY KEY AUTO_INCREMENT,
    hostel_name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 13.HOSTEL BLOCKS
CREATE TABLE hostel_blocks (
    id INT PRIMARY KEY AUTO_INCREMENT,
    hostel_id INT NOT NULL,
    block_name VARCHAR(10) NOT NULL, -- A, B, C

    FOREIGN KEY (hostel_id) REFERENCES hostels(id) ON DELETE CASCADE,
    UNIQUE KEY unique_block (hostel_id, block_name)
);

-- 14.HOSTEL ROOMS
CREATE TABLE rooms (
    id INT PRIMARY KEY AUTO_INCREMENT,
    block_id INT NOT NULL,

    room_number VARCHAR(10) NOT NULL, -- A-203
    floor INT NOT NULL,

    room_type ENUM('Single','Double','Triple','Dorm') NOT NULL,
    capacity INT NOT NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (block_id) REFERENCES hostel_blocks(id) ON DELETE CASCADE,

    UNIQUE KEY unique_room (block_id, room_number)
);

-- 15. WARDENS
CREATE TABLE wardens (
    id INT PRIMARY KEY AUTO_INCREMENT,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    middle_name VARCHAR(100),
    mobile VARCHAR(15),
    email VARCHAR(100),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

--  16. ROOM ALLOCATION
CREATE TABLE hostel_allocations (
    id INT PRIMARY KEY AUTO_INCREMENT,

    student_id INT NOT NULL,
    room_id INT NOT NULL,

    bed_number INT, -- useful for shared rooms

    check_in_date DATE NOT NULL,
    check_out_date DATE,

    is_active BOOLEAN DEFAULT TRUE,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,

    -- only one active allocation per student
    UNIQUE KEY unique_active_student (student_id, is_active)
);

-- 17. ROOM ↔ WARDEN MAPPING
CREATE TABLE room_wardens (
    id INT PRIMARY KEY AUTO_INCREMENT,
    room_id INT NOT NULL,
    warden_id INT NOT NULL,

    FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
    FOREIGN KEY (warden_id) REFERENCES wardens(id) ON DELETE CASCADE,

    UNIQUE KEY unique_room_warden (room_id, warden_id)
);

-- 18. HOSTEL FEES
CREATE TABLE hostel_fees (
    id INT PRIMARY KEY AUTO_INCREMENT,

    student_id INT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,

    status ENUM('Pending','Paid','Overdue') DEFAULT 'Pending',

    payment_date DATE,
    due_date DATE,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);

-- 19. COMPLAINTS
CREATE TABLE hostel_complaints (
    id INT PRIMARY KEY AUTO_INCREMENT,

    student_id INT NOT NULL,
    room_id INT,

    issue TEXT NOT NULL,

    status ENUM('Pending','In Progress','Resolved') DEFAULT 'Pending',

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP NULL,

    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE SET NULL
);

-- 20. NOTICES / ANNOUNCEMENTS
CREATE TABLE announcements (
    id INT PRIMARY KEY AUTO_INCREMENT,

    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,

    category ENUM('Academic','Examination','Holiday','Event','General') 
        DEFAULT 'General',

    priority ENUM('High','Medium','Low') 
        DEFAULT 'Medium',

    notice_date DATE NOT NULL,
    expiry_date DATE DEFAULT NULL,

    audience ENUM('All','Students','Teachers','Staff') 
        DEFAULT 'All',

    academic_class_id INT DEFAULT NULL, -- class-specific notice

    created_by INT NOT NULL, -- admin/teacher
    is_active BOOLEAN DEFAULT TRUE,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (academic_class_id) 
        REFERENCES academic_classes(id) ON DELETE SET NULL,

    FOREIGN KEY (created_by) 
        REFERENCES students(id) ON DELETE CASCADE,

    INDEX idx_notice_date (notice_date),
    INDEX idx_expiry_date (expiry_date),
    INDEX idx_priority (priority),
    INDEX idx_audience (audience),
    INDEX idx_active (is_active)
);

-- 21. NOTICE TARGET MAPPING
CREATE TABLE announcement_targets (
    id INT PRIMARY KEY AUTO_INCREMENT,

    notice_id INT NOT NULL,
    academic_class_id INT NOT NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (notice_id) 
        REFERENCES announcements(id) ON DELETE CASCADE,

    FOREIGN KEY (academic_class_id) 
        REFERENCES academic_classes(id) ON DELETE CASCADE,

    UNIQUE KEY unique_notice_class (notice_id, academic_class_id)
);

-- 22. NOTICE READ TRACKING
CREATE TABLE announcement_reads (
    id INT PRIMARY KEY AUTO_INCREMENT,

    notice_id INT NOT NULL,

    student_id INT NULL,
    teacher_id INT NULL,

    is_read BOOLEAN DEFAULT TRUE,
    read_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (notice_id) REFERENCES announcements(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE CASCADE,

    UNIQUE KEY unique_student (notice_id, student_id),
    UNIQUE KEY unique_teacher (notice_id, teacher_id)
);

-- Library
-- 23. BOOKS
CREATE TABLE books (
    id INT PRIMARY KEY AUTO_INCREMENT,

    title VARCHAR(255) NOT NULL,
    author VARCHAR(100),
    category VARCHAR(50),

    isbn VARCHAR(20) UNIQUE,

    total_copies INT DEFAULT 1,
    available_copies INT DEFAULT 1,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_title (title),
    INDEX idx_category (category)
);

-- 24. BOOK ISSUES
CREATE TABLE book_issues (
    id INT PRIMARY KEY AUTO_INCREMENT,

    student_id INT NOT NULL,
    book_id INT NOT NULL,

    issue_date DATE NOT NULL,
    due_date DATE NOT NULL,
    return_date DATE NULL,

    fine_per_day DECIMAL(5,2) DEFAULT 10.00,
    fine_amount DECIMAL(10,2) DEFAULT 0,

    status ENUM('Issued','Returned','Overdue') DEFAULT 'Issued',

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE,

    INDEX idx_student (student_id),
    INDEX idx_status (status)
);

-- 25. BOOK PAYMENTS
CREATE TABLE library_payments (
    id INT PRIMARY KEY AUTO_INCREMENT,

    student_id INT NOT NULL,
    issue_id INT NOT NULL,

    amount_paid DECIMAL(10,2) NOT NULL,
    payment_date DATE,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (issue_id) REFERENCES book_issues(id) ON DELETE CASCADE
);

-- 26.Assignments Section 
CREATE TABLE assignments (
    id INT PRIMARY KEY AUTO_INCREMENT,

    academic_class_id INT NOT NULL,
    subject_id INT NOT NULL,

    title VARCHAR(255) NOT NULL,
    description TEXT,

    assigned_date DATE NOT NULL,
    due_date DATE NOT NULL,

    total_marks INT DEFAULT 100,

    created_by INT NOT NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_assignment_class
        FOREIGN KEY (academic_class_id)
        REFERENCES academic_classes(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    CONSTRAINT fk_assignment_subject
        FOREIGN KEY (subject_id)
        REFERENCES subjects(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    CONSTRAINT fk_assignment_teacher
        FOREIGN KEY (created_by)
        REFERENCES teachers(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    INDEX idx_class (academic_class_id),
    INDEX idx_due_date (due_date)
);

CREATE TABLE assignment_files (
    id INT PRIMARY KEY AUTO_INCREMENT,

    assignment_id INT NOT NULL,

    file_name VARCHAR(255),
    file_url TEXT NOT NULL,

    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_assignment_files
        FOREIGN KEY (assignment_id)
        REFERENCES assignments(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);

CREATE TABLE assignment_submissions (
    id INT PRIMARY KEY AUTO_INCREMENT,

    assignment_id INT NOT NULL,
    student_id INT NOT NULL,

    submission_text TEXT,
    submission_file_url TEXT,

    submitted_at TIMESTAMP NULL,

    status ENUM('New','Submitted','Late','Needs Resubmission') DEFAULT 'New',

    marks_obtained DECIMAL(5,2) DEFAULT NULL,
    feedback TEXT DEFAULT NULL,

    graded_by INT DEFAULT NULL,
    graded_at TIMESTAMP NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_submission_assignment
        FOREIGN KEY (assignment_id)
        REFERENCES assignments(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    CONSTRAINT fk_submission_student
        FOREIGN KEY (student_id)
        REFERENCES students(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    CONSTRAINT fk_submission_teacher
        FOREIGN KEY (graded_by)
        REFERENCES teachers(id)
        ON DELETE SET NULL
        ON UPDATE CASCADE,

    UNIQUE KEY unique_submission (assignment_id, student_id),

    INDEX idx_student (student_id),
    INDEX idx_status (status),
    INDEX idx_assignment (assignment_id)
);

CREATE TABLE submission_files (
    id INT PRIMARY KEY AUTO_INCREMENT,

    submission_id INT NOT NULL,

    assignment_file_url TEXT NOT NULL,
    file_name VARCHAR(255),

    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_submission_files
        FOREIGN KEY (submission_id)
        REFERENCES assignment_submissions(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);

-- Student Leaves table
CREATE TABLE student_leaves (
    id INT PRIMARY KEY AUTO_INCREMENT,

    student_id INT NOT NULL,

    leave_type ENUM('Sick','Casual','Emergency') DEFAULT 'Casual',

    from_date DATE NOT NULL,
    to_date DATE NOT NULL,

    total_days INT NOT NULL,

    reason TEXT,

    status ENUM('Pending','Approved','Rejected') DEFAULT 'Pending',

    applied_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    approved_at DATETIME NULL,
    rejected_at DATETIME NULL,

    approved_by INT NULL,

    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,

    INDEX idx_student (student_id),
    INDEX idx_status (status),
    INDEX idx_dates (from_date, to_date)
);