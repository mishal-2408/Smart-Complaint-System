const API_URL = 'http://localhost:5000/api';

function showMessage(msg, isError = false) {
    const msgBox = document.getElementById('messageBox');
    if (!msgBox) return;

    msgBox.textContent = msg;
    msgBox.className = isError ? 'msg-error' : 'msg-success';
    msgBox.style.display = 'block';

    setTimeout(() => {
        msgBox.style.display = 'none';
    }, 4000);
}

function getUser() {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
}

function setUser(user) {
    localStorage.setItem('user', JSON.stringify(user));
}

function isAuthenticated() {
    return localStorage.getItem('user') !== null;
}

function logout() {
    localStorage.removeItem('user');
    window.location.href = 'login.html';
}

function formatDate(dateStr) {
    const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    return new Date(dateStr).toLocaleDateString(undefined, options);
}

function openImageModal(src) {
    const modal = document.getElementById("imageModal");
    const modalImg = document.getElementById("modalImage");
    if(modal && modalImg) {
        modal.style.display = "block";
        modalImg.src = src;
    } else {
        window.open(src, '_blank'); // fallback
    }
}

function closeModal() {
    const modal = document.getElementById("imageModal");
    if(modal) {
        modal.style.display = "none";
    }
}

async function registerUser(username, email, password, role) {
    try {
        const response = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password, role })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showMessage('Registration successful! Redirecting to login...');
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 1500);
        } else {
            showMessage(data.message || 'Registration failed', true);
        }
    } catch (error) {
        showMessage('Error connecting to server', true);
    }
}

async function loginUser(username, password) {
    try {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            if(data.user.role === 'admin') {
                return showMessage('Admins must use the Admin Login page', true);
            }
            setUser(data.user);
            window.location.href = 'dashboard.html';
        } else {
            showMessage(data.message || 'Login failed', true);
        }
    } catch (error) {
        showMessage('Error connecting to server', true);
    }
}

async function adminLoginUser(username, password) {
    try {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            if(data.user.role !== 'admin') {
                return showMessage('Access denied. Administrator account required.', true);
            }
            setUser(data.user);
            window.location.href = 'admin.html';
        } else {
            showMessage(data.message || 'Login failed', true);
        }
    } catch (error) {
        showMessage('Error connecting to server', true);
    }
}

async function submitComplaint(title, description, attachment) {
    const user = getUser();
    if (!user) return;

    try {
        const formData = new FormData();
        formData.append('title', title);
        formData.append('description', description);
        formData.append('userId', user._id);
        if (attachment) {
            formData.append('attachment', attachment);
        }

        const response = await fetch(`${API_URL}/complaints`, {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showMessage('Complaint submitted successfully!');
            // Reload list is handled in the frontend file
        } else {
            showMessage(data.message || 'Failed to submit complaint', true);
        }
    } catch (error) {
        showMessage('Error connecting to server', true);
    }
}

async function loadUserComplaints() {
    const user = getUser();
    const listContainer = document.getElementById('complaintsList');
    if (!user || !listContainer) return;

    try {
        const response = await fetch(`${API_URL}/complaints?userId=${user._id}`);
        const complaints = await response.json();
        
        listContainer.innerHTML = '';
        
        if(complaints.length === 0) {
            listContainer.innerHTML = '<p>No complaints submitted yet.</p>';
            return;
        }

        complaints.forEach(complaint => {
            const card = document.createElement('div');
            card.className = 'complaint-card';
            
            // Format status class name to remove spaces
            const statusClass = `status-${complaint.status.replace(/\s+/g, '')}`;
            const priorityClass = `priority-${complaint.priority}`;

            const attachmentHtml = complaint.attachment 
                ? `<div style="margin-bottom: 15px;"><img src="/${complaint.attachment}" alt="Attachment" style="max-width: 120px; max-height: 80px; margin-top: 10px; border-radius: 4px; border: 1px solid #ddd; object-fit: cover; cursor: pointer;" onclick="openImageModal('/${complaint.attachment}')"></div>` 
                : '';

            card.innerHTML = `
                <h3>${complaint.title}</h3>
                <p class="complaint-desc">${complaint.description}</p>
                ${attachmentHtml}
                <div class="meta-info">
                    <span>${formatDate(complaint.createdAt)}</span>
                    <div>
                        <span class="badge ${priorityClass}">${complaint.priority} Priority</span>
                        <span class="badge ${statusClass}">${complaint.status}</span>
                    </div>
                </div>
            `;
            listContainer.appendChild(card);
        });
    } catch (error) {
        listContainer.innerHTML = '<p class="msg-error">Error loading complaints.</p>';
    }
}

async function loadAdminComplaints(filterStatus = 'All') {
    const user = getUser();
    const tbody = document.getElementById('adminComplaintsList');
    if (!user || user.role !== 'admin' || !tbody) return;

    try {
        const response = await fetch(`${API_URL}/complaints?role=admin`);
        let complaints = await response.json();
        
        if (filterStatus !== 'All') {
            complaints = complaints.filter(c => c.status === filterStatus);
        }
        
        tbody.innerHTML = '';
        
        if(complaints.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" style="text-align: center;">No complaints found.</td></tr>`;
            return;
        }

        complaints.forEach(complaint => {
            const tr = document.createElement('tr');
            
            const statusClass = `status-${complaint.status.replace(/\s+/g, '')}`;
            const priorityClass = `priority-${complaint.priority}`;
            
            const username = complaint.userId ? complaint.userId.username : 'Unknown User';

            const attachmentLink = complaint.attachment 
                ? `<br><img src="/${complaint.attachment}" alt="Attachment" style="max-width: 120px; max-height: 80px; margin-top: 10px; border-radius: 4px; border: 1px solid #ddd; object-fit: cover; cursor: pointer;" onclick="openImageModal('/${complaint.attachment}')">` 
                : '';

            let descHtml = complaint.description;
            if (complaint.description.length > 50) {
                descHtml = `<details>
                                <summary style="cursor: pointer; color: var(--primary-color); outline: none;">${complaint.description.substring(0, 50)}... (Read more)</summary>
                                <div style="margin-top: 5px; white-space: pre-wrap; font-size: 13px; color: #555;">${complaint.description}</div>
                            </details>`;
            } else {
                descHtml = `<div style="white-space: pre-wrap;">${complaint.description}</div>`;
            }

            tr.innerHTML = `
                <td>${formatDate(complaint.createdAt)}</td>
                <td><strong>${username}</strong></td>
                <td>${complaint.title}</td>
                <td>${descHtml}${attachmentLink}</td>
                <td><span class="badge ${priorityClass}">${complaint.priority}</span></td>
                <td>
                    <select onchange="updateComplaintStatus('${complaint._id}', this.value)">
                        <option value="Pending" ${complaint.status === 'Pending' ? 'selected' : ''}>Pending</option>
                        <option value="In Progress" ${complaint.status === 'In Progress' ? 'selected' : ''}>In Progress</option>
                        <option value="Resolved" ${complaint.status === 'Resolved' ? 'selected' : ''}>Resolved</option>
                    </select>
                </td>
                <td>
                    <button class="btn btn-danger btn-small" onclick="deleteComplaint('${complaint._id}')">Delete</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (error) {
        tbody.innerHTML = `<tr><td colspan="7" class="msg-error">Error loading complaints.</td></tr>`;
    }
}

async function updateComplaintStatus(id, newStatus) {
    try {
        const response = await fetch(`${API_URL}/complaints/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus })
        });
        
        if (response.ok) {
            showMessage('Status updated successfully');
            loadStats(); // Refresh stats
        } else {
            showMessage('Failed to update status', true);
            // Reload to reset the dropdown visually if failed
            const filter = document.getElementById('statusFilter').value;
            loadAdminComplaints(filter);
        }
    } catch (error) {
        showMessage('Error connecting to server', true);
    }
}

async function deleteComplaint(id) {
    if (!confirm('Are you sure you want to delete this complaint?')) return;
    
    try {
        const response = await fetch(`${API_URL}/complaints/${id}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            showMessage('Complaint deleted');
            const filter = document.getElementById('statusFilter').value;
            loadAdminComplaints(filter);
            loadStats();
        } else {
            showMessage('Failed to delete complaint', true);
        }
    } catch (error) {
        showMessage('Error connecting to server', true);
    }
}

let statsChartInstance = null;

async function loadStats() {
    const statsContainer = document.getElementById('statsContainer');
    if (!statsContainer) return; // Only run on admin page

    try {
        const response = await fetch(`${API_URL}/complaints/stats`);
        const stats = await response.json();
        
        // Reset
        let pending = 0, inProgress = 0, resolved = 0;

        stats.forEach(stat => {
            if (stat._id === 'Pending') pending = stat.count;
            if (stat._id === 'In Progress') inProgress = stat.count;
            if (stat._id === 'Resolved') resolved = stat.count;
        });
        
        document.getElementById('statPending').textContent = pending;
        document.getElementById('statInProgress').textContent = inProgress;
        document.getElementById('statResolved').textContent = resolved;

        const ctx = document.getElementById('statsChart');
        if (ctx) {
            if (statsChartInstance) {
                statsChartInstance.data.datasets[0].data = [pending, inProgress, resolved];
                statsChartInstance.update();
            } else {
                statsChartInstance = new Chart(ctx, {
                    type: 'doughnut',
                    data: {
                        labels: ['Pending', 'In Progress', 'Resolved'],
                        datasets: [{
                            data: [pending, inProgress, resolved],
                            backgroundColor: ['#f39c12', '#4a90e2', '#2ecc71']
                        }]
                    },
                    options: { responsive: true, maintainAspectRatio: false }
                });
            }
        }
        
    } catch (error) {
        console.error('Failed to load stats');
    }
}
