# 🚀 Vercel Deployment Guide - MIT Reddit with Supabase

## 🎯 Current Status
Your local website works perfectly, but the Vercel deployment needs environment variables and configuration updates to work with Supabase.

## 📋 Steps to Fix Vercel Deployment

### 1. **Add Environment Variables to Vercel**

Go to your Vercel dashboard and add these environment variables:

#### **In Vercel Dashboard:**
1. Go to your project settings
2. Navigate to "Environment Variables"
3. Add these variables:

```env
SUPABASE_URL=https://kewhwewjdmexpftvngoy.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtld2h3ZXdqZG1leHBmdHZuZ295Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyNDU2NzQxMSwiZXhwIjoyMDQwMTQzNDExfQ.VXNOZFkD1mJHtRKOVZNMKnj8QfXWzQrGOqh1CdYmfEA
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtld2h3ZXdqZG1leHBmdHZuZ295Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjQ1Njc0MTEsImV4cCI6MjA0MDE0MzQxMX0.8kVpyXJrPz5aQlKdV0Iy0YdZiWxCxRqGOqh1CdYmfEA
JWT_SECRET=mit_reddit_super_secret_jwt_key_for_supabase_migration_2024_secure
NODE_ENV=production
PORT=3000
```

**Important**: Set all variables for **Production**, **Preview**, and **Development** environments.

### 2. **Update Vercel Configuration**

The current `vercel.json` needs updates for proper Supabase integration:

```json
{
  "version": 2,
  "builds": [
    {
      "src": "server/src/server.js",
      "use": "@vercel/node",
      "config": {
        "maxLambdaSize": "50mb"
      }
    },
    {
      "src": "client/**",
      "use": "@vercel/static"
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "/server/src/server.js"
    },
    {
      "src": "/(.*\\.(css|js|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot))",
      "dest": "/client/$1"
    },
    {
      "src": "/(.*)",
      "dest": "/client/index.html"
    }
  ],
  "functions": {
    "server/src/server.js": {
      "maxDuration": 30
    }
  }
}
```

### 3. **Update Supabase Dashboard Settings**

In your Supabase dashboard:

1. Go to **Authentication > Settings**
2. Update **Site URL** to your Vercel domain: `https://your-app.vercel.app`
3. Add **Redirect URLs**:
   - `https://your-app.vercel.app`
   - `https://your-app.vercel.app/auth/callback`
   - `http://localhost:5000` (for local development)

### 4. **Deploy Commands**

After setting up environment variables:

```bash
# Commit any changes
git add -A
git commit -m "Configure for Vercel deployment with Supabase"
git push origin main

# Vercel will automatically redeploy
```

## 🧪 **Testing Your Deployment**

### **Check These URLs:**
1. **Main App**: `https://your-app.vercel.app`
2. **Health Check**: `https://your-app.vercel.app/api/health`
3. **Test Auth**: Try signup/login on the deployed site

### **Expected Behavior:**
- ✅ Website loads without errors
- ✅ Signup/Login works properly
- ✅ Database connection successful
- ✅ Posts and content load correctly

## ⚠️ **Common Issues & Solutions**

### **Issue 1: "Database Error" on Health Check**
**Solution**: Double-check environment variables in Vercel dashboard

### **Issue 2: "Invalid API Key" Errors**
**Solution**: Ensure SUPABASE_ANON_KEY is correctly set in Vercel

### **Issue 3: Authentication Not Working**
**Solution**: Update Supabase redirect URLs to include your Vercel domain

### **Issue 4: 500 Internal Server Error**
**Solution**: Check Vercel function logs for specific error messages

## 🔧 **Vercel CLI Commands (Optional)**

If you prefer using CLI:

```bash
# Install Vercel CLI
npm i -g vercel

# Set environment variables via CLI
vercel env add SUPABASE_URL
vercel env add SUPABASE_SERVICE_KEY
vercel env add SUPABASE_ANON_KEY
vercel env add JWT_SECRET

# Deploy
vercel --prod
```

## 🎯 **Success Checklist**

- [ ] Environment variables added to Vercel
- [ ] Supabase dashboard updated with Vercel URL
- [ ] vercel.json configuration updated
- [ ] Code committed and pushed to GitHub
- [ ] Vercel automatically redeployed
- [ ] Website loads at your Vercel URL
- [ ] Authentication works on deployed site
- [ ] Database connection successful

## 🆘 **Need Help?**

If you encounter issues:

1. **Check Vercel Function Logs**: Go to Vercel dashboard > Functions tab
2. **Test API Endpoints**: Visit `https://your-app.vercel.app/api/health`
3. **Verify Environment Variables**: Ensure all variables are set correctly
4. **Check Supabase Settings**: Confirm redirect URLs are updated

## 🎉 **After Setup**

Once configured, your Vercel deployment will have:
- ✅ Full Supabase integration
- ✅ Working authentication
- ✅ Database connectivity
- ✅ All features from local development
- ✅ Production-ready performance

Your MIT Reddit will be live and fully functional on Vercel! 🚀
