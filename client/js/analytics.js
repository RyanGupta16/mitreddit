// Analytics tracking and dashboard functionality
class Analytics {
    constructor() {
        this.isAdmin = false;
        this.refreshInterval = null;
        this.init();
    }

    init() {
        this.bindEvents();
        this.startPageTracking();
        this.checkAdminStatus();
    }

    bindEvents() {
        // Navigation to analytics page
        document.querySelectorAll('[data-page="analytics"]').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                this.showAnalyticsPage();
            });
        });

        // Refresh analytics data
        const refreshBtn = document.getElementById('refreshAnalytics');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.loadDashboardData();
            });
        }

        // Export analytics data
        const exportBtn = document.getElementById('exportAnalytics');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                this.exportAnalyticsData();
            });
        }

        // Track page visibility changes
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                this.trackPageView();
            }
        });
    }

    async checkAdminStatus() {
        try {
            const token = localStorage.getItem('token');
            if (!token) return;

            const response = await fetch(`${API_BASE_URL}/api/users/profile`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const user = await response.json();
                this.isAdmin = user.role === 'admin';
                
                if (this.isAdmin) {
                    document.querySelectorAll('.admin-only').forEach(element => {
                        element.classList.add('show');
                    });
                }
            }
        } catch (error) {
            console.error('Error checking admin status:', error);
        }
    }

    startPageTracking() {
        // Track initial page view
        this.trackPageView();

        // Track time spent on page
        this.pageStartTime = Date.now();
        
        // Track when user leaves the page
        window.addEventListener('beforeunload', () => {
            const duration = Math.round((Date.now() - this.pageStartTime) / 1000);
            this.trackEvent('page_view', {
                page: this.getCurrentPage(),
                duration: duration
            });
        });

        // Track navigation within the site
        document.addEventListener('click', (e) => {
            if (e.target.matches('[data-page]') || e.target.closest('[data-page]')) {
                setTimeout(() => {
                    this.trackPageView();
                    this.pageStartTime = Date.now();
                }, 100);
            }
        });
    }

    getCurrentPage() {
        const activeLink = document.querySelector('.nav-link.active');
        return activeLink ? activeLink.dataset.page || 'home' : 'home';
    }

    async trackPageView() {
        await this.trackEvent('page_view', {
            page: this.getCurrentPage(),
            userAgent: navigator.userAgent,
            referrer: document.referrer,
            timestamp: new Date().toISOString()
        });
    }

    async trackEvent(type, metadata = {}) {
        try {
            await fetch(`${API_BASE_URL}/api/analytics/track`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    type,
                    ...metadata
                })
            });
        } catch (error) {
            console.error('Error tracking event:', error);
        }
    }

    showAnalyticsPage() {
        if (!this.isAdmin) {
            alert('Access denied. Admin privileges required.');
            return;
        }

        // Hide main content and show analytics page
        document.querySelector('main').style.display = 'none';
        document.getElementById('studyBuddyPage').style.display = 'none';
        document.getElementById('analyticsPage').style.display = 'block';
        
        // Update navigation
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });
        document.querySelector('[data-page="analytics"]').classList.add('active');
        
        this.loadDashboardData();
        this.startRealtimeUpdates();
    }

    hideAnalyticsPage() {
        document.querySelector('main').style.display = 'block';
        document.getElementById('analyticsPage').style.display = 'none';
        this.stopRealtimeUpdates();
    }

    async loadDashboardData() {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/api/analytics/dashboard`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.updateDashboard(data);
            } else {
                throw new Error('Failed to load dashboard data');
            }
        } catch (error) {
            console.error('Error loading dashboard data:', error);
            this.showError('Failed to load analytics data');
        }
    }

    updateDashboard(data) {
        // Update overview cards
        document.getElementById('totalUsers').textContent = data.overview.totalUsers;
        document.getElementById('totalPosts').textContent = data.overview.totalPosts;
        document.getElementById('totalComments').textContent = data.overview.totalComments;
        document.getElementById('weeklyPageViews').textContent = data.overview.weeklyPageViews;
        
        document.getElementById('todayUsers').textContent = `+${data.overview.todayUsers} today`;
        document.getElementById('todayPosts').textContent = `+${data.overview.todayPosts} today`;
        document.getElementById('todayComments').textContent = `+${data.overview.todayComments} today`;
        document.getElementById('todayPageViews').textContent = `${data.overview.todayPageViews} today`;

        // Update device stats
        this.updateDeviceStats(data.deviceStats);
        
        // Update popular pages
        this.updatePopularPages(data.popularPages);
        
        // Update active users
        this.updateActiveUsers(data.activeUsers);
    }

    updateDeviceStats(deviceStats) {
        const container = document.getElementById('deviceStats');
        
        if (!deviceStats || deviceStats.length === 0) {
            container.innerHTML = '<p>No device data available</p>';
            return;
        }

        const total = deviceStats.reduce((sum, item) => sum + item.count, 0);
        
        container.innerHTML = deviceStats.map(device => {
            const percentage = ((device.count / total) * 100).toFixed(1);
            const icon = device._id === 'mobile' ? 'fa-mobile-alt' : 
                        device._id === 'tablet' ? 'fa-tablet-alt' : 'fa-desktop';
            
            return `
                <div class="device-item">
                    <span class="device-name">
                        <i class="fas ${icon}"></i>
                        ${device._id || 'Unknown'}
                    </span>
                    <span class="device-count">${device.count} (${percentage}%)</span>
                </div>
            `;
        }).join('');
    }

    updatePopularPages(popularPages) {
        const container = document.getElementById('popularPages');
        
        if (!popularPages || popularPages.length === 0) {
            container.innerHTML = '<p>No page view data available</p>';
            return;
        }

        container.innerHTML = `
            <div class="popular-pages-table">
                ${popularPages.map(page => `
                    <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid var(--reddit-border);">
                        <span class="page-name">${page._id || 'Home'}</span>
                        <span class="page-views">${page.count} views</span>
                    </div>
                `).join('')}
            </div>
        `;
    }

    updateActiveUsers(activeUsers) {
        const container = document.getElementById('activeUsers');
        
        if (!activeUsers || activeUsers.length === 0) {
            container.innerHTML = '<p>No active user data available</p>';
            return;
        }

        container.innerHTML = `
            <div class="active-users-table">
                ${activeUsers.map(user => `
                    <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid var(--reddit-border);">
                        <span class="user-name">${user.user?.name || 'Anonymous'}</span>
                        <span class="user-activity">${user.activityCount} actions</span>
                    </div>
                `).join('')}
            </div>
        `;
    }

    async loadRealtimeData() {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/api/analytics/realtime`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                this.updateRealtimeData(data);
            }
        } catch (error) {
            console.error('Error loading realtime data:', error);
        }
    }

    updateRealtimeData(data) {
        document.getElementById('realtimeActiveUsers').textContent = data.activeUsers;
        document.getElementById('realtimePageViews').textContent = data.recentPageViews;
        
        const container = document.getElementById('recentActivity');
        
        if (data.recentActivity && data.recentActivity.length > 0) {
            container.innerHTML = data.recentActivity.map(activity => `
                <div class="activity-item">
                    <div class="activity-info">
                        <span class="activity-type">${this.formatActivityType(activity.type)}</span>
                        <span class="activity-user">${activity.userId?.name || 'Anonymous'}</span>
                    </div>
                    <span class="activity-time">${this.timeAgo(activity.date)}</span>
                </div>
            `).join('');
        } else {
            container.innerHTML = '<p>No recent activity</p>';
        }
    }

    formatActivityType(type) {
        const types = {
            'page_view': 'Page View',
            'user_signup': 'User Signup',
            'user_login': 'User Login',
            'post_created': 'Post Created',
            'comment_created': 'Comment Created',
            'study_request_created': 'Study Request Created',
            'search_performed': 'Search Performed'
        };
        return types[type] || type;
    }

    startRealtimeUpdates() {
        this.loadRealtimeData();
        this.refreshInterval = setInterval(() => {
            this.loadRealtimeData();
        }, 30000); // Update every 30 seconds
    }

    stopRealtimeUpdates() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
    }

    async exportAnalyticsData() {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_BASE_URL}/api/analytics/export`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.style.display = 'none';
                a.href = url;
                a.download = `analytics_export_${new Date().toISOString().split('T')[0]}.csv`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
                
                this.showSuccess('Analytics data exported successfully!');
            } else {
                throw new Error('Failed to export data');
            }
        } catch (error) {
            console.error('Error exporting analytics data:', error);
            this.showError('Failed to export analytics data');
        }
    }

    timeAgo(date) {
        const now = new Date();
        const postDate = new Date(date);
        const diffInSeconds = Math.floor((now - postDate) / 1000);

        if (diffInSeconds < 60) return 'Just now';
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} min ago`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
        return postDate.toLocaleDateString();
    }

    showSuccess(message) {
        if (window.showNotification) {
            window.showNotification(message, 'success');
        } else {
            alert(message);
        }
    }

    showError(message) {
        if (window.showNotification) {
            window.showNotification(message, 'error');
        } else {
            alert(message);
        }
    }
}

// Track user actions for analytics
function trackUserAction(action, metadata = {}) {
    if (window.analytics) {
        window.analytics.trackEvent(action, metadata);
    }
}

// Initialize Analytics when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.analytics = new Analytics();
});

// Handle navigation back to main feed
document.addEventListener('click', (e) => {
    if (e.target.matches('[data-page]:not([data-page="analytics"])') || 
        e.target.closest('[data-page]:not([data-page="analytics"])')) {
        
        const analyticsPage = document.getElementById('analyticsPage');
        if (analyticsPage && analyticsPage.style.display !== 'none') {
            analyticsPage.style.display = 'none';
            document.querySelector('main').style.display = 'block';
            if (window.analytics) {
                window.analytics.stopRealtimeUpdates();
            }
        }
    }
});
