const { pool } = require('../config/db');

// Get dashboard summary for student
const getDashboard = async (req, res) => {
  const userId = req.user.userId;

  try {
    // Get student info
    const [students] = await pool.query(
      'SELECT * FROM Students WHERE UserID = ?',
      [userId]
    );

    if (students.length === 0) {
      return res.status(404).json({ error: 'Student profile not found' });
    }

    const student = students[0];

    // Get hours summary from view
    const [summary] = await pool.query(
      'SELECT * FROM StudentHoursSummary WHERE StudentID = ?',
      [student.StudentID]
    );

    const stats = summary[0] || {
      VolunteerHours: 0,
      PersonalDevelopmentHours: 0,
      PhysicalFitnessHours: 0,
      ExpeditionCount: 0,
      PendingLogs: 0,
      ApprovedLogs: 0,
      RejectedLogs: 0
    };

    // Calculate next level requirements
    const nextLevel = calculateNextLevel(
      stats.VolunteerHours,
      stats.PersonalDevelopmentHours,
      stats.PhysicalFitnessHours,
      stats.ExpeditionCount
    );

    res.json({
      student: {
        studentId: student.StudentID,
        name: student.StudentName,
        grade: student.Grade,
        school: student.SchoolName,
        startDate: student.StartDate,
        currentLevel: student.CurrentLevel
      },
      hours: {
        volunteer: parseFloat(stats.VolunteerHours),
        personalDevelopment: parseFloat(stats.PersonalDevelopmentHours),
        physicalFitness: parseFloat(stats.PhysicalFitnessHours),
        expeditions: stats.ExpeditionCount
      },
      logStats: {
        pending: stats.PendingLogs,
        approved: stats.ApprovedLogs,
        rejected: stats.RejectedLogs,
        total: stats.PendingLogs + stats.ApprovedLogs + stats.RejectedLogs
      },
      nextLevel: nextLevel
    });

  } catch (error) {
    console.error('Get dashboard error:', error);
    res.status(500).json({ error: 'Failed to retrieve dashboard data' });
  }
};

// Calculate next level and requirements
function calculateNextLevel(volunteer, pd, pf, expeditions) {
  const levels = [
    {
      name: 'Bronze Certificate',
      requirements: { volunteer: 30, pd: 15, pf: 15, expeditions: 1 }
    },
    {
      name: 'Silver Certificate',
      requirements: { volunteer: 60, pd: 30, pf: 30, expeditions: 2 }
    },
    {
      name: 'Gold Certificate',
      requirements: { volunteer: 90, pd: 45, pf: 45, expeditions: 3 }
    },
    {
      name: 'Bronze Medal',
      requirements: { volunteer: 100, pd: 50, pf: 50, expeditions: 1 }
    },
    {
      name: 'Silver Medal',
      requirements: { volunteer: 200, pd: 100, pf: 100, expeditions: 2 }
    },
    {
      name: 'Gold Medal',
      requirements: { volunteer: 400, pd: 200, pf: 200, expeditions: 4 }
    }
  ];

  // Find the next level student hasn't achieved yet
  for (const level of levels) {
    const req = level.requirements;
    if (volunteer < req.volunteer || pd < req.pd || pf < req.pf || expeditions < req.expeditions) {
      return {
        name: level.name,
        requirements: req,
        remaining: {
          volunteer: Math.max(0, req.volunteer - volunteer),
          personalDevelopment: Math.max(0, req.pd - pd),
          physicalFitness: Math.max(0, req.pf - pf),
          expeditions: Math.max(0, req.expeditions - expeditions)
        },
        progress: {
          volunteer: Math.min(100, (volunteer / req.volunteer) * 100),
          personalDevelopment: Math.min(100, (pd / req.pd) * 100),
          physicalFitness: Math.min(100, (pf / req.pf) * 100),
          expeditions: Math.min(100, (expeditions / req.expeditions) * 100)
        }
      };
    }
  }

  // Already achieved Gold Medal
  return {
    name: 'Gold Medal (Achieved)',
    requirements: levels[5].requirements,
    remaining: {
      volunteer: 0,
      personalDevelopment: 0,
      physicalFitness: 0,
      expeditions: 0
    },
    progress: {
      volunteer: 100,
      personalDevelopment: 100,
      physicalFitness: 100,
      expeditions: 100
    }
  };
}

// Get available activities
const getActivities = async (req, res) => {
  try {
    const [activities] = await pool.query(
      `SELECT a.ActivityID, a.ActivityName, a.Category, a.Description, 
       a.Location, a.Price, a.ApplyLink,
       s.SupervisorID, s.SupervisorName
       FROM Activities a
       LEFT JOIN Supervisors s ON a.DefaultSupervisorID = s.SupervisorID
       WHERE a.IsActive = TRUE
       ORDER BY a.Category, a.ActivityName`
    );

    res.json(activities);
  } catch (error) {
    console.error('Get activities error:', error);
    res.status(500).json({ error: 'Failed to retrieve activities' });
  }
};

// Get available supervisors
const getSupervisors = async (req, res) => {
  try {
    const [supervisors] = await pool.query(
      `SELECT SupervisorID, SupervisorName, Email, Role
       FROM Supervisors
       WHERE IsActive = TRUE
       ORDER BY SupervisorName`
    );

    res.json(supervisors);
  } catch (error) {
    console.error('Get supervisors error:', error);
    res.status(500).json({ error: 'Failed to retrieve supervisors' });
  }
};

module.exports = {
  getDashboard,
  getActivities,
  getSupervisors
};