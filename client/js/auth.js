// Authentication Management Module
class AuthManager {
    constructor() {
        this.currentUser = null;
        this.bindAuthEvents();
    }
    
    bindAuthEvents() {
        // Tab switching
        document.querySelectorAll('.auth-tabs .tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchAuthTab(e.target.dataset.tab);
            });
        });
        
        document.querySelectorAll('.switch-tab').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                this.switchAuthTab(e.target.dataset.tab);
            });
        });
        
        // Form submissions
        const loginForm = document.getElementById('loginForm');
        const signupForm = document.getElementById('signupForm');
        
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }
        
        if (signupForm) {
            signupForm.addEventListener('submit', (e) => this.handleSignup(e));
        }
        
        // Email validation for all domains
        const emailInputs = document.querySelectorAll('input[type="email"]');
        emailInputs.forEach(input => {
            input.addEventListener('blur', (e) => this.validateEmailFormat(e.target));
        });
        
        // Password strength indicator
        const passwordInputs = document.querySelectorAll('input[type="password"]');
        passwordInputs.forEach(input => {
            if (input.placeholder === 'Password') {
                input.addEventListener('input', (e) => this.checkPasswordStrength(e.target));
            }
        });
        
        // Password confirmation
        const confirmPasswordInput = document.querySelector('input[placeholder="Confirm Password"]');
        if (confirmPasswordInput) {
            confirmPasswordInput.addEventListener('input', (e) => this.validatePasswordConfirmation(e.target));
        }
    }
    
    switchAuthTab(tab) {
        // Update tab buttons
        document.querySelectorAll('.auth-tabs .tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tab}"]`).classList.add('active');
        
        // Update form visibility
        document.querySelectorAll('.auth-form').forEach(form => {
            form.classList.remove('active');
        });
        document.getElementById(`${tab}Form`).classList.add('active');
        
        // Clear any error messages
        this.clearValidationErrors();
    }
    
    async handleLogin(event) {
        event.preventDefault();
        
        const formData = new FormData(event.target);
        const loginData = {
            email: formData.get('email') || event.target.querySelector('input[type="email"]').value,
            password: formData.get('password') || event.target.querySelector('input[type="password"]').value
        };
        
        // Client-side validation
        if (!this.validateLoginForm(loginData)) {
            return;
        }
        
        try {
            // Show loading state
            const submitBtn = event.target.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<div class="loading-spinner"></div> Signing in...';
            
            // Attempt login
            const user = await this.authenticateUser(loginData);
            
            // Success
            this.currentUser = user;
            this.saveUserSession(user);
            this.updateUIForLoggedInUser(user);
            
            window.mitReddit.currentUser = user;
            window.mitReddit.hideLoginModal();
            window.mitReddit.showToast(`Welcome back, ${user.name}!`, 'success');
            
        } catch (error) {
            console.error('Login error:', error);
            this.showAuthError(error.message);
        } finally {
            // Reset button state
            const submitBtn = event.target.querySelector('button[type="submit"]');
            submitBtn.disabled = false;
            submitBtn.textContent = 'Log In';
        }
    }
    
    async handleSignup(event) {
        event.preventDefault();
        
        const inputs = event.target.querySelectorAll('input, select');
        const signupData = {
            name: inputs[0].value.trim(),
            email: inputs[1].value.trim(),
            branch: inputs[2].value,
            year: inputs[3].value,
            password: inputs[4].value,
            confirmPassword: inputs[5].value
        };
        
        // Client-side validation
        if (!this.validateSignupForm(signupData)) {
            return;
        }
        
        try {
            // Show loading state
            const submitBtn = event.target.querySelector('button[type="submit"]');
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<div class="loading-spinner"></div> Creating account...';
            
            // Create account
            const user = await this.createUser(signupData);
            
            // Success
            this.currentUser = user;
            this.saveUserSession(user);
            this.updateUIForLoggedInUser(user);
            
            window.mitReddit.currentUser = user;
            window.mitReddit.hideLoginModal();
            window.mitReddit.showToast(`Welcome to MIT Reddit, ${user.name}!`, 'success');
            
        } catch (error) {
            console.error('Signup error:', error);
            this.showAuthError(error.message);
        } finally {
            // Reset button state
            const submitBtn = event.target.querySelector('button[type="submit"]');
            submitBtn.disabled = false;
            submitBtn.textContent = 'Sign Up';
        }
    }
    
    validateLoginForm(data) {
        this.clearValidationErrors();
        let isValid = true;
        
        // Email validation
        if (!data.email) {
            this.showFieldError('email', 'Email is required');
            isValid = false;
        } else if (!this.isValidEmail(data.email)) {
            this.showFieldError('email', 'Please enter a valid email address');
            isValid = false;
        }
        
        // Password validation
        if (!data.password) {
            this.showFieldError('password', 'Password is required');
            isValid = false;
        } else if (data.password.length < 6) {
            this.showFieldError('password', 'Password must be at least 6 characters');
            isValid = false;
        }
        
        return isValid;
    }
    
    validateSignupForm(data) {
        this.clearValidationErrors();
        let isValid = true;
        
        // Name validation
        if (!data.name) {
            this.showFieldError('name', 'Full name is required');
            isValid = false;
        } else if (data.name.length < 2) {
            this.showFieldError('name', 'Name must be at least 2 characters');
            isValid = false;
        }
        
        // Email validation
        if (!data.email) {
            this.showFieldError('email', 'Email is required');
            isValid = false;
        } else if (!this.isValidEmail(data.email)) {
            this.showFieldError('email', 'Please enter a valid email address');
            isValid = false;
        }
        
        // Branch validation
        if (!data.branch) {
            this.showFieldError('branch', 'Please select your branch');
            isValid = false;
        }
        
        // Year validation
        if (!data.year) {
            this.showFieldError('year', 'Please select your year');
            isValid = false;
        }
        
        // Password validation
        if (!data.password) {
            this.showFieldError('password', 'Password is required');
            isValid = false;
        } else if (data.password.length < 8) {
            this.showFieldError('password', 'Password must be at least 8 characters');
            isValid = false;
        } else if (!this.isStrongPassword(data.password)) {
            this.showFieldError('password', 'Password must contain at least one uppercase letter, one lowercase letter, and one number');
            isValid = false;
        }
        
        // Password confirmation validation
        if (!data.confirmPassword) {
            this.showFieldError('confirmPassword', 'Please confirm your password');
            isValid = false;
        } else if (data.password !== data.confirmPassword) {
            this.showFieldError('confirmPassword', 'Passwords do not match');
            isValid = false;
        }
        
        return isValid;
    }
    
    validateEmailFormat(input) {
        const email = input.value.trim();
        
        if (email && !this.isValidEmail(email)) {
            this.showInputWarning(input, 'Please enter a valid email address');
            return false;
        } else {
            this.clearInputWarning(input);
            return true;
        }
    }
    
    checkPasswordStrength(input) {
        const password = input.value;
        const strengthIndicator = this.getOrCreatePasswordStrengthIndicator(input);
        
        let strength = 0;
        let feedback = [];
        
        if (password.length >= 8) strength++;
        else feedback.push('At least 8 characters');
        
        if (password.match(/[a-z]/)) strength++;
        else feedback.push('One lowercase letter');
        
        if (password.match(/[A-Z]/)) strength++;
        else feedback.push('One uppercase letter');
        
        if (password.match(/[0-9]/)) strength++;
        else feedback.push('One number');
        
        if (password.match(/[^A-Za-z0-9]/)) strength++;
        else feedback.push('One special character');
        
        // Update strength indicator
        const strengthLevels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong'];
        const strengthColors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#16a34a'];
        
        strengthIndicator.textContent = strengthLevels[Math.min(strength, 4)];
        strengthIndicator.style.color = strengthColors[Math.min(strength, 4)];
        
        // Show feedback
        if (feedback.length > 0) {
            this.showInputInfo(input, `Missing: ${feedback.join(', ')}`);
        } else {
            this.clearInputInfo(input);
        }
    }
    
    validatePasswordConfirmation(input) {
        const password = document.querySelector('input[placeholder="Password"]').value;
        const confirmPassword = input.value;
        
        if (confirmPassword && password !== confirmPassword) {
            this.showInputError(input, 'Passwords do not match');
            return false;
        } else {
            this.clearInputError(input);
            return true;
        }
    }
    
    async authenticateUser(credentials) {
        try {
            // Use the actual API service for authentication
            const response = await window.mitReddit.api.post('/auth/login', credentials);
            
            // The API returns user data in the 'data' field
            if (response.success && response.data) {
                // Update the API service with the new token
                window.mitReddit.api.setAuthToken(response.data.token);
                return response.data;
            } else {
                throw new Error(response.message || 'Login failed');
            }
        } catch (error) {
            console.error('Authentication error:', error);
            throw error;
        }
    }
    
    async createUser(userData) {
        try {
            // Use the actual API service for user registration
            const response = await window.mitReddit.api.post('/auth/signup', userData);
            
            // The API returns user data in the 'data' field
            if (response.success && response.data) {
                // Update the API service with the new token
                window.mitReddit.api.setAuthToken(response.data.token);
                return response.data;
            } else {
                throw new Error(response.message || 'Signup failed');
            }
        } catch (error) {
            console.error('User creation error:', error);
            throw error;
        }
    }
    
    generateUsername(name) {
        const cleanName = name.toLowerCase().replace(/[^a-z0-9]/g, '_');
        const randomSuffix = Math.floor(Math.random() * 100);
        return `${cleanName}_${randomSuffix}`;
    }
    
    saveUserSession(user) {
        try {
            localStorage.setItem('mitRedditUser', JSON.stringify(user));
            localStorage.setItem('mitRedditAuthTime', Date.now().toString());
        } catch (error) {
            console.error('Error saving user session:', error);
        }
    }
    
    loadUserSession() {
        try {
            const userData = localStorage.getItem('mitRedditUser');
            const authTime = localStorage.getItem('mitRedditAuthTime');
            
            if (!userData || !authTime) return null;
            
            // Check if session is expired (30 days)
            const sessionAge = Date.now() - parseInt(authTime);
            const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
            
            if (sessionAge > maxAge) {
                this.clearUserSession();
                return null;
            }
            
            return JSON.parse(userData);
        } catch (error) {
            console.error('Error loading user session:', error);
            this.clearUserSession();
            return null;
        }
    }
    
    clearUserSession() {
        try {
            localStorage.removeItem('mitRedditUser');
            localStorage.removeItem('mitRedditAuthTime');
        } catch (error) {
            console.error('Error clearing user session:', error);
        }
    }
    
    logout() {
        this.currentUser = null;
        this.clearUserSession();
        
        // Update UI
        const avatar = document.getElementById('userAvatar');
        avatar.innerHTML = '<i class="fas fa-user"></i>';
        avatar.title = 'Login';
        
        // Clear any user-specific data
        window.mitReddit.currentUser = null;
        
        // Show success message
        window.mitReddit.showToast('Logged out successfully', 'success');
        
        // Refresh page to clear user-specific content
        setTimeout(() => {
            window.location.reload();
        }, 1000);
    }
    
    updateUIForLoggedInUser(user) {
        const avatar = document.getElementById('userAvatar');
        const initials = user.name.split(' ').map(n => n[0]).join('').toUpperCase();
        
        avatar.innerHTML = `
            <img src="https://api.dicebear.com/7.x/initials/svg?seed=${initials}&backgroundColor=ff4500" 
                 alt="${user.name}" 
                 style="width: 100%; height: 100%; border-radius: 50%;">
        `;
        avatar.title = `Logged in as ${user.name}`;
        
        // Add logout functionality
        avatar.addEventListener('click', () => {
            this.showUserDropdown(user);
        });
    }
    
    showUserDropdown(user) {
        // Remove any existing dropdown
        const existingDropdown = document.querySelector('.user-dropdown');
        if (existingDropdown) {
            existingDropdown.remove();
            return;
        }
        
        const dropdown = document.createElement('div');
        dropdown.className = 'dropdown-content user-dropdown';
        dropdown.style.position = 'absolute';
        dropdown.style.right = '0';
        dropdown.style.top = '100%';
        dropdown.style.minWidth = '200px';
        dropdown.style.display = 'block';
        dropdown.style.opacity = '1';
        dropdown.style.visibility = 'visible';
        dropdown.style.transform = 'translateY(0)';
        
        dropdown.innerHTML = `
            <div style="padding: 12px 16px; border-bottom: 1px solid var(--reddit-light-gray);">
                <div style="font-weight: 600; color: var(--reddit-text);">${user.name}</div>
                <div style="font-size: 12px; color: var(--reddit-meta-text);">u/${user.username}</div>
            </div>
            <a href="#" class="dropdown-item" id="profileLink">
                <i class="fas fa-user"></i>
                Profile
            </a>
            <a href="#" class="dropdown-item" id="settingsLink">
                <i class="fas fa-cog"></i>
                Settings
            </a>
            <div class="dropdown-divider"></div>
            <a href="#" class="dropdown-item" id="logoutLink">
                <i class="fas fa-sign-out-alt"></i>
                Logout
            </a>
        `;
        
        // Position relative to avatar
        const avatar = document.getElementById('userAvatar');
        avatar.style.position = 'relative';
        avatar.appendChild(dropdown);
        
        // Bind events
        dropdown.querySelector('#logoutLink').addEventListener('click', (e) => {
            e.preventDefault();
            this.logout();
        });
        
        dropdown.querySelector('#profileLink').addEventListener('click', (e) => {
            e.preventDefault();
            window.mitReddit.showToast('Profile page coming soon!', 'info');
            dropdown.remove();
        });
        
        dropdown.querySelector('#settingsLink').addEventListener('click', (e) => {
            e.preventDefault();
            window.mitReddit.showToast('Settings page coming soon!', 'info');
            dropdown.remove();
        });
        
        // Close dropdown when clicking outside
        setTimeout(() => {
            document.addEventListener('click', function closeDropdown(e) {
                if (!avatar.contains(e.target)) {
                    dropdown.remove();
                    document.removeEventListener('click', closeDropdown);
                }
            });
        }, 100);
    }
    
    // Utility functions
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
    
    isStrongPassword(password) {
        return password.length >= 8 && 
               password.match(/[a-z]/) && 
               password.match(/[A-Z]/) && 
               password.match(/[0-9]/);
    }
    
    // Error handling functions
    showAuthError(message) {
        window.mitReddit.showToast(message, 'error');
    }
    
    showFieldError(fieldName, message) {
        const field = document.querySelector(`input[placeholder*="${fieldName}"], select`);
        if (field) {
            this.showInputError(field, message);
        }
    }
    
    showInputError(input, message) {
        this.clearInputError(input);
        
        input.style.borderColor = '#ef4444';
        const errorDiv = document.createElement('div');
        errorDiv.className = 'input-error';
        errorDiv.style.color = '#ef4444';
        errorDiv.style.fontSize = '12px';
        errorDiv.style.marginTop = '4px';
        errorDiv.textContent = message;
        
        input.parentElement.appendChild(errorDiv);
    }
    
    showInputWarning(input, message) {
        this.clearInputWarning(input);
        
        input.style.borderColor = '#f59e0b';
        const warningDiv = document.createElement('div');
        warningDiv.className = 'input-warning';
        warningDiv.style.color = '#f59e0b';
        warningDiv.style.fontSize = '12px';
        warningDiv.style.marginTop = '4px';
        warningDiv.textContent = message;
        
        input.parentElement.appendChild(warningDiv);
    }
    
    showInputInfo(input, message) {
        this.clearInputInfo(input);
        
        const infoDiv = document.createElement('div');
        infoDiv.className = 'input-info';
        infoDiv.style.color = '#6b7280';
        infoDiv.style.fontSize = '12px';
        infoDiv.style.marginTop = '4px';
        infoDiv.textContent = message;
        
        input.parentElement.appendChild(infoDiv);
    }
    
    clearInputError(input) {
        input.style.borderColor = '';
        const errorDiv = input.parentElement.querySelector('.input-error');
        if (errorDiv) errorDiv.remove();
    }
    
    clearInputWarning(input) {
        input.style.borderColor = '';
        const warningDiv = input.parentElement.querySelector('.input-warning');
        if (warningDiv) warningDiv.remove();
    }
    
    clearInputInfo(input) {
        const infoDiv = input.parentElement.querySelector('.input-info');
        if (infoDiv) infoDiv.remove();
    }
    
    clearValidationErrors() {
        document.querySelectorAll('.input-error, .input-warning, .input-info').forEach(el => el.remove());
        document.querySelectorAll('input, select').forEach(input => {
            input.style.borderColor = '';
        });
    }
    
    getOrCreatePasswordStrengthIndicator(input) {
        let indicator = input.parentElement.querySelector('.password-strength');
        
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.className = 'password-strength';
            indicator.style.fontSize = '12px';
            indicator.style.marginTop = '4px';
            indicator.style.fontWeight = '500';
            input.parentElement.appendChild(indicator);
        }
        
        return indicator;
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.authManager = new AuthManager();
    
    // Load existing session
    const savedUser = window.authManager.loadUserSession();
    if (savedUser) {
        window.authManager.currentUser = savedUser;
        window.authManager.updateUIForLoggedInUser(savedUser);
        
        // Update main app
        if (window.mitReddit) {
            window.mitReddit.currentUser = savedUser;
        }
    }
});
