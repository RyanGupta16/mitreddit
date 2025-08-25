// API Service Module
class APIService {
    constructor() {
        // Automatically detect the current host and port for global compatibility
        const currentLocation = window.location;
        const isLocalhost = currentLocation.hostname === 'localhost' || currentLocation.hostname === '127.0.0.1';
        
        // In development/localhost, use the server port (usually 5000)
        // In production, use the same domain as the frontend
        if (isLocalhost) {
            this.baseURL = `${currentLocation.protocol}//${currentLocation.hostname}:5000/api`;
        } else {
            this.baseURL = `${currentLocation.protocol}//${currentLocation.host}/api`;
        }
        
        this.authToken = this.getAuthToken();
        
        console.log('API Service initialized with baseURL:', this.baseURL);
    }
    
    // Authentication methods
    getAuthToken() {
        try {
            const userData = localStorage.getItem('mitRedditUser');
            if (userData) {
                const user = JSON.parse(userData);
                return user.token || null;
            }
        } catch (error) {
            console.error('Error getting auth token:', error);
        }
        return null;
    }
    
    setAuthToken(token) {
        this.authToken = token;
    }
    
    // HTTP request wrapper
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        };
        
        // Add authentication token if available
        if (this.authToken) {
            config.headers['Authorization'] = `Bearer ${this.authToken}`;
        }
        
        try {
            const response = await fetch(url, config);
            
            // Handle HTTP errors
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
            }
            
            // Handle different content types
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                return await response.json();
            } else {
                return await response.text();
            }
        } catch (error) {
            console.error(`API request failed: ${endpoint}`, error);
            
            // Handle network errors
            if (error.name === 'TypeError' && error.message.includes('fetch')) {
                throw new Error('Network error: Please check your internet connection');
            }
            
            throw error;
        }
    }
    
    // Convenience methods
    async get(endpoint, params = {}) {
        const queryString = new URLSearchParams(params).toString();
        const url = queryString ? `${endpoint}?${queryString}` : endpoint;
        return this.request(url, { method: 'GET' });
    }
    
    async post(endpoint, data) {
        return this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }
    
    async put(endpoint, data) {
        return this.request(endpoint, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }
    
    async delete(endpoint) {
        return this.request(endpoint, { method: 'DELETE' });
    }
    
    async uploadFile(endpoint, file, additionalData = {}) {
        const formData = new FormData();
        formData.append('file', file);
        
        // Add additional data
        Object.keys(additionalData).forEach(key => {
            formData.append(key, additionalData[key]);
        });
        
        return this.request(endpoint, {
            method: 'POST',
            headers: {
                // Don't set Content-Type for FormData - browser will set it with boundary
                'Authorization': this.authToken ? `Bearer ${this.authToken}` : undefined
            },
            body: formData
        });
    }
    
    // Authentication API calls
    async login(credentials) {
        try {
            const response = await this.post('/auth/login', credentials);
            if (response.token) {
                this.setAuthToken(response.token);
            }
            return response;
        } catch (error) {
            throw new Error(error.message || 'Login failed');
        }
    }
    
    async signup(userData) {
        try {
            const response = await this.post('/auth/signup', userData);
            if (response.token) {
                this.setAuthToken(response.token);
            }
            return response;
        } catch (error) {
            throw new Error(error.message || 'Registration failed');
        }
    }
    
    async logout() {
        try {
            await this.post('/auth/logout');
        } catch (error) {
            console.error('Logout API call failed:', error);
        } finally {
            this.setAuthToken(null);
        }
    }
    
    async refreshToken() {
        try {
            const response = await this.post('/auth/refresh');
            if (response.token) {
                this.setAuthToken(response.token);
            }
            return response;
        } catch (error) {
            throw new Error('Token refresh failed');
        }
    }
    
    // Posts API calls
    async getPosts(params = {}) {
        const defaultParams = {
            page: 1,
            limit: 10,
            sort: 'hot'
        };
        return this.get('/posts', { ...defaultParams, ...params });
    }
    
    async getPost(postId) {
        return this.get(`/posts/${postId}`);
    }
    
    async createPost(postData) {
        return this.post('/posts', postData);
    }
    
    async updatePost(postId, postData) {
        return this.put(`/posts/${postId}`, postData);
    }
    
    async deletePost(postId) {
        return this.delete(`/posts/${postId}`);
    }
    
    async votePost(postId, voteType) {
        return this.post(`/posts/${postId}/vote`, { type: voteType });
    }
    
    async savePost(postId) {
        return this.post(`/posts/${postId}/save`);
    }
    
    async unsavePost(postId) {
        return this.delete(`/posts/${postId}/save`);
    }
    
    async reportPost(postId, reason) {
        return this.post(`/posts/${postId}/report`, { reason });
    }
    
    // Comments API calls
    async getComments(postId, params = {}) {
        return this.get(`/posts/${postId}/comments`, params);
    }
    
    async createComment(postId, commentData) {
        return this.post(`/posts/${postId}/comments`, commentData);
    }
    
    async updateComment(commentId, commentData) {
        return this.put(`/comments/${commentId}`, commentData);
    }
    
    async deleteComment(commentId) {
        return this.delete(`/comments/${commentId}`);
    }
    
    async voteComment(commentId, voteType) {
        return this.post(`/comments/${commentId}/vote`, { type: voteType });
    }
    
    // User API calls
    async getUserProfile(username) {
        return this.get(`/users/${username}`);
    }
    
    async updateProfile(profileData) {
        return this.put('/users/profile', profileData);
    }
    
    async uploadAvatar(file) {
        return this.uploadFile('/users/avatar', file);
    }
    
    async getUserPosts(username, params = {}) {
        return this.get(`/users/${username}/posts`, params);
    }
    
    async getUserComments(username, params = {}) {
        return this.get(`/users/${username}/comments`, params);
    }
    
    async getSavedPosts(params = {}) {
        return this.get('/users/saved', params);
    }
    
    // Search API calls
    async search(query, params = {}) {
        return this.get('/search', { q: query, ...params });
    }
    
    async searchPosts(query, params = {}) {
        return this.get('/search/posts', { q: query, ...params });
    }
    
    async searchUsers(query, params = {}) {
        return this.get('/search/users', { q: query, ...params });
    }
    
    // Categories and topics
    async getCategories() {
        return this.get('/categories');
    }
    
    async getTrendingTopics() {
        return this.get('/trending');
    }
    
    async getCategoryPosts(category, params = {}) {
        return this.get(`/categories/${category}/posts`, params);
    }
    
    // Events API calls
    async getEvents(params = {}) {
        return this.get('/events', params);
    }
    
    async createEvent(eventData) {
        return this.post('/events', eventData);
    }
    
    async getEvent(eventId) {
        return this.get(`/events/${eventId}`);
    }
    
    async joinEvent(eventId) {
        return this.post(`/events/${eventId}/join`);
    }
    
    async leaveEvent(eventId) {
        return this.delete(`/events/${eventId}/join`);
    }
    
    // News API calls
    async getNews(params = {}) {
        return this.get('/news', params);
    }
    
    async getNewsItem(newsId) {
        return this.get(`/news/${newsId}`);
    }
    
    // Restaurants API calls
    async getRestaurants(params = {}) {
        return this.get('/restaurants', params);
    }
    
    async getRestaurant(restaurantId) {
        return this.get(`/restaurants/${restaurantId}`);
    }
    
    async rateRestaurant(restaurantId, rating, review = '') {
        return this.post(`/restaurants/${restaurantId}/reviews`, { rating, review });
    }
    
    async getRestaurantReviews(restaurantId, params = {}) {
        return this.get(`/restaurants/${restaurantId}/reviews`, params);
    }
    
    // Notifications API calls
    async getNotifications(params = {}) {
        return this.get('/notifications', params);
    }
    
    async markNotificationRead(notificationId) {
        return this.put(`/notifications/${notificationId}/read`);
    }
    
    async markAllNotificationsRead() {
        return this.put('/notifications/read-all');
    }
    
    // Admin API calls (if user has admin privileges)
    async getReports(params = {}) {
        return this.get('/admin/reports', params);
    }
    
    async handleReport(reportId, action, reason = '') {
        return this.post(`/admin/reports/${reportId}/handle`, { action, reason });
    }
    
    async getStats() {
        return this.get('/admin/stats');
    }
    
    // Utility methods
    isOnline() {
        return navigator.onLine;
    }
    
    async healthCheck() {
        try {
            await this.get('/health');
            return true;
        } catch (error) {
            return false;
        }
    }
    
    // Error handling
    handleError(error) {
        console.error('API Error:', error);
        
        // Show user-friendly error messages
        if (error.message.includes('Network error')) {
            window.mitReddit?.showToast('Please check your internet connection', 'error');
        } else if (error.message.includes('401')) {
            window.mitReddit?.showToast('Session expired. Please login again.', 'error');
            // Redirect to login
            window.authManager?.logout();
        } else if (error.message.includes('403')) {
            window.mitReddit?.showToast('You don\'t have permission to perform this action', 'error');
        } else if (error.message.includes('404')) {
            window.mitReddit?.showToast('Requested resource not found', 'error');
        } else if (error.message.includes('500')) {
            window.mitReddit?.showToast('Server error. Please try again later.', 'error');
        } else {
            window.mitReddit?.showToast(error.message || 'An error occurred', 'error');
        }
        
        return error;
    }
}

// Offline support
class OfflineManager {
    constructor(apiService) {
        this.api = apiService;
        this.cache = new Map();
        this.pendingRequests = [];
        
        this.bindEvents();
    }
    
    bindEvents() {
        window.addEventListener('online', () => this.handleOnline());
        window.addEventListener('offline', () => this.handleOffline());
    }
    
    handleOnline() {
        console.log('Connection restored');
        window.mitReddit?.showToast('Connection restored', 'success');
        
        // Process pending requests
        this.processPendingRequests();
    }
    
    handleOffline() {
        console.log('Connection lost');
        window.mitReddit?.showToast('You\'re offline. Some features may be limited.', 'warning');
    }
    
    async processPendingRequests() {
        while (this.pendingRequests.length > 0) {
            const request = this.pendingRequests.shift();
            try {
                await this.api.request(request.endpoint, request.options);
            } catch (error) {
                console.error('Failed to process pending request:', error);
            }
        }
    }
    
    cacheData(key, data) {
        this.cache.set(key, {
            data,
            timestamp: Date.now()
        });
    }
    
    getCachedData(key, maxAge = 5 * 60 * 1000) { // 5 minutes default
        const cached = this.cache.get(key);
        if (!cached) return null;
        
        if (Date.now() - cached.timestamp > maxAge) {
            this.cache.delete(key);
            return null;
        }
        
        return cached.data;
    }
    
    addPendingRequest(endpoint, options) {
        this.pendingRequests.push({ endpoint, options });
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.apiService = new APIService();
    window.offlineManager = new OfflineManager(window.apiService);
    
    // Check server health on load
    window.apiService.healthCheck().then(isHealthy => {
        if (!isHealthy) {
            console.warn('Server health check failed - running in mock mode');
        }
    });
});
