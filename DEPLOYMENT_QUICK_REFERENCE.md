# 🚀 Quick Deployment Reference

## Current Status: Ready to Deploy

You have completed the pre-deployment preparation. Now follow these steps in order.

---

## Step 1: Create PostgreSQL Database on Render (5 min)

1. **Go to [render.com](https://render.com)** and sign up/login
2. **Click "New +" → "PostgreSQL"**
3. **Configure database:**
   - Name: `eoty-postgres`
   - Database: `eoty_platform`
   - User: `eoty_user` (auto-generated)
   - Region: Choose closest to you
   - Plan: **Free** (or Starter for production)
4. **Click "Create Database"**
5. **Wait 2-3 minutes** for database to provision

### 📍 Get Database Connection Details

Once created, you'll see the database dashboard with connection info:

**Look for "Connections" section** - you'll see:
- ✅ **Internal Database URL** (use this one!)
- ❌ External Database URL (don't use - costs money)

**Internal URL format:**
```
postgresql://eoty_user:password123@dpg-xxxxx-a:5432/eoty_platform
```

### 🔍 Extract These Values for Backend Environment:

From the URL above, extract:

| Variable | Value | Example |
|----------|-------|---------|
| `DATABASE_URL` | Full Internal URL | `postgresql://eoty_user:pass@dpg-xxxxx-a:5432/eoty_platform` |
| `DB_HOST` | Part after `@` before `:5432` | `dpg-xxxxx-a` |
| `DB_USER` | Part after `://` before `:` | `eoty_user` |
| `DB_PASSWORD` | Part after `:` before `@` | `password123` |
| `DB_NAME` | Part after last `/` | `eoty_platform` |
| `DB_PORT` | Usually | `5432` |

**✅ Copy these values - you'll need them in Step 2!**

---

## Step 2: Deploy Backend to Render (10 min)

1. **Click "New +" → "Web Service"**
2. **Connect your GitHub repository**
3. **Configure service:**
   - Name: `eoty-backend`
   - Region: Same as database
   - Branch: `main`
   - Root Directory: `backend`
   - Runtime: `Node`
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Plan: **Free** (or Starter)

4. **Add Environment Variables** (click "Advanced" → "Add Environment Variable"):

```bash
# Database (from Step 1)
DATABASE_URL=<your-internal-database-url>
DB_HOST=<your-db-host>
DB_USER=<your-db-user>
DB_PASSWORD=<your-db-password>
DB_NAME=eoty_platform
DB_PORT=5432

# Security
NODE_ENV=production
JWT_SECRET=<generate-with-command-below>
JWT_EXPIRES_IN=7d

# Mux Video
MUX_TOKEN_ID=<your-mux-token-id>
MUX_TOKEN_SECRET=<your-mux-token-secret>
MUX_WEBHOOK_SECRET=<your-mux-webhook-secret>
MUX_ENVIRONMENT=production

# AWS S3 (if using)
AWS_REGION=us-east-1
AWS_BUCKET_NAME=<your-bucket-name>
AWS_ACCESS_KEY_ID=<your-aws-key>
AWS_SECRET_ACCESS_KEY=<your-aws-secret>

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=<your-email>
SMTP_PASSWORD=<your-app-password>
EMAIL_FROM=noreply@yourdomain.com

# Google OAuth
GOOGLE_CLIENT_ID=<your-google-client-id>
GOOGLE_CLIENT_SECRET=<your-google-client-secret>

# Frontend (will update after Step 3)
FRONTEND_URL=https://your-app.vercel.app
```

**Generate JWT_SECRET:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

5. **Click "Create Web Service"**
6. **Wait 5-10 minutes** for deployment
7. **Copy your backend URL:** `https://eoty-backend-xxxx.onrender.com`

### Run Database Migrations

Once deployed:
1. **Go to your backend service dashboard**
2. **Click "Shell" tab** (top right)
3. **Run these commands:**
```bash
npm run migrate
npm run seed
```

### Test Backend

Visit: `https://your-backend-url.onrender.com/health`

Should return:
```json
{"status":"healthy","timestamp":"..."}
```

---

## Step 3: Deploy Frontend to Vercel (5 min)

1. **Go to [vercel.com](https://vercel.com)** and sign up/login
2. **Click "Add New..." → "Project"**
3. **Import your GitHub repository**
4. **Configure project:**
   - Framework Preset: `Vite`
   - Root Directory: `frontend`
   - Build Command: `npm run build`
   - Output Directory: `dist`

5. **Add Environment Variables:**

```bash
VITE_API_BASE_URL=https://your-backend-url.onrender.com/api
VITE_GOOGLE_CLIENT_ID=<your-google-client-id>
VITE_ENABLE_BETTER_AUTH=true
NODE_ENV=production
```

6. **Click "Deploy"**
7. **Wait 3-5 minutes**
8. **Copy your frontend URL:** `https://your-app.vercel.app`

---

## Step 4: Connect Frontend & Backend (2 min)

Now that you have both URLs, connect them:

### Update Backend Environment

1. **Go to Render dashboard → Backend service**
2. **Click "Environment" tab**
3. **Update `FRONTEND_URL`:**
   ```
   FRONTEND_URL=https://your-app.vercel.app
   ```
4. **Click "Save Changes"**
5. **Wait for automatic redeploy** (2-3 min)

---

## Step 5: Test Your Deployment (5 min)

### Frontend Tests
- [ ] Visit your Vercel URL
- [ ] No console errors (F12 → Console)
- [ ] Login page loads
- [ ] Register page loads

### Backend Tests
- [ ] Visit `https://your-backend.onrender.com/health`
- [ ] Returns `{"status":"healthy"}`

### Integration Tests
- [ ] Register a new user
- [ ] Login with that user
- [ ] Check if you can access dashboard
- [ ] Test video upload (if applicable)

---

## Step 6: Create Admin User (3 min)

1. **Go to Render → Backend service → Shell**
2. **Run this command** (replace with your details):

```javascript
node -e "
const bcrypt = require('bcryptjs');
const knex = require('knex')(require('./knexfile').production);

async function createAdmin() {
  try {
    const hash = await bcrypt.hash('YourSecurePassword123!', 10);
    await knex('users').insert({
      first_name: 'Admin',
      last_name: 'User',
      email: 'admin@yourdomain.com',
      password_hash: hash,
      role: 'platform_admin',
      chapter_id: 1,
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    });
    console.log('✅ Admin user created successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}
createAdmin();
"
```

3. **Test admin login** at your frontend URL

---

## 🎉 Deployment Complete!

Your application is now live at:
- **Frontend:** `https://your-app.vercel.app`
- **Backend:** `https://your-backend.onrender.com`

---

## 🚨 Troubleshooting

### CORS Errors
- Verify `FRONTEND_URL` in Render matches Vercel URL exactly
- No trailing slashes
- Redeploy backend after changing

### Database Connection Failed
- Use **Internal** Database URL, not External
- Check database is running in Render
- Verify credentials match

### Backend Not Starting
- Check Render logs: Dashboard → Logs tab
- Verify all environment variables are set
- Check for missing dependencies

### Frontend Build Failed
- Check Vercel logs
- Verify `VITE_API_BASE_URL` is correct
- Check for TypeScript errors

### Cold Starts (Free Tier)
- Render free tier spins down after 15 min inactivity
- First request after sleep takes 30-60 seconds
- Consider upgrading to paid plan for production

---

## 📊 Monitoring

### Set Up Uptime Monitoring
1. **Go to [uptimerobot.com](https://uptimerobot.com)** (free)
2. **Add monitor:**
   - Type: HTTP(s)
   - URL: `https://your-backend.onrender.com/health`
   - Interval: 5 minutes
3. **Get alerts** when backend goes down

### Check Logs
- **Render:** Dashboard → Logs tab
- **Vercel:** Dashboard → Deployments → View Function Logs

---

## 🔒 Security Checklist

- [ ] JWT_SECRET is strong (32+ characters)
- [ ] Database password is strong
- [ ] `.env` files not in git
- [ ] CORS configured correctly
- [ ] HTTPS enabled (automatic on Render/Vercel)
- [ ] Admin password is secure
- [ ] 2FA enabled on Render account
- [ ] 2FA enabled on Vercel account

---

## 📝 Save Your Deployment Info

```
Frontend URL: https://_____________________.vercel.app
Backend URL:  https://_____________________.onrender.com
Database:     <keep-private>

Admin Email:    _____________________
Admin Password: <keep-secure>

Deployed on:    _____________________
Deployed by:    _____________________
```

---

## Next Steps

1. **Monitor for 24 hours** - Watch for errors
2. **Test all features** - Comprehensive testing
3. **Invite team members** - Share access
4. **Set up backups** - Database backup strategy
5. **Plan scaling** - Upgrade plans as needed

---

## Need Help?

- **Render Docs:** https://render.com/docs
- **Vercel Docs:** https://vercel.com/docs
- **Full Guide:** See `DEPLOYMENT_GUIDE.md`
- **Checklist:** See `FINAL_DEPLOYMENT_CHECKLIST.md`

**Good luck! 🚀**
