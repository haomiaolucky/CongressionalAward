// Admin Dashboard JavaScript

const token = localStorage.getItem('token');
let allStudents = [];
let allSupervisors = [];
let allActivities = [];
let allLogs = [];

// Check authentication
if (!token) {
    window.location.href = '/login';
}

// API helper
async function apiCall(url, options = {}) {
    const defaultOptions = {
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    };
    
    const response = await fetch(url, { ...defaultOptions, ...options });
    
    if (response.status === 401 || response.status === 403) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
        return;
    }
    
    return response;
}

// Load dashboard
async function loadDashboard() {
    try {
        // Get user info
        const userResponse = await apiCall('/api/auth/me');
        const user = await userResponse.json();
        
        if (user.Role !== 'Admin') {
            alert('Access denied. Admin only.');
            window.location.href = '/dashboard';
            return;
        }
        
        document.getElementById('adminEmail').textContent = user.Email;
        
        // Load stats
        await loadStats();
        
        // Load all data
        await Promise.all([
            loadPendingUsers(),
            loadStudents(),
            loadSupervisors(),
            loadActivities(),
            loadAdminUsers()
        ]);
        
        document.getElementById('loading').style.display = 'none';
        document.getElementById('content').style.display = 'block';
    } catch (error) {
        console.error('Error loading dashboard:', error);
        alert('Failed to load dashboard');
    }
}

// Load statistics
async function loadStats() {
    try {
        const response = await apiCall('/api/admin/stats');
        const stats = await response.json();
        
        document.getElementById('totalStudents').textContent = stats.totalStudents;
        document.getElementById('pendingApprovals').textContent = stats.pendingApprovals;
        document.getElementById('activeActivities').textContent = stats.activeActivities;
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

// Load pending users
async function loadPendingUsers() {
    try {
        const response = await apiCall('/api/admin/pending-users');
        const users = await response.json();
        
        const tbody = document.getElementById('pendingBody');
        
        if (users.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center">No pending approvals</td></tr>';
            return;
        }
        
        tbody.innerHTML = users.map(user => `
            <tr>
                <td>${user.StudentName}</td>
                <td>${user.Email}</td>
                <td>${user.Grade}</td>
                <td>${user.SchoolName}</td>
                <td>${new Date(user.CreatedAt).toLocaleDateString()}</td>
                <td>
                    <div class="action-buttons">
                        <button class="btn btn-success btn-sm" onclick="approveUser(${user.UserID})">✓ Approve</button>
                        <button class="btn btn-danger btn-sm" onclick="rejectUser(${user.UserID})">✗ Reject</button>
                    </div>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Error loading pending users:', error);
    }
}

// Load students
async function loadStudents() {
    try {
        const response = await apiCall('/api/admin/students');
        allStudents = await response.json();
        displayStudents(allStudents);
    } catch (error) {
        console.error('Error loading students:', error);
    }
}

function displayStudents(students) {
    const tbody = document.getElementById('studentsBody');
    
    if (students.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center">No students found</td></tr>';
        return;
    }
    
    tbody.innerHTML = students.map(student => `
        <tr>
            <td>${student.StudentName}</td>
            <td>${student.Email}</td>
            <td>${student.Grade}</td>
            <td>${student.CurrentLevel || 'In Progress'}</td>
            <td><span class="badge badge-${student.StudentStatus === 'Active' ? 'active' : 'inactive'}">${student.StudentStatus === 'Active' ? 'Active' : 'Inactive'}</span></td>
            <td>
                <div class="action-buttons">
                    ${student.StudentStatus !== 'Active' ? 
                        `<button class="btn btn-success btn-sm" onclick="activateStudent(${student.StudentID})">Activate</button>` :
                        `<button class="btn btn-warning btn-sm" onclick="deactivateStudent(${student.StudentID})">Deactivate</button>`
                    }
                </div>
            </td>
        </tr>
    `).join('');
}

// Load supervisors
async function loadSupervisors() {
    try {
        const response = await apiCall('/api/admin/supervisors');
        allSupervisors = await response.json();
        displaySupervisors(allSupervisors);
        updateSupervisorDropdown();
    } catch (error) {
        console.error('Error loading supervisors:', error);
    }
}

function displaySupervisors(supervisors) {
    const tbody = document.getElementById('supervisorsBody');
    
    if (supervisors.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center">No supervisors found</td></tr>';
        return;
    }
    
    tbody.innerHTML = supervisors.map(sup => `
        <tr>
            <td>${sup.SupervisorName}</td>
            <td>${sup.Email}</td>
            <td>${sup.Role || 'N/A'}</td>
            <td><span class="badge badge-${sup.IsActive ? 'active' : 'inactive'}">${sup.IsActive ? 'Active' : 'Inactive'}</span></td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-primary btn-sm" onclick="editSupervisor(${sup.SupervisorID})">Edit</button>
                    <button class="btn btn-danger btn-sm" onclick="deleteSupervisor(${sup.SupervisorID})">Delete</button>
                </div>
            </td>
        </tr>
    `).join('');
}

function updateSupervisorDropdown() {
    const select = document.getElementById('activitySupervisor');
    select.innerHTML = '<option value="">None</option>' + 
        allSupervisors
            .filter(s => s.IsActive)
            .map(s => `<option value="${s.SupervisorID}">${s.SupervisorName}</option>`)
            .join('');
}

// Load activities
async function loadActivities() {
    try {
        const response = await apiCall('/api/admin/activities');
        allActivities = await response.json();
        // Sort: Active first, then Inactive
        const sortedActivities = allActivities.sort((a, b) => {
            if (a.IsActive === b.IsActive) return 0;
            return a.IsActive ? -1 : 1;
        });
        displayActivities(sortedActivities);
    } catch (error) {
        console.error('Error loading activities:', error);
    }
}

function displayActivities(activities) {
    const tbody = document.getElementById('activitiesBody');
    
    if (activities.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center">No activities found</td></tr>';
        return;
    }
    
    tbody.innerHTML = activities.map(act => {
        const description = act.Description || 'No description available';
        const location = act.Location || 'N/A';
        const link = act.ApplyLink || '';
        
        return `
        <tr class="activity-row" data-activity-id="${act.ActivityID}">
            <td>
                <span class="activity-name-expandable" onclick="toggleActivityDetails(${act.ActivityID})">
                    <span class="expand-icon">▶</span> ${act.ActivityName}
                </span>
            </td>
            <td>${act.Category}</td>
            <td>${act.SupervisorName || 'N/A'}</td>
            <td>$${parseFloat(act.Price || 0).toFixed(2)}</td>
            <td><span class="badge badge-${act.IsActive ? 'active' : 'inactive'}">${act.IsActive ? 'Active' : 'Inactive'}</span></td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-primary btn-sm" onclick="editActivity(${act.ActivityID})">Edit</button>
                    ${act.IsActive ? 
                        `<button class="btn btn-warning btn-sm" onclick="deactivateActivity(${act.ActivityID})">Inactive</button>` :
                        `<button class="btn btn-success btn-sm" onclick="activateActivity(${act.ActivityID})">Active</button>`
                    }
                </div>
            </td>
        </tr>
        <tr class="activity-details" id="details-${act.ActivityID}" style="display: none;">
            <td colspan="6" style="background: #f8f9fa; padding: 1rem; border-left: 3px solid #0066cc;">
                <div style="display: grid; grid-template-columns: auto 1fr; gap: 0.5rem 1rem; max-width: 800px;">
                    <strong>Description:</strong>
                    <span>${description}</span>
                    
                    <strong>Location:</strong>
                    <span>${location}</span>
                    
                    ${link ? `
                    <strong>Apply Link:</strong>
                    <span><a href="${link}" target="_blank" style="color: #0066cc;">${link}</a></span>
                    ` : ''}
                </div>
            </td>
        </tr>
        `;
    }).join('');
}

// Helper function to escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Toggle activity details
function toggleActivityDetails(activityId) {
    const detailsRow = document.getElementById(`details-${activityId}`);
    const activityRow = document.querySelector(`tr[data-activity-id="${activityId}"]`);
    const icon = activityRow.querySelector('.expand-icon');
    
    if (detailsRow.style.display === 'none') {
        // Close all other details first
        document.querySelectorAll('.activity-details').forEach(row => {
            row.style.display = 'none';
        });
        document.querySelectorAll('.expand-icon').forEach(ico => {
            ico.textContent = '▶';
        });
        
        // Open this one
        detailsRow.style.display = 'table-row';
        icon.textContent = '▼';
    } else {
        // Close this one
        detailsRow.style.display = 'none';
        icon.textContent = '▶';
    }
}

// Load admin users
async function loadAdminUsers() {
    try {
        const response = await apiCall('/api/admin/admin-users');
        const admins = await response.json();
        
        const tbody = document.getElementById('adminsBody');
        
        if (admins.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center">No admin users found</td></tr>';
            return;
        }
        
        tbody.innerHTML = admins.map(admin => `
            <tr>
                <td>${admin.Email}</td>
                <td>${admin.Name || 'N/A'}</td>
                <td>${admin.CreatedByEmail || 'System'}</td>
                <td>${new Date(admin.CreatedAt).toLocaleDateString()}</td>
                <td><span class="badge badge-${admin.IsActive ? 'active' : 'inactive'}">${admin.IsActive ? 'Active' : 'Inactive'}</span></td>
                <td>
                    <div class="action-buttons">
                        ${admin.IsActive ? 
                            `<button class="btn btn-warning btn-sm" onclick="deactivateAdmin(${admin.AdminID})">Deactivate</button>` :
                            `<button class="btn btn-success btn-sm" onclick="activateAdmin(${admin.AdminID})">Activate</button>`
                        }
                    </div>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Error loading admin users:', error);
    }
}

// User actions
async function approveUser(userId) {
    if (!confirm('Approve this student registration?')) return;
    
    try {
        const response = await apiCall(`/api/admin/approve-user/${userId}`, {
            method: 'PUT'
        });
        
        if (response.ok) {
            alert('Student approved successfully');
            await loadPendingUsers();
            await loadStats();
            await loadStudents();
        } else {
            const error = await response.json();
            alert(error.error || 'Failed to approve student');
        }
    } catch (error) {
        console.error('Error approving user:', error);
        alert('Failed to approve student');
    }
}

async function rejectUser(userId) {
    if (!confirm('Reject this student registration?')) return;
    
    try {
        const response = await apiCall(`/api/admin/reject-user/${userId}`, {
            method: 'PUT'
        });
        
        if (response.ok) {
            alert('Student registration rejected');
            await loadPendingUsers();
            await loadStats();
        } else {
            const error = await response.json();
            alert(error.error || 'Failed to reject student');
        }
    } catch (error) {
        console.error('Error rejecting user:', error);
        alert('Failed to reject student');
    }
}

async function activateStudent(studentId) {
    if (!confirm('Activate this student?')) return;
    
    try {
        const response = await apiCall(`/api/admin/students/${studentId}/activate`, {
            method: 'PUT'
        });
        
        if (response.ok) {
            alert('Student activated successfully');
            await loadStudents();
        } else {
            const error = await response.json();
            alert(error.error || 'Failed to activate student');
        }
    } catch (error) {
        console.error('Error activating student:', error);
        alert('Failed to activate student');
    }
}

async function deactivateStudent(studentId) {
    if (!confirm('Deactivate this student?')) return;
    
    try {
        const response = await apiCall(`/api/admin/students/${studentId}/deactivate`, {
            method: 'PUT'
        });
        
        if (response.ok) {
            alert('Student deactivated successfully');
            await loadStudents();
        } else {
            const error = await response.json();
            alert(error.error || 'Failed to deactivate student');
        }
    } catch (error) {
        console.error('Error deactivating student:', error);
        alert('Failed to deactivate student');
    }
}

// Supervisor modal functions
function showAddSupervisorModal() {
    document.getElementById('supervisorModalTitle').textContent = 'Add Supervisor';
    document.getElementById('supervisorForm').reset();
    document.getElementById('supervisorId').value = '';
    document.getElementById('supervisorModal').classList.add('active');
}

function closeSupervisorModal() {
    document.getElementById('supervisorModal').classList.remove('active');
}

function editSupervisor(supervisorId) {
    const supervisor = allSupervisors.find(s => s.SupervisorID === supervisorId);
    if (!supervisor) return;
    
    document.getElementById('supervisorModalTitle').textContent = 'Edit Supervisor';
    document.getElementById('supervisorId').value = supervisor.SupervisorID;
    document.getElementById('supervisorName').value = supervisor.SupervisorName;
    document.getElementById('supervisorEmail').value = supervisor.Email;
    document.getElementById('supervisorRole').value = supervisor.Role || '';
    document.getElementById('supervisorModal').classList.add('active');
}

document.getElementById('supervisorForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const supervisorId = document.getElementById('supervisorId').value;
    const data = {
        supervisorName: document.getElementById('supervisorName').value,
        email: document.getElementById('supervisorEmail').value,
        role: document.getElementById('supervisorRole').value
    };
    
    try {
        const url = supervisorId ? 
            `/api/admin/supervisors/${supervisorId}` : 
            '/api/admin/supervisors';
        const method = supervisorId ? 'PUT' : 'POST';
        
        const response = await apiCall(url, {
            method: method,
            body: JSON.stringify(data)
        });
        
        if (response.ok) {
            alert(supervisorId ? 'Supervisor updated successfully' : 'Supervisor added successfully');
            closeSupervisorModal();
            await loadSupervisors();
        } else {
            const error = await response.json();
            alert(error.error || 'Operation failed');
        }
    } catch (error) {
        console.error('Error saving supervisor:', error);
        alert('Failed to save supervisor');
    }
});

async function deleteSupervisor(supervisorId) {
    if (!confirm('Delete this supervisor? They will be deactivated if they have associated records.')) return;
    
    try {
        const response = await apiCall(`/api/admin/supervisors/${supervisorId}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            const result = await response.json();
            alert(result.message);
            await loadSupervisors();
        } else {
            const error = await response.json();
            alert(error.error || 'Failed to delete supervisor');
        }
    } catch (error) {
        console.error('Error deleting supervisor:', error);
        alert('Failed to delete supervisor');
    }
}

// Activity modal functions
function showAddActivityModal() {
    document.getElementById('activityModalTitle').textContent = 'Add Activity';
    document.getElementById('activityForm').reset();
    document.getElementById('activityId').value = '';
    document.getElementById('activityModal').classList.add('active');
}

function closeActivityModal() {
    document.getElementById('activityModal').classList.remove('active');
}

function editActivity(activityId) {
    const activity = allActivities.find(a => a.ActivityID === activityId);
    if (!activity) return;
    
    document.getElementById('activityModalTitle').textContent = 'Edit Activity';
    document.getElementById('activityId').value = activity.ActivityID;
    document.getElementById('activityName').value = activity.ActivityName;
    document.getElementById('activityCategory').value = activity.Category;
    document.getElementById('activitySupervisor').value = activity.DefaultSupervisorID || '';
    document.getElementById('activityDescription').value = activity.Description || '';
    document.getElementById('activityLocation').value = activity.Location || '';
    document.getElementById('activityPrice').value = activity.Price || 0;
    document.getElementById('activityLink').value = activity.ApplyLink || '';
    document.getElementById('activityModal').classList.add('active');
}

document.getElementById('activityForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const activityId = document.getElementById('activityId').value;
    const data = {
        activityName: document.getElementById('activityName').value,
        category: document.getElementById('activityCategory').value,
        defaultSupervisorId: document.getElementById('activitySupervisor').value || null,
        description: document.getElementById('activityDescription').value,
        location: document.getElementById('activityLocation').value,
        price: parseFloat(document.getElementById('activityPrice').value) || 0,
        applyLink: document.getElementById('activityLink').value
    };
    
    try {
        const url = activityId ? 
            `/api/admin/activities/${activityId}` : 
            '/api/admin/activities';
        const method = activityId ? 'PUT' : 'POST';
        
        const response = await apiCall(url, {
            method: method,
            body: JSON.stringify(data)
        });
        
        if (response.ok) {
            alert(activityId ? 'Activity updated successfully' : 'Activity added successfully');
            closeActivityModal();
            await loadActivities();
            await loadStats();
        } else {
            const error = await response.json();
            alert(error.error || 'Operation failed');
        }
    } catch (error) {
        console.error('Error saving activity:', error);
        alert('Failed to save activity');
    }
});

async function activateActivity(activityId) {
    if (!confirm('Activate this activity?')) return;
    
    try {
        const activity = allActivities.find(a => a.ActivityID === activityId);
        const data = {
            activityName: activity.ActivityName,
            category: activity.Category,
            defaultSupervisorId: activity.DefaultSupervisorID,
            description: activity.Description,
            location: activity.Location,
            price: activity.Price,
            applyLink: activity.ApplyLink,
            isActive: true
        };
        
        const response = await apiCall(`/api/admin/activities/${activityId}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
        
        if (response.ok) {
            alert('Activity activated successfully');
            await loadActivities();
            await loadStats();
        } else {
            const error = await response.json();
            alert(error.error || 'Failed to activate activity');
        }
    } catch (error) {
        console.error('Error activating activity:', error);
        alert('Failed to activate activity');
    }
}

async function deactivateActivity(activityId) {
    if (!confirm('Deactivate this activity?')) return;
    
    try {
        const activity = allActivities.find(a => a.ActivityID === activityId);
        const data = {
            activityName: activity.ActivityName,
            category: activity.Category,
            defaultSupervisorId: activity.DefaultSupervisorID,
            description: activity.Description,
            location: activity.Location,
            price: activity.Price,
            applyLink: activity.ApplyLink,
            isActive: false
        };
        
        const response = await apiCall(`/api/admin/activities/${activityId}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
        
        if (response.ok) {
            alert('Activity deactivated successfully');
            await loadActivities();
            await loadStats();
        } else {
            const error = await response.json();
            alert(error.error || 'Failed to deactivate activity');
        }
    } catch (error) {
        console.error('Error deactivating activity:', error);
        alert('Failed to deactivate activity');
    }
}

async function deleteActivity(activityId) {
    if (!confirm('Delete this activity? If it has associated logs, it will only be deactivated.')) return;
    
    try {
        const response = await apiCall(`/api/admin/activities/${activityId}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            const result = await response.json();
            alert(result.message);
            await loadActivities();
            await loadStats();
        } else {
            const error = await response.json();
            alert(error.error || 'Failed to delete activity');
        }
    } catch (error) {
        console.error('Error deleting activity:', error);
        alert('Failed to delete activity');
    }
}

// Admin modal functions
function showAddAdminModal() {
    document.getElementById('adminForm').reset();
    document.getElementById('adminModal').classList.add('active');
}

function closeAdminModal() {
    document.getElementById('adminModal').classList.remove('active');
}

document.getElementById('adminForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const data = {
        email: document.getElementById('adminEmail2').value,
        name: document.getElementById('adminName').value
    };
    
    try {
        const response = await apiCall('/api/admin/admin-users', {
            method: 'POST',
            body: JSON.stringify(data)
        });
        
        if (response.ok) {
            const result = await response.json();
            alert(result.message);
            closeAdminModal();
            await loadAdminUsers();
        } else {
            const error = await response.json();
            alert(error.error || 'Failed to add admin user');
        }
    } catch (error) {
        console.error('Error adding admin user:', error);
        alert('Failed to add admin user');
    }
});

async function activateAdmin(adminId) {
    if (!confirm('Activate this admin user?')) return;
    
    try {
        const response = await apiCall(`/api/admin/admin-users/${adminId}/activate`, {
            method: 'PUT'
        });
        
        if (response.ok) {
            alert('Admin user activated successfully');
            await loadAdminUsers();
        } else {
            const error = await response.json();
            alert(error.error || 'Failed to activate admin user');
        }
    } catch (error) {
        console.error('Error activating admin user:', error);
        alert('Failed to activate admin user');
    }
}

async function deactivateAdmin(adminId) {
    if (!confirm('Deactivate this admin user?')) return;
    
    try {
        const response = await apiCall(`/api/admin/admin-users/${adminId}/deactivate`, {
            method: 'PUT'
        });
        
        if (response.ok) {
            alert('Admin user deactivated successfully');
            await loadAdminUsers();
        } else {
            const error = await response.json();
            alert(error.error || 'Failed to deactivate admin user');
        }
    } catch (error) {
        console.error('Error deactivating admin user:', error);
        alert('Failed to deactivate admin user');
    }
}

// Load hour logs
async function loadHourLogs() {
    try {
        const response = await apiCall('/api/admin/logs');
        allLogs = await response.json();
        
        // Populate student filter dropdown
        const studentFilter = document.getElementById('logStudentFilter');
        const uniqueStudents = [...new Set(allLogs.map(log => log.StudentName))].sort();
        studentFilter.innerHTML = '<option value="">All Students</option>' +
            uniqueStudents.map(name => `<option value="${name}">${name}</option>`).join('');
        
        // Populate activity filter dropdown
        const activityFilter = document.getElementById('logActivityFilter');
        const uniqueActivities = [...new Set(allLogs.map(log => log.ActivityName))].sort();
        activityFilter.innerHTML = '<option value="">All Activities</option>' +
            uniqueActivities.map(name => `<option value="${name}">${name}</option>`).join('');
        
        displayLogs(allLogs);
    } catch (error) {
        console.error('Error loading logs:', error);
    }
}

function displayLogs(logs) {
    const tbody = document.getElementById('logsBody');
    
    if (logs.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center">No logs found</td></tr>';
        return;
    }
    
    tbody.innerHTML = logs.map(log => `
        <tr>
            <td>${log.StudentName}</td>
            <td>${log.ActivityName}</td>
            <td>${log.Category}</td>
            <td>${new Date(log.Date).toLocaleDateString()}</td>
            <td>${log.Hours}</td>
            <td>${log.SupervisorName}</td>
            <td><span class="badge badge-${log.Status === 'Approved' ? 'active' : log.Status === 'Pending' ? 'pending' : 'inactive'}">${log.Status}</span></td>
        </tr>
    `).join('');
}

// Log filters
document.getElementById('logStudentFilter').addEventListener('change', filterLogs);
document.getElementById('logActivityFilter').addEventListener('change', filterLogs);
document.getElementById('logCategoryFilter').addEventListener('change', filterLogs);
document.getElementById('logStatusFilter').addEventListener('change', filterLogs);

function filterLogs() {
    const studentFilter = document.getElementById('logStudentFilter').value;
    const activityFilter = document.getElementById('logActivityFilter').value;
    const categoryFilter = document.getElementById('logCategoryFilter').value;
    const statusFilter = document.getElementById('logStatusFilter').value;
    
    const filtered = allLogs.filter(log => {
        const matchesStudent = !studentFilter || log.StudentName === studentFilter;
        const matchesActivity = !activityFilter || log.ActivityName === activityFilter;
        const matchesCategory = !categoryFilter || log.Category === categoryFilter;
        const matchesStatus = !statusFilter || log.Status === statusFilter;
        return matchesStudent && matchesActivity && matchesCategory && matchesStatus;
    });
    
    displayLogs(filtered);
}

// Tab switching
document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
        const targetTab = tab.dataset.tab;
        
        // Update active tab
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        
        // Update active content
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        document.getElementById(`${targetTab}-tab`).classList.add('active');
        
        // Load logs when logs tab is clicked
        if (targetTab === 'logs' && allLogs.length === 0) {
            loadHourLogs();
        }
    });
});

// Student search and filter
document.getElementById('studentSearch').addEventListener('input', filterStudents);
document.getElementById('studentStatusFilter').addEventListener('change', filterStudents);

function filterStudents() {
    const searchTerm = document.getElementById('studentSearch').value.toLowerCase();
    const statusFilter = document.getElementById('studentStatusFilter').value;
    
    const filtered = allStudents.filter(student => {
        const matchesSearch = student.StudentName.toLowerCase().includes(searchTerm) ||
                            student.Email.toLowerCase().includes(searchTerm);
        const matchesStatus = !statusFilter || student.StudentStatus === statusFilter;
        return matchesSearch && matchesStatus;
    });
    
    displayStudents(filtered);
}

// Logout
document.getElementById('logoutBtn').addEventListener('click', (e) => {
    e.preventDefault();
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
});

// Initialize
loadDashboard();