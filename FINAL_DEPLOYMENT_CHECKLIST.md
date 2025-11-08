# ✅ Final Deployment Checklist

## Pre-Deployment (Complete)

- [x] Codebase cleaned up (64 unnecessary files removed)
- [x] JWT_SECRET is strong and secure
- [x] MUX_ENVIRONMENT set to production
- [x] All credentials configured in backend/.env
- [x] Frontend production environment created
- [x] Deployment configuration files created
- [x] Readiness check passes
- [x] Git repository initialized
- [x] .env files in .gitignore

---

## Ready to Deploy

### Step 1: Commit Your Changes

```bash
# Review what changed
git status

# Add all changes
git add .

# Commit
git commit -m "Prepare for deployment: cleanup and configuration"

# Push to GitHub
git push origin main
```

### Step 2: Deploy Backend to Render (15 minutes)

- [ ] Go to [render.com](https://render.com) and sign up
- [ ] Create PostgreSQL database
  - Name: `eoty-postgres`
  - Database: `eoty_platform`
  - Plan: Free
- [ ] Copy Internal Database URL
- [ ] Create Web Service
  - Name: `eoty-backend`
  - Root Directory: `backend`
  - Build Command: `npm install`
  - Start Command: `npm start`
- [ ] Add all environment variables (see DEPLOYMENT_QUICK_REFERENCE.md)
- [ ] Deploy and wait for completion
- [ ] Copy backend URL: `https://eoty-backend.onrender.com`
- [ ] Open Shell and run:
  ```bash
  npm run migrate
  npm run seed
  ```
- [ ] Test health endpoint: `https://eoty-backend.onrender.com/health`

### Step 3: Deploy Frontend to Vercel (10 minutes)

- [ ] Go to [vercel.com](https://vercel.com) and sign up
- [ ] Import GitHub repository
- [ ] Configure:
  - Framework: Vite
  - Root Directory: `frontend`
  - Build Command: `npm run build`
  - Output Directory: `dist`
- [ ] Add environment variables:
  ```bash
  VITE_API_BASE_URL=https://eoty-backend.onrender.com/api
  VITE_GOOGLE_CLIENT_ID=your-google-client-id
  VITE_ENABLE_BETTER_AUTH=true
  NODE_ENV=production
  ```
- [ ] Deploy and wait for completion
- [ ] Copy frontend URL: `https://your-app.vercel.app`

### Step 4: Connect Frontend and Backend (5 minutes)

- [ ] Go back to Render dashboard
- [ ] Open backend service → Environment
- [ ] Update `FRONTEND_URL` to your Vercel URL
- [ ] Save and wait for automatic redeploy
- [ ] Test CORS by visiting your Vercel URL

### Step 5: Post-Deployment Testing (10 minutes)

- [ ] Visit your Vercel URL
- [ ] Check browser console for errors
- [ ] Test user registration
- [ ] Test user login
- [ ] Test video upload (if applicable)
- [ ] Test course creation
- [ ] Test all major features
- [ ] Check Render logs for errors
- [ ] Check Vercel logs for errors

### Step 6: Create Admin User

- [ ] Open Render Shell for backend
- [ ] Run admin creation script (see DEPLOYMENT_QUICK_REFERENCE.md)
- [ ] Test admin login

### Step 7: Final Verification

- [ ] All features working
- [ ] No console errors
- [ ] No server errors in logs
- [ ] CORS working correctly
- [ ] Videos uploading to Mux
- [ ] Emails sending correctly
- [ ] Database queries working

---

## Post-Deployment

### Monitoring Setup

- [ ] Set up uptime monitoring (UptimeRobot, Pingdom)
- [ ] Configure error tracking (optional: Sentry)
- [ ] Set up log alerts in Render
- [ ] Monitor Vercel analytics

### Documentation

- [ ] Document your deployment URLs
- [ ] Save admin credentials securely
- [ ] Update README with deployment info
- [ ] Share access with team members

### Security

- [ ] Verify .env files not in git
- [ ] Enable 2FA on Render account
- [ ] Enable 2FA on Vercel account
- [ ] Review CORS settings
- [ ] Check rate limiting is working

---

## Troubleshooting

### If Backend Fails to Deploy:
1. Check Render build logs
2. Verify all environment variables are set
3. Check database connection
4. Review migrations

### If Frontend Fails to Deploy:
1. Check Vercel build logs
2. Verify `VITE_API_BASE_URL` is correct
3. Check for TypeScript errors
4. Review build command

### If CORS Errors Occur:
1. Verify `FRONTEND_URL` in Render matches Vercel URL exactly
2. No trailing slashes
3. Redeploy backend after changing
4. Clear browser cache

### If Database Connection Fails:
1. Use Internal Database URL, not External
2. Verify database is running in Render
3. Check DB credentials
4. Test connection in Render Shell

---

## Success Criteria

Your deployment is successful when:

- ✅ Backend health check returns `{"status":"healthy"}`
- ✅ Frontend loads without errors
- ✅ Users can register and login
- ✅ Videos can be uploaded
- ✅ All features work as expected
- ✅ No errors in logs
- ✅ CORS is working
- ✅ Admin can access admin panel

---

## Your Deployment URLs

Fill these in after deployment:

```
Frontend: https://_____________________.vercel.app
Backend:  https://_____________________.onrender.com
Database: <internal-url-keep-private>

Admin Email: _____________________
Admin Password: <keep-secure>
```

---

## Next Steps After Successful Deployment

1. **Monitor for 24 hours**: Watch logs and uptime
2. **Test thoroughly**: Have team members test all features
3. **Gather feedback**: Get user feedback on performance
4. **Plan scaling**: Consider upgrading to paid plans if needed
5. **Consider Docker**: For production, follow Docker deployment guide

---

## Need Help?

- **Render Issues**: Check `QUICK_START_DEPLOYMENT.md` → Troubleshooting
- **Vercel Issues**: Check Vercel build logs
- **General Help**: Review `DEPLOYMENT_QUICK_REFERENCE.md`
- **API Docs**: Check `backend/docs/` folder

---

## Congratulations! 🎉

Once all checkboxes are complete, your EOTY Platform will be live and ready for users!

**Remember**: 
- Free tier has limitations (cold starts on Render)
- Monitor usage and upgrade as needed
- Keep credentials secure
- Regular backups recommended

**Good luck with your deployment!** 🚀
