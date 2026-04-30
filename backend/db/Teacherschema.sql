-- =========================
-- TEACHER/ADMIN TABLES
-- =========================
-- 1. TEACHERS
CREATE TABLE teachers (
    id INT PRIMARY KEY AUTO_INCREMENT,
    teacher_id VARCHAR(50) UNIQUE NOT NULL,
    user_id INT NOT NULL,

    first_name VARCHAR(100),
    middle_name VARCHAR(100),
    last_name VARCHAR(100),

    email VARCHAR(120) UNIQUE,
    mobile VARCHAR(15) UNIQUE,

    gender VARCHAR(10),
    date_of_birth DATE,
    blood_group VARCHAR(5),

    address TEXT,
    city VARCHAR(50),
    state VARCHAR(50),
    pincode VARCHAR(10),

    designation VARCHAR(100),

    degree VARCHAR(100),
    university VARCHAR(150),
    experience_years INT,
    specialization VARCHAR(100),

    joining_date DATE,
    employment_type VARCHAR(50),
    shift VARCHAR(50),

    total_classes_taken INT DEFAULT 0,
    assignments_count INT DEFAULT 0,
    rating FLOAT DEFAULT 0,
    attendance_percentage FLOAT DEFAULT 0,

    medical_condition TEXT,

    emergency_name VARCHAR(100),
    emergency_relation VARCHAR(50),
    emergency_phone VARCHAR(15),

    username VARCHAR(50) UNIQUE,
    auth_token VARCHAR(255),
    password VARCHAR(255) NOT NULL,
    role ENUM('teacher','admin') DEFAULT 'teacher',
    status VARCHAR(20) DEFAULT 'Active',
    last_login DATETIME,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. TEACHER → CLASS MAPPING
-- Which classes each teacher teaches
CREATE TABLE teacher_classes (
    id INT PRIMARY KEY AUTO_INCREMENT,
    teacher_id INT NOT NULL,
    academic_class_id INT NOT NULL,

    subject_id INT NOT NULL, -- optional if teacher teaches multiple subjects

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE CASCADE,
    FOREIGN KEY (academic_class_id) REFERENCES academic_classes(id) ON DELETE CASCADE,
    FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,

    UNIQUE KEY unique_teacher_class_subject (teacher_id, academic_class_id, subject_id)
);

-- 3. TEACHER LEAVE TABLE (MAIN TABLE)
CREATE TABLE teacher_leaves (
    id INT PRIMARY KEY AUTO_INCREMENT,

    teacher_id INT NOT NULL,

    leave_type ENUM('CL','SL') NOT NULL, -- Casual / Sick
    from_date DATE NOT NULL,
    to_date DATE NOT NULL,
    total_days INT NOT NULL,

    reason TEXT,

    status ENUM('Pending','Approved','Rejected') DEFAULT 'Pending',

    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    approved_at DATETIME,
    rejected_at DATETIME,

    approved_by INT, -- admin id (optional)

    FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE CASCADE
);

-- 4. LEAVE BALANCE TABLE
CREATE TABLE teacher_leave_balance (
    id INT PRIMARY KEY AUTO_INCREMENT,

    teacher_id INT UNIQUE,

    casual_leave INT DEFAULT 10,
    sick_leave INT DEFAULT 8,
    used_leave INT DEFAULT 0,

    FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE CASCADE
);

--5. Activity Logs
CREATE TABLE `activity_logs` (
	`id` INT NOT NULL AUTO_INCREMENT,
	`user_id` INT NULL DEFAULT NULL,
	`role` VARCHAR(50) NULL DEFAULT NULL,
	`action` VARCHAR(100) NULL DEFAULT NULL,
	`description` TEXT NULL DEFAULT NULL COLLATE,
	`student_id` INT NULL DEFAULT NULL,
	`leave_id` INT NULL DEFAULT NULL,
	`created_at` DATETIME NULL DEFAULT NULL,
	PRIMARY KEY (`id`) USING BTREE
);


-- Teacher Time table   
CREATE TABLE teacher_timetable (
    id INT PRIMARY KEY AUTO_INCREMENT,

    teacher_id INT NOT NULL,
    academic_class_id INT NOT NULL,
    subject_id INT NOT NULL,

    day ENUM(
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday'
    ) NOT NULL,

    period_no INT NOT NULL,

    start_time TIME NOT NULL,
    end_time TIME NOT NULL,

    room_no VARCHAR(30),

    is_lab BOOLEAN DEFAULT FALSE,
    is_extra_class BOOLEAN DEFAULT FALSE,

    remarks VARCHAR(255),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    -- Prevent same teacher double booked
    UNIQUE KEY uq_teacher_slot (
        teacher_id,
        day,
        start_time
    ),

    -- Prevent same class double booked
    UNIQUE KEY uq_class_slot (
        academic_class_id,
        day,
        start_time
    ),

    -- Prevent duplicate period assignment
    UNIQUE KEY uq_teacher_period (
        teacher_id,
        day,
        period_no
    ),

    FOREIGN KEY (teacher_id)
        REFERENCES teachers(id)
        ON DELETE CASCADE,

    FOREIGN KEY (academic_class_id)
        REFERENCES academic_classes(id)
        ON DELETE CASCADE,

    FOREIGN KEY (subject_id)
        REFERENCES subjects(id)
        ON DELETE CASCADE
);