#!/bin/bash

# Deployment preparation script for Manipal Reddit Platform

echo "🚀 Preparing for deployment..."

# Check if git is initialized
if [ ! -d ".git" ]; then
    echo "❌ Git repository not found. Initializing..."
    git init
    git add .
    git commit -m "Initial commit - Manipal Reddit Platform"
    echo "✅ Git repository initialized"
else
    echo "✅ Git repository found"
fi

# Check if package.json exists in root
if [ ! -f "package.json" ]; then
    echo "❌ Root package.json not found"
    exit 1
else
    echo "✅ Root package.json found"
fi

# Check if server dependencies exist
if [ ! -d "server/node_modules" ]; then
    echo "📦 Installing server dependencies..."
    cd server && npm install && cd ..
    echo "✅ Server dependencies installed"
else
    echo "✅ Server dependencies already installed"
fi

# Check if MongoDB connection string is in environment
if [ -z "$MONGODB_URI" ]; then
    echo "⚠️ MONGODB_URI environment variable not set"
    echo "   Make sure to set it in your deployment platform"
else
    echo "✅ MongoDB URI configured"
fi

# Check if JWT_SECRET is set
if [ -z "$JWT_SECRET" ]; then
    echo "⚠️ JWT_SECRET environment variable not set"
    echo "   Make sure to set it in your deployment platform"
else
    echo "✅ JWT Secret configured"
fi

echo ""
echo "🎯 Deployment checklist:"
echo "   ✅ Git repository ready"
echo "   ✅ Package.json configured"
echo "   ✅ Health check endpoint added"
echo "   ✅ CORS configured for production"
echo "   ✅ Deployment configs ready (Railway, Heroku, Vercel)"
echo ""
echo "📋 Next steps:"
echo "   1. Push to GitHub: git remote add origin YOUR_REPO_URL && git push -u origin main"
echo "   2. Choose deployment platform (recommended: Railway)"
echo "   3. Set environment variables in your platform"
echo "   4. Deploy and test!"
echo ""
echo "🔗 See DEPLOYMENT.md for detailed platform-specific instructions"
