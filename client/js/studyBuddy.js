// Study Buddy functionality
class StudyBuddy {
    constructor() {
        this.currentTab = 'available';
        this.currentRequestId = null;
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadRequests();
    }

    bindEvents() {
        // Tab switching
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tab = e.target.dataset.tab;
                this.switchTab(tab);
            });
        });

        // Navigation to study buddy page
        document.querySelectorAll('[data-page="study-buddy"]').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                this.showStudyBuddyPage();
            });
        });

        // Create request modal
        const createRequestBtn = document.getElementById('createRequestBtn');
        if (createRequestBtn) {
            createRequestBtn.addEventListener('click', () => {
                this.showCreateRequestModal();
            });
        }

        // Close modals
        const closeRequestModal = document.getElementById('closeRequestModal');
        if (closeRequestModal) {
            closeRequestModal.addEventListener('click', () => {
                this.hideCreateRequestModal();
            });
        }

        const closeRespondModal = document.getElementById('closeRespondModal');
        if (closeRespondModal) {
            closeRespondModal.addEventListener('click', () => {
                this.hideRespondModal();
            });
        }

        // Form submissions
        const createRequestForm = document.getElementById('createRequestForm');
        if (createRequestForm) {
            createRequestForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.createRequest(e.target);
            });
        }

        const respondForm = document.getElementById('respondForm');
        if (respondForm) {
            respondForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.submitResponse(e.target);
            });
        }

        // Filters
        document.getElementById('subjectFilter')?.addEventListener('change', () => this.applyFilters());
        document.getElementById('helpTypeFilter')?.addEventListener('change', () => this.applyFilters());
        document.getElementById('urgencyFilter')?.addEventListener('change', () => this.applyFilters());
    }

    showStudyBuddyPage() {
        // Hide main content and show study buddy page
        document.querySelector('main').style.display = 'none';
        document.getElementById('studyBuddyPage').style.display = 'block';
        
        // Update navigation
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });
        document.querySelector('[data-page="study-buddy"]').classList.add('active');
        
        // Test authentication first
        this.testAuthentication();
    }

    async testAuthentication() {
        try {
            const token = localStorage.getItem('token');
            console.log('Token exists:', !!token);
            
            if (!token) {
                console.log('No token found, showing login required');
                this.showLoginRequired();
                return;
            }

            // Test authentication with debug endpoint
            const response = await fetch(`${API_BASE_URL}/api/study-buddy/debug-auth`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            console.log('Auth test response status:', response.status);
            
            if (response.ok) {
                const data = await response.json();
                console.log('Auth test successful:', data);
                this.loadRequests();
            } else {
                console.log('Auth test failed, clearing token');
                localStorage.removeItem('token');
                this.showLoginRequired();
            }
        } catch (error) {
            console.error('Auth test error:', error);
            localStorage.removeItem('token');
            this.showLoginRequired();
        }
    }

    hideStudyBuddyPage() {
        document.querySelector('main').style.display = 'block';
        document.getElementById('studyBuddyPage').style.display = 'none';
    }

    switchTab(tab) {
        this.currentTab = tab;
        
        // Update tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tab}"]`).classList.add('active');
        
        // Update tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(tab).classList.add('active');
        
        this.loadRequests();
    }

    async loadRequests() {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                this.showLoginRequired();
                return;
            }

            let endpoint = '/api/study-buddy';
            if (this.currentTab === 'my-requests') {
                endpoint = '/api/study-buddy/my-requests';
            } else if (this.currentTab === 'helping') {
                endpoint = '/api/study-buddy/helping';
            }

            const response = await fetch(`${API_BASE_URL}${endpoint}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.status === 401) {
                // Token expired or invalid
                localStorage.removeItem('token');
                this.showLoginRequired();
                return;
            }

            if (response.ok) {
                const data = await response.json();
                const requests = data.studyRequests || data;
                this.renderRequests(requests);
            } else {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to load requests');
            }
        } catch (error) {
            console.error('Error loading requests:', error);
            if (error.message.includes('401') || error.message.includes('unauthorized')) {
                localStorage.removeItem('token');
                this.showLoginRequired();
            } else {
                this.showError('Failed to load study requests: ' + error.message);
            }
        }
    }

    renderRequests(requests) {
        const containerId = this.currentTab === 'available' ? 'availableRequests' : 
                          this.currentTab === 'my-requests' ? 'myRequests' : 'helpingRequests';
        
        const container = document.getElementById(containerId);
        
        if (requests.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-graduation-cap"></i>
                    <h3>No ${this.currentTab.replace('-', ' ')} found</h3>
                    <p>
                        ${this.currentTab === 'available' ? 'No study requests available right now.' : 
                          this.currentTab === 'my-requests' ? 'You haven\'t created any study requests yet.' :
                          'You\'re not helping anyone right now.'}
                    </p>
                </div>
            `;
            return;
        }

        container.innerHTML = requests.map(request => this.createRequestCard(request)).join('');
    }

    createRequestCard(request) {
        const urgencyClass = `urgency-${request.urgency}`;
        const statusClass = `status-${request.status}`;
        const timeAgo = this.timeAgo(request.createdAt);
        const canHelp = this.currentTab === 'available';
        const isOwner = this.currentTab === 'my-requests';
        const isHelping = this.currentTab === 'helping';

        return `
            <div class="study-request-card">
                <div class="request-header">
                    <div class="request-title">
                        <h3>${request.topic}</h3>
                        <div class="request-meta">
                            <span class="meta-item">
                                <i class="fas fa-book"></i>
                                ${request.subject}
                            </span>
                            <span class="meta-item">
                                <i class="fas fa-user"></i>
                                ${request.requester?.name} (${request.requester?.branch})
                            </span>
                            <span class="meta-item">
                                <i class="fas fa-clock"></i>
                                ${timeAgo}
                            </span>
                            <span class="urgency-badge ${urgencyClass}">
                                ${request.urgency}
                            </span>
                            <span class="status-badge ${statusClass}">
                                ${request.status}
                            </span>
                        </div>
                    </div>
                </div>
                
                <div class="request-description">
                    ${request.description}
                </div>
                
                <div class="request-meta">
                    <span class="meta-item">
                        <i class="fas fa-tag"></i>
                        ${request.helpType.replace('-', ' ')}
                    </span>
                    <span class="meta-item">
                        <i class="fas fa-clock"></i>
                        ${request.preferredTime}
                    </span>
                    <span class="meta-item">
                        <i class="fas fa-video"></i>
                        ${request.meetingType}
                    </span>
                </div>
                
                <div class="request-actions">
                    ${canHelp ? `
                        <button class="action-btn help-btn" onclick="studyBuddy.showRespondModal('${request._id}')">
                            <i class="fas fa-hand-helping"></i>
                            Offer Help
                        </button>
                    ` : ''}
                    
                    ${isOwner && request.status === 'open' ? `
                        <button class="action-btn delete-btn" onclick="studyBuddy.deleteRequest('${request._id}')">
                            <i class="fas fa-trash"></i>
                            Delete
                        </button>
                    ` : ''}
                    
                    ${isOwner && request.status === 'matched' ? `
                        <button class="action-btn complete-btn" onclick="studyBuddy.completeRequest('${request._id}')">
                            <i class="fas fa-check"></i>
                            Mark Complete
                        </button>
                    ` : ''}
                </div>
                
                ${request.responses && request.responses.length > 0 && isOwner ? `
                    <div class="responses-section">
                        <h4><i class="fas fa-comments"></i> Responses (${request.responses.length})</h4>
                        ${request.responses.map(response => `
                            <div class="response-item">
                                <div class="response-header">
                                    <span class="responder-info">
                                        ${response.helper?.name} (${response.helper?.branch})
                                    </span>
                                    <div>
                                        <span class="response-time">${this.timeAgo(response.createdAt)}</span>
                                        ${request.status === 'open' ? `
                                            <button class="action-btn accept-btn" onclick="studyBuddy.acceptHelper('${request._id}', '${response.helper._id}')">
                                                <i class="fas fa-check"></i> Accept
                                            </button>
                                        ` : ''}
                                    </div>
                                </div>
                                <div class="response-message">${response.message}</div>
                            </div>
                        `).join('')}
                    </div>
                ` : ''}
            </div>
        `;
    }

    showCreateRequestModal() {
        document.getElementById('createRequestModal').style.display = 'flex';
    }

    hideCreateRequestModal() {
        document.getElementById('createRequestModal').style.display = 'none';
        document.getElementById('createRequestForm').reset();
    }

    showRespondModal(requestId) {
        this.currentRequestId = requestId;
        document.getElementById('respondModal').style.display = 'flex';
    }

    hideRespondModal() {
        document.getElementById('respondModal').style.display = 'none';
        document.getElementById('respondForm').reset();
        this.currentRequestId = null;
    }

    async createRequest(form) {
        try {
            const formData = new FormData(form);
            const requestData = {
                subject: formData.get('subject'),
                topic: formData.get('topic'),
                description: formData.get('description'),
                urgency: formData.get('urgency'),
                helpType: formData.get('helpType'),
                preferredTime: formData.get('preferredTime'),
                meetingType: formData.get('meetingType')
            };

            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/api/study-buddy`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(requestData)
            });

            if (response.ok) {
                this.hideCreateRequestModal();
                this.showSuccess('Study request created successfully!');
                this.switchTab('my-requests');
            } else {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to create request');
            }
        } catch (error) {
            console.error('Error creating request:', error);
            this.showError(error.message);
        }
    }

    async submitResponse(form) {
        try {
            const formData = new FormData(form);
            const responseData = {
                message: formData.get('message')
            };

            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/api/study-buddy/${this.currentRequestId}/respond`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(responseData)
            });

            if (response.ok) {
                this.hideRespondModal();
                this.showSuccess('Response sent successfully!');
                this.loadRequests();
            } else {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to send response');
            }
        } catch (error) {
            console.error('Error sending response:', error);
            this.showError(error.message);
        }
    }

    async acceptHelper(requestId, helperId) {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/api/study-buddy/${requestId}/accept/${helperId}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                this.showSuccess('Helper accepted! You can now start working together.');
                this.loadRequests();
            } else {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to accept helper');
            }
        } catch (error) {
            console.error('Error accepting helper:', error);
            this.showError(error.message);
        }
    }

    async completeRequest(requestId) {
        const rating = prompt('Rate your experience (1-5 stars):');
        const feedback = prompt('Any feedback? (optional)');

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/api/study-buddy/${requestId}/complete`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    rating: rating ? parseInt(rating) : undefined,
                    feedback: feedback || undefined
                })
            });

            if (response.ok) {
                this.showSuccess('Request marked as completed!');
                this.loadRequests();
            } else {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to complete request');
            }
        } catch (error) {
            console.error('Error completing request:', error);
            this.showError(error.message);
        }
    }

    async deleteRequest(requestId) {
        if (!confirm('Are you sure you want to delete this request?')) return;

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/api/study-buddy/${requestId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                this.showSuccess('Request deleted successfully!');
                this.loadRequests();
            } else {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to delete request');
            }
        } catch (error) {
            console.error('Error deleting request:', error);
            this.showError(error.message);
        }
    }

    applyFilters() {
        // This would filter the displayed requests based on selected filters
        // For now, we'll reload from server with filters
        this.loadRequests();
    }

    timeAgo(date) {
        const now = new Date();
        const postDate = new Date(date);
        const diffInSeconds = Math.floor((now - postDate) / 1000);

        if (diffInSeconds < 60) return 'Just now';
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} min ago`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
        if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)} days ago`;
        return postDate.toLocaleDateString();
    }

    showSuccess(message) {
        // Use existing notification system
        if (window.showNotification) {
            window.showNotification(message, 'success');
        } else {
            alert(message);
        }
    }

    showError(message) {
        // Use existing notification system
        if (window.showNotification) {
            window.showNotification(message, 'error');
        } else {
            alert(message);
        }
    }

    showLoginRequired() {
        // Hide the Study Buddy page and show main page
        document.querySelector('main').style.display = 'block';
        document.getElementById('studyBuddyPage').style.display = 'none';
        
        // Show the auth modal if it exists
        const authModal = document.getElementById('authModal');
        if (authModal) {
            authModal.style.display = 'flex';
        } else if (window.auth && typeof window.auth.showAuthModal === 'function') {
            window.auth.showAuthModal();
        } else {
            // Fallback: show a better message
            const loginBtn = document.querySelector('.nav-right button');
            if (loginBtn) {
                loginBtn.click();
            } else {
                alert('Please log in to access Study Buddy features');
            }
        }
    }
}

// Initialize Study Buddy when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.studyBuddy = new StudyBuddy();
});

// Handle navigation back to main feed
document.addEventListener('click', (e) => {
    if (e.target.matches('[data-page]:not([data-page="study-buddy"])') || 
        e.target.closest('[data-page]:not([data-page="study-buddy"])')) {
        
        const studyBuddyPage = document.getElementById('studyBuddyPage');
        if (studyBuddyPage && studyBuddyPage.style.display !== 'none') {
            studyBuddyPage.style.display = 'none';
            document.querySelector('main').style.display = 'block';
        }
    }
});
