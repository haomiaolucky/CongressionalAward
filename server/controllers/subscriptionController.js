const sql = require('mssql');

// Get all subscription plans
exports.getPlans = async (req, res) => {
    try {
        const pool = await sql.connect();
        const result = await pool.request()
            .query(`
                SELECT 
                    PlanID,
                    PlanName,
                    PlanType,
                    Price,
                    DurationDays,
                    Description,
                    IsActive
                FROM SubscriptionPlans
                WHERE IsActive = 1
                ORDER BY Price ASC
            `);
        
        res.json(result.recordset);
    } catch (error) {
        console.error('Error fetching subscription plans:', error);
        res.status(500).json({ error: 'Failed to fetch subscription plans' });
    }
};

// Get student's current subscription
exports.getStudentSubscription = async (req, res) => {
    try {
        const studentId = req.user.StudentID;
        const pool = await sql.connect();
        
        const result = await pool.request()
            .input('studentId', sql.Int, studentId)
            .query(`
                SELECT 
                    ss.SubscriptionID,
                    ss.StudentID,
                    ss.SubscriptionStatus,
                    ss.StartDate,
                    ss.EndDate,
                    ss.NextBillingDate,
                    ss.AutoRenew,
                    sp.PlanName,
                    sp.PlanType,
                    sp.Price,
                    DATEDIFF(day, GETDATE(), ss.EndDate) AS DaysRemaining
                FROM StudentSubscriptions ss
                INNER JOIN SubscriptionPlans sp ON ss.PlanID = sp.PlanID
                WHERE ss.StudentID = @studentId
                AND ss.SubscriptionStatus = 'Active'
            `);
        
        if (result.recordset.length > 0) {
            res.json(result.recordset[0]);
        } else {
            res.json(null);
        }
    } catch (error) {
        console.error('Error fetching student subscription:', error);
        res.status(500).json({ error: 'Failed to fetch subscription' });
    }
};

// Create a new subscription (after payment)
exports.createSubscription = async (req, res) => {
    try {
        const studentId = req.user.StudentID;
        const { planId, paymentMethod, paymentGatewayId } = req.body;
        
        const pool = await sql.connect();
        
        // Get plan details
        const planResult = await pool.request()
            .input('planId', sql.Int, planId)
            .query('SELECT * FROM SubscriptionPlans WHERE PlanID = @planId');
        
        if (planResult.recordset.length === 0) {
            return res.status(404).json({ error: 'Subscription plan not found' });
        }
        
        const plan = planResult.recordset[0];
        
        // Calculate dates based on plan type
        const startDate = new Date();
        let endDate, nextBillingDate;
        
        if (plan.PlanType === 'Monthly') {
            // Add 1 month using JavaScript
            endDate = new Date(startDate);
            endDate.setMonth(endDate.getMonth() + 1);
            nextBillingDate = new Date(endDate);
        } else if (plan.PlanType === 'Yearly') {
            // Add 1 year
            endDate = new Date(startDate);
            endDate.setFullYear(endDate.getFullYear() + 1);
            nextBillingDate = new Date(endDate);
        }
        
        // Start transaction
        const transaction = new sql.Transaction(pool);
        await transaction.begin();
        
        try {
            // 1. Create subscription record
            const subResult = await transaction.request()
                .input('studentId', sql.Int, studentId)
                .input('planId', sql.Int, planId)
                .input('startDate', sql.DateTime, startDate)
                .input('endDate', sql.DateTime, endDate)
                .input('nextBillingDate', sql.DateTime, nextBillingDate)
                .query(`
                    INSERT INTO StudentSubscriptions 
                    (StudentID, PlanID, SubscriptionStatus, StartDate, EndDate, NextBillingDate, AutoRenew)
                    OUTPUT INSERTED.SubscriptionID
                    VALUES (@studentId, @planId, 'Active', @startDate, @endDate, @nextBillingDate, 1)
                `);
            
            const subscriptionId = subResult.recordset[0].SubscriptionID;
            
            // 2. Create payment transaction record
            await transaction.request()
                .input('studentId', sql.Int, studentId)
                .input('subscriptionId', sql.Int, subscriptionId)
                .input('amount', sql.Decimal(10, 2), plan.Price)
                .input('paymentMethod', sql.NVarChar(50), paymentMethod)
                .input('paymentGatewayId', sql.NVarChar(255), paymentGatewayId)
                .input('description', sql.NVarChar(500), `Subscription: ${plan.PlanName}`)
                .query(`
                    INSERT INTO PaymentTransactions
                    (StudentID, SubscriptionID, Amount, PaymentMethod, PaymentStatus, PaymentGatewayID, Description)
                    VALUES (@studentId, @subscriptionId, @amount, @paymentMethod, 'Completed', @paymentGatewayId, @description)
                `);
            
            // 3. Update student status
            await transaction.request()
                .input('studentId', sql.Int, studentId)
                .query(`
                    UPDATE Students
                    SET Status = 'Active',
                        SubscriptionStatus = 'Active'
                    WHERE StudentID = @studentId
                `);
            
            // 4. Log subscription history
            await transaction.request()
                .input('subscriptionId', sql.Int, subscriptionId)
                .input('studentId', sql.Int, studentId)
                .query(`
                    INSERT INTO SubscriptionHistory
                    (SubscriptionID, StudentID, Action, NewStatus, Note)
                    VALUES (@subscriptionId, @studentId, 'Created', 'Active', 'New subscription created')
                `);
            
            await transaction.commit();
            
            res.json({
                success: true,
                subscriptionId,
                message: 'Subscription created successfully',
                subscription: {
                    startDate,
                    endDate,
                    nextBillingDate,
                    planName: plan.PlanName,
                    amount: plan.Price
                }
            });
            
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
        
    } catch (error) {
        console.error('Error creating subscription:', error);
        res.status(500).json({ error: 'Failed to create subscription' });
    }
};

// Cancel subscription
exports.cancelSubscription = async (req, res) => {
    try {
        const studentId = req.user.StudentID;
        const { reason } = req.body;
        
        const pool = await sql.connect();
        
        // Get active subscription
        const subResult = await pool.request()
            .input('studentId', sql.Int, studentId)
            .query(`
                SELECT SubscriptionID, SubscriptionStatus
                FROM StudentSubscriptions
                WHERE StudentID = @studentId
                AND SubscriptionStatus = 'Active'
            `);
        
        if (subResult.recordset.length === 0) {
            return res.status(404).json({ error: 'No active subscription found' });
        }
        
        const subscriptionId = subResult.recordset[0].SubscriptionID;
        
        // Update subscription
        await pool.request()
            .input('subscriptionId', sql.Int, subscriptionId)
            .input('reason', sql.NVarChar(500), reason || 'User cancelled')
            .query(`
                UPDATE StudentSubscriptions
                SET AutoRenew = 0,
                    CancelledAt = GETDATE(),
                    CancellationReason = @reason,
                    UpdatedAt = GETDATE()
                WHERE SubscriptionID = @subscriptionId
            `);
        
        // Log history
        await pool.request()
            .input('subscriptionId', sql.Int, subscriptionId)
            .input('studentId', sql.Int, studentId)
            .input('reason', sql.NVarChar(500), reason)
            .query(`
                INSERT INTO SubscriptionHistory
                (SubscriptionID, StudentID, Action, OldStatus, NewStatus, Note)
                VALUES (@subscriptionId, @studentId, 'Cancelled', 'Active', 'Active', @reason)
            `);
        
        res.json({
            success: true,
            message: 'Auto-renewal cancelled. Your subscription will remain active until the end date.'
        });
        
    } catch (error) {
        console.error('Error cancelling subscription:', error);
        res.status(500).json({ error: 'Failed to cancel subscription' });
    }
};

// Get payment history
exports.getPaymentHistory = async (req, res) => {
    try {
        const studentId = req.user.StudentID;
        const pool = await sql.connect();
        
        const result = await pool.request()
            .input('studentId', sql.Int, studentId)
            .query(`
                SELECT 
                    TransactionID,
                    Amount,
                    Currency,
                    PaymentMethod,
                    PaymentStatus,
                    TransactionDate,
                    Description
                FROM PaymentTransactions
                WHERE StudentID = @studentId
                ORDER BY TransactionDate DESC
            `);
        
        res.json(result.recordset);
    } catch (error) {
        console.error('Error fetching payment history:', error);
        res.status(500).json({ error: 'Failed to fetch payment history' });
    }
};

// Check trial status
exports.getTrialStatus = async (req, res) => {
    try {
        const studentId = req.user.StudentID;
        const pool = await sql.connect();
        
        const result = await pool.request()
            .input('studentId', sql.Int, studentId)
            .query(`
                SELECT 
                    SubscriptionStatus,
                    TrialEndDate,
                    DATEDIFF(day, GETDATE(), TrialEndDate) AS DaysRemainingInTrial
                FROM Students
                WHERE StudentID = @studentId
            `);
        
        if (result.recordset.length > 0) {
            const student = result.recordset[0];
            res.json({
                subscriptionStatus: student.SubscriptionStatus,
                trialEndDate: student.TrialEndDate,
                daysRemaining: student.DaysRemainingInTrial,
                isTrial: student.SubscriptionStatus === 'Trial'
            });
        } else {
            res.status(404).json({ error: 'Student not found' });
        }
    } catch (error) {
        console.error('Error fetching trial status:', error);
        res.status(500).json({ error: 'Failed to fetch trial status' });
    }
};

// Admin: Get all subscriptions
exports.getAllSubscriptions = async (req, res) => {
    try {
        const pool = await sql.connect();
        
        const result = await pool.request()
            .query(`
                SELECT 
                    ss.SubscriptionID,
                    s.StudentName,
                    s.Email,
                    sp.PlanName,
                    sp.PlanType,
                    sp.Price,
                    ss.SubscriptionStatus,
                    ss.StartDate,
                    ss.EndDate,
                    ss.NextBillingDate,
                    ss.AutoRenew,
                    DATEDIFF(day, GETDATE(), ss.EndDate) AS DaysRemaining
                FROM StudentSubscriptions ss
                INNER JOIN Students s ON ss.StudentID = s.StudentID
                INNER JOIN SubscriptionPlans sp ON ss.PlanID = sp.PlanID
                ORDER BY ss.CreatedAt DESC
            `);
        
        res.json(result.recordset);
    } catch (error) {
        console.error('Error fetching all subscriptions:', error);
        res.status(500).json({ error: 'Failed to fetch subscriptions' });
    }
};

// Admin: Get subscription statistics
exports.getSubscriptionStats = async (req, res) => {
    try {
        const pool = await sql.connect();
        
        const result = await pool.request()
            .query(`
                SELECT 
                    COUNT(CASE WHEN SubscriptionStatus = 'Active' THEN 1 END) AS ActiveSubscriptions,
                    COUNT(CASE WHEN SubscriptionStatus = 'Expired' THEN 1 END) AS ExpiredSubscriptions,
                    COUNT(CASE WHEN SubscriptionStatus = 'Cancelled' THEN 1 END) AS CancelledSubscriptions,
                    SUM(CASE WHEN SubscriptionStatus = 'Active' THEN sp.Price ELSE 0 END) AS MonthlyRevenue
                FROM StudentSubscriptions ss
                INNER JOIN SubscriptionPlans sp ON ss.PlanID = sp.PlanID
            `);
        
        res.json(result.recordset[0]);
    } catch (error) {
        console.error('Error fetching subscription stats:', error);
        res.status(500).json({ error: 'Failed to fetch statistics' });
    }
};