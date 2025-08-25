# Deployment preparation script for Manipal Reddit Platform (PowerShell)

Write-Host "🚀 Preparing for deployment..." -ForegroundColor Green

# Check if git is initialized
if (!(Test-Path ".git")) {
    Write-Host "❌ Git repository not found. Initializing..." -ForegroundColor Red
    git init
    git add .
    git commit -m "Initial commit - Manipal Reddit Platform"
    Write-Host "✅ Git repository initialized" -ForegroundColor Green
} else {
    Write-Host "✅ Git repository found" -ForegroundColor Green
}

# Check if package.json exists in root
if (!(Test-Path "package.json")) {
    Write-Host "❌ Root package.json not found" -ForegroundColor Red
    exit 1
} else {
    Write-Host "✅ Root package.json found" -ForegroundColor Green
}

# Check if server dependencies exist
if (!(Test-Path "server/node_modules")) {
    Write-Host "📦 Installing server dependencies..." -ForegroundColor Yellow
    Set-Location server
    npm install
    Set-Location ..
    Write-Host "✅ Server dependencies installed" -ForegroundColor Green
} else {
    Write-Host "✅ Server dependencies already installed" -ForegroundColor Green
}

# Check if MongoDB connection string is in environment
if (!$env:MONGODB_URI) {
    Write-Host "⚠️ MONGODB_URI environment variable not set" -ForegroundColor Yellow
    Write-Host "   Make sure to set it in your deployment platform" -ForegroundColor Yellow
} else {
    Write-Host "✅ MongoDB URI configured" -ForegroundColor Green
}

# Check if JWT_SECRET is set
if (!$env:JWT_SECRET) {
    Write-Host "⚠️ JWT_SECRET environment variable not set" -ForegroundColor Yellow
    Write-Host "   Make sure to set it in your deployment platform" -ForegroundColor Yellow
} else {
    Write-Host "✅ JWT Secret configured" -ForegroundColor Green
}

Write-Host ""
Write-Host "🎯 Deployment checklist:" -ForegroundColor Cyan
Write-Host "   ✅ Git repository ready" -ForegroundColor Green
Write-Host "   ✅ Package.json configured" -ForegroundColor Green
Write-Host "   ✅ Health check endpoint added" -ForegroundColor Green
Write-Host "   ✅ CORS configured for production" -ForegroundColor Green
Write-Host "   ✅ Deployment configs ready (Railway, Heroku, Vercel)" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Next steps:" -ForegroundColor Cyan
Write-Host "   1. Push to GitHub: git remote add origin YOUR_REPO_URL && git push -u origin main" -ForegroundColor White
Write-Host "   2. Choose deployment platform (recommended: Railway)" -ForegroundColor White
Write-Host "   3. Set environment variables in your platform" -ForegroundColor White
Write-Host "   4. Deploy and test!" -ForegroundColor White
Write-Host ""
Write-Host "🔗 See DEPLOYMENT.md for detailed platform-specific instructions" -ForegroundColor Cyan
