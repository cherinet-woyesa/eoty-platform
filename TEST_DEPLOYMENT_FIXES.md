# Testing Deployment Fixes

Use this guide to verify all fixes are working correctly after deployment.

## Pre-Testing Checklist

Before testing, ensure:
- [ ] `VITE_API_BASE_URL` is set in Vercel environment variables
- [ ] Frontend has been redeployed on Vercel
- [ ] Backend is running on Render
- [ ] You have access to browser DevTools

## Test 1: Environment Variable Configuration

**Test:** Verify API base URL is correctly configured

1. Open your Vercel-deployed frontend in browser
2. Open browser DevTools (F12)
3. Go to **Console** tab
4. Type: `console.log(import.meta.env.VITE_API_BASE_URL)`
5. **Expected:** Should show your Render backend URL (e.g., `https://your-backend.onrender.com/api`)
6. **If wrong:** Environment variable not set correctly

**Alternative test:**
- Open **Network** tab in DevTools
- Try to login
- Check the request URL - should point to your Render backend, not localhost

## Test 2: CORS Configuration

**Test:** Verify CORS allows requests from Vercel

1. Open browser DevTools → **Network** tab
2. Try to login or make any API call
3. Check for CORS errors in **Console** tab
4. **Expected:** No CORS errors, requests succeed
5. **If CORS error:** Check backend logs on Render for CORS rejection messages

**Look for:**
- ✅ No "CORS policy" errors
- ✅ No "Access-Control-Allow-Origin" errors
- ✅ API requests return 200/201/400 (not CORS errors)

## Test 3: API Timeout (60 seconds)

**Test:** Verify API calls don't timeout prematurely

1. Open **Network** tab in DevTools
2. Make an API call (login, fetch courses, etc.)
3. Check the request timing
4. **Expected:** Requests complete within 60 seconds (or fail with proper error)
5. **If timeout < 60s:** Check if it's a network issue or backend issue

**Test slow connection:**
- Use browser DevTools → **Network** → Throttling → "Slow 3G"
- Try making API calls
- Should wait up to 60 seconds before timing out

## Test 4: Loading State (No Infinite Loading)

**Test:** Verify "Loading your experience..." doesn't hang forever

1. Open your Vercel frontend
2. Clear browser cache and localStorage:
   - Open DevTools → **Application** → **Storage** → **Clear site data**
3. Refresh the page
4. **Expected:** 
   - "Loading your experience..." appears briefly (< 5 seconds)
   - Then either shows login page or dashboard
5. **If stuck loading:** Check console for API errors

**Test with network issues:**
1. Open DevTools → **Network** → Check "Offline"
2. Refresh page
3. **Expected:** Should show login page (using cached data or graceful fallback)
4. Uncheck "Offline"
5. **Expected:** Should connect and work normally

## Test 5: 404 Errors on Refresh

**Test:** Verify page refresh doesn't show 404

1. Navigate to any route (e.g., `/dashboard`, `/courses`, `/teacher/dashboard`)
2. **Refresh the page** (F5 or Ctrl+R)
3. **Expected:** Page loads correctly, no 404 error
4. **If 404:** `vercel.json` rewrite not working

**Test navigation:**
1. Navigate to `/dashboard`
2. Click browser **Back** button
3. **Expected:** Should go back to previous page
4. Click browser **Forward** button
5. **Expected:** Should go forward correctly

**Test direct URL access:**
1. Copy a route URL (e.g., `https://your-app.vercel.app/teacher/dashboard`)
2. Open in new tab/incognito
3. **Expected:** Page loads correctly
4. **If 404:** SPA routing not configured correctly

## Test 6: Video Upload

**Test:** Verify video upload works with extended timeout

1. Navigate to a page with video upload functionality
2. Select a video file (preferably > 10MB to test timeout)
3. Start upload
4. **Expected:**
   - Upload progress shows
   - Upload completes (or shows proper error if file too large)
   - No timeout errors before 5 minutes
5. **If timeout < 5 min:** Check backend upload limits or network issues

**Check console for:**
- ✅ No "Request timeout" errors (unless > 5 minutes)
- ✅ Upload progress updates
- ✅ Success or proper error message

## Test 7: Login Functionality

**Test:** Verify login works without timeout errors

1. Go to login page
2. Enter credentials
3. Click login
4. **Expected:**
   - Login succeeds within reasonable time (< 10 seconds)
   - Redirects to appropriate dashboard
   - No "Request timeout" errors
5. **If timeout:** Check `VITE_API_BASE_URL` is correct

**Check Network tab:**
- ✅ POST request to `/auth/login` goes to Render backend
- ✅ Response received (200 or 401, not timeout)
- ✅ Response time < 60 seconds

## Test 8: API Error Handling

**Test:** Verify graceful error handling

1. Temporarily set wrong `VITE_API_BASE_URL` (or disconnect network)
2. Try to login or make API call
3. **Expected:**
   - Shows appropriate error message
   - Doesn't hang forever
   - UI remains responsive
4. Fix the issue
5. **Expected:** Should work normally

## Quick Test Script

Run these in browser console (after page loads):

```javascript
// Test 1: Check API base URL
console.log('API Base URL:', import.meta.env.VITE_API_BASE_URL);

// Test 2: Test API connection
fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'}/health`)
  .then(r => r.json())
  .then(data => console.log('✅ Backend reachable:', data))
  .catch(err => console.error('❌ Backend unreachable:', err));

// Test 3: Check if token exists (if logged in)
console.log('Token exists:', !!localStorage.getItem('token'));

// Test 4: Test CORS
fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'}/health`, {
  method: 'GET',
  credentials: 'include'
})
  .then(r => {
    console.log('✅ CORS working, status:', r.status);
    return r.json();
  })
  .then(data => console.log('Response:', data))
  .catch(err => console.error('❌ CORS error:', err));
```

## Expected Results Summary

After all tests, you should see:

✅ **No CORS errors** in console  
✅ **No infinite loading** states  
✅ **No 404 errors** on page refresh  
✅ **API calls complete** within 60 seconds  
✅ **Video uploads work** (or show proper errors)  
✅ **Login works** without timeout  
✅ **Navigation works** (back/forward buttons)  
✅ **Direct URL access works** (no 404s)

## Common Issues & Quick Fixes

### Issue: Still seeing localhost in API calls
**Fix:** `VITE_API_BASE_URL` not set in Vercel → Set it in Vercel dashboard

### Issue: CORS errors
**Fix:** Backend CORS updated, but may need redeploy → Redeploy backend on Render

### Issue: 404 on refresh
**Fix:** `vercel.json` updated → Commit and push to trigger redeploy

### Issue: Still timing out
**Fix:** Check Render backend is running → Check Render dashboard

### Issue: Infinite loading
**Fix:** AuthContext updated → Clear browser cache and localStorage

## Reporting Test Results

If any test fails, note:
1. Which test failed
2. Browser console errors
3. Network tab request details
4. Screenshot if possible

