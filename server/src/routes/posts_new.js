const express = require('express');
const supabase = require('../config/supabaseClient');
const { 
    authenticateToken, 
    optionalAuth, 
    requireOwnershipOrAdmin,
    userRateLimit,
    requireModerator
} = require('../middleware/auth');

const router = express.Router();

// Helper function to track analytics
const trackAnalytics = async (eventType, userId = null, metadata = {}) => {
    try {
        const { error } = await supabase
            .from('analytics')
            .insert({
                event_type: eventType,
                user_id: userId,
                metadata: metadata,
                created_at: new Date().toISOString()
            });
        
        if (error) {
            console.error('Analytics tracking error:', error);
        }
    } catch (err) {
        console.error('Analytics tracking failed:', err);
    }
};

// @route   GET /api/posts
// @desc    Get posts with pagination and filtering
// @access  Public
router.get('/', optionalAuth, async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            sort = 'hot',
            category,
            author,
            search,
            timeframe = '24h'
        } = req.query;
        
        const pageNum = parseInt(page);
        const limitNum = Math.min(parseInt(limit), 50); // Cap at 50
        const offset = (pageNum - 1) * limitNum;
        
        // Build query
        let query = supabase
            .from('posts')
            .select(`
                *,
                users!posts_author_id_fkey(id, name, username, avatar_url, reputation)
            `)
            .eq('is_deleted', false);
        
        // Apply filters
        if (category) {
            query = query.eq('category', category);
        }
        
        if (author) {
            // Find author by username first
            const { data: authorUser } = await supabase
                .from('users')
                .select('id')
                .eq('username', author)
                .single();
            
            if (authorUser) {
                query = query.eq('author_id', authorUser.id);
            }
        }
        
        // Apply search (PostgreSQL full-text search)
        if (search) {
            query = query.or(`title.ilike.%${search}%, content.ilike.%${search}%`);
        }
        
        // Apply timeframe filter
        if (timeframe !== 'all') {
            let hours;
            switch (timeframe) {
                case '1h': hours = 1; break;
                case '24h': hours = 24; break;
                case '7d': hours = 168; break;
                case '30d': hours = 720; break;
                default: hours = 24;
            }
            
            const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
            query = query.gte('created_at', cutoffTime);
        }
        
        // Apply sorting
        switch (sort) {
            case 'new':
                query = query.order('created_at', { ascending: false });
                break;
            case 'top':
                query = query.order('score', { ascending: false }).order('created_at', { ascending: false });
                break;
            case 'hot':
            default:
                // Hot algorithm: combines score and recency
                query = query.order('score', { ascending: false }).order('created_at', { ascending: false });
                break;
        }
        
        // Apply pagination
        query = query.range(offset, offset + limitNum - 1);
        
        const { data: posts, error } = await query;
        
        if (error) {
            console.error('Posts fetch error:', error);
            return res.status(500).json({
                success: false,
                message: 'Error fetching posts'
            });
        }
        
        // Get total count for pagination
        let countQuery = supabase
            .from('posts')
            .select('*', { count: 'exact', head: true })
            .eq('is_deleted', false);
        
        if (category) countQuery = countQuery.eq('category', category);
        if (search) countQuery = countQuery.or(`title.ilike.%${search}%, content.ilike.%${search}%`);
        
        const { count: totalPosts } = await countQuery;
        
        // If user is authenticated, get their votes
        if (req.user?.userId) {
            const postIds = posts.map(post => post.id);
            const { data: userVotes } = await supabase
                .from('votes')
                .select('target_id, vote_type')
                .eq('user_id', req.user.userId)
                .eq('target_type', 'post')
                .in('target_id', postIds);
            
            // Add user vote information to posts
            const voteMap = userVotes?.reduce((acc, vote) => {
                acc[vote.target_id] = vote.vote_type;
                return acc;
            }, {}) || {};
            
            posts.forEach(post => {
                post.user_vote = voteMap[post.id] || 0;
            });
        }
        
        const totalPages = Math.ceil(totalPosts / limitNum);
        
        res.json({
            success: true,
            posts: posts || [],
            pagination: {
                currentPage: pageNum,
                totalPages,
                totalPosts,
                hasNext: pageNum < totalPages,
                hasPrev: pageNum > 1
            }
        });
        
    } catch (error) {
        console.error('Posts fetch error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error fetching posts'
        });
    }
});

// @route   GET /api/posts/:id
// @desc    Get single post by ID
// @access  Public
router.get('/:id', optionalAuth, async (req, res) => {
    try {
        const { id } = req.params;
        
        // Get post with author info
        const { data: post, error } = await supabase
            .from('posts')
            .select(`
                *,
                users!posts_author_id_fkey(id, name, username, avatar_url, reputation)
            `)
            .eq('id', id)
            .eq('is_deleted', false)
            .single();
        
        if (error || !post) {
            return res.status(404).json({
                success: false,
                message: 'Post not found'
            });
        }
        
        // Get user's vote if authenticated
        if (req.user?.userId) {
            const { data: userVote } = await supabase
                .from('votes')
                .select('vote_type')
                .eq('user_id', req.user.userId)
                .eq('target_id', id)
                .eq('target_type', 'post')
                .single();
            
            post.user_vote = userVote?.vote_type || 0;
        }
        
        res.json({
            success: true,
            post
        });
        
    } catch (error) {
        console.error('Single post fetch error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error fetching post'
        });
    }
});

// @route   POST /api/posts
// @desc    Create a new post
// @access  Private
router.post('/', authenticateToken, userRateLimit(5, 60 * 60 * 1000), async (req, res) => {
    try {
        const { title, content, category, image_url } = req.body;
        const userId = req.user.userId;
        
        // Validation
        if (!title?.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Title is required'
            });
        }
        
        if (!category) {
            return res.status(400).json({
                success: false,
                message: 'Category is required'
            });
        }
        
        if (title.length > 300) {
            return res.status(400).json({
                success: false,
                message: 'Title must be less than 300 characters'
            });
        }
        
        // Create post
        const { data: newPost, error } = await supabase
            .from('posts')
            .insert({
                title: title.trim(),
                content: content?.trim() || '',
                author_id: userId,
                category: category,
                image_url: image_url || '',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
            .select(`
                *,
                users!posts_author_id_fkey(id, name, username, avatar_url, reputation)
            `)
            .single();
        
        if (error) {
            console.error('Post creation error:', error);
            return res.status(500).json({
                success: false,
                message: 'Error creating post'
            });
        }
        
        // Track analytics
        await trackAnalytics('post_created', userId, {
            post_id: newPost.id,
            category: category
        });
        
        res.status(201).json({
            success: true,
            message: 'Post created successfully',
            post: newPost
        });
        
    } catch (error) {
        console.error('Post creation error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error creating post'
        });
    }
});

// @route   PUT /api/posts/:id
// @desc    Update a post
// @access  Private (author only)
router.put('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { title, content, category } = req.body;
        const userId = req.user.userId;
        
        // Check if post exists and user owns it
        const { data: existingPost, error: fetchError } = await supabase
            .from('posts')
            .select('author_id')
            .eq('id', id)
            .eq('is_deleted', false)
            .single();
        
        if (fetchError || !existingPost) {
            return res.status(404).json({
                success: false,
                message: 'Post not found'
            });
        }
        
        if (existingPost.author_id !== userId) {
            return res.status(403).json({
                success: false,
                message: 'You can only edit your own posts'
            });
        }
        
        // Validation
        if (title && title.length > 300) {
            return res.status(400).json({
                success: false,
                message: 'Title must be less than 300 characters'
            });
        }
        
        // Update post
        const updateData = { updated_at: new Date().toISOString() };
        if (title) updateData.title = title.trim();
        if (content !== undefined) updateData.content = content.trim();
        if (category) updateData.category = category;
        
        const { data: updatedPost, error } = await supabase
            .from('posts')
            .update(updateData)
            .eq('id', id)
            .select(`
                *,
                users!posts_author_id_fkey(id, name, username, avatar_url, reputation)
            `)
            .single();
        
        if (error) {
            console.error('Post update error:', error);
            return res.status(500).json({
                success: false,
                message: 'Error updating post'
            });
        }
        
        res.json({
            success: true,
            message: 'Post updated successfully',
            post: updatedPost
        });
        
    } catch (error) {
        console.error('Post update error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error updating post'
        });
    }
});

// @route   DELETE /api/posts/:id
// @desc    Delete a post
// @access  Private (author only)
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.userId;
        
        // Check if post exists and user owns it
        const { data: existingPost, error: fetchError } = await supabase
            .from('posts')
            .select('author_id')
            .eq('id', id)
            .eq('is_deleted', false)
            .single();
        
        if (fetchError || !existingPost) {
            return res.status(404).json({
                success: false,
                message: 'Post not found'
            });
        }
        
        if (existingPost.author_id !== userId) {
            return res.status(403).json({
                success: false,
                message: 'You can only delete your own posts'
            });
        }
        
        // Soft delete the post
        const { error } = await supabase
            .from('posts')
            .update({ 
                is_deleted: true,
                updated_at: new Date().toISOString()
            })
            .eq('id', id);
        
        if (error) {
            console.error('Post deletion error:', error);
            return res.status(500).json({
                success: false,
                message: 'Error deleting post'
            });
        }
        
        res.json({
            success: true,
            message: 'Post deleted successfully'
        });
        
    } catch (error) {
        console.error('Post deletion error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error deleting post'
        });
    }
});

// @route   POST /api/posts/:id/vote
// @desc    Vote on a post
// @access  Private
router.post('/:id/vote', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { voteType } = req.body; // 1 for upvote, -1 for downvote, 0 to remove vote
        const userId = req.user.userId;
        
        // Validation
        if (![1, -1, 0].includes(voteType)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid vote type'
            });
        }
        
        // Check if post exists
        const { data: post, error: postError } = await supabase
            .from('posts')
            .select('id, author_id')
            .eq('id', id)
            .eq('is_deleted', false)
            .single();
        
        if (postError || !post) {
            return res.status(404).json({
                success: false,
                message: 'Post not found'
            });
        }
        
        // Users cannot vote on their own posts
        if (post.author_id === userId) {
            return res.status(400).json({
                success: false,
                message: 'You cannot vote on your own post'
            });
        }
        
        // Get existing vote
        const { data: existingVote } = await supabase
            .from('votes')
            .select('vote_type')
            .eq('user_id', userId)
            .eq('target_id', id)
            .eq('target_type', 'post')
            .single();
        
        let scoreChange = 0;
        
        if (voteType === 0) {
            // Remove vote
            if (existingVote) {
                await supabase
                    .from('votes')
                    .delete()
                    .eq('user_id', userId)
                    .eq('target_id', id)
                    .eq('target_type', 'post');
                
                scoreChange = -existingVote.vote_type;
            }
        } else {
            // Add or update vote
            if (existingVote) {
                // Update existing vote
                scoreChange = voteType - existingVote.vote_type;
                
                await supabase
                    .from('votes')
                    .update({ vote_type: voteType })
                    .eq('user_id', userId)
                    .eq('target_id', id)
                    .eq('target_type', 'post');
            } else {
                // Create new vote
                scoreChange = voteType;
                
                await supabase
                    .from('votes')
                    .insert({
                        user_id: userId,
                        target_id: id,
                        target_type: 'post',
                        vote_type: voteType,
                        created_at: new Date().toISOString()
                    });
            }
        }
        
        // Update post score and vote counts
        if (scoreChange !== 0) {
            const { data: currentPost } = await supabase
                .from('posts')
                .select('upvotes, downvotes, score')
                .eq('id', id)
                .single();
            
            let newUpvotes = currentPost.upvotes;
            let newDownvotes = currentPost.downvotes;
            
            if (scoreChange > 0) {
                newUpvotes += scoreChange;
            } else {
                newDownvotes += Math.abs(scoreChange);
            }
            
            const newScore = newUpvotes - newDownvotes;
            
            await supabase
                .from('posts')
                .update({
                    upvotes: Math.max(0, newUpvotes),
                    downvotes: Math.max(0, newDownvotes),
                    score: newScore,
                    updated_at: new Date().toISOString()
                })
                .eq('id', id);
        }
        
        res.json({
            success: true,
            message: 'Vote recorded successfully',
            voteType: voteType
        });
        
    } catch (error) {
        console.error('Vote error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error recording vote'
        });
    }
});

module.exports = router;
