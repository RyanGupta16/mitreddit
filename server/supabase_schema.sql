-- MIT Manipal Reddit Database Schema for Supabase
-- Run this script in your Supabase SQL Editor

-- Enable Row Level Security (RLS) and necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    bio TEXT DEFAULT '',
    avatar_url TEXT DEFAULT '',
    year INTEGER DEFAULT 1,
    branch VARCHAR(100) DEFAULT '',
    is_verified BOOLEAN DEFAULT FALSE,
    reputation INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Posts table
CREATE TABLE IF NOT EXISTS posts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title VARCHAR(300) NOT NULL,
    content TEXT,
    author_id UUID REFERENCES users(id) ON DELETE CASCADE,
    category VARCHAR(50) NOT NULL,
    image_url TEXT DEFAULT '',
    upvotes INTEGER DEFAULT 0,
    downvotes INTEGER DEFAULT 0,
    score INTEGER DEFAULT 0,
    comment_count INTEGER DEFAULT 0,
    is_pinned BOOLEAN DEFAULT FALSE,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Comments table
CREATE TABLE IF NOT EXISTS comments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    content TEXT NOT NULL,
    author_id UUID REFERENCES users(id) ON DELETE CASCADE,
    post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES comments(id) ON DELETE CASCADE,
    upvotes INTEGER DEFAULT 0,
    downvotes INTEGER DEFAULT 0,
    score INTEGER DEFAULT 0,
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Votes table (for tracking user votes on posts and comments)
CREATE TABLE IF NOT EXISTS votes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    target_id UUID NOT NULL, -- Can reference either posts.id or comments.id
    target_type VARCHAR(20) NOT NULL CHECK (target_type IN ('post', 'comment')),
    vote_type INTEGER NOT NULL CHECK (vote_type IN (-1, 1)), -- -1 for downvote, 1 for upvote
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, target_id, target_type)
);

-- Events table
CREATE TABLE IF NOT EXISTS events (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    date TIMESTAMP WITH TIME ZONE NOT NULL,
    location VARCHAR(200),
    category VARCHAR(50) DEFAULT 'general',
    organizer VARCHAR(100),
    registration_url TEXT DEFAULT '',
    image_url TEXT DEFAULT '',
    is_featured BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- News table
CREATE TABLE IF NOT EXISTS news (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title VARCHAR(300) NOT NULL,
    summary TEXT,
    content TEXT,
    source VARCHAR(100) DEFAULT 'Manipal',
    author VARCHAR(100),
    image_url TEXT DEFAULT '',
    published_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_featured BOOLEAN DEFAULT FALSE,
    category VARCHAR(50) DEFAULT 'general',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Restaurants table
CREATE TABLE IF NOT EXISTS restaurants (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    location VARCHAR(200),
    cuisine_type VARCHAR(50),
    rating DECIMAL(2,1) DEFAULT 0.0,
    price_range VARCHAR(20) DEFAULT '$',
    phone VARCHAR(20),
    hours TEXT,
    image_url TEXT DEFAULT '',
    is_featured BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Study Buddy requests table
CREATE TABLE IF NOT EXISTS study_buddy_requests (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    requester_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    subject VARCHAR(100) NOT NULL,
    study_type VARCHAR(50) DEFAULT 'group', -- 'group', 'one-on-one', 'online', 'in-person'
    preferred_time VARCHAR(100),
    location VARCHAR(200),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'matched', 'completed', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Analytics table
CREATE TABLE IF NOT EXISTS analytics (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    event_type VARCHAR(50) NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    metadata JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_posts_author_created ON posts(author_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_category_created ON posts(category, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_score ON posts(score DESC);
CREATE INDEX IF NOT EXISTS idx_posts_created ON posts(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_comments_post_created ON comments(post_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_author_created ON comments(author_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_parent ON comments(parent_id);

CREATE INDEX IF NOT EXISTS idx_votes_user_target ON votes(user_id, target_id, target_type);
CREATE INDEX IF NOT EXISTS idx_votes_target ON votes(target_id, target_type);

CREATE INDEX IF NOT EXISTS idx_events_date ON events(date);
CREATE INDEX IF NOT EXISTS idx_events_category_date ON events(category, date);

CREATE INDEX IF NOT EXISTS idx_news_published ON news(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_news_category ON news(category);

CREATE INDEX IF NOT EXISTS idx_study_buddy_status ON study_buddy_requests(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_study_buddy_subject ON study_buddy_requests(subject, status);

CREATE INDEX IF NOT EXISTS idx_analytics_type_date ON analytics(event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_user_date ON analytics(user_id, created_at DESC);

-- Create updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_posts_updated_at BEFORE UPDATE ON posts 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_comments_updated_at BEFORE UPDATE ON comments 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON events 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_restaurants_updated_at BEFORE UPDATE ON restaurants 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_study_buddy_requests_updated_at BEFORE UPDATE ON study_buddy_requests 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (optional - you can enable this later)
-- ALTER TABLE users ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- Insert sample admin user (password: 'adminpassword' - hashed with bcrypt)
INSERT INTO users (name, email, username, password_hash, is_verified) VALUES 
('Admin User', 'admin@learner.manipal.edu', 'admin', '$2a$10$Ww7Z8vZK4ZvKxz8nY6nGOu8qP5qQZzQ3Zz6nQ7X8vYyN6xZzK4nN8', TRUE)
ON CONFLICT (email) DO NOTHING;

-- Insert sample categories/posts for demonstration
INSERT INTO posts (title, content, author_id, category) 
SELECT 
    'Welcome to MIT Manipal Reddit!',
    'This is the official discussion platform for Manipal Institute of Technology students. Feel free to share your thoughts, ask questions, and connect with your peers!',
    u.id,
    'announcement'
FROM users u WHERE u.email = 'admin@learner.manipal.edu'
ON CONFLICT DO NOTHING;

COMMENT ON TABLE users IS 'User accounts and profiles';
COMMENT ON TABLE posts IS 'User posts and discussions';
COMMENT ON TABLE comments IS 'Comments on posts with threading support';
COMMENT ON TABLE votes IS 'User votes on posts and comments';
COMMENT ON TABLE events IS 'Campus events and activities';
COMMENT ON TABLE news IS 'News and announcements';
COMMENT ON TABLE restaurants IS 'Local restaurant information';
COMMENT ON TABLE study_buddy_requests IS 'Study partner matching system';
COMMENT ON TABLE analytics IS 'Usage analytics and metrics';
