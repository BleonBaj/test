-- BTS Management System - Complete Database Schema
-- Includes all tables from base schema + migrations
-- Target: MySQL 5.7+ / MariaDB 10.2+
-- Created: 2025-12-05

SET FOREIGN_KEY_CHECKS = 0;
SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";

-- Drop all tables in correct order (reverse of dependencies)
DROP TABLE IF EXISTS `pin_audit_logs`;
DROP TABLE IF EXISTS `activity_logs`;
DROP TABLE IF EXISTS `permission_access_tokens`;
DROP TABLE IF EXISTS `pin_permissions`;
DROP TABLE IF EXISTS `password_reset_tokens`;
DROP TABLE IF EXISTS `login_attempts`;
DROP TABLE IF EXISTS `salary_statements`;
DROP TABLE IF EXISTS `student_invoices`;
DROP TABLE IF EXISTS `class_payment_plan`;
DROP TABLE IF EXISTS `class_students`;
DROP TABLE IF EXISTS `class_professors`;
DROP TABLE IF EXISTS `classes`;
DROP TABLE IF EXISTS `professors`;
DROP TABLE IF EXISTS `students`;
DROP TABLE IF EXISTS `courses`;
DROP TABLE IF EXISTS `settings`;
DROP TABLE IF EXISTS `admins`;

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================================
-- CORE TABLES
-- ============================================================================

-- Administrators -----------------------------------------------------------
CREATE TABLE `admins` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `public_id` VARCHAR(20) NOT NULL,
  `username` VARCHAR(60) NOT NULL,
  `name` VARCHAR(120) NOT NULL,
  `email` VARCHAR(190) NOT NULL,
  `password_hash` VARCHAR(255) DEFAULT NULL,
  `management_pin_hash` VARCHAR(255) NOT NULL,
  `two_factor_enabled` TINYINT(1) NOT NULL DEFAULT 0,
  `two_factor_secret` VARCHAR(64) DEFAULT NULL,
  `failed_login_attempts` INT UNSIGNED NOT NULL DEFAULT 0,
  `locked_until` DATETIME DEFAULT NULL,
  `last_login_at` DATETIME DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_admin_public` (`public_id`),
  UNIQUE KEY `uniq_admin_username` (`username`),
  UNIQUE KEY `uniq_admin_email` (`email`),
  KEY `idx_admin_username` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Settings -----------------------------------------------------------------
CREATE TABLE `settings` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `settings_group` VARCHAR(60) NOT NULL,
  `setting_key` VARCHAR(120) NOT NULL,
  `setting_value` TEXT DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_setting_group_key` (`settings_group`, `setting_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- SECURITY & AUDIT TABLES
-- ============================================================================

-- Activity Logs ------------------------------------------------------------
CREATE TABLE `activity_logs` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `admin_id` INT UNSIGNED NOT NULL,
  `action_key` VARCHAR(120) NOT NULL,
  `description` TEXT DEFAULT NULL,
  `context` JSON DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_activity_admin` (`admin_id`),
  KEY `idx_activity_action` (`action_key`),
  KEY `idx_activity_created_at` (`created_at`),
  CONSTRAINT `fk_activity_admin` FOREIGN KEY (`admin_id`) REFERENCES `admins` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- PIN Audit Logs -----------------------------------------------------------
CREATE TABLE `pin_audit_logs` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `admin_id` INT UNSIGNED NOT NULL,
  `action_key` VARCHAR(120) NOT NULL,
  `entity_type` VARCHAR(60) DEFAULT NULL,
  `entity_public_id` VARCHAR(40) DEFAULT NULL,
  `status` ENUM('success','failure') NOT NULL,
  `metadata` JSON DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_pin_audit_admin` (`admin_id`),
  KEY `idx_pin_audit_action` (`action_key`),
  KEY `idx_pin_audit_status` (`status`),
  KEY `idx_pin_audit_created` (`created_at`),
  CONSTRAINT `fk_pin_audit_admin` FOREIGN KEY (`admin_id`) REFERENCES `admins` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Login Attempts (Rate Limiting) -------------------------------------------
CREATE TABLE `login_attempts` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `identifier` VARCHAR(190) NOT NULL,
  `ip_address` VARCHAR(45) NOT NULL,
  `success` TINYINT(1) NOT NULL DEFAULT 0,
  `attempted_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_login_identifier_time` (`identifier`, `attempted_at`),
  KEY `idx_login_ip_time` (`ip_address`, `attempted_at`),
  KEY `idx_login_success` (`success`, `attempted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Password Reset Tokens ----------------------------------------------------
CREATE TABLE `password_reset_tokens` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `admin_id` INT UNSIGNED NOT NULL,
  `token` CHAR(64) NOT NULL,
  `expires_at` DATETIME NOT NULL,
  `used_at` DATETIME DEFAULT NULL,
  `ip_address` VARCHAR(45) DEFAULT NULL,
  `user_agent` VARCHAR(255) DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_password_reset_token` (`token`),
  KEY `idx_password_reset_admin` (`admin_id`),
  KEY `idx_password_reset_expires` (`expires_at`),
  CONSTRAINT `fk_password_reset_admin` FOREIGN KEY (`admin_id`) REFERENCES `admins` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Permission Access Tokens -------------------------------------------------
CREATE TABLE `permission_access_tokens` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `admin_id` INT UNSIGNED NOT NULL,
  `token` CHAR(64) NOT NULL,
  `email_sent_to` VARCHAR(190) NOT NULL,
  `expires_at` DATETIME NOT NULL,
  `used_at` DATETIME DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_permission_token` (`token`),
  KEY `idx_permission_admin` (`admin_id`),
  KEY `idx_permission_expires` (`expires_at`),
  CONSTRAINT `fk_permission_admin` FOREIGN KEY (`admin_id`) REFERENCES `admins` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- PIN Permissions ----------------------------------------------------------
CREATE TABLE `pin_permissions` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `entity_type` VARCHAR(60) NOT NULL,
  `action_type` VARCHAR(60) NOT NULL,
  `requires_pin` TINYINT(1) NOT NULL DEFAULT 0,
  `updated_by` INT UNSIGNED DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_pin_permission` (`entity_type`, `action_type`),
  KEY `idx_pin_updated_by` (`updated_by`),
  KEY `idx_pin_entity_action` (`entity_type`, `action_type`),
  CONSTRAINT `fk_pin_permissions_admin` FOREIGN KEY (`updated_by`) REFERENCES `admins` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- ACADEMIC TABLES
-- ============================================================================

-- Courses ------------------------------------------------------------------
CREATE TABLE `courses` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `public_id` VARCHAR(20) NOT NULL,
  `name` VARCHAR(190) NOT NULL,
  `level` VARCHAR(80) NOT NULL,
  `price` DECIMAL(10,2) NOT NULL DEFAULT 0,
  `description` TEXT DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_course_public` (`public_id`),
  KEY `idx_course_name` (`name`),
  KEY `idx_course_level` (`level`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Students -----------------------------------------------------------------
CREATE TABLE `students` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `public_id` VARCHAR(20) NOT NULL,
  `first_name` VARCHAR(120) NOT NULL,
  `last_name` VARCHAR(120) NOT NULL,
  `national_id` VARCHAR(60) NOT NULL,
  `phone` VARCHAR(60) NOT NULL,
  `address` VARCHAR(255) DEFAULT NULL,
  `age` INT UNSIGNED DEFAULT NULL,
  `registration_date` DATE NOT NULL,
  `notes` TEXT DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_student_public` (`public_id`),
  UNIQUE KEY `uniq_student_national` (`national_id`),
  KEY `idx_student_name` (`last_name`, `first_name`),
  KEY `idx_student_phone` (`phone`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Professors ---------------------------------------------------------------
CREATE TABLE `professors` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `public_id` VARCHAR(20) NOT NULL,
  `first_name` VARCHAR(120) NOT NULL,
  `last_name` VARCHAR(120) NOT NULL,
  `national_id` VARCHAR(60) DEFAULT NULL,
  `email` VARCHAR(190) NOT NULL,
  `phone` VARCHAR(60) NOT NULL,
  `address` VARCHAR(255) DEFAULT NULL,
  `education` VARCHAR(255) DEFAULT NULL,
  `biography` TEXT DEFAULT NULL,
  `salary_type` ENUM('fixed','per-class','per-hour') NOT NULL DEFAULT 'fixed',
  `base_salary` DECIMAL(10,2) NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_professor_public` (`public_id`),
  UNIQUE KEY `uniq_professor_email` (`email`),
  KEY `idx_professor_name` (`last_name`, `first_name`),
  KEY `idx_professor_salary_type` (`salary_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Classes ------------------------------------------------------------------
CREATE TABLE `classes` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `public_id` VARCHAR(20) NOT NULL,
  `course_id` INT UNSIGNED NOT NULL,
  `name` VARCHAR(190) NOT NULL,
  `level` VARCHAR(80) NOT NULL,
  `start_date` DATE NOT NULL,
  `end_date` DATE DEFAULT NULL,
  `schedule` JSON DEFAULT NULL,
  `monthly_price` DECIMAL(10,2) NOT NULL DEFAULT 0,
  `professor_class_pay` DECIMAL(10,2) DEFAULT NULL,
  `description` TEXT DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_class_public` (`public_id`),
  KEY `idx_class_course` (`course_id`),
  KEY `idx_class_dates` (`start_date`, `end_date`),
  CONSTRAINT `fk_class_course` FOREIGN KEY (`course_id`) REFERENCES `courses` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Class-Professor Relationship ---------------------------------------------
CREATE TABLE `class_professors` (
  `class_id` INT UNSIGNED NOT NULL,
  `professor_id` INT UNSIGNED NOT NULL,
  `role` VARCHAR(120) DEFAULT NULL,
  `pay_amount` DECIMAL(10,2) DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`class_id`, `professor_id`),
  KEY `idx_cp_professor` (`professor_id`),
  CONSTRAINT `fk_cp_class` FOREIGN KEY (`class_id`) REFERENCES `classes` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_cp_professor` FOREIGN KEY (`professor_id`) REFERENCES `professors` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Class-Student Relationship -----------------------------------------------
CREATE TABLE `class_students` (
  `class_id` INT UNSIGNED NOT NULL,
  `student_id` INT UNSIGNED NOT NULL,
  `join_date` DATE NOT NULL,
  `status` ENUM('active','left') NOT NULL DEFAULT 'active',
  `monthly_fee` DECIMAL(10,2) NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`class_id`, `student_id`),
  KEY `idx_cs_student` (`student_id`),
  KEY `idx_cs_status` (`status`),
  KEY `idx_cs_class_status` (`class_id`, `status`),
  CONSTRAINT `fk_cs_class` FOREIGN KEY (`class_id`) REFERENCES `classes` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_cs_student` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Class Payment Plans ------------------------------------------------------
CREATE TABLE `class_payment_plan` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `class_id` INT UNSIGNED NOT NULL,
  `plan_month` CHAR(7) NOT NULL COMMENT 'YYYY-MM format',
  `due_amount` DECIMAL(10,2) NOT NULL,
  `due_date` DATE DEFAULT NULL,
  `notes` VARCHAR(255) DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_plan_class_month` (`class_id`, `plan_month`),
  KEY `idx_plan_month` (`plan_month`),
  CONSTRAINT `fk_plan_class` FOREIGN KEY (`class_id`) REFERENCES `classes` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- FINANCIAL TABLES
-- ============================================================================

-- Student Invoices ---------------------------------------------------------
CREATE TABLE `student_invoices` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `public_id` VARCHAR(20) NOT NULL,
  `class_id` INT UNSIGNED NOT NULL,
  `student_id` INT UNSIGNED NOT NULL,
  `plan_month` CHAR(7) NOT NULL COMMENT 'YYYY-MM format',
  `due_amount` DECIMAL(10,2) NOT NULL,
  `paid_amount` DECIMAL(10,2) NOT NULL DEFAULT 0,
  `status` ENUM('paid','partial','due') NOT NULL DEFAULT 'due',
  `tax` ENUM('none','vat8','vat18','exempt') NOT NULL DEFAULT 'none',
  `notes` JSON DEFAULT NULL,
  `confirmed_at` DATETIME DEFAULT NULL,
  `confirmed_by` INT UNSIGNED DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_invoice_public` (`public_id`),
  KEY `idx_invoice_class` (`class_id`),
  KEY `idx_invoice_student` (`student_id`),
  KEY `idx_invoice_month` (`plan_month`),
  KEY `idx_invoice_status` (`status`),
  KEY `idx_invoice_class_month` (`class_id`, `plan_month`),
  KEY `idx_invoice_student_month` (`student_id`, `plan_month`),
  CONSTRAINT `fk_invoice_class` FOREIGN KEY (`class_id`) REFERENCES `classes` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_invoice_student` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_invoice_admin` FOREIGN KEY (`confirmed_by`) REFERENCES `admins` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Professor Salaries -------------------------------------------------------
CREATE TABLE `salary_statements` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `public_id` VARCHAR(20) NOT NULL,
  `professor_id` INT UNSIGNED NOT NULL,
  `class_id` INT UNSIGNED DEFAULT NULL,
  `pay_month` CHAR(7) NOT NULL COMMENT 'YYYY-MM format',
  `base_amount` DECIMAL(10,2) NOT NULL,
  `advances` DECIMAL(10,2) NOT NULL DEFAULT 0,
  `paid_amount` DECIMAL(10,2) NOT NULL DEFAULT 0,
  `balance` DECIMAL(10,2) NOT NULL DEFAULT 0,
  `status` ENUM('paid','partial','due') NOT NULL DEFAULT 'due',
  `notes` TEXT DEFAULT NULL,
  `confirmed_at` DATETIME DEFAULT NULL,
  `confirmed_by` INT UNSIGNED DEFAULT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_salary_public` (`public_id`),
  KEY `idx_salary_professor` (`professor_id`),
  KEY `idx_salary_class` (`class_id`),
  KEY `idx_salary_month` (`pay_month`),
  KEY `idx_salary_status` (`status`),
  KEY `idx_salary_prof_month` (`professor_id`, `pay_month`),
  CONSTRAINT `fk_salary_professor` FOREIGN KEY (`professor_id`) REFERENCES `professors` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_salary_class` FOREIGN KEY (`class_id`) REFERENCES `classes` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_salary_admin` FOREIGN KEY (`confirmed_by`) REFERENCES `admins` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- DEFAULT DATA
-- ============================================================================

-- Insert default PIN permissions (all disabled for maximum flexibility)
INSERT INTO `pin_permissions` (`entity_type`, `action_type`, `requires_pin`) VALUES
  ('course', 'create', 0),
  ('course', 'update', 0),
  ('course', 'delete', 0),
  ('class', 'create', 0),
  ('class', 'update', 0),
  ('class', 'delete', 0),
  ('student', 'create', 0),
  ('student', 'update', 0),
  ('student', 'delete', 0),
  ('professor', 'create', 0),
  ('professor', 'update', 0),
  ('professor', 'delete', 0),
  ('invoice', 'create', 0),
  ('invoice', 'update', 0),
  ('invoice', 'delete', 0),
  ('salary', 'create', 0),
  ('salary', 'update', 0),
  ('salary', 'delete', 0)
ON DUPLICATE KEY UPDATE `requires_pin` = VALUES(`requires_pin`);

-- Insert default settings
INSERT INTO `settings` (`settings_group`, `setting_key`, `setting_value`) VALUES
  ('app', 'language_default', 'sq'),
  ('app', 'currency', 'EUR'),
  ('app', 'name', 'BTS Menaxhimi i Kursit Fizik'),
  ('business', 'company_name', ''),
  ('business', 'company_address', ''),
  ('business', 'company_phone', ''),
  ('business', 'company_email', ''),
  ('business', 'company_tax_id', ''),
  ('business', 'company_logo_url', '')
ON DUPLICATE KEY UPDATE `setting_value` = VALUES(`setting_value`);

-- ============================================================================
-- NOTES
-- ============================================================================
-- 
-- After running this schema:
-- 1. Create admin user with: php create_admin.php
-- 2. Or manually insert admin:
--    INSERT INTO admins (public_id, username, name, email, password_hash, management_pin_hash)
--    VALUES ('A00001', 'admin', 'Administrator', 'your-email@example.com', 
--            '$2y$10$...', '$2y$10$...');
--
-- 3. Update admin email:
--    UPDATE admins SET email = 'your-email@example.com' WHERE username = 'admin';
--
-- 4. Configure config/config.php with:
--    - Database credentials
--    - SMTP credentials
--    - Admin email
--
-- ============================================================================

