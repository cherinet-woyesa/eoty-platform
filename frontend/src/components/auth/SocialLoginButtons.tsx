import React, { memo } from 'react';
import { useAuth } from '../../context/AuthContext';

const SocialLoginButtons: React.FC = memo(() => {
  const { loginWithGoogle } = useAuth();

  const handleGoogleLogin = async () => {
    try {
      // In a real implementation, this would:
      // 1. Load the Google OAuth library
      // 2. Initiate the Google sign-in flow
      // 3. Get the user's Google profile data
      // 4. Send that data to our backend
      
      // For demonstration purposes, we'll simulate a successful Google login
      // In a real app, you would use the Google OAuth library:
      /*
      // Load the Google OAuth library
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      document.body.appendChild(script);
      
      // Initialize Google Auth
      google.accounts.id.initialize({
        client_id: "YOUR_GOOGLE_CLIENT_ID",
        callback: handleGoogleCallback
      });
      
      // Handle the Google OAuth callback
      const handleGoogleCallback = (response) => {
        // Decode the JWT token to get user info
        const user = jwt_decode(response.credential);
        
        // Send to our backend
        loginWithGoogle({
          googleId: user.sub,
          email: user.email,
          firstName: user.given_name,
          lastName: user.family_name,
          profilePicture: user.picture
        });
      };
      */
      
      // Simulate Google login for demonstration
      alert('In a real application, this would initiate the Google OAuth flow. For now, we\'ll simulate a successful login.');
      
      // Simulate successful Google login
      await loginWithGoogle({
        googleId: '123456789',
        email: 'user@gmail.com',
        firstName: 'Google',
        lastName: 'User',
        profilePicture: 'https://via.placeholder.com/150'
      });
      
    } catch (error: any) {
      console.error('Google login failed:', error);
      alert('Google login failed: ' + (error.message || 'Unknown error'));
    }
  };

  return (
    <div className="mt-4 sm:mt-6">
      <div className="relative" role="separator" aria-label="Or continue with social login">
        <div className="absolute inset-0 flex items-center" aria-hidden="true">
          <div className="w-full border-t border-gray-300" />
        </div>
        <div className="relative flex justify-center text-xs sm:text-sm">
          <span className="px-2 bg-white text-gray-500">
            Or continue with
          </span>
        </div>
      </div>

      {/* Responsive grid: 1 column mobile, 2 columns tablet, 3 columns desktop */}
      <div className="mt-4 sm:mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3" role="group" aria-label="Social login options">
        {/* Google Login */}
        <button
          onClick={handleGoogleLogin}
          className="group relative w-full inline-flex justify-center items-center min-h-[44px] py-3 px-4 border-2 border-gray-200 rounded-xl shadow-sm bg-white text-sm font-semibold text-gray-700 hover:bg-gray-50 hover:border-blue-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:border-gray-200 disabled:hover:shadow-sm disabled:active:scale-100"
          aria-label="Sign in with Google"
          disabled={false}
        >
          <svg className="w-5 h-5 sm:mr-2 flex-shrink-0" viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          {/* Show text on tablet and desktop, hide on mobile */}
          <span className="hidden sm:inline">Google</span>
        </button>

        {/* Facebook Login */}
        <div className="relative group">
          <button
            className="w-full inline-flex justify-center items-center min-h-[44px] py-3 px-4 border-2 border-gray-200 rounded-xl shadow-sm bg-white text-sm font-semibold text-gray-400 cursor-not-allowed opacity-60 transition-all duration-200"
            aria-label="Sign in with Facebook (Coming Soon)"
            disabled={true}
            aria-disabled="true"
          >
            <svg className="w-5 h-5 sm:mr-2 flex-shrink-0" fill="#1877F2" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
            </svg>
            {/* Show text on tablet and desktop, hide on mobile */}
            <span className="hidden sm:inline">Facebook</span>
          </button>
          {/* Tooltip for disabled state */}
          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
            Facebook login coming soon
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900"></div>
          </div>
        </div>

        {/* Apple Login */}
        <div className="relative group">
          <button
            className="w-full inline-flex justify-center items-center min-h-[44px] py-3 px-4 border-2 border-gray-200 rounded-xl shadow-sm bg-white text-sm font-semibold text-gray-400 cursor-not-allowed opacity-60 transition-all duration-200"
            aria-label="Sign in with Apple (Coming Soon)"
            disabled={true}
            aria-disabled="true"
          >
            <svg className="w-5 h-5 sm:mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
            </svg>
            {/* Show text on tablet and desktop, hide on mobile */}
            <span className="hidden sm:inline">Apple</span>
          </button>
          {/* Tooltip for disabled state */}
          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
            Apple login coming soon
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900"></div>
          </div>
        </div>
      </div>
    </div>
  );
});

SocialLoginButtons.displayName = 'SocialLoginButtons';

export default SocialLoginButtons;