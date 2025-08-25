# Deployment Guide - Manipal Reddit Platform

This guide covers multiple deployment options for your full-stack Reddit-like platform.

## Prerequisites

1. **GitHub Repository**: Push your code to GitHub first
2. **MongoDB Atlas**: Your database is already set up with connection string
3. **Environment Variables**: Make sure all sensitive data uses environment variables

## Deployment Options

### Option 1: Railway (Recommended) 🚂

Railway is perfect for full-stack Node.js applications with MongoDB.

#### Steps:
1. Go to [railway.app](https://railway.app)
2. Sign up with your GitHub account
3. Click "New Project" → "Deploy from GitHub repo"
4. Select your repository
5. Railway will automatically detect your `railway.json` configuration
6. Set environment variables:
   - `MONGODB_URI`: `mongodb+srv://ryangupta2005:sVYyYSC2t71DYRuS@mitreddit.49830ky.mongodb.net/manipal_reddit`
   - `JWT_SECRET`: `your-jwt-secret-key`
   - `NODE_ENV`: `production`
   - `PORT`: `3000`

#### Features:
- ✅ Automatic deployments on git push
- ✅ Custom domains
- ✅ Built-in SSL certificates
- ✅ Generous free tier
- ✅ Easy environment variable management

---

### Option 2: Heroku 🟣

Traditional Platform-as-a-Service with good Node.js support.

#### Steps:
1. Install [Heroku CLI](https://devcenter.heroku.com/articles/heroku-cli)
2. Login: `heroku login`
3. Create app: `heroku create your-app-name`
4. Set environment variables:
   ```bash
   heroku config:set MONGODB_URI="mongodb+srv://ryangupta2005:sVYyYSC2t71DYRuS@mitreddit.49830ky.mongodb.net/manipal_reddit"
   heroku config:set JWT_SECRET="your-jwt-secret-key"
   heroku config:set NODE_ENV="production"
   ```
5. Deploy: `git push heroku main`

#### Features:
- ✅ Well-established platform
- ✅ Good documentation
- ⚠️ Free tier limitations (dyno sleeping)
- ✅ Add-ons ecosystem

---

### Option 3: Vercel (Frontend-focused) ▲

Best for serverless deployment, though requires some adjustments for your backend.

#### Steps:
1. Go to [vercel.com](https://vercel.com)
2. Import your GitHub repository
3. Vercel will detect the `vercel.json` configuration
4. Set environment variables in Vercel dashboard
5. Deploy

#### Notes:
- ⚠️ Serverless functions have execution time limits
- ✅ Excellent for static frontend hosting
- ✅ Global CDN
- ⚠️ May require backend modifications for serverless compatibility

---

### Option 4: DigitalOcean App Platform 🌊

Good balance between simplicity and control.

#### Steps:
1. Go to [DigitalOcean](https://cloud.digitalocean.com/apps)
2. Create new app from GitHub repository
3. Configure build and run commands:
   - Build: `npm run build`
   - Run: `npm start`
4. Set environment variables
5. Deploy

#### Features:
- ✅ Predictable pricing
- ✅ Good performance
- ✅ Database add-ons available
- ✅ Custom domains

---

### Option 5: Render 🎨

Modern alternative to Heroku with generous free tier.

#### Steps:
1. Go to [render.com](https://render.com)
2. Connect your GitHub account
3. Create new Web Service
4. Configure:
   - Build Command: `npm run build`
   - Start Command: `npm start`
5. Set environment variables
6. Deploy

#### Features:
- ✅ No dyno sleeping on free tier
- ✅ Automatic SSL certificates
- ✅ Custom domains
- ✅ Good free tier limits

---

## Environment Variables Setup

For any deployment platform, you'll need these environment variables:

```env
# Database
MONGODB_URI=mongodb+srv://ryangupta2005:sVYyYSC2t71DYRuS@mitreddit.49830ky.mongodb.net/manipal_reddit

# Authentication
JWT_SECRET=your-super-secret-jwt-key-here

# Server Configuration
NODE_ENV=production
PORT=3000

# Optional: For file uploads (if using cloud storage)
CLOUDINARY_CLOUD_NAME=your-cloudinary-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

## Pre-Deployment Checklist

- [ ] Push code to GitHub repository
- [ ] Test application locally with production build
- [ ] Set up environment variables
- [ ] Update MongoDB connection string if needed
- [ ] Test database connectivity
- [ ] Configure CORS for production domain
- [ ] Set up custom domain (optional)

## Post-Deployment Steps

1. **Test all features**:
   - User registration/login
   - Post creation and viewing
   - Comments system
   - Events, news, restaurants
   - Study Buddy feature
   - Analytics dashboard

2. **Monitor performance**:
   - Check server logs
   - Monitor database connections
   - Test analytics tracking

3. **Set up monitoring** (optional):
   - Error tracking (Sentry)
   - Performance monitoring
   - Uptime monitoring

## Recommended Deployment Path

For your project, I recommend starting with **Railway** because:

1. ✅ Excellent Node.js + MongoDB support
2. ✅ Simple deployment process
3. ✅ Generous free tier
4. ✅ No cold starts
5. ✅ Easy environment variable management
6. ✅ Automatic deployments from GitHub

## Custom Domain Setup

After deployment, you can add a custom domain:

1. Purchase domain (e.g., from Namecheap, GoDaddy)
2. In your deployment platform, add custom domain
3. Update DNS records as instructed
4. SSL certificate will be auto-generated

## Need Help?

If you encounter any issues during deployment, check:
1. Server logs for errors
2. Environment variables are set correctly
3. Database connection is working
4. All dependencies are installed

Choose your preferred platform and I'll help you with the specific deployment steps!
