// MIT Reddit - Main Application JavaScript
class MITReddit {
    constructor() {
        this.currentUser = null;
        this.currentPage = 'home';
        this.currentSort = 'hot';
        this.posts = [];
        this.loading = false;
        this.page = 1;
        this.hasMore = true;
        
        // Initialize API service
        this.api = new APIService();
        
        this.init();
    }
    
    init() {
        this.bindEvents();
        this.checkAuthStatus();
        this.loadPosts();
        this.initInfiniteScroll();
        
        // Show login modal if not authenticated
        if (!this.currentUser) {
            setTimeout(() => this.showLoginModal(), 1000);
        }
    }
    
    bindEvents() {
        // Navigation events
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                this.switchPage(e.target.closest('.nav-link').dataset.page);
            });
        });
        
        // Sort events
        document.querySelectorAll('.sort-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                this.switchSort(e.target.closest('.sort-btn').dataset.sort);
            });
        });
        
        // Category filter events
        document.querySelectorAll('[data-category]').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                this.filterByCategory(e.target.closest('[data-category]').dataset.category);
            });
        });
        
        // Modal events
        document.getElementById('createPostBtn').addEventListener('click', () => {
            if (!this.currentUser) {
                this.showLoginModal();
                return;
            }
            this.showCreatePostModal();
        });
        
        document.getElementById('closeModal').addEventListener('click', () => {
            this.hideCreatePostModal();
        });
        
        document.getElementById('closeLoginModal').addEventListener('click', () => {
            this.hideLoginModal();
        });
        
        // Close modals on outside click
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.hideAllModals();
            }
        });
        
        // Search functionality
        document.querySelector('.search-input').addEventListener('input', 
            this.debounce((e) => this.search(e.target.value), 300)
        );
        
        // User avatar click
        document.getElementById('userAvatar').addEventListener('click', () => {
            if (!this.currentUser) {
                this.showLoginModal();
            } else {
                this.showUserMenu();
            }
        });
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.hideAllModals();
            }
            if (e.ctrlKey && e.key === 'k') {
                e.preventDefault();
                document.querySelector('.search-input').focus();
            }
        });
    }
    
    switchPage(page) {
        // Update active nav link
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });
        document.querySelector(`[data-page="${page}"]`).classList.add('active');
        
        this.currentPage = page;
        this.resetPosts();
        this.loadPosts();
        
        // Update page title
        const titles = {
            'home': 'MIT Reddit - Campus Community',
            'events': 'Events - MIT Reddit',
            'parties': 'Parties - MIT Reddit',
            'restaurants': 'Food & Restaurants - MIT Reddit',
            'news': 'Campus News - MIT Reddit'
        };
        document.title = titles[page] || 'MIT Reddit';
    }
    
    switchSort(sort) {
        // Update active sort button
        document.querySelectorAll('.sort-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-sort="${sort}"]`).classList.add('active');
        
        this.currentSort = sort;
        this.resetPosts();
        this.loadPosts();
    }
    
    filterByCategory(category) {
        // Visual feedback
        document.querySelectorAll('[data-category]').forEach(link => {
            link.classList.remove('active');
        });
        document.querySelector(`[data-category="${category}"]`).classList.add('active');
        
        this.currentCategory = category;
        this.resetPosts();
        this.loadPosts();
    }
    
    resetPosts() {
        this.posts = [];
        this.page = 1;
        this.hasMore = true;
        document.getElementById('postsFeed').innerHTML = '';
    }
    
    async loadPosts() {
        if (this.loading || !this.hasMore) return;
        
        this.loading = true;
        this.showLoading();
        
        try {
            // Simulate API call with mock data
            await this.delay(800); // Simulate network delay
            const newPosts = this.generateMockPosts();
            
            this.posts = [...this.posts, ...newPosts];
            this.renderPosts(newPosts);
            this.page++;
            
            // Simulate end of data after 3 pages
            if (this.page > 3) {
                this.hasMore = false;
            }
        } catch (error) {
            console.error('Error loading posts:', error);
            this.showToast('Error loading posts. Please try again.', 'error');
        } finally {
            this.loading = false;
            this.hideLoading();
        }
    }
    
    generateMockPosts() {
        const categories = ['academics', 'events', 'parties', 'restaurants', 'news', 'placements', 'hostels', 'clubs', 'sports', 'tech', 'general'];
        const titles = {
            academics: [
                'Anyone know when CS204 assignment is due?',
                'Study group for Data Structures exam',
                'Best resources for Machine Learning course',
                'Professor Kumar\'s notes available?',
                'Midterm results discussion thread'
            ],
            events: [
                'TechFest 2024 registrations are open!',
                'Guest lecture by Google engineer tomorrow',
                'Annual Sports Meet starting next week',
                'Cultural fest auditions this Friday',
                'Hackathon team formation thread'
            ],
            parties: [
                'Freshers party at Student Center tonight!',
                'End semester celebration plans?',
                'Birthday bash invitation - all welcome',
                'Hostel DJ night this Saturday',
                'Rooftop party location suggestions'
            ],
            restaurants: [
                'New pizza place near MIT gate - reviews?',
                'Best late night food delivery options',
                'Manipal Food Court vs Outside eateries',
                'Healthy food options discussion',
                'Budget-friendly restaurants recommendation'
            ],
            news: [
                'MIT Manipal ranks in top 10 engineering colleges',
                'New computer lab inaugurated in Block 5',
                'Placement statistics for 2024 batch',
                'Campus wifi upgrade completed',
                'New library timing announced'
            ],
            placements: [
                'Microsoft interview experience',
                'Tips for technical interviews',
                'Placement statistics discussion',
                'Resume review request',
                'Internship opportunities thread'
            ],
            hostels: [
                'Block 22 vs Block 24 - which is better?',
                'Hostel room decoration ideas',
                'Mess food review thread',
                'Room allotment queries',
                'Hostel night out stories'
            ],
            clubs: [
                'IEEE club recruitment drive',
                'Photography club exhibition',
                'Debate society meetup',
                'Music club jam session',
                'Robotics club workshop'
            ],
            sports: [
                'Basketball court booking system',
                'Inter-hostel cricket tournament',
                'Gym workout partner needed',
                'Swimming pool timings',
                'Football team selection'
            ],
            tech: [
                'Flutter vs React Native discussion',
                'AI/ML project collaboration',
                'Open source contributions',
                'Tech internship experiences',
                'Coding competition announcements'
            ],
            general: [
                'How to make friends in MIT?',
                'Weekend trip plans from Manipal',
                'Auto/bus rates negotiation tips',
                'Local SIM card recommendations',
                'Weather update and preparation'
            ]
        };
        
        const users = [
            'tech_enthusiast_21', 'manipal_foodie', 'cs_student_22', 'party_planner_20',
            'book_worm_23', 'sports_captain', 'music_lover_21', 'future_engineer',
            'coding_ninja_22', 'campus_explorer', 'study_buddy_23', 'hostel_life_21'
        ];
        
        const posts = [];
        const currentCategory = this.currentCategory || (this.currentPage === 'home' ? null : this.currentPage);
        
        for (let i = 0; i < 5; i++) {
            const category = currentCategory || categories[Math.floor(Math.random() * categories.length)];
            const categoryTitles = titles[category] || titles.general;
            
            const post = {
                id: Date.now() + i,
                title: categoryTitles[Math.floor(Math.random() * categoryTitles.length)],
                category: category,
                author: users[Math.floor(Math.random() * users.length)],
                content: this.generatePostContent(),
                timestamp: this.generateTimestamp(),
                upvotes: Math.floor(Math.random() * 500) + 1,
                downvotes: Math.floor(Math.random() * 50),
                comments: Math.floor(Math.random() * 100) + 1,
                hasImage: Math.random() > 0.7,
                imageUrl: Math.random() > 0.7 ? `https://picsum.photos/600/300?random=${Date.now() + i}` : null,
                isUpvoted: false,
                isDownvoted: false,
                badges: this.generateBadges()
            };
            
            posts.push(post);
        }
        
        return posts;
    }
    
    generatePostContent() {
        const contents = [
            'Looking for suggestions and experiences from fellow students. Any advice would be appreciated!',
            'Has anyone else experienced this? Would love to hear your thoughts and opinions.',
            'Just wanted to share this with the community. Hope it helps someone!',
            'Need some quick help with this. Thanks in advance for your responses!',
            'Thought this might be interesting for everyone here. What do you all think?',
            'Can someone please help me out with this? I\'m really confused.',
            'Sharing my experience so others can benefit from it. Feel free to ask questions!',
            'Is it just me or does anyone else feel the same way about this?',
            'Found this really helpful and wanted to share with everyone here.',
            'Need urgent help with this. Any assistance would be greatly appreciated!'
        ];
        
        return contents[Math.floor(Math.random() * contents.length)];
    }
    
    generateTimestamp() {
        const now = new Date();
        const past = new Date(now - Math.random() * 7 * 24 * 60 * 60 * 1000); // Within last week
        const diff = now - past;
        
        const minutes = Math.floor(diff / (1000 * 60));
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        
        if (minutes < 1) return 'just now';
        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        return `${days}d ago`;
    }
    
    generateBadges() {
        const badges = [];
        const random = Math.random();
        
        if (random > 0.9) badges.push('hot');
        if (random > 0.85) badges.push('trending');
        if (random > 0.95) badges.push('pinned');
        if (this.page === 1 && Math.random() > 0.8) badges.push('new');
        
        return badges;
    }
    
    renderPosts(posts) {
        const feed = document.getElementById('postsFeed');
        
        posts.forEach(post => {
            const postElement = this.createPostElement(post);
            feed.appendChild(postElement);
        });
    }
    
    createPostElement(post) {
        const article = document.createElement('article');
        article.className = 'post-card';
        article.dataset.postId = post.id;
        
        const badges = post.badges.map(badge => 
            `<span class="badge badge-${badge}">${badge}</span>`
        ).join('');
        
        const categoryEmojis = {
            academics: '📚', events: '📅', parties: '🎉', restaurants: '🍕',
            news: '📰', placements: '💼', hostels: '🏠', clubs: '👥',
            sports: '⚽', tech: '💻', general: '💬'
        };
        
        article.innerHTML = `
            <div class="post-content">
                <div class="post-header">
                    <span class="post-category">${categoryEmojis[post.category]} ${post.category}</span>
                    <span class="post-meta">
                        Posted by u/${post.author} • ${post.timestamp}
                    </span>
                    ${badges}
                </div>
                <h2 class="post-title">${post.title}</h2>
                <p class="post-text">${post.content}</p>
                ${post.imageUrl ? `<img src="${post.imageUrl}" alt="Post image" class="post-image">` : ''}
                <div class="post-actions">
                    <div class="vote-buttons" style="display: flex; align-items: center; margin-right: 16px;">
                        <button class="vote-btn upvote-btn" data-action="upvote">
                            <i class="fas fa-arrow-up"></i>
                        </button>
                        <span class="vote-count">${post.upvotes - post.downvotes}</span>
                        <button class="vote-btn downvote-btn" data-action="downvote">
                            <i class="fas fa-arrow-down"></i>
                        </button>
                    </div>
                    <button class="action-btn comment-btn">
                        <i class="fas fa-comment"></i>
                        ${post.comments} Comments
                    </button>
                    <button class="action-btn share-btn">
                        <i class="fas fa-share"></i>
                        Share
                    </button>
                    <button class="action-btn save-btn">
                        <i class="fas fa-bookmark"></i>
                        Save
                    </button>
                    <button class="action-btn more-btn">
                        <i class="fas fa-ellipsis-h"></i>
                    </button>
                </div>
            </div>
        `;
        
        // Bind events
        this.bindPostEvents(article, post);
        
        return article;
    }
    
    bindPostEvents(postElement, post) {
        // Vote buttons
        const upvoteBtn = postElement.querySelector('.upvote-btn');
        const downvoteBtn = postElement.querySelector('.downvote-btn');
        const voteCount = postElement.querySelector('.vote-count');
        
        upvoteBtn.addEventListener('click', () => {
            if (!this.currentUser) {
                this.showLoginModal();
                return;
            }
            
            if (post.isUpvoted) {
                // Remove upvote
                post.isUpvoted = false;
                post.upvotes--;
                upvoteBtn.classList.remove('upvoted');
            } else {
                // Add upvote, remove downvote if exists
                if (post.isDownvoted) {
                    post.isDownvoted = false;
                    post.downvotes--;
                    downvoteBtn.classList.remove('downvoted');
                }
                post.isUpvoted = true;
                post.upvotes++;
                upvoteBtn.classList.add('upvoted');
            }
            
            voteCount.textContent = post.upvotes - post.downvotes;
        });
        
        downvoteBtn.addEventListener('click', () => {
            if (!this.currentUser) {
                this.showLoginModal();
                return;
            }
            
            if (post.isDownvoted) {
                // Remove downvote
                post.isDownvoted = false;
                post.downvotes--;
                downvoteBtn.classList.remove('downvoted');
            } else {
                // Add downvote, remove upvote if exists
                if (post.isUpvoted) {
                    post.isUpvoted = false;
                    post.upvotes--;
                    upvoteBtn.classList.remove('upvoted');
                }
                post.isDownvoted = true;
                post.downvotes++;
                downvoteBtn.classList.add('downvoted');
            }
            
            voteCount.textContent = post.upvotes - post.downvotes;
        });
        
        // Post title click
        postElement.querySelector('.post-title').addEventListener('click', () => {
            this.showPostDetail(post);
        });
        
        // Comment button
        postElement.querySelector('.comment-btn').addEventListener('click', () => {
            if (!this.currentUser) {
                this.showLoginModal();
                return;
            }
            this.showPostDetail(post);
        });
        
        // Share button
        postElement.querySelector('.share-btn').addEventListener('click', () => {
            this.sharePost(post);
        });
        
        // Save button
        postElement.querySelector('.save-btn').addEventListener('click', () => {
            if (!this.currentUser) {
                this.showLoginModal();
                return;
            }
            this.toggleSavePost(post, postElement.querySelector('.save-btn'));
        });
    }
    
    showPostDetail(post) {
        // This would typically open a detailed post view
        // For now, just scroll to comments section
        console.log('Show post detail for:', post.title);
        this.showToast('Post detail view coming soon!', 'info');
    }
    
    sharePost(post) {
        if (navigator.share) {
            navigator.share({
                title: post.title,
                text: post.content,
                url: window.location.href + '#post-' + post.id
            }).catch(console.error);
        } else {
            // Fallback to clipboard
            const url = window.location.href + '#post-' + post.id;
            navigator.clipboard.writeText(url).then(() => {
                this.showToast('Link copied to clipboard!', 'success');
            }).catch(() => {
                this.showToast('Could not copy link', 'error');
            });
        }
    }
    
    toggleSavePost(post, button) {
        const icon = button.querySelector('i');
        if (icon.classList.contains('fas')) {
            icon.classList.remove('fas');
            icon.classList.add('far');
            this.showToast('Post removed from saved', 'info');
        } else {
            icon.classList.remove('far');
            icon.classList.add('fas');
            this.showToast('Post saved!', 'success');
        }
    }
    
    search(query) {
        if (query.length < 2) {
            return;
        }
        
        console.log('Searching for:', query);
        this.showToast(`Searching for "${query}"...`, 'info');
        
        // Reset and load filtered posts
        this.currentSearch = query;
        this.resetPosts();
        this.loadPosts();
    }
    
    initInfiniteScroll() {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting && !this.loading && this.hasMore) {
                    this.loadPosts();
                }
            });
        }, {
            rootMargin: '100px'
        });
        
        observer.observe(document.getElementById('loading'));
    }
    
    showLoading() {
        document.getElementById('loading').style.display = 'block';
    }
    
    hideLoading() {
        document.getElementById('loading').style.display = 'none';
    }
    
    showCreatePostModal() {
        document.getElementById('createPostModal').classList.add('active');
        document.body.style.overflow = 'hidden';
    }
    
    hideCreatePostModal() {
        document.getElementById('createPostModal').classList.remove('active');
        document.body.style.overflow = '';
        
        // Reset form
        document.getElementById('createPostForm').reset();
    }
    
    showLoginModal() {
        document.getElementById('loginModal').classList.add('active');
        document.body.style.overflow = 'hidden';
    }
    
    hideLoginModal() {
        document.getElementById('loginModal').classList.remove('active');
        document.body.style.overflow = '';
    }
    
    hideAllModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.classList.remove('active');
        });
        document.body.style.overflow = '';
    }
    
    showUserMenu() {
        // This would show a dropdown menu for logged-in users
        console.log('Show user menu');
    }
    
    checkAuthStatus() {
        // Check if user is logged in (from localStorage or session)
        const savedUser = localStorage.getItem('mitRedditUser');
        if (savedUser) {
            try {
                this.currentUser = JSON.parse(savedUser);
                
                // Restore the authentication token in the API service
                if (this.currentUser.token) {
                    this.api.setAuthToken(this.currentUser.token);
                }
                
                this.updateUIForLoggedInUser();
            } catch (error) {
                console.error('Error parsing saved user data:', error);
                localStorage.removeItem('mitRedditUser');
            }
        }
    }
    
    updateUIForLoggedInUser() {
        const avatar = document.getElementById('userAvatar');
        avatar.innerHTML = `<img src="https://api.dicebear.com/7.x/initials/svg?seed=${this.currentUser.name}" alt="Avatar" style="width: 100%; height: 100%; border-radius: 50%;">`;
        avatar.title = `Logged in as ${this.currentUser.name}`;
    }
    
    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        const icons = {
            success: 'fas fa-check-circle',
            error: 'fas fa-exclamation-circle',
            warning: 'fas fa-exclamation-triangle',
            info: 'fas fa-info-circle'
        };
        
        toast.innerHTML = `
            <div class="toast-content">
                <i class="toast-icon ${icons[type]}"></i>
                <span class="toast-message">${message}</span>
            </div>
        `;
        
        document.body.appendChild(toast);
        
        // Trigger show animation
        setTimeout(() => toast.classList.add('show'), 100);
        
        // Auto hide after 4 seconds
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 4000);
    }
    
    // Utility functions
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.mitReddit = new MITReddit();
    
    // Add some global keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        // Ctrl/Cmd + Enter to submit forms
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            const activeForm = document.querySelector('.modal.active form');
            if (activeForm) {
                activeForm.dispatchEvent(new Event('submit'));
            }
        }
    });
});
