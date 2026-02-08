-- Subscription and Payment System for Congressional Award Tracker

-- 1. Subscription Plans Table
CREATE TABLE SubscriptionPlans (
    PlanID INT PRIMARY KEY IDENTITY(1,1),
    PlanName NVARCHAR(50) NOT NULL,
    PlanType NVARCHAR(20) NOT NULL CHECK (PlanType IN ('Monthly', 'Yearly')),
    Price DECIMAL(10, 2) NOT NULL,
    DurationDays INT NOT NULL, -- 30 for monthly, 365 for yearly
    Description NVARCHAR(500),
    IsActive BIT DEFAULT 1,
    CreatedAt DATETIME DEFAULT GETDATE()
);

-- Insert default plans
-- Note: For Monthly plans, DurationDays is just a reference. Actual billing uses DATEADD(MONTH, 1, date)
-- For Yearly plans, DurationDays is also a reference. Actual billing uses DATEADD(YEAR, 1, date)
INSERT INTO SubscriptionPlans (PlanName, PlanType, Price, DurationDays, Description)
VALUES 
    ('Monthly Subscription', 'Monthly', 80.00, 30, 'Access for 1 calendar month, renews on the same day each month'),
    ('Yearly Subscription', 'Yearly', 800.00, 365, 'Access for 1 calendar year, renews on the same date each year. Save $160!');

-- 2. Student Subscriptions Table
CREATE TABLE StudentSubscriptions (
    SubscriptionID INT PRIMARY KEY IDENTITY(1,1),
    StudentID INT NOT NULL FOREIGN KEY REFERENCES Students(StudentID),
    PlanID INT NOT NULL FOREIGN KEY REFERENCES SubscriptionPlans(PlanID),
    SubscriptionStatus NVARCHAR(20) NOT NULL DEFAULT 'Active' CHECK (SubscriptionStatus IN ('Active', 'Expired', 'Cancelled', 'PendingPayment')),
    StartDate DATETIME NOT NULL DEFAULT GETDATE(),
    EndDate DATETIME NOT NULL,
    NextBillingDate DATETIME,
    AutoRenew BIT DEFAULT 1,
    CreatedAt DATETIME DEFAULT GETDATE(),
    UpdatedAt DATETIME DEFAULT GETDATE(),
    CancelledAt DATETIME NULL,
    CancellationReason NVARCHAR(500) NULL
);

-- 3. Payment Transactions Table
CREATE TABLE PaymentTransactions (
    TransactionID INT PRIMARY KEY IDENTITY(1,1),
    StudentID INT NOT NULL FOREIGN KEY REFERENCES Students(StudentID),
    SubscriptionID INT NULL FOREIGN KEY REFERENCES StudentSubscriptions(SubscriptionID),
    Amount DECIMAL(10, 2) NOT NULL,
    Currency NVARCHAR(10) DEFAULT 'USD',
    PaymentMethod NVARCHAR(50), -- 'CreditCard', 'PayPal', 'Stripe', etc.
    PaymentStatus NVARCHAR(20) NOT NULL DEFAULT 'Pending' CHECK (PaymentStatus IN ('Pending', 'Completed', 'Failed', 'Refunded')),
    TransactionDate DATETIME DEFAULT GETDATE(),
    PaymentGatewayID NVARCHAR(255), -- External payment gateway transaction ID
    PaymentGateway NVARCHAR(50), -- 'Stripe', 'PayPal', etc.
    Description NVARCHAR(500),
    ErrorMessage NVARCHAR(1000) NULL,
    CreatedAt DATETIME DEFAULT GETDATE()
);

-- 4. Payment Reminders Table (for tracking reminders sent)
CREATE TABLE PaymentReminders (
    ReminderID INT PRIMARY KEY IDENTITY(1,1),
    StudentID INT NOT NULL FOREIGN KEY REFERENCES Students(StudentID),
    SubscriptionID INT NOT NULL FOREIGN KEY REFERENCES StudentSubscriptions(SubscriptionID),
    ReminderType NVARCHAR(20) NOT NULL CHECK (ReminderType IN ('7DaysBefore', '3DaysBefore', '1DayBefore', 'DueDate', 'Overdue')),
    SentDate DATETIME DEFAULT GETDATE(),
    EmailSent BIT DEFAULT 0,
    EmailSentAt DATETIME NULL
);

-- 5. Subscription History Table (for audit trail)
CREATE TABLE SubscriptionHistory (
    HistoryID INT PRIMARY KEY IDENTITY(1,1),
    SubscriptionID INT NOT NULL FOREIGN KEY REFERENCES StudentSubscriptions(SubscriptionID),
    StudentID INT NOT NULL FOREIGN KEY REFERENCES Students(StudentID),
    Action NVARCHAR(50) NOT NULL, -- 'Created', 'Renewed', 'Cancelled', 'Expired', 'Reactivated'
    OldStatus NVARCHAR(20),
    NewStatus NVARCHAR(20),
    Note NVARCHAR(500),
    ActionDate DATETIME DEFAULT GETDATE(),
    ActionBy INT NULL -- AdminID if admin made the change
);

-- Create indexes for better performance
CREATE INDEX IX_StudentSubscriptions_StudentID ON StudentSubscriptions(StudentID);
CREATE INDEX IX_StudentSubscriptions_Status ON StudentSubscriptions(SubscriptionStatus);
CREATE INDEX IX_StudentSubscriptions_NextBilling ON StudentSubscriptions(NextBillingDate);
CREATE INDEX IX_PaymentTransactions_StudentID ON PaymentTransactions(StudentID);
CREATE INDEX IX_PaymentTransactions_Status ON PaymentTransactions(PaymentStatus);
CREATE INDEX IX_PaymentReminders_StudentID ON PaymentReminders(StudentID);

-- Add subscription fields to Students table
-- First check if columns don't exist, then add them
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Students') AND name = 'SubscriptionRequired')
BEGIN
    ALTER TABLE Students ADD SubscriptionRequired BIT DEFAULT 1;
END

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Students') AND name = 'SubscriptionStatus')
BEGIN
    ALTER TABLE Students ADD SubscriptionStatus NVARCHAR(20) DEFAULT 'Inactive' CHECK (SubscriptionStatus IN ('Active', 'Inactive', 'Expired', 'Trial'));
END

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Students') AND name = 'TrialEndDate')
BEGIN
    ALTER TABLE Students ADD TrialEndDate DATETIME NULL;
END

-- View: Active Subscriptions Summary
CREATE VIEW vw_ActiveSubscriptions AS
SELECT 
    s.StudentID,
    s.StudentName,
    s.Email,
    ss.SubscriptionID,
    sp.PlanName,
    sp.PlanType,
    sp.Price,
    ss.SubscriptionStatus,
    ss.StartDate,
    ss.EndDate,
    ss.NextBillingDate,
    ss.AutoRenew,
    DATEDIFF(day, GETDATE(), ss.EndDate) AS DaysRemaining,
    CASE 
        WHEN DATEDIFF(day, GETDATE(), ss.EndDate) < 0 THEN 'Expired'
        WHEN DATEDIFF(day, GETDATE(), ss.EndDate) <= 7 THEN 'ExpiringSoon'
        ELSE 'Active'
    END AS SubscriptionHealth
FROM Students s
INNER JOIN StudentSubscriptions ss ON s.StudentID = ss.StudentID
INNER JOIN SubscriptionPlans sp ON ss.PlanID = sp.PlanID
WHERE ss.SubscriptionStatus = 'Active';

-- View: Payment Summary
CREATE VIEW vw_PaymentSummary AS
SELECT 
    s.StudentID,
    s.StudentName,
    s.Email,
    COUNT(pt.TransactionID) AS TotalTransactions,
    SUM(CASE WHEN pt.PaymentStatus = 'Completed' THEN pt.Amount ELSE 0 END) AS TotalPaid,
    SUM(CASE WHEN pt.PaymentStatus = 'Failed' THEN 1 ELSE 0 END) AS FailedPayments,
    MAX(pt.TransactionDate) AS LastPaymentDate
FROM Students s
LEFT JOIN PaymentTransactions pt ON s.StudentID = pt.StudentID
GROUP BY s.StudentID, s.StudentName, s.Email;

-- Stored Procedure: Check and Update Expired Subscriptions
CREATE PROCEDURE sp_CheckExpiredSubscriptions
AS
BEGIN
    SET NOCOUNT ON;
    
    DECLARE @ExpiredCount INT = 0;
    
    -- Update expired subscriptions
    UPDATE StudentSubscriptions
    SET 
        SubscriptionStatus = 'Expired',
        UpdatedAt = GETDATE()
    WHERE 
        SubscriptionStatus = 'Active' 
        AND EndDate < GETDATE();
    
    SET @ExpiredCount = @@ROWCOUNT;
    
    -- Update student status to Inactive if their subscription expired
    UPDATE s
    SET 
        Status = 'Inactive',
        SubscriptionStatus = 'Expired'
    FROM Students s
    INNER JOIN StudentSubscriptions ss ON s.StudentID = ss.StudentID
    WHERE ss.SubscriptionStatus = 'Expired'
    AND s.Status = 'Active';
    
    -- Log the action
    INSERT INTO SubscriptionHistory (SubscriptionID, StudentID, Action, OldStatus, NewStatus, Note)
    SELECT 
        ss.SubscriptionID,
        ss.StudentID,
        'Expired',
        'Active',
        'Expired',
        'Subscription expired automatically'
    FROM StudentSubscriptions ss
    WHERE ss.SubscriptionStatus = 'Expired'
    AND ss.UpdatedAt >= DATEADD(MINUTE, -1, GETDATE());
    
    SELECT @ExpiredCount AS ExpiredSubscriptionsCount;
END;

-- Stored Procedure: Send Payment Reminders
CREATE PROCEDURE sp_SendPaymentReminders
AS
BEGIN
    SET NOCOUNT ON;
    
    -- Find subscriptions needing reminders
    -- 7 days before
    INSERT INTO PaymentReminders (StudentID, SubscriptionID, ReminderType)
    SELECT ss.StudentID, ss.SubscriptionID, '7DaysBefore'
    FROM StudentSubscriptions ss
    WHERE ss.SubscriptionStatus = 'Active'
    AND DATEDIFF(day, GETDATE(), ss.NextBillingDate) = 7
    AND NOT EXISTS (
        SELECT 1 FROM PaymentReminders pr 
        WHERE pr.SubscriptionID = ss.SubscriptionID 
        AND pr.ReminderType = '7DaysBefore'
        AND CAST(pr.SentDate AS DATE) = CAST(GETDATE() AS DATE)
    );
    
    -- 3 days before
    INSERT INTO PaymentReminders (StudentID, SubscriptionID, ReminderType)
    SELECT ss.StudentID, ss.SubscriptionID, '3DaysBefore'
    FROM StudentSubscriptions ss
    WHERE ss.SubscriptionStatus = 'Active'
    AND DATEDIFF(day, GETDATE(), ss.NextBillingDate) = 3
    AND NOT EXISTS (
        SELECT 1 FROM PaymentReminders pr 
        WHERE pr.SubscriptionID = ss.SubscriptionID 
        AND pr.ReminderType = '3DaysBefore'
        AND CAST(pr.SentDate AS DATE) = CAST(GETDATE() AS DATE)
    );
    
    -- 1 day before
    INSERT INTO PaymentReminders (StudentID, SubscriptionID, ReminderType)
    SELECT ss.StudentID, ss.SubscriptionID, '1DayBefore'
    FROM StudentSubscriptions ss
    WHERE ss.SubscriptionStatus = 'Active'
    AND DATEDIFF(day, GETDATE(), ss.NextBillingDate) = 1
    AND NOT EXISTS (
        SELECT 1 FROM PaymentReminders pr 
        WHERE pr.SubscriptionID = ss.SubscriptionID 
        AND pr.ReminderType = '1DayBefore'
        AND CAST(pr.SentDate AS DATE) = CAST(GETDATE() AS DATE)
    );
    
    -- On due date
    INSERT INTO PaymentReminders (StudentID, SubscriptionID, ReminderType)
    SELECT ss.StudentID, ss.SubscriptionID, 'DueDate'
    FROM StudentSubscriptions ss
    WHERE ss.SubscriptionStatus = 'Active'
    AND CAST(ss.NextBillingDate AS DATE) = CAST(GETDATE() AS DATE)
    AND NOT EXISTS (
        SELECT 1 FROM PaymentReminders pr 
        WHERE pr.SubscriptionID = ss.SubscriptionID 
        AND pr.ReminderType = 'DueDate'
        AND CAST(pr.SentDate AS DATE) = CAST(GETDATE() AS DATE)
    );
    
    SELECT @@ROWCOUNT AS RemindersCreated;
END;

PRINT 'Subscription and Payment tables created successfully!';
PRINT 'Run sp_CheckExpiredSubscriptions daily to check for expired subscriptions.';
PRINT 'Run sp_SendPaymentReminders daily to send payment reminders.';