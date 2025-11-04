# Redirect Loop Fix 🔄

## Problem
Login was successful but the app was looping continuously between `/login` and `/dashboard` without showing any errors in console or network tab.

## Root Cause
The redirect loop was caused by **cookie/session issues** between the frontend (port 5173) and backend (port 5000):

1. **Missing credentials in fetch requests** - Better Auth client wasn't configured to send cookies
2. **CORS missing Vite port** - Backend CORS didn't allow requests from port 5173
3. **Cookie SameSite settings** - Not explicitly configured for cross-port development

## Fixes Applied

### 1. Frontend Auth Client (`frontend/src/lib/auth-client.ts`)
```typescript
export const authClient = createAuthClient({
  baseURL: import.meta.env.VITE_API_BASE_URL?.replace('/api', '') || "http://localhost:5000",
  fetchOptions: {
    credentials: "include", // ✅ CRITICAL: Send cookies with requests
  },
})
```

**Why this matters:** Without `credentials: "include"`, the browser won't send session cookies with API requests, causing the session check to always fail.

### 2. Backend Better Auth Config (`backend/lib/auth.js`)
```javascript
advanced: {
  // ... other settings
  cookieOptions: {
    sameSite: "lax", // ✅ Allow cookies across same-site requests
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    path: "/",
  },
},
```

**Why this matters:** Explicit cookie configuration ensures cookies work properly in development with different ports.

### 3. Backend CORS Config (`backend/app.js`)
```javascript
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5000',
  'http://localhost:5173', // ✅ Added Vite dev server
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5000',
  'http://127.0.0.1:5173' // ✅ Added Vite dev server
];
```

**Why this matters:** CORS must explicitly allow the frontend origin (port 5173) for cookies to be sent/received.

## How the Redirect Loop Happened

1. User logs in with `teacher@eoty.org` / `Teacher123!`
2. Backend creates session and sets cookie
3. Frontend redirects to `/dashboard`
4. Dashboard's `ProtectedRoute` checks `isAuthenticated` via `useSession()`
5. **Session check fails** because cookies aren't being sent
6. Redirects back to `/login`
7. Login page checks if user is authenticated
8. **Still no session** (same cookie issue)
9. Shows login form
10. But there might be auto-redirect logic → **LOOP**

## Testing the Fix

### Step 1: Restart Backend
```bash
cd backend
# Stop the server (Ctrl+C)
npm run dev
```

### Step 2: Restart Frontend
```bash
cd frontend
# Stop the server (Ctrl+C)
npm run dev
```

### Step 3: Clear Browser Data
1. Open DevTools (F12)
2. Go to Application tab
3. Clear all cookies for localhost
4. Clear localStorage
5. Refresh the page

### Step 4: Test Login
1. Navigate to `http://localhost:5173/login`
2. Login with: `teacher@eoty.org` / `Teacher123!`
3. Should redirect to dashboard and STAY there
4. Refresh the page - should remain logged in

## Verification Checklist

- [ ] Backend server restarted
- [ ] Frontend server restarted
- [ ] Browser cookies cleared
- [ ] Login successful
- [ ] Redirects to dashboard
- [ ] No redirect loop
- [ ] Page refresh keeps you logged in
- [ ] Network tab shows cookies being sent
- [ ] Session cookie visible in Application tab

## What to Check in DevTools

### Network Tab
1. Look for the login request to `/api/auth/sign-in/email`
2. Check Response Headers for `Set-Cookie`
3. Look for subsequent requests (like `/api/auth/session`)
4. Verify Request Headers include `Cookie`

### Application Tab
1. Go to Cookies → `http://localhost:5173`
2. Should see a Better Auth session cookie
3. Cookie should have:
   - `HttpOnly`: true
   - `SameSite`: Lax
   - `Secure`: false (in development)

### Console Tab
Should see:
```
🔐 Attempting Better Auth login...
📤 Sending login request...
✅ Login successful!
✅ Better Auth login successful
🔄 Redirecting to dashboard...
```

## If Still Having Issues

### Issue: Cookies not being set
**Solution:** Check backend console for Better Auth errors

### Issue: Cookies set but not sent
**Solution:** Verify `credentials: "include"` in auth client

### Issue: CORS errors
**Solution:** Check backend CORS allows port 5173

### Issue: Session expires immediately
**Solution:** Check session configuration in `backend/lib/auth.js`

## Files Modified
1. `frontend/src/lib/auth-client.ts` - Added credentials: "include"
2. `backend/lib/auth.js` - Added explicit cookie options
3. `backend/app.js` - Added port 5173 to CORS allowed origins

## Next Steps
After fixing the redirect loop:
1. Test all user roles (student, teacher, admin)
2. Test logout functionality
3. Test session persistence across page refreshes
4. Test "Remember me" functionality
5. Test password reset flow
