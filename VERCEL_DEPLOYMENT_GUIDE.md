# 🚀 Vercel Frontend Deployment Guide

## Prerequisites
- GitHub account with your code pushed
- Vercel account (sign up at https://vercel.com)

## Step 1: Deploy to Vercel

### Option A: Using Vercel CLI (Recommended)

1. **Install Vercel CLI:**
```bash
npm install -g vercel
```

2. **Login to Vercel:**
```bash
vercel login
```

3. **Deploy from project root:**
```bash
vercel
```

4. **Follow the prompts:**
   - Set up and deploy? **Y**
   - Which scope? Select your account
   - Link to existing project? **N**
   - Project name? **eoty-platform** (or your choice)
   - In which directory is your code located? **./frontend**
   - Want to override settings? **N**

5. **Set environment variables:**
```bash
vercel env add VITE_API_URL
```
Enter: `https://eoty-backend.onrender.com`

6. **Deploy to production:**
```bash
vercel --prod
```

### Option B: Using Vercel Dashboard

1. **Go to https://vercel.com/new**

2. **Import your GitHub repository**

3. **Configure Project:**
   - Framework Preset: **Vite**
   - Root Directory: **frontend**
   - Build Command: `npm run build`
   - Output Directory: `dist`

4. **Add Environment Variable:**
   - Name: `VITE_API_URL`
   - Value: `https://eoty-backend.onrender.com`

5. **Click "Deploy"**

## Step 2: Verify Deployment

Once deployed, Vercel will give you a URL like:
`https://eoty-platform.vercel.app`

Test it by:
1. Opening the URL
2. Trying to login with test credentials:
   - Email: `admin@eoty.org`
   - Password: `admin123`

## Step 3: Update Backend CORS

Your backend needs to allow requests from your Vercel domain.

Add this to your Render environment variables:
```
FRONTEND_URL=https://your-app.vercel.app
```

Then update backend CORS configuration to include your Vercel URL.

## 🎯 Quick Deploy Command

If you have Vercel CLI installed:
```bash
vercel --prod
```

## 📝 Environment Variables Needed

| Variable | Value | Description |
|----------|-------|-------------|
| `VITE_API_URL` | `https://eoty-backend.onrender.com` | Backend API URL |

## 🔧 Troubleshooting

### Build Fails
- Check that all dependencies are in `package.json`
- Verify Node version compatibility
- Check build logs in Vercel dashboard

### API Connection Issues
- Verify `VITE_API_URL` is set correctly
- Check backend CORS settings
- Verify backend is running at the specified URL

### 404 on Routes
- Vercel.json should have rewrites configured (already done)
- Check that SPA routing is working

## 🎉 Success!

Your frontend should now be live and connected to your backend!

Test URLs:
- Frontend: https://your-app.vercel.app
- Backend: https://eoty-backend.onrender.com
- Backend Health: https://eoty-backend.onrender.com/api/health
