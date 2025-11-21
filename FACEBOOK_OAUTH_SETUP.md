# Facebook OAuth Setup (Easier than Google!)

## Step 1: Create Facebook App
1. Go to https://developers.facebook.com/
2. Click "My Apps" → "Create App"
3. Choose "Consumer" → "Next"
4. **App name:** "EOTY Platform"
5. **App contact email:** `woyesabizunesh@gmail.com`
6. Click "Create App"

## Step 2: Set up Facebook Login
1. In your app dashboard, click "Add Product"
2. Find "Facebook Login" → Click "Set Up"
3. Choose "Web" platform
4. **Site URL:** `http://localhost:3000`
5. Click "Save"

## Step 3: Get Your Credentials
1. Go to "Settings" → "Basic"
2. Copy:
   - **App ID** (15 digits)
   - **App Secret** (32 characters)

## Step 4: Configure Your App
Update your `backend/.env` file:
```bash
# Frontend OAuth
VITE_FACEBOOK_APP_ID=your_15_digit_app_id

# Backend OAuth
FACEBOOK_APP_ID=your_15_digit_app_id
FACEBOOK_APP_SECRET=your_32_character_secret
```

## Step 5: Test Facebook Login
1. Go to `http://localhost:3000/login`
2. Click the Facebook button
3. Sign in with Facebook
4. Should work immediately!

## Why Facebook is Easier:
- ✅ **No domain verification** required for development
- ✅ **Works on localhost** immediately
- ✅ **Simple App ID + Secret** setup
- ✅ **No complex redirect URI** configuration

## Facebook vs Google:
| Feature | Facebook | Google |
|---------|----------|--------|
| Localhost Support | ✅ Works | ❌ Requires domain setup |
| Setup Time | 5 minutes | 15+ minutes |
| Development | ✅ Easy | ❌ Complex |
| Production | ✅ Ready | ✅ Ready |

**Facebook OAuth is much easier for development!** 🚀

Ready to set up Facebook OAuth instead?
