# Google Cloud Console OAuth Configuration Guide

## Issue: `redirect_uri_mismatch`
You are seeing this error because your application is running on `https://www.eotcommunity.org`, but Google's OAuth servers don't recognize this domain as an authorized redirect destination.

## Solution
You need to add the specific callback URL for your custom domain to the Google Cloud Console.

### 1. Go to Google Cloud Console
1. Navigate to [Google Cloud Console - APIs & Services > Credentials](https://console.cloud.google.com/apis/credentials).
2. Find your **OAuth 2.0 Client ID** (the one you created for this project).
3. Click the **Edit** (pencil) icon.

### 2. Add Authorized Redirect URIs
Under the **Authorized redirect URIs** section, ensure you have ALL of the following:

#### Production (Custom Domain) - **CRITICAL FOR YOUR CURRENT ERROR**
- `https://www.eotcommunity.org/auth/google/callback`
- `https://eotcommunity.org/auth/google/callback`

#### Production (Vercel Default)
- `https://eoty-platform.vercel.app/auth/google/callback`

#### Local Development
- `http://localhost:5173/auth/google/callback`
- `http://localhost:3000/auth/google/callback`

### 3. Add Authorized JavaScript Origins
Under **Authorized JavaScript origins**, ensure you have:
- `https://www.eotcommunity.org`
- `https://eotcommunity.org`
- `https://eoty-platform.vercel.app`
- `http://localhost:5173`

### 4. Save Changes
Click **Save**. Note that it may take anywhere from **5 minutes to a few hours** for these changes to propagate across Google's global network, though it is often instant.

## Verification
After saving:
1. Wait 5 minutes.
2. Open your site: `https://www.eotcommunity.org/login`
3. Try the "Continue with Google" button again.
