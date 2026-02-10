-- Step 1: Add ExpireDate column to Students table
ALTER TABLE Students 
ADD COLUMN ExpireDate DATE NULL COMMENT 'Student membership expiration date';

-- Step 2: Update existing active students to have expire date 6 months from now
-- Using StudentID in WHERE clause to satisfy safe update mode
UPDATE Students 
SET ExpireDate = DATE_ADD(CURDATE(), INTERVAL 6 MONTH)
WHERE Status = 'Active' 
  AND StudentID > 0;

-- Step 3: Create index for querying expired students
CREATE INDEX idx_students_expire_date ON Students(ExpireDate);