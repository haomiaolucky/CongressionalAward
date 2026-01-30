# Congressional Award Tracker - System Design Document

## 1. Project Overview

This web application helps students track volunteer hours, personal development, physical fitness activities, and expeditions to qualify for The Congressional Award program.

### Key Features
- User registration with admin approval workflow
- Track hours across 4 categories (Volunteer, Personal Development, Physical Fitness, Expedition/Exploration)
- Activity logging with supervisor verification via email
- Progress tracking toward Bronze/Silver/Gold levels
- Email notifications for supervisors to approve/reject submissions

---

## 2. Congressional Award Levels

### Certificate Requirements
- **Bronze Certificate**: 30h Volunteer, 15h PD, 15h PF, 1 Expedition
- **Silver Certificate**: 60h Volunteer, 30h PD, 30h PF, 2 Expeditions  
- **Gold Certificate**: 90h Volunteer, 45h PD, 45h PF, 3 Expeditions

### Medal Requirements
- **Bronze Medal**: 100h Volunteer, 50h PD, 50h PF, 1+ night Expedition
- **Silver Medal**: 200h Volunteer, 100h PD, 100h PF, 2+ nights Expedition
- **Gold Medal**: 400h Volunteer, 200h PD, 200h PF, 4+ nights Expedition

---

## 3. Database Schema (MySQL with Foreign Keys)

### 3.1 Users Table (Students + Admins)
```sql
CREATE TABLE Users (
    UserID INT AUTO_INCREMENT PRIMARY KEY,
    Email VARCHAR(255) UNIQUE NOT NULL,
    PasswordHash VARCHAR(255) NOT NULL,
    Role ENUM('Student', 'Admin') DEFAULT 'Student',
    Status ENUM('Pending', 'Approved', 'Rejected') DEFAULT 'Pending',
    CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_email (Email),
    INDEX idx_status (Status)
);
```

### 3.2 Students Table (Extended Profile)
```sql
CREATE TABLE Students (
    StudentID INT AUTO_INCREMENT PRIMARY KEY,
    UserID INT UNIQUE NOT NULL,
    StudentName VARCHAR(255) NOT NULL,
    Grade INT,
    SchoolName VARCHAR(255),
    ParentEmail VARCHAR(255),
    StartDate DATE,
    CurrentLevel VARCHAR(50) DEFAULT 'Not Started',
    FOREIGN KEY (UserID) REFERENCES Users(UserID) ON DELETE CASCADE,
    INDEX idx_user (UserID)
);
```

### 3.3 Supervisors Table
```sql
CREATE TABLE Supervisors (
    SupervisorID INT AUTO_INCREMENT PRIMARY KEY,
    SupervisorName VARCHAR(255) NOT NULL,
    Email VARCHAR(255) UNIQUE NOT NULL,
    Role VARCHAR(100),
    IsActive BOOLEAN DEFAULT TRUE,
    CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_email (Email)
);
```

### 3.4 Activities Table
```sql
CREATE TABLE Activities (
    ActivityID INT AUTO_INCREMENT PRIMARY KEY,
    ActivityName VARCHAR(255) NOT NULL,
    Category ENUM('Volunteer', 'Personal Development', 'Physical Fitness', 'Expedition') NOT NULL,
    DefaultSupervisorID INT,
    Description TEXT,
    ApplyLink VARCHAR(500),
    Location VARCHAR(255),
    Price DECIMAL(10,2),
    IsActive BOOLEAN DEFAULT TRUE,
    CreatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (DefaultSupervisorID) REFERENCES Supervisors(SupervisorID) ON DELETE SET NULL,
    INDEX idx_category (Category)
);
```

### 3.5 HourLogs Table (Core Tracking)
```sql
CREATE TABLE HourLogs (
    LogID INT AUTO_INCREMENT PRIMARY KEY,
    StudentID INT NOT NULL,
    ActivityID INT,
    ActivityName VARCHAR(255) NOT NULL,
    Category ENUM('Volunteer', 'Personal Development', 'Physical Fitness', 'Expedition') NOT NULL,
    Date DATE NOT NULL,
    Hours DECIMAL(5,2) NOT NULL,
    SupervisorID INT NOT NULL,
    Status ENUM('Pending', 'Approved', 'Rejected') DEFAULT 'Pending',
    Proof TEXT,
    Notes TEXT,
    VerificationToken VARCHAR(255),
    SubmittedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ApprovalTime TIMESTAMP NULL,
    FOREIGN KEY (StudentID) REFERENCES Students(StudentID) ON DELETE CASCADE,
    FOREIGN KEY (ActivityID) REFERENCES Activities(ActivityID) ON DELETE SET NULL,
    FOREIGN KEY (SupervisorID) REFERENCES Supervisors(SupervisorID) ON DELETE RESTRICT,
    INDEX idx_student (StudentID),
    INDEX idx_status (Status),
    INDEX idx_supervisor (SupervisorID),
    INDEX idx_token (VerificationToken)
);
```

---

## 4. System Architecture

### Technology Stack
- **Backend**: Node.js + Express.js
- **Database**: Azure MySQL Database
- **Authentication**: JWT (JSON Web Tokens) + bcrypt
- **Email**: Nodemailer (SMTP) or SendGrid
- **Frontend**: HTML5, CSS3, JavaScript (vanilla or React)

### File Structure
```
congressional-award-tracker/
├── server/
│   ├── config/
│   │   └── db.js (Database connection)
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── studentController.js
│   │   ├── adminController.js
│   │   └── logController.js
│   ├── middleware/
│   │   ├── auth.js
│   │   └── roleCheck.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── students.js
│   │   ├── logs.js
│   │   └── admin.js
│   ├── utils/
│   │   ├── emailService.js
│   │   └── tokenGenerator.js
│   └── server.js
├── public/
│   ├── index.html
│   ├── dashboard.html
│   ├── css/
│   └── js/
├── database/
│   └── schema.sql
├── package.json
├── .env.example
└── README.md
```

---

## 5. Key Workflows

### 5.1 Student Registration Flow
1. Student fills registration form (name, email, password, grade, school, parent email)
2. System creates User (Status='Pending') and Student record
3. Admin receives notification
4. Admin reviews and approves/rejects
5. Student receives email notification
6. Approved students can login

### 5.2 Hour Logging Flow
1. Student logs in, navigates to "Add Activity"
2. Selects activity (from dropdown or custom), date, hours, supervisor
3. Optionally uploads proof (photo/document)
4. Clicks Submit → Status='Pending', generates unique verification token
5. System sends email to supervisor with log details and Approve/Reject buttons
6. Supervisor clicks button → opens URL with token
7. System validates token, updates Status, records ApprovalTime
8. Student sees updated hours on dashboard

### 5.3 Edit Pending Log Flow
1. Student views their logs, sees "Edit" button for Pending logs
2. Makes changes (hours, proof, notes)
3. System sends updated email to supervisor
4. Supervisor re-reviews and approves/rejects

---

## 6. API Endpoints

### Authentication
- `POST /api/auth/register` - Register new student
- `POST /api/auth/login` - Login (returns JWT)
- `GET /api/auth/me` - Get current user info

### Admin
- `GET /api/admin/pending-users` - List pending registrations
- `PUT /api/admin/approve-user/:id` - Approve student
- `PUT /api/admin/reject-user/:id` - Reject student
- `GET /api/admin/activities` - Manage activities
- `POST /api/admin/activities` - Create activity

### Student Dashboard
- `GET /api/students/dashboard` - Get summary (total hours per category, current level, progress)
- `GET /api/students/logs` - Get all logs for logged-in student
- `GET /api/activities` - List available activities
- `GET /api/supervisors` - List active supervisors

### Hour Logs
- `POST /api/logs` - Create new log entry
- `PUT /api/logs/:id` - Update pending log (student only)
- `DELETE /api/logs/:id` - Delete pending log
- `GET /api/logs/verify` - Supervisor verification endpoint (token-based)
- `POST /api/logs/verify` - Process approval/rejection

---

## 7. Security Considerations

1. **Password Security**: bcrypt with salt rounds ≥ 10
2. **JWT Tokens**: Short expiration (1-7 days), secure secret key
3. **Verification Tokens**: UUID v4, single-use, expiration time
4. **SQL Injection**: Use parameterized queries (mysql2 prepared statements)
5. **XSS Protection**: Sanitize user inputs, CSP headers
6. **Role-Based Access**: Middleware to check user roles
7. **Email Rate Limiting**: Prevent spam

---

## 8. Email Templates

### Supervisor Verification Email
```
Subject: Hour Log Verification Required - [Student Name]

Dear [Supervisor Name],

[Student Name] has logged [Hours] hours for [Activity Name] ([Category]) on [Date].

Notes: [Student Notes]
Proof: [Link to proof if uploaded]

Please verify this submission:
[Approve Button - Link]  [Reject Button - Link]

This link expires in 7 days.

Thank you for supporting our students!
```

---

## 9. Dashboard Calculations

### Current Level Logic
```javascript
function calculateLevel(volunteer, pd, pf, expeditions) {
    if (volunteer >= 400 && pd >= 200 && pf >= 200 && expeditions >= 4) return 'Gold Medal';
    if (volunteer >= 200 && pd >= 100 && pf >= 100 && expeditions >= 2) return 'Silver Medal';
    if (volunteer >= 100 && pd >= 50 && pf >= 50 && expeditions >= 1) return 'Bronze Medal';
    if (volunteer >= 90 && pd >= 45 && pf >= 45 && expeditions >= 3) return 'Gold Certificate';
    if (volunteer >= 60 && pd >= 30 && pf >= 30 && expeditions >= 2) return 'Silver Certificate';
    if (volunteer >= 30 && pd >= 15 && pf >= 15 && expeditions >= 1) return 'Bronze Certificate';
    return 'In Progress';
}
```

---

## 10. Future Enhancements

- PDF report generation for award applications
- Mobile app (React Native)
- Batch hour import (CSV)
- Supervisor portal (view all pending approvals)
- Notification preferences
- Data analytics dashboard for admins