// Posts Management Module
class PostsManager {
    constructor() {
        this.bindPostFormEvents();
        this.bindTabEvents();
    }
    
    bindPostFormEvents() {
        const createPostForm = document.getElementById('createPostForm');
        if (createPostForm) {
            createPostForm.addEventListener('submit', (e) => this.handleCreatePost(e));
        }
        
        const cancelBtn = document.getElementById('cancelPost');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                window.mitReddit.hideCreatePostModal();
            });
        }
    }
    
    bindTabEvents() {
        document.querySelectorAll('.post-type-tabs .tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchPostType(e.target.closest('.tab-btn').dataset.type);
            });
        });
    }
    
    switchPostType(type) {
        // Update active tab
        document.querySelectorAll('.post-type-tabs .tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-type="${type}"]`).classList.add('active');
        
        // Update form based on post type
        this.updateFormForType(type);
    }
    
    updateFormForType(type) {
        const contentInput = document.querySelector('.content-input');
        const form = document.getElementById('createPostForm');
        
        // Remove any existing additional fields
        const existingFields = form.querySelectorAll('.dynamic-field');
        existingFields.forEach(field => field.remove());
        
        switch(type) {
            case 'text':
                contentInput.placeholder = 'Text (optional)';
                contentInput.style.display = 'block';
                break;
                
            case 'image':
                contentInput.placeholder = 'Description (optional)';
                contentInput.style.display = 'block';
                this.addImageUploadField();
                break;
                
            case 'link':
                contentInput.placeholder = 'Description (optional)';
                contentInput.style.display = 'block';
                this.addLinkField();
                break;
        }
    }
    
    addImageUploadField() {
        const formGroup = document.createElement('div');
        formGroup.className = 'form-group dynamic-field';
        formGroup.innerHTML = `
            <div class="image-upload" onclick="this.querySelector('input').click()">
                <i class="fas fa-cloud-upload-alt"></i>
                <p>Click to upload an image</p>
                <small>JPG, PNG, GIF up to 10MB</small>
                <input type="file" accept="image/*" style="display: none;">
            </div>
            <div class="image-preview-container" style="display: none;">
                <img class="image-preview" alt="Preview">
                <button type="button" class="remove-image-btn">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        
        const contentGroup = document.querySelector('.content-input').parentElement;
        contentGroup.parentElement.insertBefore(formGroup, contentGroup.nextSibling);
        
        // Handle file selection
        const fileInput = formGroup.querySelector('input[type="file"]');
        fileInput.addEventListener('change', (e) => this.handleImageUpload(e, formGroup));
        
        // Handle image removal
        const removeBtn = formGroup.querySelector('.remove-image-btn');
        removeBtn.addEventListener('click', () => this.removeImage(formGroup));
    }
    
    addLinkField() {
        const formGroup = document.createElement('div');
        formGroup.className = 'form-group dynamic-field';
        formGroup.innerHTML = `
            <input type="url" class="link-input" placeholder="https://example.com" required>
            <div class="link-preview" style="display: none;">
                <div class="link-preview-content">
                    <img class="link-preview-image" alt="Link preview">
                    <div class="link-preview-text">
                        <h4 class="link-preview-title"></h4>
                        <p class="link-preview-description"></p>
                        <span class="link-preview-domain"></span>
                    </div>
                </div>
            </div>
        `;
        
        const titleGroup = document.querySelector('.title-input').parentElement;
        titleGroup.parentElement.insertBefore(formGroup, titleGroup.nextSibling);
        
        // Handle link preview
        const linkInput = formGroup.querySelector('.link-input');
        linkInput.addEventListener('input', (e) => {
            this.debounce(() => this.generateLinkPreview(e.target.value, formGroup), 500)();
        });
    }
    
    handleImageUpload(event, container) {
        const file = event.target.files[0];
        if (!file) return;
        
        // Validate file size (10MB max)
        if (file.size > 10 * 1024 * 1024) {
            window.mitReddit.showToast('Image size must be less than 10MB', 'error');
            return;
        }
        
        // Validate file type
        if (!file.type.startsWith('image/')) {
            window.mitReddit.showToast('Please select a valid image file', 'error');
            return;
        }
        
        const reader = new FileReader();
        reader.onload = (e) => {
            const preview = container.querySelector('.image-preview');
            const previewContainer = container.querySelector('.image-preview-container');
            const uploadArea = container.querySelector('.image-upload');
            
            preview.src = e.target.result;
            previewContainer.style.display = 'block';
            uploadArea.style.display = 'none';
        };
        
        reader.readAsDataURL(file);
    }
    
    removeImage(container) {
        const preview = container.querySelector('.image-preview');
        const previewContainer = container.querySelector('.image-preview-container');
        const uploadArea = container.querySelector('.image-upload');
        const fileInput = container.querySelector('input[type="file"]');
        
        preview.src = '';
        fileInput.value = '';
        previewContainer.style.display = 'none';
        uploadArea.style.display = 'block';
    }
    
    async generateLinkPreview(url, container) {
        if (!this.isValidUrl(url)) return;
        
        const preview = container.querySelector('.link-preview');
        
        try {
            // In a real app, this would fetch metadata from the URL
            // For demo purposes, we'll generate mock preview data
            const mockPreview = this.generateMockLinkPreview(url);
            
            const image = preview.querySelector('.link-preview-image');
            const title = preview.querySelector('.link-preview-title');
            const description = preview.querySelector('.link-preview-description');
            const domain = preview.querySelector('.link-preview-domain');
            
            image.src = mockPreview.image;
            title.textContent = mockPreview.title;
            description.textContent = mockPreview.description;
            domain.textContent = mockPreview.domain;
            
            preview.style.display = 'block';
        } catch (error) {
            console.error('Error generating link preview:', error);
        }
    }
    
    generateMockLinkPreview(url) {
        const domain = new URL(url).hostname;
        return {
            title: `Link Preview for ${domain}`,
            description: `This is a preview of the linked content from ${domain}. In a real application, this would show the actual page metadata.`,
            image: `https://picsum.photos/200/100?random=${Date.now()}`,
            domain: domain
        };
    }
    
    isValidUrl(string) {
        try {
            new URL(string);
            return true;
        } catch (_) {
            return false;
        }
    }
    
    async handleCreatePost(event) {
        event.preventDefault();
        
        if (!window.mitReddit.currentUser) {
            window.mitReddit.showLoginModal();
            return;
        }
        
        const formData = new FormData(event.target);
        const postData = {
            category: event.target.querySelector('.category-select').value,
            title: event.target.querySelector('.title-input').value.trim(),
            content: event.target.querySelector('.content-input').value.trim(),
            type: document.querySelector('.post-type-tabs .tab-btn.active').dataset.type
        };
        
        // Validate required fields
        if (!postData.category) {
            window.mitReddit.showToast('Please select a category', 'error');
            return;
        }
        
        if (!postData.title) {
            window.mitReddit.showToast('Please enter a title', 'error');
            return;
        }
        
        if (postData.title.length < 5) {
            window.mitReddit.showToast('Title must be at least 5 characters long', 'error');
            return;
        }
        
        if (postData.title.length > 300) {
            window.mitReddit.showToast('Title must be less than 300 characters', 'error');
            return;
        }
        
        // Handle different post types
        if (postData.type === 'image') {
            const imageInput = event.target.querySelector('input[type="file"]');
            if (imageInput && imageInput.files[0]) {
                postData.image = imageInput.files[0];
            }
        } else if (postData.type === 'link') {
            const linkInput = event.target.querySelector('.link-input');
            if (linkInput && linkInput.value) {
                if (!this.isValidUrl(linkInput.value)) {
                    window.mitReddit.showToast('Please enter a valid URL', 'error');
                    return;
                }
                postData.link = linkInput.value;
            }
        }
        
        try {
            // Show loading state
            const submitBtn = event.target.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Posting...';
            
            // Simulate API call
            await this.submitPost(postData);
            
            // Success
            window.mitReddit.showToast('Post created successfully!', 'success');
            window.mitReddit.hideCreatePostModal();
            
            // Refresh feed
            window.mitReddit.resetPosts();
            window.mitReddit.loadPosts();
            
        } catch (error) {
            console.error('Error creating post:', error);
            window.mitReddit.showToast('Failed to create post. Please try again.', 'error');
        } finally {
            // Reset button state
            const submitBtn = event.target.querySelector('button[type="submit"]');
            submitBtn.disabled = false;
            submitBtn.textContent = 'Post';
        }
    }
    
    async submitPost(postData) {
        // Use the actual API service to create the post
        try {
            const response = await window.mitReddit.api.createPost(postData);
            return response;
        } catch (error) {
            console.error('Error submitting post:', error);
            throw error;
        }
    }
    
    // Utility function
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

// Comment Management
class CommentsManager {
    constructor() {
        this.comments = new Map(); // postId -> comments array
    }
    
    async loadComments(postId) {
        try {
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Generate mock comments
            const comments = this.generateMockComments(postId);
            this.comments.set(postId, comments);
            
            return comments;
        } catch (error) {
            console.error('Error loading comments:', error);
            throw error;
        }
    }
    
    generateMockComments(postId) {
        const users = [
            'study_buddy_23', 'tech_geek_21', 'manipal_senior', 'freshman_2024',
            'coding_enthusiast', 'sports_fan_22', 'music_lover', 'bookworm_21'
        ];
        
        const comments = [];
        const numComments = Math.floor(Math.random() * 10) + 3;
        
        for (let i = 0; i < numComments; i++) {
            comments.push({
                id: `comment_${postId}_${i}`,
                author: users[Math.floor(Math.random() * users.length)],
                content: this.generateCommentContent(),
                timestamp: this.generateCommentTimestamp(),
                upvotes: Math.floor(Math.random() * 50),
                downvotes: Math.floor(Math.random() * 5),
                replies: Math.random() > 0.7 ? this.generateReplies(postId, i) : []
            });
        }
        
        return comments;
    }
    
    generateCommentContent() {
        const contents = [
            'Great point! I completely agree with your perspective on this.',
            'Thanks for sharing this. Really helpful information.',
            'Has anyone else tried this approach? I\'d love to hear experiences.',
            'This is exactly what I was looking for. Much appreciated!',
            'I had a similar experience. Here\'s what worked for me...',
            'Can you provide more details about this? I\'m curious to learn more.',
            'Disagree with this. Here\'s why I think differently...',
            'Adding to what you said, I think we should also consider...',
            'This reminds me of something that happened last semester.',
            'Bookmarking this for future reference. Super useful!'
        ];
        
        return contents[Math.floor(Math.random() * contents.length)];
    }
    
    generateCommentTimestamp() {
        const now = new Date();
        const past = new Date(now - Math.random() * 24 * 60 * 60 * 1000); // Within last day
        const diff = now - past;
        
        const minutes = Math.floor(diff / (1000 * 60));
        const hours = Math.floor(diff / (1000 * 60 * 60));
        
        if (minutes < 1) return 'just now';
        if (minutes < 60) return `${minutes}m ago`;
        return `${hours}h ago`;
    }
    
    generateReplies(postId, commentIndex) {
        const numReplies = Math.floor(Math.random() * 3) + 1;
        const replies = [];
        
        for (let i = 0; i < numReplies; i++) {
            replies.push({
                id: `reply_${postId}_${commentIndex}_${i}`,
                author: 'reply_user_' + (i + 1),
                content: 'Thanks for the clarification! This helps a lot.',
                timestamp: this.generateCommentTimestamp(),
                upvotes: Math.floor(Math.random() * 20),
                downvotes: Math.floor(Math.random() * 2)
            });
        }
        
        return replies;
    }
    
    async addComment(postId, content) {
        if (!window.mitReddit.currentUser) {
            throw new Error('User not authenticated');
        }
        
        if (!content.trim()) {
            throw new Error('Comment content is required');
        }
        
        try {
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 800));
            
            const newComment = {
                id: `comment_${postId}_${Date.now()}`,
                author: window.mitReddit.currentUser.username,
                content: content.trim(),
                timestamp: 'just now',
                upvotes: 0,
                downvotes: 0,
                replies: []
            };
            
            // Add to local comments
            if (!this.comments.has(postId)) {
                this.comments.set(postId, []);
            }
            this.comments.get(postId).unshift(newComment);
            
            return newComment;
        } catch (error) {
            console.error('Error adding comment:', error);
            throw error;
        }
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.postsManager = new PostsManager();
    window.commentsManager = new CommentsManager();
});
