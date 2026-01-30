-- Congressional Award Tracker Database Schema
-- Database: congressional_award_tracker
-- Author: System Generated
-- Date: 2026-01-29

-- =============================================
-- Drop existing tables (in reverse order of dependencies)
-- =============================================
DROP TABLE IF EXISTS HourLogs;
DROP TABLE IF EXISTS Activities;
DROP TABLE IF EXISTS Students;
DROP TABLE IF EXISTS Supervisors;
DROP TABLE IF EXISTS Users;

-- =============================================
-- 1. Users Table (Authentication & Base User Info)
-- =============================================
CREATE TABLE Users (
    UserID INT AUTO_INCREMENT PRIMARY KEY,
    Email VARCHAR(255) UNIQUE NOT NULL,
    PasswordHash VARCHAR(255) NOT NULL,
    Role ENUM('Student', 'Admin') DEFAULT 'Student',
    Status ENUM('Pending', 'Approved', 'Rejected') DEFAULT 'Pending',
    CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (Email),
    INDEX idx_status (Status),
    INDEX idx_role (Role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- 2. Students Table (Extended Profile Information)
-- =============================================
CREATE TABLE Students (
    StudentID INT AUTO_INCREMENT PRIMARY KEY,
    UserID INT UNIQUE NOT NULL,
    StudentName VARCHAR(255) NOT NULL,
    Grade INT CHECK (Grade BETWEEN 1 AND 12),
    SchoolName VARCHAR(255),
    ParentEmail VARCHAR(255),
    StartDate DATE DEFAULT (CURRENT_DATE),
    CurrentLevel VARCHAR(50) DEFAULT 'In Progress',
    LastUpdated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (UserID) REFERENCES Users(UserID) ON DELETE CASCADE,
    INDEX idx_user (UserID),
    INDEX idx_level (CurrentLevel)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- 3. Supervisors Table (Activity Supervisors)
-- =============================================
CREATE TABLE Supervisors (
    SupervisorID INT AUTO_INCREMENT PRIMARY KEY,
    SupervisorName VARCHAR(255) NOT NULL,
    Email VARCHAR(255) UNIQUE NOT NULL,
    Role VARCHAR(100) COMMENT 'e.g., Teacher, Coach, Organization Leader',
    IsActive BOOLEAN DEFAULT TRUE,
    CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (Email),
    INDEX idx_active (IsActive)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- 4. Activities Table (Organization-Provided Activities)
-- =============================================
CREATE TABLE Activities (
    ActivityID INT AUTO_INCREMENT PRIMARY KEY,
    ActivityName VARCHAR(255) NOT NULL,
    Category ENUM('Volunteer', 'Personal Development', 'Physical Fitness', 'Expedition') NOT NULL,
    DefaultSupervisorID INT,
    Description TEXT,
    ApplyLink VARCHAR(500),
    Location VARCHAR(255),
    Price DECIMAL(10,2) DEFAULT 0.00,
    IsActive BOOLEAN DEFAULT TRUE,
    CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (DefaultSupervisorID) REFERENCES Supervisors(SupervisorID) ON DELETE SET NULL,
    INDEX idx_category (Category),
    INDEX idx_active (IsActive),
    INDEX idx_supervisor (DefaultSupervisorID)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- 5. HourLogs Table (Student Activity Submissions)
-- =============================================
CREATE TABLE HourLogs (
    LogID INT AUTO_INCREMENT PRIMARY KEY,
    StudentID INT NOT NULL,
    ActivityID INT COMMENT 'NULL if custom activity',
    ActivityName VARCHAR(255) NOT NULL,
    Category ENUM('Volunteer', 'Personal Development', 'Physical Fitness', 'Expedition') NOT NULL,
    Date DATE NOT NULL,
    Hours DECIMAL(5,2) NOT NULL CHECK (Hours > 0),
    SupervisorID INT NOT NULL,
    Status ENUM('Pending', 'Approved', 'Rejected') DEFAULT 'Pending',
    Proof TEXT COMMENT 'File path or URL to proof document/photo',
    Notes TEXT COMMENT 'Student notes or description',
    VerificationToken VARCHAR(255) UNIQUE COMMENT 'Unique token for email verification',
    TokenExpiry DATETIME COMMENT 'Verification token expiration time',
    SubmittedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ApprovalTime TIMESTAMP NULL,
    ApprovedBy VARCHAR(255) COMMENT 'Email of supervisor who approved',
    RejectionReason TEXT,
    UpdatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (StudentID) REFERENCES Students(StudentID) ON DELETE CASCADE,
    FOREIGN KEY (ActivityID) REFERENCES Activities(ActivityID) ON DELETE SET NULL,
    FOREIGN KEY (SupervisorID) REFERENCES Supervisors(SupervisorID) ON DELETE RESTRICT,
    INDEX idx_student (StudentID),
    INDEX idx_status (Status),
    INDEX idx_supervisor (SupervisorID),
    INDEX idx_token (VerificationToken),
    INDEX idx_date (Date),
    INDEX idx_category (Category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- Insert Default Admin User
-- =============================================
-- Password: 'Admin123!' (hashed with bcrypt, you'll need to update this)
-- In production, run bcrypt.hash('Admin123!', 10) to generate proper hash
INSERT INTO Users (Email, PasswordHash, Role, Status) VALUES
('admin@congressionalaward.org', '$2b$10$placeholder.hash.should.be.replaced', 'Admin', 'Approved');

-- =============================================
-- Insert Sample Supervisors
-- =============================================
INSERT INTO Supervisors (SupervisorName, Email, Role) VALUES
('John Smith', 'john.smith@example.com', 'Volunteer Coordinator'),
('Sarah Johnson', 'sarah.johnson@example.com', 'PE Teacher'),
('Michael Chen', 'michael.chen@example.com', 'Music Director'),
('Emily Davis', 'emily.davis@example.com', 'Expedition Leader');

-- =============================================
-- Insert Sample Activities
-- =============================================
INSERT INTO Activities (ActivityName, Category, DefaultSupervisorID, Description, Location, Price) VALUES
('Food Bank Volunteer', 'Volunteer', 1, 'Help sort and distribute food to families in need', 'Community Food Bank', 0.00),
('Animal Shelter Care', 'Volunteer', 1, 'Care for animals, clean facilities, and assist with adoptions', 'Local Animal Shelter', 0.00),
('Piano Lessons', 'Personal Development', 3, 'One-on-one piano instruction', 'Music Academy', 50.00),
('Public Speaking Club', 'Personal Development', NULL, 'Weekly Toastmasters-style meetings', 'Community Center', 25.00),
('Soccer Team', 'Physical Fitness', 2, 'Competitive youth soccer league', 'City Sports Complex', 100.00),
('Swimming Lessons', 'Physical Fitness', 2, 'Swim instruction and practice', 'YMCA Pool', 75.00),
('Mountain Hiking Trip', 'Expedition', 4, '3-day backpacking expedition', 'State Park', 200.00),
('Camping Adventure', 'Expedition', 4, 'Weekend camping with outdoor skills training', 'National Forest', 150.00);

-- =============================================
-- Views for Reporting
-- =============================================

-- View: Student Hours Summary
CREATE OR REPLACE VIEW StudentHoursSummary AS
SELECT 
    s.StudentID,
    s.StudentName,
    s.CurrentLevel,
    s.StartDate,
    COALESCE(SUM(CASE WHEN hl.Category = 'Volunteer' AND hl.Status = 'Approved' THEN hl.Hours ELSE 0 END), 0) AS VolunteerHours,
    COALESCE(SUM(CASE WHEN hl.Category = 'Personal Development' AND hl.Status = 'Approved' THEN hl.Hours ELSE 0 END), 0) AS PersonalDevelopmentHours,
    COALESCE(SUM(CASE WHEN hl.Category = 'Physical Fitness' AND hl.Status = 'Approved' THEN hl.Hours ELSE 0 END), 0) AS PhysicalFitnessHours,
    COALESCE(COUNT(DISTINCT CASE WHEN hl.Category = 'Expedition' AND hl.Status = 'Approved' THEN hl.LogID END), 0) AS ExpeditionCount,
    COUNT(CASE WHEN hl.Status = 'Pending' THEN 1 END) AS PendingLogs,
    COUNT(CASE WHEN hl.Status = 'Approved' THEN 1 END) AS ApprovedLogs,
    COUNT(CASE WHEN hl.Status = 'Rejected' THEN 1 END) AS RejectedLogs
FROM Students s
LEFT JOIN HourLogs hl ON s.StudentID = hl.StudentID
GROUP BY s.StudentID, s.StudentName, s.CurrentLevel, s.StartDate;

-- View: Supervisor Pending Approvals
CREATE OR REPLACE VIEW SupervisorPendingApprovals AS
SELECT 
    sup.SupervisorID,
    sup.SupervisorName,
    sup.Email,
    hl.LogID,
    s.StudentName,
    hl.ActivityName,
    hl.Category,
    hl.Date,
    hl.Hours,
    hl.SubmittedAt,
    hl.VerificationToken
FROM Supervisors sup
JOIN HourLogs hl ON sup.SupervisorID = hl.SupervisorID
JOIN Students s ON hl.StudentID = s.StudentID
WHERE hl.Status = 'Pending'
ORDER BY hl.SubmittedAt ASC;

-- =============================================
-- Stored Procedures
-- =============================================

DELIMITER //

-- Procedure: Calculate Student Award Level
CREATE PROCEDURE CalculateStudentLevel(IN p_StudentID INT)
BEGIN
    DECLARE v_volunteer DECIMAL(10,2);
    DECLARE v_pd DECIMAL(10,2);
    DECLARE v_pf DECIMAL(10,2);
    DECLARE v_expedition INT;
    DECLARE v_level VARCHAR(50);
    
    -- Get totals
    SELECT 
        COALESCE(SUM(CASE WHEN Category = 'Volunteer' THEN Hours ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN Category = 'Personal Development' THEN Hours ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN Category = 'Physical Fitness' THEN Hours ELSE 0 END), 0),
        COALESCE(COUNT(DISTINCT CASE WHEN Category = 'Expedition' THEN LogID END), 0)
    INTO v_volunteer, v_pd, v_pf, v_expedition
    FROM HourLogs
    WHERE StudentID = p_StudentID AND Status = 'Approved';
    
    -- Determine level
    IF v_volunteer >= 400 AND v_pd >= 200 AND v_pf >= 200 AND v_expedition >= 4 THEN
        SET v_level = 'Gold Medal';
    ELSEIF v_volunteer >= 200 AND v_pd >= 100 AND v_pf >= 100 AND v_expedition >= 2 THEN
        SET v_level = 'Silver Medal';
    ELSEIF v_volunteer >= 100 AND v_pd >= 50 AND v_pf >= 50 AND v_expedition >= 1 THEN
        SET v_level = 'Bronze Medal';
    ELSEIF v_volunteer >= 90 AND v_pd >= 45 AND v_pf >= 45 AND v_expedition >= 3 THEN
        SET v_level = 'Gold Certificate';
    ELSEIF v_volunteer >= 60 AND v_pd >= 30 AND v_pf >= 30 AND v_expedition >= 2 THEN
        SET v_level = 'Silver Certificate';
    ELSEIF v_volunteer >= 30 AND v_pd >= 15 AND v_pf >= 15 AND v_expedition >= 1 THEN
        SET v_level = 'Bronze Certificate';
    ELSE
        SET v_level = 'In Progress';
    END IF;
    
    -- Update student record
    UPDATE Students SET CurrentLevel = v_level WHERE StudentID = p_StudentID;
END //

DELIMITER ;

-- =============================================
-- Triggers
-- =============================================

DELIMITER //

-- Trigger: Update Student Level After HourLog Status Change
CREATE TRIGGER after_hourlog_update
AFTER UPDATE ON HourLogs
FOR EACH ROW
BEGIN
    IF OLD.Status != NEW.Status AND NEW.Status = 'Approved' THEN
        CALL CalculateStudentLevel(NEW.StudentID);
    END IF;
END //

DELIMITER ;

-- =============================================
-- Comments
-- =============================================
-- This schema includes:
-- 1. Proper foreign key relationships with CASCADE/RESTRICT
-- 2. Indexes for query optimization
-- 3. Check constraints for data validation
-- 4. Views for common reporting queries
-- 5. Stored procedure for level calculation
-- 6. Trigger for automatic level updates
-- 7. Sample data for testing
--
-- To use with Azure MySQL:
-- 1. Create database: CREATE DATABASE congressional_award_tracker;
-- 2. Run this script
-- 3. Update admin password hash using bcrypt
-- 4. Configure connection in application