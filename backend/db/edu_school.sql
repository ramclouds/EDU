-- Dumping database structure for edu_school
CREATE DATABASE IF NOT EXISTS `edu_school` 
USE `edu_school`;

-- academic_classes
CREATE TABLE IF NOT EXISTS `academic_classes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `batch_id` int NOT NULL,
  `division_id` int NOT NULL,
  `section_id` int NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_batch_division_section` (`batch_id`,`division_id`,`section_id`),
  KEY `division_id` (`division_id`),
  KEY `section_id` (`section_id`),
  CONSTRAINT `academic_classes_ibfk_1` FOREIGN KEY (`batch_id`) REFERENCES `batches` (`id`) ON DELETE CASCADE,
  CONSTRAINT `academic_classes_ibfk_2` FOREIGN KEY (`division_id`) REFERENCES `divisions` (`id`) ON DELETE CASCADE,
  CONSTRAINT `academic_classes_ibfk_3` FOREIGN KEY (`section_id`) REFERENCES `sections` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- activity_logs
CREATE TABLE IF NOT EXISTS `activity_logs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int DEFAULT NULL,
  `role` varchar(50) DEFAULT NULL,
  `action` varchar(100) DEFAULT NULL,
  `description` text,
  `student_id` int DEFAULT NULL,
  `leave_id` int DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- admins
CREATE TABLE IF NOT EXISTS `admins` (
  `id` int NOT NULL AUTO_INCREMENT,
  `admin_id` varchar(50) NOT NULL,
  `user_id` varchar(50) NOT NULL,
  `first_name` varchar(100) NOT NULL,
  `middle_name` varchar(100) DEFAULT NULL,
  `last_name` varchar(100) NOT NULL,
  `profile_image` varchar(255) DEFAULT NULL,
  `gender` enum('Male','Female','Other') DEFAULT NULL,
  `date_of_birth` date DEFAULT NULL,
  `blood_group` enum('A+','A-','B+','B-','AB+','AB-','O+','O-') DEFAULT NULL,
  `email` varchar(120) NOT NULL,
  `mobile` varchar(15) DEFAULT NULL,
  `alternate_mobile` varchar(15) DEFAULT NULL,
  `username` varchar(50) NOT NULL,
  `address` text,
  `city` varchar(100) DEFAULT NULL,
  `state` varchar(100) DEFAULT NULL,
  `country` varchar(100) DEFAULT NULL,
  `pincode` varchar(10) DEFAULT NULL,
  `role` enum('admin','super_admin') NOT NULL,
  `admin_type` enum('Super Admin','Academic Admin','Library Admin','Hostel Admin','Accounts Admin','HR Admin') NOT NULL,
  `designation` varchar(100) DEFAULT NULL,
  `department` varchar(100) DEFAULT NULL,
  `permissions` varchar(3000) DEFAULT NULL,
  `access_level` varchar(50) DEFAULT NULL,
  `qualification` varchar(150) DEFAULT NULL,
  `specialization` varchar(100) DEFAULT NULL,
  `experience_years` int DEFAULT NULL,
  `joining_date` date DEFAULT NULL,
  `employment_type` enum('Full Time','Part Time','Contract','Temporary') DEFAULT NULL,
  `shift` varchar(50) DEFAULT NULL,
  `salary` float DEFAULT NULL,
  `school_name` varchar(150) DEFAULT NULL,
  `school_code` varchar(50) DEFAULT NULL,
  `board` varchar(50) DEFAULT NULL,
  `established_year` varchar(10) DEFAULT NULL,
  `users_managed` int DEFAULT NULL,
  `active_sessions` int DEFAULT NULL,
  `modules_enabled` varchar(3000) DEFAULT NULL,
  `fee_access` tinyint(1) DEFAULT NULL,
  `discount_authority` tinyint(1) DEFAULT NULL,
  `revenue_view` tinyint(1) DEFAULT NULL,
  `two_factor_enabled` tinyint(1) DEFAULT NULL,
  `login_alerts` tinyint(1) DEFAULT NULL,
  `last_login` datetime DEFAULT NULL,
  `last_password_change` datetime DEFAULT NULL,
  `logins_30d` int DEFAULT NULL,
  `actions_count` int DEFAULT NULL,
  `last_action` varchar(255) DEFAULT NULL,
  `medical_condition` text,
  `emergency_name` varchar(100) DEFAULT NULL,
  `emergency_relation` varchar(50) DEFAULT NULL,
  `emergency_phone` varchar(15) DEFAULT NULL,
  `auth_token` varchar(255) DEFAULT NULL,
  `password` varchar(255) NOT NULL,
  `status` enum('Active','Inactive','Suspended') NOT NULL,
  `is_deleted` tinyint(1) DEFAULT NULL,
  `created_by` varchar(50) DEFAULT NULL,
  `updated_by` varchar(50) DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ix_admins_admin_id` (`admin_id`),
  UNIQUE KEY `ix_admins_user_id` (`user_id`),
  UNIQUE KEY `ix_admins_email` (`email`),
  UNIQUE KEY `ix_admins_username` (`username`),
  UNIQUE KEY `ix_admins_mobile` (`mobile`),
  KEY `idx_admin_email` (`email`),
  KEY `idx_admin_status` (`status`),
  KEY `idx_admin_username` (`username`),
  KEY `idx_admin_admin_id` (`admin_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- admin_book_issues
CREATE TABLE IF NOT EXISTS `admin_book_issues` (
  `id` int NOT NULL AUTO_INCREMENT,
  `admin_id` int NOT NULL,
  `book_id` int NOT NULL,
  `issue_date` date NOT NULL,
  `due_date` date NOT NULL,
  `return_date` date DEFAULT NULL,
  `fine_per_day` decimal(5,2) NOT NULL,
  `fine_amount` decimal(10,2) NOT NULL,
  `status` enum('Issued','Returned','Overdue') NOT NULL,
  `remarks` varchar(500) DEFAULT NULL,
  `issued_by` varchar(50) DEFAULT NULL,
  `returned_by` varchar(50) DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `ix_admin_book_issues_book_id` (`book_id`),
  KEY `ix_admin_book_issues_status` (`status`),
  KEY `ix_admin_book_issues_admin_id` (`admin_id`),
  CONSTRAINT `admin_book_issues_ibfk_1` FOREIGN KEY (`admin_id`) REFERENCES `admins` (`id`) ON DELETE CASCADE,
  CONSTRAINT `admin_book_issues_ibfk_2` FOREIGN KEY (`book_id`) REFERENCES `books` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- admin_library_fine_payments
CREATE TABLE IF NOT EXISTS `admin_library_fine_payments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `admin_id` int NOT NULL,
  `book_issue_id` int DEFAULT NULL,
  `amount` decimal(10,2) NOT NULL,
  `payment_method` varchar(30) NOT NULL,
  `reference_no` varchar(100) DEFAULT NULL,
  `remarks` varchar(500) DEFAULT NULL,
  `status` enum('Collected','Waived','Refunded') NOT NULL,
  `collected_by` varchar(50) DEFAULT NULL,
  `collected_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `ix_admin_library_fine_payments_admin_id` (`admin_id`),
  KEY `ix_admin_library_fine_payments_status` (`status`),
  KEY `ix_admin_library_fine_payments_book_issue_id` (`book_issue_id`),
  CONSTRAINT `admin_library_fine_payments_ibfk_1` FOREIGN KEY (`admin_id`) REFERENCES `admins` (`id`) ON DELETE CASCADE,
  CONSTRAINT `admin_library_fine_payments_ibfk_2` FOREIGN KEY (`book_issue_id`) REFERENCES `admin_book_issues` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- announcements
CREATE TABLE IF NOT EXISTS `announcements` (
  `id` int NOT NULL AUTO_INCREMENT,
  `title` varchar(255) NOT NULL,
  `description` text NOT NULL,
  `category` enum('Academic','Examination','Holiday','Event','General') DEFAULT NULL,
  `priority` enum('High','Medium','Low') DEFAULT NULL,
  `notice_date` date NOT NULL,
  `expiry_date` date DEFAULT NULL,
  `audience` enum('All','Students','Teachers','Admins','Staff') DEFAULT NULL,
  `academic_class_id` int DEFAULT NULL,
  `created_by` int DEFAULT NULL,
  `created_role` enum('admin','teacher') DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- announcement_reads
CREATE TABLE IF NOT EXISTS `announcement_reads` (
  `id` int NOT NULL AUTO_INCREMENT,
  `notice_id` int DEFAULT NULL,
  `student_id` int DEFAULT NULL,
  `teacher_id` int DEFAULT NULL,
  `admin_id` int DEFAULT NULL,
  `is_read` tinyint(1) DEFAULT NULL,
  `read_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `notice_id` (`notice_id`),
  KEY `student_id` (`student_id`),
  KEY `teacher_id` (`teacher_id`),
  KEY `admin_id` (`admin_id`),
  CONSTRAINT `announcement_reads_ibfk_1` FOREIGN KEY (`notice_id`) REFERENCES `announcements` (`id`),
  CONSTRAINT `announcement_reads_ibfk_2` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`),
  CONSTRAINT `announcement_reads_ibfk_3` FOREIGN KEY (`teacher_id`) REFERENCES `teachers` (`id`),
  CONSTRAINT `announcement_reads_ibfk_4` FOREIGN KEY (`admin_id`) REFERENCES `admins` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- assets
CREATE TABLE IF NOT EXISTS `assets` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `asset_id` varchar(50) NOT NULL,
  `asset_code` varchar(50) NOT NULL,
  `asset_name` varchar(150) NOT NULL,
  `asset_description` text,
  `category` varchar(100) NOT NULL,
  `sub_category` varchar(100) DEFAULT NULL,
  `brand` varchar(100) DEFAULT NULL,
  `model_number` varchar(100) DEFAULT NULL,
  `serial_number` varchar(150) DEFAULT NULL,
  `barcode` varchar(150) DEFAULT NULL,
  `qr_code` varchar(255) DEFAULT NULL,
  `purchase_date` date DEFAULT NULL,
  `purchase_cost` float DEFAULT NULL,
  `vendor_name` varchar(150) DEFAULT NULL,
  `invoice_number` varchar(100) DEFAULT NULL,
  `warranty_start_date` date DEFAULT NULL,
  `warranty_end_date` date DEFAULT NULL,
  `depreciation_method` varchar(50) DEFAULT NULL,
  `depreciation_rate` float DEFAULT NULL,
  `current_book_value` float DEFAULT NULL,
  `location` varchar(150) DEFAULT NULL,
  `building_name` varchar(100) DEFAULT NULL,
  `floor_number` varchar(50) DEFAULT NULL,
  `room_number` varchar(50) DEFAULT NULL,
  `condition_status` varchar(50) DEFAULT NULL,
  `status` varchar(50) DEFAULT NULL,
  `assigned_to_admin_id` varchar(50) DEFAULT NULL,
  `last_maintenance_date` date DEFAULT NULL,
  `next_maintenance_date` date DEFAULT NULL,
  `maintenance_notes` text,
  `insurance_provider` varchar(150) DEFAULT NULL,
  `insurance_policy_number` varchar(100) DEFAULT NULL,
  `insurance_expiry_date` date DEFAULT NULL,
  `asset_image` varchar(255) DEFAULT NULL,
  `remarks` text,
  `vehicle_number` varchar(100) DEFAULT NULL,
  `vehicle_type` varchar(100) DEFAULT NULL,
  `registration_number` varchar(100) DEFAULT NULL,
  `fuel_type` varchar(50) DEFAULT NULL,
  `engine_number` varchar(100) DEFAULT NULL,
  `chassis_number` varchar(100) DEFAULT NULL,
  `insurance_expiry` date DEFAULT NULL,
  `processor` varchar(100) DEFAULT NULL,
  `ram` varchar(100) DEFAULT NULL,
  `storage` varchar(100) DEFAULT NULL,
  `operating_system` varchar(100) DEFAULT NULL,
  `material` varchar(100) DEFAULT NULL,
  `color` varchar(100) DEFAULT NULL,
  `dimensions` varchar(100) DEFAULT NULL,
  `calibration_date` date DEFAULT NULL,
  `equipment_accuracy` varchar(100) DEFAULT NULL,
  `school_name` varchar(150) DEFAULT NULL,
  `school_code` varchar(50) DEFAULT NULL,
  `created_by` varchar(50) DEFAULT NULL,
  `updated_by` varchar(50) DEFAULT NULL,
  `is_deleted` tinyint(1) DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `asset_id` (`asset_id`),
  UNIQUE KEY `asset_code` (`asset_code`),
  UNIQUE KEY `serial_number` (`serial_number`),
  KEY `assigned_to_admin_id` (`assigned_to_admin_id`),
  CONSTRAINT `assets_ibfk_1` FOREIGN KEY (`assigned_to_admin_id`) REFERENCES `admins` (`admin_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- asset_history
CREATE TABLE IF NOT EXISTS `asset_history` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `asset_id` varchar(100) DEFAULT NULL,
  `asset_code` varchar(100) DEFAULT NULL,
  `action` varchar(50) DEFAULT NULL,
  `performed_by` varchar(100) DEFAULT NULL,
  `action_time` datetime DEFAULT NULL,
  `snapshot` json DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- assignments
CREATE TABLE IF NOT EXISTS `assignments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `academic_class_id` int NOT NULL,
  `subject_id` int NOT NULL,
  `title` varchar(255) NOT NULL,
  `description` text,
  `assigned_date` date NOT NULL,
  `due_date` date NOT NULL,
  `total_marks` int DEFAULT NULL,
  `created_by` int NOT NULL,
  `created_at` datetime DEFAULT (now()),
  `updated_at` datetime DEFAULT (now()),
  PRIMARY KEY (`id`),
  KEY `academic_class_id` (`academic_class_id`),
  KEY `subject_id` (`subject_id`),
  KEY `created_by` (`created_by`),
  CONSTRAINT `assignments_ibfk_1` FOREIGN KEY (`academic_class_id`) REFERENCES `academic_classes` (`id`) ON DELETE CASCADE,
  CONSTRAINT `assignments_ibfk_2` FOREIGN KEY (`subject_id`) REFERENCES `subjects` (`id`) ON DELETE CASCADE,
  CONSTRAINT `assignments_ibfk_3` FOREIGN KEY (`created_by`) REFERENCES `teachers` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- assignment_files
CREATE TABLE IF NOT EXISTS `assignment_files` (
  `id` int NOT NULL AUTO_INCREMENT,
  `assignment_id` int NOT NULL,
  `file_name` varchar(255) DEFAULT NULL,
  `file_url` text NOT NULL,
  PRIMARY KEY (`id`),
  KEY `assignment_id` (`assignment_id`),
  CONSTRAINT `assignment_files_ibfk_1` FOREIGN KEY (`assignment_id`) REFERENCES `assignments` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- assignment_submissions
CREATE TABLE IF NOT EXISTS `assignment_submissions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `assignment_id` int NOT NULL,
  `student_id` int NOT NULL,
  `submission_file_url` text,
  `status` enum('New','Submitted','Late','Needs Resubmission') DEFAULT NULL,
  `submitted_at` datetime DEFAULT NULL,
  `marks_obtained` decimal(5,2) DEFAULT NULL,
  `feedback` text,
  `graded_by` int DEFAULT NULL,
  `graded_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `assignment_id` (`assignment_id`),
  KEY `student_id` (`student_id`),
  KEY `graded_by` (`graded_by`),
  CONSTRAINT `assignment_submissions_ibfk_1` FOREIGN KEY (`assignment_id`) REFERENCES `assignments` (`id`) ON DELETE CASCADE,
  CONSTRAINT `assignment_submissions_ibfk_2` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE,
  CONSTRAINT `assignment_submissions_ibfk_3` FOREIGN KEY (`graded_by`) REFERENCES `teachers` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- attendance_audit
CREATE TABLE IF NOT EXISTS `attendance_audit` (
  `id` int NOT NULL AUTO_INCREMENT,
  `attendance_record_id` int NOT NULL,
  `old_status` varchar(20) DEFAULT NULL,
  `new_status` varchar(20) DEFAULT NULL,
  `changed_by_role` varchar(20) DEFAULT NULL,
  `changed_by_user_id` int DEFAULT NULL,
  `created_at` datetime DEFAULT (now()),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- attendance_records
CREATE TABLE IF NOT EXISTS `attendance_records` (
  `id` int NOT NULL AUTO_INCREMENT,
  `session_id` int NOT NULL,
  `student_id` int NOT NULL,
  `status` enum('Present','Absent','Late') NOT NULL,
  `remarks` text,
  `marked_by_role` enum('Teacher','Admin') NOT NULL,
  `marked_by_user_id` int DEFAULT NULL,
  `updated_at` datetime DEFAULT (now()),
  `created_at` datetime DEFAULT (now()),
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_student_session` (`session_id`,`student_id`),
  KEY `student_id` (`student_id`),
  CONSTRAINT `attendance_records_ibfk_1` FOREIGN KEY (`session_id`) REFERENCES `attendance_sessions` (`id`) ON DELETE CASCADE,
  CONSTRAINT `attendance_records_ibfk_2` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- attendance_sessions
CREATE TABLE IF NOT EXISTS `attendance_sessions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `academic_class_id` int NOT NULL,
  `session_date` date NOT NULL,
  `teacher_id` int DEFAULT NULL,
  `marked_by_role` enum('Teacher','Admin') NOT NULL,
  `marked_by_user_id` int DEFAULT NULL,
  `updated_at` datetime DEFAULT (now()),
  `created_at` datetime DEFAULT (now()),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_attendance_session` (`academic_class_id`,`session_date`),
  KEY `teacher_id` (`teacher_id`),
  CONSTRAINT `attendance_sessions_ibfk_1` FOREIGN KEY (`academic_class_id`) REFERENCES `academic_classes` (`id`),
  CONSTRAINT `attendance_sessions_ibfk_2` FOREIGN KEY (`teacher_id`) REFERENCES `teachers` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- batches
CREATE TABLE IF NOT EXISTS `batches` (
  `id` int NOT NULL AUTO_INCREMENT,
  `batch_name` varchar(20) NOT NULL,
  `start_date` date DEFAULT NULL,
  `end_date` date DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `batch_name` (`batch_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- beds
CREATE TABLE IF NOT EXISTS `beds` (
  `id` int NOT NULL AUTO_INCREMENT,
  `room_id` int NOT NULL,
  `bed_number` varchar(10) NOT NULL,
  `bed_type` enum('Standard','Premium') DEFAULT NULL,
  `status` enum('Vacant','Occupied','Maintenance','Reserved') NOT NULL,
  `created_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_bed_room_number` (`room_id`,`bed_number`),
  CONSTRAINT `beds_ibfk_1` FOREIGN KEY (`room_id`) REFERENCES `rooms` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- books
CREATE TABLE IF NOT EXISTS `books` (
  `id` int NOT NULL AUTO_INCREMENT,
  `book_code` varchar(30) DEFAULT NULL,
  `title` varchar(255) NOT NULL,
  `author` varchar(150) DEFAULT NULL,
  `author_id` int DEFAULT NULL,
  `category` varchar(100) DEFAULT NULL,
  `category_id` int DEFAULT NULL,
  `isbn` varchar(30) DEFAULT NULL,
  `total_copies` int NOT NULL,
  `available_copies` int NOT NULL,
  `shelf_no` varchar(50) NOT NULL,
  `publisher` varchar(150) DEFAULT NULL,
  `published_year` int DEFAULT NULL,
  `language` varchar(50) DEFAULT NULL,
  `description` text,
  `status` enum('Available','Unavailable','Inactive') NOT NULL,
  `is_deleted` tinyint(1) NOT NULL,
  `created_by` varchar(50) DEFAULT NULL,
  `updated_by` varchar(50) DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ix_books_book_code` (`book_code`),
  UNIQUE KEY `ix_books_isbn` (`isbn`),
  KEY `ix_books_is_deleted` (`is_deleted`),
  KEY `ix_books_author_id` (`author_id`),
  KEY `ix_books_title` (`title`),
  KEY `ix_books_category_id` (`category_id`),
  KEY `ix_books_status` (`status`),
  CONSTRAINT `books_ibfk_1` FOREIGN KEY (`author_id`) REFERENCES `book_authors` (`id`) ON DELETE SET NULL,
  CONSTRAINT `books_ibfk_2` FOREIGN KEY (`category_id`) REFERENCES `book_categories` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- book_authors
CREATE TABLE IF NOT EXISTS `book_authors` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(150) NOT NULL,
  `slug` varchar(180) NOT NULL,
  `country` varchar(100) DEFAULT NULL,
  `biography` text,
  `status` enum('Active','Inactive') NOT NULL DEFAULT 'Active',
  `is_deleted` tinyint(1) NOT NULL DEFAULT '0',
  `created_by` varchar(50) DEFAULT NULL,
  `updated_by` varchar(50) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_book_authors_name` (`name`),
  UNIQUE KEY `uq_book_authors_slug` (`slug`),
  KEY `idx_book_author_status_deleted` (`status`,`is_deleted`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- book_categories
CREATE TABLE IF NOT EXISTS `book_categories` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `slug` varchar(120) NOT NULL,
  `description` text,
  `status` enum('Active','Inactive') NOT NULL,
  `display_order` int NOT NULL,
  `is_deleted` tinyint(1) NOT NULL,
  `created_by` varchar(50) DEFAULT NULL,
  `updated_by` varchar(50) DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ix_book_categories_name` (`name`),
  UNIQUE KEY `ix_book_categories_slug` (`slug`),
  KEY `ix_book_categories_status` (`status`),
  KEY `ix_book_categories_is_deleted` (`is_deleted`),
  KEY `idx_book_category_status_deleted` (`status`,`is_deleted`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- book_issues
CREATE TABLE IF NOT EXISTS `book_issues` (
  `id` int NOT NULL AUTO_INCREMENT,
  `student_id` int NOT NULL,
  `book_id` int NOT NULL,
  `issue_date` date NOT NULL,
  `due_date` date NOT NULL,
  `return_date` date DEFAULT NULL,
  `fine_per_day` decimal(5,2) DEFAULT NULL,
  `fine_amount` decimal(10,2) DEFAULT NULL,
  `status` enum('Issued','Returned','Overdue') DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `student_id` (`student_id`),
  KEY `book_id` (`book_id`),
  CONSTRAINT `book_issues_ibfk_1` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`),
  CONSTRAINT `book_issues_ibfk_2` FOREIGN KEY (`book_id`) REFERENCES `books` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- divisions
CREATE TABLE IF NOT EXISTS `divisions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `division_name` varchar(20) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `division_name` (`division_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- exams
CREATE TABLE IF NOT EXISTS `exams` (
  `id` int NOT NULL AUTO_INCREMENT,
  `academic_class_id` int NOT NULL,
  `academic_year` varchar(20) NOT NULL,
  `exam_name` varchar(100) NOT NULL,
  `exam_type` varchar(50) DEFAULT NULL,
  `start_date` date DEFAULT NULL,
  `end_date` date DEFAULT NULL,
  `is_published` tinyint(1) DEFAULT NULL,
  `is_verified` tinyint(1) DEFAULT NULL,
  `marks_entry_enabled` tinyint(1) NOT NULL DEFAULT '0',
  `publish_at` datetime DEFAULT NULL,
  `published_at` datetime DEFAULT NULL,
  `verified_at` datetime DEFAULT NULL,
  `verified_by` int DEFAULT NULL,
  `created_at` datetime DEFAULT (now()),
  `updated_at` datetime DEFAULT (now()),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_exam` (`academic_class_id`,`academic_year`,`exam_name`),
  KEY `verified_by` (`verified_by`),
  KEY `ix_exams_academic_class_id` (`academic_class_id`),
  KEY `ix_exams_academic_year` (`academic_year`),
  CONSTRAINT `exams_ibfk_1` FOREIGN KEY (`academic_class_id`) REFERENCES `academic_classes` (`id`),
  CONSTRAINT `exams_ibfk_2` FOREIGN KEY (`verified_by`) REFERENCES `teachers` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- exam_results
CREATE TABLE IF NOT EXISTS `exam_results` (
  `id` int NOT NULL AUTO_INCREMENT,
  `student_id` int NOT NULL,
  `exam_id` int NOT NULL,
  `subject_id` int NOT NULL,
  `internal_marks` float DEFAULT NULL,
  `external_marks` float DEFAULT NULL,
  `oral_marks` float DEFAULT NULL,
  `practical_marks` float DEFAULT NULL,
  `internal_out_of` float DEFAULT NULL,
  `external_out_of` float DEFAULT NULL,
  `oral_out_of` float DEFAULT NULL,
  `practical_out_of` float DEFAULT NULL,
  `total_marks` float DEFAULT NULL,
  `percentage` float DEFAULT NULL,
  `grade` varchar(5) DEFAULT NULL,
  `status` varchar(20) DEFAULT NULL,
  `remarks` text,
  `created_by` int DEFAULT NULL,
  `created_at` datetime DEFAULT (now()),
  `updated_at` datetime DEFAULT (now()),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_student_exam_subject` (`student_id`,`exam_id`,`subject_id`),
  KEY `created_by` (`created_by`),
  KEY `ix_exam_results_student_id` (`student_id`),
  KEY `ix_exam_results_subject_id` (`subject_id`),
  KEY `ix_exam_results_exam_id` (`exam_id`),
  CONSTRAINT `exam_results_ibfk_1` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`),
  CONSTRAINT `exam_results_ibfk_2` FOREIGN KEY (`exam_id`) REFERENCES `exams` (`id`),
  CONSTRAINT `exam_results_ibfk_3` FOREIGN KEY (`subject_id`) REFERENCES `subjects` (`id`),
  CONSTRAINT `exam_results_ibfk_4` FOREIGN KEY (`created_by`) REFERENCES `teachers` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- exam_result_audit
CREATE TABLE IF NOT EXISTS `exam_result_audit` (
  `id` int NOT NULL AUTO_INCREMENT,
  `result_id` int DEFAULT NULL,
  `updated_by` int DEFAULT NULL,
  `old_total` float DEFAULT NULL,
  `new_total` float DEFAULT NULL,
  `action` varchar(50) DEFAULT NULL,
  `created_at` datetime DEFAULT (now()),
  PRIMARY KEY (`id`),
  KEY `result_id` (`result_id`),
  KEY `updated_by` (`updated_by`),
  CONSTRAINT `exam_result_audit_ibfk_1` FOREIGN KEY (`result_id`) REFERENCES `exam_results` (`id`),
  CONSTRAINT `exam_result_audit_ibfk_2` FOREIGN KEY (`updated_by`) REFERENCES `teachers` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- exam_subjects
CREATE TABLE IF NOT EXISTS `exam_subjects` (
  `id` int NOT NULL AUTO_INCREMENT,
  `exam_id` int NOT NULL,
  `subject_id` int NOT NULL,
  `internal_max` float DEFAULT NULL,
  `external_max` float DEFAULT NULL,
  `oral_max` float DEFAULT NULL,
  `practical_max` float DEFAULT NULL,
  `passing_marks` float DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_exam_subject` (`exam_id`,`subject_id`),
  KEY `subject_id` (`subject_id`),
  CONSTRAINT `exam_subjects_ibfk_1` FOREIGN KEY (`exam_id`) REFERENCES `exams` (`id`),
  CONSTRAINT `exam_subjects_ibfk_2` FOREIGN KEY (`subject_id`) REFERENCES `subjects` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- hostels
CREATE TABLE IF NOT EXISTS `hostels` (
  `id` int NOT NULL AUTO_INCREMENT,
  `hostel_name` varchar(100) NOT NULL,
  `hostel_type` enum('Boys','Girls','Co-ed') DEFAULT NULL,
  `address` varchar(255) DEFAULT NULL,
  `status` enum('Active','Inactive') NOT NULL,
  `created_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `hostel_name` (`hostel_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- hostel_allocations
CREATE TABLE IF NOT EXISTS `hostel_allocations` (
  `id` int NOT NULL AUTO_INCREMENT,
  `student_id` int DEFAULT NULL,
  `bed_id` int NOT NULL,
  `check_in_date` date DEFAULT NULL,
  `check_out_date` date DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `student_id` (`student_id`),
  KEY `bed_id` (`bed_id`),
  CONSTRAINT `hostel_allocations_ibfk_1` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE,
  CONSTRAINT `hostel_allocations_ibfk_2` FOREIGN KEY (`bed_id`) REFERENCES `beds` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- hostel_attendance
CREATE TABLE IF NOT EXISTS `hostel_attendance` (
  `id` int NOT NULL AUTO_INCREMENT,
  `student_id` int NOT NULL,
  `attendance_date` date NOT NULL,
  `status` enum('Present','Absent','On Leave','Late Entry') NOT NULL,
  `check_in_time` datetime DEFAULT NULL,
  `remarks` varchar(255) DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_attendance_student_date` (`student_id`,`attendance_date`),
  CONSTRAINT `hostel_attendance_ibfk_1` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- hostel_blocks
CREATE TABLE IF NOT EXISTS `hostel_blocks` (
  `id` int NOT NULL AUTO_INCREMENT,
  `hostel_id` int NOT NULL,
  `block_name` varchar(10) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `status` enum('Active','Inactive') NOT NULL,
  `created_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_block_hostel_name` (`hostel_id`,`block_name`),
  CONSTRAINT `hostel_blocks_ibfk_1` FOREIGN KEY (`hostel_id`) REFERENCES `hostels` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- hostel_complaints
CREATE TABLE IF NOT EXISTS `hostel_complaints` (
  `id` int NOT NULL AUTO_INCREMENT,
  `student_id` int DEFAULT NULL,
  `room_id` int DEFAULT NULL,
  `issue` text,
  `status` enum('Pending','In Progress','Resolved') DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `student_id` (`student_id`),
  KEY `room_id` (`room_id`),
  CONSTRAINT `hostel_complaints_ibfk_1` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE,
  CONSTRAINT `hostel_complaints_ibfk_2` FOREIGN KEY (`room_id`) REFERENCES `rooms` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- hostel_fees
CREATE TABLE IF NOT EXISTS `hostel_fees` (
  `id` int NOT NULL AUTO_INCREMENT,
  `student_id` int DEFAULT NULL,
  `amount` decimal(10,2) DEFAULT NULL,
  `status` enum('Pending','Paid','Overdue') DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `student_id` (`student_id`),
  CONSTRAINT `hostel_fees_ibfk_1` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- hostel_floors
CREATE TABLE IF NOT EXISTS `hostel_floors` (
  `id` int NOT NULL AUTO_INCREMENT,
  `block_id` int NOT NULL,
  `floor_number` int NOT NULL,
  `floor_name` varchar(50) DEFAULT NULL,
  `status` enum('Active','Inactive') NOT NULL,
  `created_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_floor_block_number` (`block_id`,`floor_number`),
  CONSTRAINT `hostel_floors_ibfk_1` FOREIGN KEY (`block_id`) REFERENCES `hostel_blocks` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- hostel_leave_requests
CREATE TABLE IF NOT EXISTS `hostel_leave_requests` (
  `id` int NOT NULL AUTO_INCREMENT,
  `student_id` int NOT NULL,
  `leave_type` enum('Weekend Leave','Medical Leave','Emergency Leave','Other') NOT NULL,
  `from_date` date NOT NULL,
  `to_date` date NOT NULL,
  `reason` varchar(255) DEFAULT NULL,
  `status` enum('Pending','Approved','Rejected','Returned') NOT NULL,
  `actual_return_date` date DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `student_id` (`student_id`),
  CONSTRAINT `hostel_leave_requests_ibfk_1` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- hostel_movements
CREATE TABLE IF NOT EXISTS `hostel_movements` (
  `id` int NOT NULL AUTO_INCREMENT,
  `student_id` int NOT NULL,
  `check_out_time` datetime NOT NULL,
  `expected_return_time` datetime DEFAULT NULL,
  `check_in_time` datetime DEFAULT NULL,
  `purpose` varchar(255) DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `student_id` (`student_id`),
  CONSTRAINT `hostel_movements_ibfk_1` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- hostel_staff
CREATE TABLE IF NOT EXISTS `hostel_staff` (
  `id` int NOT NULL AUTO_INCREMENT,
  `staff_code` varchar(20) NOT NULL,
  `first_name` varchar(100) NOT NULL,
  `middle_name` varchar(100) DEFAULT NULL,
  `last_name` varchar(100) DEFAULT NULL,
  `role` enum('Warden','Security Guard','Cleaner','Cook','Maintenance','Other') NOT NULL,
  `block_id` int DEFAULT NULL,
  `shift` enum('Morning','Evening','Night') DEFAULT NULL,
  `mobile` varchar(15) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `status` enum('Active','On Leave','Inactive') NOT NULL,
  `created_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `staff_code` (`staff_code`),
  KEY `block_id` (`block_id`),
  CONSTRAINT `hostel_staff_ibfk_1` FOREIGN KEY (`block_id`) REFERENCES `hostel_blocks` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- hostel_visitors
CREATE TABLE IF NOT EXISTS `hostel_visitors` (
  `id` int NOT NULL AUTO_INCREMENT,
  `visitor_code` varchar(20) NOT NULL,
  `visitor_name` varchar(150) NOT NULL,
  `visitor_mobile` varchar(15) DEFAULT NULL,
  `student_id` int NOT NULL,
  `relation` enum('Parent','Guardian','Friend','Relative','Other') NOT NULL,
  `purpose` varchar(255) DEFAULT NULL,
  `status` enum('Pending','Approved','Rejected','Checked Out') NOT NULL,
  `check_in_time` datetime DEFAULT NULL,
  `check_out_time` datetime DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `visitor_code` (`visitor_code`),
  KEY `student_id` (`student_id`),
  CONSTRAINT `hostel_visitors_ibfk_1` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- library_fine_payments
CREATE TABLE IF NOT EXISTS `library_fine_payments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `student_id` int NOT NULL,
  `book_issue_id` int DEFAULT NULL,
  `amount` decimal(10,2) NOT NULL,
  `payment_method` varchar(30) NOT NULL,
  `reference_no` varchar(100) DEFAULT NULL,
  `remarks` varchar(500) DEFAULT NULL,
  `status` enum('Collected','Waived','Refunded') NOT NULL,
  `collected_by` varchar(50) DEFAULT NULL,
  `collected_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `ix_library_fine_payments_student_id` (`student_id`),
  KEY `ix_library_fine_payments_status` (`status`),
  KEY `ix_library_fine_payments_book_issue_id` (`book_issue_id`),
  CONSTRAINT `library_fine_payments_ibfk_1` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`),
  CONSTRAINT `library_fine_payments_ibfk_2` FOREIGN KEY (`book_issue_id`) REFERENCES `book_issues` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- non_teaching_staff
CREATE TABLE IF NOT EXISTS `non_teaching_staff` (
  `id` int NOT NULL AUTO_INCREMENT,
  `staff_id` varchar(50) NOT NULL,
  `user_id` varchar(50) NOT NULL,
  `first_name` varchar(100) NOT NULL,
  `middle_name` varchar(100) DEFAULT NULL,
  `last_name` varchar(100) NOT NULL,
  `profile_image` varchar(255) DEFAULT NULL,
  `gender` enum('Male','Female','Other') DEFAULT NULL,
  `date_of_birth` date DEFAULT NULL,
  `blood_group` enum('A+','A-','B+','B-','AB+','AB-','O+','O-') DEFAULT NULL,
  `email` varchar(120) NOT NULL,
  `mobile` varchar(15) DEFAULT NULL,
  `alternate_mobile` varchar(15) DEFAULT NULL,
  `username` varchar(50) NOT NULL,
  `address` text,
  `city` varchar(100) DEFAULT NULL,
  `state` varchar(100) DEFAULT NULL,
  `country` varchar(100) NOT NULL,
  `pincode` varchar(10) DEFAULT NULL,
  `department` varchar(100) NOT NULL,
  `designation` varchar(100) NOT NULL,
  `staff_type` enum('Clerk','Accountant','Librarian','Lab Assistant','Receptionist','Office Assistant','Peon','Security','Driver','Cleaner','Maintenance','Nurse','Counsellor','Other') NOT NULL,
  `qualification` varchar(150) DEFAULT NULL,
  `specialization` varchar(100) DEFAULT NULL,
  `experience_years` int NOT NULL,
  `joining_date` date DEFAULT NULL,
  `employment_type` enum('Full Time','Part Time','Contract','Temporary') NOT NULL,
  `shift` varchar(50) DEFAULT NULL,
  `salary` float DEFAULT NULL,
  `medical_condition` text,
  `emergency_name` varchar(100) DEFAULT NULL,
  `emergency_relation` varchar(50) DEFAULT NULL,
  `emergency_phone` varchar(15) DEFAULT NULL,
  `role` enum('staff') NOT NULL,
  `password` varchar(255) NOT NULL,
  `auth_token` varchar(255) DEFAULT NULL,
  `status` enum('Active','Inactive','Suspended') NOT NULL,
  `last_login` datetime DEFAULT NULL,
  `is_deleted` tinyint(1) NOT NULL,
  `created_by` varchar(50) DEFAULT NULL,
  `updated_by` varchar(50) DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ix_non_teaching_staff_user_id` (`user_id`),
  UNIQUE KEY `ix_non_teaching_staff_staff_id` (`staff_id`),
  UNIQUE KEY `ix_non_teaching_staff_email` (`email`),
  UNIQUE KEY `ix_non_teaching_staff_username` (`username`),
  UNIQUE KEY `ix_non_teaching_staff_mobile` (`mobile`),
  KEY `idx_non_teaching_staff_deleted` (`is_deleted`),
  KEY `ix_non_teaching_staff_department` (`department`),
  KEY `idx_non_teaching_staff_department_status` (`department`,`status`),
  KEY `ix_non_teaching_staff_staff_type` (`staff_type`),
  KEY `ix_non_teaching_staff_status` (`status`),
  KEY `ix_non_teaching_staff_is_deleted` (`is_deleted`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- notifications
CREATE TABLE IF NOT EXISTS `notifications` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int DEFAULT NULL,
  `role` varchar(50) NOT NULL,
  `recipient_name` varchar(255) DEFAULT NULL,
  `recipient_code` varchar(100) DEFAULT NULL,
  `recipient_email` varchar(255) DEFAULT NULL,
  `recipient_mobile` varchar(30) DEFAULT NULL,
  `title` varchar(255) NOT NULL,
  `message` text NOT NULL,
  `type` varchar(50) DEFAULT NULL,
  `channel` varchar(30) NOT NULL,
  `delivery_status` varchar(30) NOT NULL,
  `failure_reason` varchar(500) DEFAULT NULL,
  `retry_count` int NOT NULL,
  `scheduled_at` datetime DEFAULT NULL,
  `sent_at` datetime DEFAULT NULL,
  `book_issue_id` int DEFAULT NULL,
  `book_id` int DEFAULT NULL,
  `student_id` int DEFAULT NULL,
  `teacher_id` int DEFAULT NULL,
  `staff_id` int DEFAULT NULL,
  `leave_id` int DEFAULT NULL,
  `created_by` varchar(100) DEFAULT NULL,
  `is_read` tinyint(1) NOT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `ix_notifications_user_id` (`user_id`),
  KEY `ix_notifications_book_id` (`book_id`),
  KEY `ix_notifications_created_at` (`created_at`),
  KEY `ix_notifications_delivery_status` (`delivery_status`),
  KEY `ix_notifications_type` (`type`),
  KEY `ix_notifications_book_issue_id` (`book_issue_id`),
  KEY `ix_notifications_is_read` (`is_read`),
  KEY `ix_notifications_role` (`role`),
  KEY `ix_notifications_channel` (`channel`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- rbac_audit_logs
CREATE TABLE IF NOT EXISTS `rbac_audit_logs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `actor_type` varchar(20) DEFAULT NULL,
  `actor_id` int DEFAULT NULL,
  `action` varchar(100) NOT NULL,
  `entity_type` varchar(50) NOT NULL,
  `entity_id` varchar(100) DEFAULT NULL,
  `details` json DEFAULT NULL,
  `ip_address` varchar(64) DEFAULT NULL,
  `user_agent` varchar(500) DEFAULT NULL,
  `created_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `ix_rbac_audit_logs_created_at` (`created_at`),
  KEY `ix_rbac_audit_logs_action` (`action`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- rbac_modules
CREATE TABLE IF NOT EXISTS `rbac_modules` (
  `id` int NOT NULL AUTO_INCREMENT,
  `code` varchar(100) NOT NULL,
  `name` varchar(150) NOT NULL,
  `category` varchar(100) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `sort_order` int NOT NULL,
  `is_active` tinyint(1) NOT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ix_rbac_modules_code` (`code`),
  KEY `ix_rbac_modules_is_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- rbac_roles
CREATE TABLE IF NOT EXISTS `rbac_roles` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(120) NOT NULL,
  `code` varchar(100) NOT NULL,
  `description` varchar(500) DEFAULT NULL,
  `user_type` varchar(20) NOT NULL,
  `is_system` tinyint(1) NOT NULL,
  `is_active` tinyint(1) NOT NULL,
  `created_by` varchar(100) DEFAULT NULL,
  `updated_by` varchar(100) DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ix_rbac_roles_code` (`code`),
  KEY `ix_rbac_roles_is_active` (`is_active`),
  KEY `ix_rbac_roles_user_type` (`user_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- rbac_role_permissions
CREATE TABLE IF NOT EXISTS `rbac_role_permissions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `role_id` int NOT NULL,
  `module_id` int NOT NULL,
  `can_view` tinyint(1) NOT NULL,
  `can_create` tinyint(1) NOT NULL,
  `can_edit` tinyint(1) NOT NULL,
  `can_delete` tinyint(1) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_rbac_role_module` (`role_id`,`module_id`),
  KEY `ix_rbac_role_permissions_role_id` (`role_id`),
  KEY `ix_rbac_role_permissions_module_id` (`module_id`),
  CONSTRAINT `rbac_role_permissions_ibfk_1` FOREIGN KEY (`role_id`) REFERENCES `rbac_roles` (`id`) ON DELETE CASCADE,
  CONSTRAINT `rbac_role_permissions_ibfk_2` FOREIGN KEY (`module_id`) REFERENCES `rbac_modules` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- rbac_user_permission_overrides
CREATE TABLE IF NOT EXISTS `rbac_user_permission_overrides` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_type` varchar(20) NOT NULL,
  `user_id` int NOT NULL,
  `module_id` int NOT NULL,
  `can_view` tinyint(1) DEFAULT NULL,
  `can_create` tinyint(1) DEFAULT NULL,
  `can_edit` tinyint(1) DEFAULT NULL,
  `can_delete` tinyint(1) DEFAULT NULL,
  `is_temporary` tinyint(1) NOT NULL,
  `expires_at` datetime DEFAULT NULL,
  `access_reason` varchar(500) DEFAULT NULL,
  `updated_by` varchar(100) DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_rbac_user_module_override` (`user_type`,`user_id`,`module_id`),
  KEY `ix_rbac_user_permission_overrides_is_temporary` (`is_temporary`),
  KEY `ix_rbac_user_permission_overrides_expires_at` (`expires_at`),
  KEY `ix_rbac_user_permission_overrides_user_id` (`user_id`),
  KEY `ix_rbac_user_permission_overrides_user_type` (`user_type`),
  KEY `ix_rbac_user_permission_overrides_module_id` (`module_id`),
  CONSTRAINT `rbac_user_permission_overrides_ibfk_1` FOREIGN KEY (`module_id`) REFERENCES `rbac_modules` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- rbac_user_roles
CREATE TABLE IF NOT EXISTS `rbac_user_roles` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_type` varchar(20) NOT NULL,
  `user_id` int NOT NULL,
  `role_id` int NOT NULL,
  `assigned_by` varchar(100) DEFAULT NULL,
  `assigned_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_rbac_user_role` (`user_type`,`user_id`),
  KEY `ix_rbac_user_roles_user_id` (`user_id`),
  KEY `ix_rbac_user_roles_user_type` (`user_type`),
  KEY `ix_rbac_user_roles_role_id` (`role_id`),
  CONSTRAINT `rbac_user_roles_ibfk_1` FOREIGN KEY (`role_id`) REFERENCES `rbac_roles` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- rooms
CREATE TABLE IF NOT EXISTS `rooms` (
  `id` int NOT NULL AUTO_INCREMENT,
  `floor_id` int NOT NULL,
  `room_number` varchar(10) NOT NULL,
  `room_type` enum('Single','Double','Triple','Dorm') DEFAULT NULL,
  `status` enum('Active','Maintenance','Inactive') NOT NULL,
  `monthly_rent` decimal(10,2) DEFAULT NULL,
  `description` varchar(255) DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_room_floor_number` (`floor_id`,`room_number`),
  CONSTRAINT `rooms_ibfk_1` FOREIGN KEY (`floor_id`) REFERENCES `hostel_floors` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- room_wardens
CREATE TABLE IF NOT EXISTS `room_wardens` (
  `id` int NOT NULL AUTO_INCREMENT,
  `room_id` int DEFAULT NULL,
  `warden_id` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `room_id` (`room_id`),
  KEY `warden_id` (`warden_id`),
  CONSTRAINT `room_wardens_ibfk_1` FOREIGN KEY (`room_id`) REFERENCES `rooms` (`id`) ON DELETE CASCADE,
  CONSTRAINT `room_wardens_ibfk_2` FOREIGN KEY (`warden_id`) REFERENCES `wardens` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- sections
CREATE TABLE IF NOT EXISTS `sections` (
  `id` int NOT NULL AUTO_INCREMENT,
  `section_name` varchar(10) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `section_name` (`section_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- staff
CREATE TABLE IF NOT EXISTS `staff` (
  `id` int NOT NULL AUTO_INCREMENT,
  `staff_id` varchar(50) NOT NULL,
  `user_id` varchar(50) NOT NULL,
  `first_name` varchar(100) NOT NULL,
  `middle_name` varchar(100) DEFAULT NULL,
  `last_name` varchar(100) NOT NULL,
  `profile_image` varchar(255) DEFAULT NULL,
  `email` varchar(120) NOT NULL,
  `mobile` varchar(15) DEFAULT NULL,
  `username` varchar(50) NOT NULL,
  `gender` varchar(20) DEFAULT NULL,
  `date_of_birth` date DEFAULT NULL,
  `blood_group` varchar(10) DEFAULT NULL,
  `address` text,
  `city` varchar(100) DEFAULT NULL,
  `state` varchar(100) DEFAULT NULL,
  `country` varchar(100) DEFAULT NULL,
  `pincode` varchar(10) DEFAULT NULL,
  `designation` varchar(100) DEFAULT NULL,
  `department` varchar(100) DEFAULT NULL,
  `qualification` varchar(150) DEFAULT NULL,
  `experience_years` int DEFAULT NULL,
  `joining_date` date DEFAULT NULL,
  `employment_type` varchar(50) DEFAULT NULL,
  `shift` varchar(50) DEFAULT NULL,
  `role` varchar(30) NOT NULL,
  `password` varchar(255) NOT NULL,
  `auth_token` varchar(255) DEFAULT NULL,
  `status` varchar(20) NOT NULL,
  `is_deleted` tinyint(1) NOT NULL,
  `last_login` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ix_staff_staff_id` (`staff_id`),
  UNIQUE KEY `ix_staff_email` (`email`),
  UNIQUE KEY `ix_staff_username` (`username`),
  UNIQUE KEY `ix_staff_user_id` (`user_id`),
  UNIQUE KEY `ix_staff_mobile` (`mobile`),
  UNIQUE KEY `ix_staff_auth_token` (`auth_token`),
  KEY `ix_staff_is_deleted` (`is_deleted`),
  KEY `ix_staff_role` (`role`),
  KEY `ix_staff_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- staff_book_issues
CREATE TABLE IF NOT EXISTS `staff_book_issues` (
  `id` int NOT NULL AUTO_INCREMENT,
  `staff_id` int NOT NULL,
  `book_id` int NOT NULL,
  `issue_date` date NOT NULL,
  `due_date` date NOT NULL,
  `return_date` date DEFAULT NULL,
  `fine_per_day` decimal(5,2) NOT NULL,
  `fine_amount` decimal(10,2) NOT NULL,
  `status` enum('Issued','Returned','Overdue') NOT NULL,
  `created_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `ix_staff_book_issues_staff_id` (`staff_id`),
  KEY `ix_staff_book_issues_book_id` (`book_id`),
  KEY `ix_staff_book_issues_status` (`status`),
  CONSTRAINT `staff_book_issues_ibfk_1` FOREIGN KEY (`staff_id`) REFERENCES `non_teaching_staff` (`id`) ON DELETE CASCADE,
  CONSTRAINT `staff_book_issues_ibfk_2` FOREIGN KEY (`book_id`) REFERENCES `books` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- staff_library_fine_payments
CREATE TABLE IF NOT EXISTS `staff_library_fine_payments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `staff_id` int NOT NULL,
  `book_issue_id` int DEFAULT NULL,
  `amount` decimal(10,2) NOT NULL,
  `payment_method` varchar(30) NOT NULL,
  `reference_no` varchar(100) DEFAULT NULL,
  `remarks` varchar(500) DEFAULT NULL,
  `status` enum('Collected','Waived','Refunded') NOT NULL,
  `collected_by` varchar(50) DEFAULT NULL,
  `collected_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `ix_staff_library_fine_payments_book_issue_id` (`book_issue_id`),
  KEY `ix_staff_library_fine_payments_status` (`status`),
  KEY `ix_staff_library_fine_payments_staff_id` (`staff_id`),
  CONSTRAINT `staff_library_fine_payments_ibfk_1` FOREIGN KEY (`staff_id`) REFERENCES `non_teaching_staff` (`id`) ON DELETE CASCADE,
  CONSTRAINT `staff_library_fine_payments_ibfk_2` FOREIGN KEY (`book_issue_id`) REFERENCES `staff_book_issues` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- students
CREATE TABLE IF NOT EXISTS `students` (
  `id` int NOT NULL AUTO_INCREMENT,
  `student_id` varchar(20) NOT NULL,
  `user_id` varchar(20) NOT NULL,
  `first_name` varchar(100) NOT NULL,
  `last_name` varchar(100) NOT NULL,
  `middle_name` varchar(100) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `mobile` varchar(15) DEFAULT NULL,
  `father_name` varchar(100) DEFAULT NULL,
  `father_mobile` varchar(15) DEFAULT NULL,
  `father_email` varchar(100) DEFAULT NULL,
  `mother_name` varchar(100) DEFAULT NULL,
  `mother_mobile` varchar(15) DEFAULT NULL,
  `mother_email` varchar(100) DEFAULT NULL,
  `parent_name` varchar(100) DEFAULT NULL,
  `parent_mobile` varchar(15) DEFAULT NULL,
  `parent_email` varchar(100) DEFAULT NULL,
  `emergency_contact_name` varchar(100) DEFAULT NULL,
  `emergency_contact_number` varchar(15) DEFAULT NULL,
  `emergency_contact_relation` varchar(50) DEFAULT NULL,
  `gender` enum('Male','Female','Other') DEFAULT NULL,
  `date_of_birth` date DEFAULT NULL,
  `blood_group` enum('A+','A-','B+','B-','AB+','AB-','O+','O-') DEFAULT NULL,
  `address` text,
  `admission_date` date DEFAULT NULL,
  `previous_school` varchar(150) DEFAULT NULL,
  `medical_conditions` text,
  `allergies` text,
  `role` enum('student','teacher','admin') NOT NULL,
  `password` varchar(255) NOT NULL,
  `status` enum('Active','Inactive') DEFAULT NULL,
  `auth_token` varchar(255) DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `student_id` (`student_id`),
  UNIQUE KEY `user_id` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- student_academic_records
CREATE TABLE IF NOT EXISTS `student_academic_records` (
  `id` int NOT NULL AUTO_INCREMENT,
  `student_id` int NOT NULL,
  `academic_class_id` int NOT NULL,
  `roll_number` int DEFAULT NULL,
  `is_current` tinyint(1) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `student_id` (`student_id`),
  KEY `academic_class_id` (`academic_class_id`),
  CONSTRAINT `student_academic_records_ibfk_1` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE,
  CONSTRAINT `student_academic_records_ibfk_2` FOREIGN KEY (`academic_class_id`) REFERENCES `academic_classes` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- student_leaves
CREATE TABLE IF NOT EXISTS `student_leaves` (
  `id` int NOT NULL AUTO_INCREMENT,
  `student_id` int NOT NULL,
  `leave_type` enum('Sick','Casual','Emergency') DEFAULT NULL,
  `from_date` date NOT NULL,
  `to_date` date NOT NULL,
  `total_days` int NOT NULL,
  `reason` text,
  `status` enum('Pending','Approved','Rejected') DEFAULT NULL,
  `applied_at` datetime DEFAULT NULL,
  `approved_at` datetime DEFAULT NULL,
  `rejected_at` datetime DEFAULT NULL,
  `approved_by` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `student_id` (`student_id`),
  CONSTRAINT `student_leaves_ibfk_1` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- subjects
CREATE TABLE IF NOT EXISTS `subjects` (
  `id` int NOT NULL AUTO_INCREMENT,
  `subject_code` varchar(20) DEFAULT NULL,
  `subject_name` varchar(100) NOT NULL,
  `created_at` datetime DEFAULT (now()),
  PRIMARY KEY (`id`),
  UNIQUE KEY `subject_name` (`subject_name`),
  UNIQUE KEY `subject_code` (`subject_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- teachers
CREATE TABLE IF NOT EXISTS `teachers` (
  `id` int NOT NULL AUTO_INCREMENT,
  `teacher_id` varchar(50) NOT NULL,
  `user_id` varchar(50) NOT NULL,
  `first_name` varchar(100) DEFAULT NULL,
  `middle_name` varchar(100) DEFAULT NULL,
  `last_name` varchar(100) DEFAULT NULL,
  `email` varchar(120) DEFAULT NULL,
  `mobile` varchar(15) DEFAULT NULL,
  `gender` varchar(10) DEFAULT NULL,
  `date_of_birth` date DEFAULT NULL,
  `blood_group` varchar(5) DEFAULT NULL,
  `address` text,
  `city` varchar(50) DEFAULT NULL,
  `state` varchar(50) DEFAULT NULL,
  `pincode` varchar(10) DEFAULT NULL,
  `designation` varchar(100) DEFAULT NULL,
  `degree` varchar(100) DEFAULT NULL,
  `university` varchar(150) DEFAULT NULL,
  `experience_years` int DEFAULT NULL,
  `specialization` varchar(100) DEFAULT NULL,
  `joining_date` date DEFAULT NULL,
  `employment_type` varchar(50) DEFAULT NULL,
  `shift` varchar(50) DEFAULT NULL,
  `total_classes_taken` int DEFAULT NULL,
  `assignments_count` int DEFAULT NULL,
  `rating` float DEFAULT NULL,
  `attendance_percentage` float DEFAULT NULL,
  `medical_condition` text,
  `emergency_name` varchar(100) DEFAULT NULL,
  `emergency_relation` varchar(50) DEFAULT NULL,
  `emergency_phone` varchar(15) DEFAULT NULL,
  `username` varchar(50) DEFAULT NULL,
  `auth_token` varchar(255) DEFAULT NULL,
  `password` varchar(255) NOT NULL,
  `role` enum('teacher','admin') DEFAULT NULL,
  `status` varchar(20) DEFAULT NULL,
  `last_login` datetime DEFAULT NULL,
  `created_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `teacher_id` (`teacher_id`),
  UNIQUE KEY `ix_teachers_user_id` (`user_id`),
  UNIQUE KEY `email` (`email`),
  UNIQUE KEY `mobile` (`mobile`),
  UNIQUE KEY `username` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- teacher_attendance
CREATE TABLE IF NOT EXISTS `teacher_attendance` (
  `id` int NOT NULL AUTO_INCREMENT,
  `teacher_id` int NOT NULL,
  `attendance_date` date NOT NULL,
  `status` enum('Present','Absent','Late') NOT NULL,
  `reason` varchar(255) DEFAULT NULL,
  `marked_by_role` enum('Teacher','Admin') NOT NULL,
  `marked_by_user_id` int DEFAULT NULL,
  `updated_at` datetime DEFAULT (now()),
  `created_at` datetime DEFAULT (now()),
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_teacher_attendance` (`teacher_id`,`attendance_date`),
  CONSTRAINT `teacher_attendance_ibfk_1` FOREIGN KEY (`teacher_id`) REFERENCES `teachers` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- teacher_book_issues
CREATE TABLE IF NOT EXISTS `teacher_book_issues` (
  `id` int NOT NULL AUTO_INCREMENT,
  `teacher_id` int NOT NULL,
  `book_id` int NOT NULL,
  `issue_date` date NOT NULL,
  `due_date` date NOT NULL,
  `return_date` date DEFAULT NULL,
  `fine_per_day` decimal(5,2) NOT NULL,
  `fine_amount` decimal(10,2) NOT NULL,
  `status` enum('Issued','Returned','Overdue') NOT NULL,
  `created_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `ix_teacher_book_issues_status` (`status`),
  KEY `ix_teacher_book_issues_teacher_id` (`teacher_id`),
  KEY `ix_teacher_book_issues_book_id` (`book_id`),
  CONSTRAINT `teacher_book_issues_ibfk_1` FOREIGN KEY (`teacher_id`) REFERENCES `teachers` (`id`) ON DELETE CASCADE,
  CONSTRAINT `teacher_book_issues_ibfk_2` FOREIGN KEY (`book_id`) REFERENCES `books` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- teacher_classes
CREATE TABLE IF NOT EXISTS `teacher_classes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `teacher_id` int NOT NULL,
  `academic_class_id` int NOT NULL,
  `subject_id` int NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_teacher_class_subject` (`teacher_id`,`academic_class_id`,`subject_id`),
  KEY `academic_class_id` (`academic_class_id`),
  KEY `subject_id` (`subject_id`),
  CONSTRAINT `teacher_classes_ibfk_1` FOREIGN KEY (`teacher_id`) REFERENCES `teachers` (`id`) ON DELETE CASCADE,
  CONSTRAINT `teacher_classes_ibfk_2` FOREIGN KEY (`academic_class_id`) REFERENCES `academic_classes` (`id`) ON DELETE CASCADE,
  CONSTRAINT `teacher_classes_ibfk_3` FOREIGN KEY (`subject_id`) REFERENCES `subjects` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- teacher_leaves
CREATE TABLE IF NOT EXISTS `teacher_leaves` (
  `id` int NOT NULL AUTO_INCREMENT,
  `teacher_id` int NOT NULL,
  `leave_type` enum('CL','SL') NOT NULL,
  `from_date` date NOT NULL,
  `to_date` date NOT NULL,
  `total_days` int NOT NULL,
  `reason` text,
  `status` enum('Pending','Approved','Rejected') DEFAULT NULL,
  `applied_at` datetime DEFAULT NULL,
  `approved_at` datetime DEFAULT NULL,
  `rejected_at` datetime DEFAULT NULL,
  `approved_by` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `teacher_id` (`teacher_id`),
  CONSTRAINT `teacher_leaves_ibfk_1` FOREIGN KEY (`teacher_id`) REFERENCES `teachers` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- teacher_leave_balance
CREATE TABLE IF NOT EXISTS `teacher_leave_balance` (
  `id` int NOT NULL AUTO_INCREMENT,
  `teacher_id` int DEFAULT NULL,
  `casual_leave` int DEFAULT NULL,
  `sick_leave` int DEFAULT NULL,
  `used_leave` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `teacher_id` (`teacher_id`),
  CONSTRAINT `teacher_leave_balance_ibfk_1` FOREIGN KEY (`teacher_id`) REFERENCES `teachers` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- teacher_library_fine_payments
CREATE TABLE IF NOT EXISTS `teacher_library_fine_payments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `teacher_id` int NOT NULL,
  `book_issue_id` int DEFAULT NULL,
  `amount` decimal(10,2) NOT NULL,
  `payment_method` varchar(30) NOT NULL,
  `reference_no` varchar(100) DEFAULT NULL,
  `remarks` varchar(500) DEFAULT NULL,
  `status` enum('Collected','Waived','Refunded') NOT NULL,
  `collected_by` varchar(50) DEFAULT NULL,
  `collected_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `ix_teacher_library_fine_payments_status` (`status`),
  KEY `ix_teacher_library_fine_payments_teacher_id` (`teacher_id`),
  KEY `ix_teacher_library_fine_payments_book_issue_id` (`book_issue_id`),
  CONSTRAINT `teacher_library_fine_payments_ibfk_1` FOREIGN KEY (`teacher_id`) REFERENCES `teachers` (`id`) ON DELETE CASCADE,
  CONSTRAINT `teacher_library_fine_payments_ibfk_2` FOREIGN KEY (`book_issue_id`) REFERENCES `teacher_book_issues` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- timetable
CREATE TABLE IF NOT EXISTS `timetable` (
  `id` int NOT NULL AUTO_INCREMENT,
  `academic_class_id` int NOT NULL,
  `day` enum('Monday','Tuesday','Wednesday','Thursday','Friday','Saturday') NOT NULL,
  `start_time` time NOT NULL,
  `end_time` time NOT NULL,
  `subject_name` varchar(50) NOT NULL,
  `teacher_id` int DEFAULT NULL,
  `created_at` datetime DEFAULT (now()),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- timetable_lectures
CREATE TABLE IF NOT EXISTS `timetable_lectures` (
  `id` int NOT NULL AUTO_INCREMENT,
  `academic_class_id` int NOT NULL,
  `subject_id` int NOT NULL,
  `teacher_id` int NOT NULL,
  `day` enum('Monday','Tuesday','Wednesday','Thursday','Friday','Saturday') NOT NULL,
  `period_no` int NOT NULL,
  `start_time` time NOT NULL,
  `end_time` time NOT NULL,
  `room_no` varchar(50) DEFAULT NULL,
  `lecture_type` varchar(30) DEFAULT NULL,
  `remarks` varchar(255) DEFAULT NULL,
  `created_at` datetime DEFAULT (now()),
  `updated_at` datetime DEFAULT (now()),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_class_period` (`academic_class_id`,`day`,`period_no`),
  UNIQUE KEY `uq_teacher_period` (`teacher_id`,`day`,`period_no`),
  KEY `subject_id` (`subject_id`),
  CONSTRAINT `timetable_lectures_ibfk_1` FOREIGN KEY (`academic_class_id`) REFERENCES `academic_classes` (`id`),
  CONSTRAINT `timetable_lectures_ibfk_2` FOREIGN KEY (`subject_id`) REFERENCES `subjects` (`id`),
  CONSTRAINT `timetable_lectures_ibfk_3` FOREIGN KEY (`teacher_id`) REFERENCES `teachers` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- wardens
CREATE TABLE IF NOT EXISTS `wardens` (
  `id` int NOT NULL AUTO_INCREMENT,
  `first_name` varchar(100) DEFAULT NULL,
  `middle_name` varchar(100) DEFAULT NULL,
  `last_name` varchar(100) DEFAULT NULL,
  `mobile` varchar(15) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;