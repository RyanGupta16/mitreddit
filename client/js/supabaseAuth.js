// Supabase Auth Client-side Module
class SupabaseAuthManager {
    constructor() {
        // Initialize Supabase client for auth
        this.supabase = null;
        this.currentUser = null;
        this.isInitialized = false;
        
        // Initialize when DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.initialize());
        } else {
            this.initialize();
        }
    }
    
    async initialize() {
        try {
            // Check if Supabase is available
            if (typeof window.supabase !== 'undefined') {
                this.supabase = window.supabase;
            } else {
                console.warn('Supabase client not available. Make sure to include Supabase JS library.');
                return;
            }
            
            this.isInitialized = true;
            
            // Listen for auth state changes
            this.supabase.auth.onAuthStateChange((event, session) => {
                console.log('Supabase auth state changed:', event, session?.user?.email);
                this.handleAuthStateChange(event, session);
            });
            
            // Check for existing session
            const { data: { session } } = await this.supabase.auth.getSession();
            if (session) {
                await this.handleAuthStateChange('SIGNED_IN', session);
            }
            
            console.log('✅ Supabase Auth Manager initialized');
        } catch (error) {
            console.error('Failed to initialize Supabase Auth Manager:', error);
        }
    }
    
    async handleAuthStateChange(event, session) {
        try {
            switch (event) {
                case 'SIGNED_IN':
                    if (session?.user) {
                        await this.handleSignIn(session);
                    }
                    break;
                    
                case 'SIGNED_OUT':
                    this.handleSignOut();
                    break;
                    
                case 'TOKEN_REFRESHED':
                    console.log('Token refreshed successfully');
                    break;
                    
                case 'USER_UPDATED':
                    console.log('User updated');
                    break;
                    
                default:
                    console.log('Auth event:', event);
            }
        } catch (error) {
            console.error('Error handling auth state change:', error);
        }
    }
    
    async handleSignIn(session) {
        try {
            // Get user profile from our backend
            const response = await fetch('/api/auth/supabase/profile', {
                headers: {
                    'Authorization': `Bearer ${session.access_token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                this.currentUser = {
                    ...data.user,
                    session: session
                };
                
                // Update UI
                this.updateUIForLoggedInUser(this.currentUser);
                
                // Update main app
                if (window.mitReddit) {
                    window.mitReddit.currentUser = this.currentUser;
                }
                
                // Store session info
                this.saveUserSession(this.currentUser);
                
            } else {
                console.error('Failed to fetch user profile');
            }
        } catch (error) {
            console.error('Error handling sign in:', error);
        }
    }
    
    handleSignOut() {
        this.currentUser = null;
        this.clearUserSession();
        
        // Update UI
        const avatar = document.getElementById('userAvatar');
        if (avatar) {
            avatar.innerHTML = '<i class="fas fa-user"></i>';
            avatar.title = 'Login';
        }
        
        // Clear main app user
        if (window.mitReddit) {
            window.mitReddit.currentUser = null;
        }
        
        console.log('User signed out');
    }
    
    // Sign up with email and password
    async signUp(userData) {
        try {
            if (!this.isInitialized) {
                throw new Error('Supabase Auth not initialized');
            }
            
            const { data, error } = await this.supabase.auth.signUp({
                email: userData.email,
                password: userData.password,
                options: {
                    data: {
                        name: userData.name,
                        branch: userData.branch,
                        year: userData.year
                    }
                }
            });
            
            if (error) {
                throw error;
            }
            
            return {
                success: true,
                user: data.user,
                session: data.session,
                needsEmailVerification: !data.user?.email_confirmed_at
            };
            
        } catch (error) {
            console.error('Supabase signup error:', error);
            throw error;
        }
    }
    
    // Sign in with email and password
    async signIn(credentials) {
        try {
            if (!this.isInitialized) {
                throw new Error('Supabase Auth not initialized');
            }
            
            const { data, error } = await this.supabase.auth.signInWithPassword({
                email: credentials.email,
                password: credentials.password
            });
            
            if (error) {
                throw error;
            }
            
            return {
                success: true,
                user: data.user,
                session: data.session
            };
            
        } catch (error) {
            console.error('Supabase signin error:', error);
            throw error;
        }
    }
    
    // Sign out
    async signOut() {
        try {
            if (!this.isInitialized) {
                throw new Error('Supabase Auth not initialized');
            }
            
            const { error } = await this.supabase.auth.signOut();
            
            if (error) {
                throw error;
            }
            
            return { success: true };
            
        } catch (error) {
            console.error('Supabase signout error:', error);
            throw error;
        }
    }
    
    // Reset password
    async resetPassword(email) {
        try {
            if (!this.isInitialized) {
                throw new Error('Supabase Auth not initialized');
            }
            
            const { error } = await this.supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/reset-password`
            });
            
            if (error) {
                throw error;
            }
            
            return { success: true };
            
        } catch (error) {
            console.error('Password reset error:', error);
            throw error;
        }
    }
    
    // Get current session
    async getSession() {
        try {
            if (!this.isInitialized) {
                return null;
            }
            
            const { data: { session }, error } = await this.supabase.auth.getSession();
            
            if (error) {
                console.error('Error getting session:', error);
                return null;
            }
            
            return session;
            
        } catch (error) {
            console.error('Error getting session:', error);
            return null;
        }
    }
    
    // Get current user
    getCurrentUser() {
        return this.currentUser;
    }
    
    // Check if user is authenticated
    isAuthenticated() {
        return !!this.currentUser;
    }
    
    // Update UI for logged in user
    updateUIForLoggedInUser(user) {
        const avatar = document.getElementById('userAvatar');
        if (!avatar) return;
        
        const initials = user.name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U';
        
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
    
    // Show user dropdown menu
    showUserDropdown(user) {
        // Remove any existing dropdown
        const existingDropdown = document.querySelector('.user-dropdown');
        if (existingDropdown) {
            existingDropdown.remove();
            return;
        }
        
        const dropdown = document.createElement('div');
        dropdown.className = 'dropdown-content user-dropdown';
        dropdown.style.cssText = `
            position: absolute;
            right: 0;
            top: 100%;
            min-width: 200px;
            display: block;
            opacity: 1;
            visibility: visible;
            transform: translateY(0);
            background: white;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            border: 1px solid #e1e5e9;
            z-index: 1000;
        `;
        
        dropdown.innerHTML = `
            <div style="padding: 12px 16px; border-bottom: 1px solid var(--reddit-light-gray);">
                <div style="font-weight: 600; color: var(--reddit-text);">${user.name}</div>
                <div style="font-size: 12px; color: var(--reddit-meta-text);">u/${user.username}</div>
                <div style="font-size: 12px; color: var(--reddit-meta-text);">Supabase Auth</div>
            </div>
            <a href="#" class="dropdown-item" id="profileLink" style="display: block; padding: 8px 16px; text-decoration: none; color: #333; hover: background-color: #f8f9fa;">
                <i class="fas fa-user"></i>
                Profile
            </a>
            <a href="#" class="dropdown-item" id="settingsLink" style="display: block; padding: 8px 16px; text-decoration: none; color: #333;">
                <i class="fas fa-cog"></i>
                Settings
            </a>
            <div style="height: 1px; background: #e1e5e9; margin: 4px 0;"></div>
            <a href="#" class="dropdown-item" id="logoutLink" style="display: block; padding: 8px 16px; text-decoration: none; color: #333;">
                <i class="fas fa-sign-out-alt"></i>
                Logout
            </a>
        `;
        
        // Position relative to avatar
        const avatar = document.getElementById('userAvatar');
        avatar.style.position = 'relative';
        avatar.appendChild(dropdown);
        
        // Bind events
        dropdown.querySelector('#logoutLink').addEventListener('click', async (e) => {
            e.preventDefault();
            await this.signOut();
            window.mitReddit?.showToast('Logged out successfully', 'success');
        });
        
        dropdown.querySelector('#profileLink').addEventListener('click', (e) => {
            e.preventDefault();
            window.mitReddit?.showToast('Profile page coming soon!', 'info');
            dropdown.remove();
        });
        
        dropdown.querySelector('#settingsLink').addEventListener('click', (e) => {
            e.preventDefault();
            window.mitReddit?.showToast('Settings page coming soon!', 'info');
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
    
    // Save user session to localStorage
    saveUserSession(user) {
        try {
            localStorage.setItem('mitRedditSupabaseUser', JSON.stringify(user));
            localStorage.setItem('mitRedditSupabaseAuthTime', Date.now().toString());
        } catch (error) {
            console.error('Error saving user session:', error);
        }
    }
    
    // Clear user session from localStorage
    clearUserSession() {
        try {
            localStorage.removeItem('mitRedditSupabaseUser');
            localStorage.removeItem('mitRedditSupabaseAuthTime');
        } catch (error) {
            console.error('Error clearing user session:', error);
        }
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.supabaseAuthManager = new SupabaseAuthManager();
});
