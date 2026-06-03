-- 1.Admin Profile
CREATE TABLE `admins` (
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
  `admin_type` enum('Super Admin','Academic Admin','Library Admin','Accounts Admin','Hostel Admin') NOT NULL,
  `designation` varchar(100) DEFAULT NULL,
  `department` varchar(100) DEFAULT NULL,
  `permissions` text,
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
  `modules_enabled` varchar(255) DEFAULT NULL,
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
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ix_admins_email` (`email`),
  UNIQUE KEY `ix_admins_username` (`username`),
  UNIQUE KEY `ix_admins_admin_id` (`admin_id`),
  UNIQUE KEY `ix_admins_user_id` (`user_id`),
  UNIQUE KEY `ix_admins_mobile` (`mobile`),
  KEY `idx_admin_username` (`username`),
  KEY `idx_admin_admin_id` (`admin_id`),
  KEY `idx_admin_status` (`status`),
  KEY `idx_admin_email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci


-- 2.Assets Master Table
CREATE TABLE `assets` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,

  -- Primary Business IDs
  `asset_id` VARCHAR(50) NOT NULL,
  `asset_code` VARCHAR(50) NOT NULL,

  -- Basic Details
  `asset_name` VARCHAR(150) NOT NULL,
  `asset_description` TEXT DEFAULT NULL,

  -- Classification
  `category` ENUM(
    'Electronics',
    'Furniture',
    'Lab Equipment',
    'Vehicles',
    'IT Equipment',
    'Sports',
    'Medical',
    'Library',
    'Office',
    'Infrastructure',
    'Other'
  ) NOT NULL DEFAULT 'Electronics',

  `sub_category` VARCHAR(100) DEFAULT NULL,
  `brand` VARCHAR(100) DEFAULT NULL,
  `model_number` VARCHAR(100) DEFAULT NULL,
  `serial_number` VARCHAR(150) DEFAULT NULL,

  -- Asset Identification
  `barcode` VARCHAR(150) DEFAULT NULL,
  `qr_code` VARCHAR(255) DEFAULT NULL,

  -- Purchase Details
  `purchase_date` DATE DEFAULT NULL,
  `purchase_cost` DECIMAL(12,2) DEFAULT 0.00,
  `currency` VARCHAR(10) DEFAULT 'INR',

  `vendor_name` VARCHAR(150) DEFAULT NULL,
  `invoice_number` VARCHAR(100) DEFAULT NULL,
  `invoice_file` VARCHAR(255) DEFAULT NULL,

  -- Warranty
  `warranty_start_date` DATE DEFAULT NULL,
  `warranty_end_date` DATE DEFAULT NULL,
  `warranty_details` TEXT DEFAULT NULL,

  -- Depreciation
  `depreciation_method` ENUM(
    'Straight Line',
    'Written Down Value',
    'None'
  ) DEFAULT 'Straight Line',

  `depreciation_rate` DECIMAL(5,2) DEFAULT 0.00,
  `current_book_value` DECIMAL(12,2) DEFAULT 0.00,

  -- Location
  `location` VARCHAR(150) DEFAULT NULL,
  `building_name` VARCHAR(100) DEFAULT NULL,
  `floor_number` VARCHAR(50) DEFAULT NULL,
  `room_number` VARCHAR(50) DEFAULT NULL,

  -- Asset Condition
  `condition_status` ENUM(
    'Excellent',
    'Good',
    'Average',
    'Damaged',
    'Scrap'
  ) DEFAULT 'Good',

  -- Operational Status
  `status` ENUM(
    'Operational',
    'Under Repair',
    'Inactive',
    'Assigned',
    'Available',
    'Lost',
    'Disposed'
  ) NOT NULL DEFAULT 'Available',

  -- Assignment
  `assigned_to_admin_id` VARCHAR(50) DEFAULT NULL,

  -- Maintenance
  `last_maintenance_date` DATE DEFAULT NULL,
  `next_maintenance_date` DATE DEFAULT NULL,
  `maintenance_notes` TEXT DEFAULT NULL,

  -- Insurance
  `insurance_provider` VARCHAR(150) DEFAULT NULL,
  `insurance_policy_number` VARCHAR(100) DEFAULT NULL,
  `insurance_expiry_date` DATE DEFAULT NULL,

  -- Attachments
  `asset_image` VARCHAR(255) DEFAULT NULL,
  `documents` JSON DEFAULT NULL,

  -- School / Organization
  `school_name` VARCHAR(150) DEFAULT NULL,
  `school_code` VARCHAR(50) DEFAULT NULL,

  -- Audit
  `remarks` TEXT DEFAULT NULL,

  `created_by` VARCHAR(50) DEFAULT NULL,
  `updated_by` VARCHAR(50) DEFAULT NULL,

  `is_deleted` TINYINT(1) NOT NULL DEFAULT 0,

  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (`id`),

  UNIQUE KEY `uk_asset_id` (`asset_id`),
  UNIQUE KEY `uk_asset_code` (`asset_code`),
  UNIQUE KEY `uk_serial_number` (`serial_number`),

  KEY `idx_asset_name` (`asset_name`),
  KEY `idx_asset_category` (`category`),
  KEY `idx_asset_status` (`status`),
  KEY `idx_asset_location` (`location`),
  KEY `idx_asset_purchase_date` (`purchase_date`),

  CONSTRAINT `fk_assets_admin`
    FOREIGN KEY (`assigned_to_admin_id`)
    REFERENCES `admins` (`admin_id`)
    ON DELETE SET NULL
    ON UPDATE CASCADE

) ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_0900_ai_ci;

-- 3.Asset Assignment Mapping Table
CREATE TABLE `asset_assignments` (

  `id` BIGINT NOT NULL AUTO_INCREMENT,

  `assignment_id` VARCHAR(50) NOT NULL,

  `asset_id` VARCHAR(50) NOT NULL,
  `admin_id` VARCHAR(50) NOT NULL,

  `assigned_date` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `expected_return_date` DATE DEFAULT NULL,
  `returned_date` DATETIME DEFAULT NULL,

  `assignment_status` ENUM(
    'Assigned',
    'Returned',
    'Overdue',
    'Lost'
  ) NOT NULL DEFAULT 'Assigned',

  `assigned_by` VARCHAR(50) DEFAULT NULL,

  `purpose` VARCHAR(255) DEFAULT NULL,
  `notes` TEXT DEFAULT NULL,

  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (`id`),

  UNIQUE KEY `uk_assignment_id` (`assignment_id`),

  KEY `idx_assignment_asset` (`asset_id`),
  KEY `idx_assignment_admin` (`admin_id`),
  KEY `idx_assignment_status` (`assignment_status`),

  CONSTRAINT `fk_assignment_asset`
    FOREIGN KEY (`asset_id`)
    REFERENCES `assets` (`asset_id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE,

  CONSTRAINT `fk_assignment_admin`
    FOREIGN KEY (`admin_id`)
    REFERENCES `admins` (`admin_id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE

) ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_0900_ai_ci;


-- 4. Asset Maintenance History Table
CREATE TABLE `asset_maintenance_logs` (

  `id` BIGINT NOT NULL AUTO_INCREMENT,

  `maintenance_id` VARCHAR(50) NOT NULL,

  `asset_id` VARCHAR(50) NOT NULL,

  `maintenance_type` ENUM(
    'Repair',
    'Service',
    'Inspection',
    'Upgrade'
  ) NOT NULL,

  `maintenance_date` DATE NOT NULL,

  `vendor_name` VARCHAR(150) DEFAULT NULL,
  `cost` DECIMAL(12,2) DEFAULT 0.00,

  `description` TEXT DEFAULT NULL,
  `next_due_date` DATE DEFAULT NULL,

  `performed_by` VARCHAR(100) DEFAULT NULL,

  `created_by` VARCHAR(50) DEFAULT NULL,

  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (`id`),

  UNIQUE KEY `uk_maintenance_id` (`maintenance_id`),

  KEY `idx_maintenance_asset` (`asset_id`),

  CONSTRAINT `fk_maintenance_asset`
    FOREIGN KEY (`asset_id`)
    REFERENCES `assets` (`asset_id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE

) ENGINE=InnoDB
DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_0900_ai_ci;