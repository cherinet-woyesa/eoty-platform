# Rate Limit Fix (429 Error) 🚦

## Problem
Getting error: **429 Too Many Requests** when trying to login.

## Root Cause
Better Auth has rate limiting that blocks too many login attempts. Even though we disabled it in the config (`enabled: false`), the backend server needs to be restarted for the change to take effect.

## Quick Fix

### Step 1: Restart Backend Server
```bash
cd backend
# Stop the server (Ctrl+C)
npm run dev
```

**Important:** Wait for the server to fully start before testing.

### Step 2: Wait 1-2 Minutes
The rate limit window is 15 minutes, but restarting clears the in-memory counter.

### Step 3: Test Login
- Navigate to `http://localhost:5173/login`
- Login with: `teacher@eoty.org` / `Teacher123!`

## If Still Getting 429 Error

### Option 1: Wait Longer
If you made many attempts, wait 15 minutes for the rate limit window to expire.

### Option 2: Increase Rate Limit (Temporary)
Edit `backend/lib/auth.js`:

```javascript
rateLimit: {
  enabled: true, // Enable but with high limit
  window: 1 * 60, // 1 minute window
  max: 1000, // Very high limit
},
```

Then restart backend.

### Option 3: Use Different Email
Try logging in with a different account that hasn't hit the rate limit:
- `student@eoty.org` / `Test123!`
- `admin@eoty.org` / `Admin123!`

## Why This Happened
During debugging, we made many login attempts which triggered Better Auth's rate limiting protection. This is actually a good security feature in production!

## Current Configuration
```javascript
// backend/lib/auth.js
rateLimit: {
  enabled: false, // ✅ Disabled for development
  window: 15 * 60, // 15 minutes
  max: 100, // 100 requests per window
},
```

## Expected Behavior After Restart
- ✅ No rate limiting
- ✅ Unlimited login attempts
- ✅ Login should work immediately

## Production Recommendation
For production, enable rate limiting with reasonable limits:
```javascript
rateLimit: {
  enabled: true,
  window: 15 * 60, // 15 minutes
  max: 5, // 5 failed attempts per 15 minutes
},
```

---

**Action Required:** Restart your backend server now! 🔄
