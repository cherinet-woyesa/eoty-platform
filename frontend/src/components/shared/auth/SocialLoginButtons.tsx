/**
 * FR7: Enhanced Social Login Buttons
 * REQUIREMENT: SSO/Social Login (OAuth2, Google, Facebook)
 */

import React, { memo, useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { authApi } from '@/services/api';
import { useNavigate } from 'react-router-dom';

const SocialLoginButtons: React.FC = memo(() => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isFacebookLoading, setIsFacebookLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load Google OAuth script
  useEffect(() => {
    const loadGoogleScript = () => {
      if (window.google) return; // Already loaded

      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      document.body.appendChild(script);
    };

    loadGoogleScript();
  }, []);

  const handleGoogleLogin = async () => {
    try {
      setIsGoogleLoading(true);
      setError(null);

      // Check if Google OAuth is available
      if (!window.google) {
        throw new Error('Google OAuth library not loaded. Please refresh the page.');
      }

      // Initialize Google OAuth (REQUIREMENT: OAuth2, Google)
      window.google.accounts.id.initialize({
        client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
        callback: async (response: any) => {
          try {
            // Decode JWT token to get user info
            const tokenParts = response.credential.split('.');
            const payload = JSON.parse(atob(tokenParts[1]));
            
            const googleData = {
              googleId: payload.sub,
              email: payload.email,
              firstName: payload.given_name || '',
              lastName: payload.family_name || '',
              profilePicture: payload.picture
            };

            // Send to backend
            const apiResponse = await authApi.googleLogin(googleData);
            
            if (apiResponse.success && apiResponse.data) {
              const { token, user } = apiResponse.data;
              
              // Use the auth context login method
              await login(googleData.email, ''); // Password not needed for SSO
              
              // Navigate to dashboard
              navigate('/dashboard');
            } else {
              throw new Error(apiResponse.message || 'Google login failed');
            }
          } catch (err: any) {
            console.error('Google callback error:', err);
            setError(err.message || 'Failed to complete Google login');
          } finally {
            setIsGoogleLoading(false);
          }
        }
      });

      // Trigger Google sign-in
      window.google.accounts.id.prompt((notification: any) => {
        if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
          // Fallback: show one-tap sign-in
          window.google.accounts.id.renderButton(
            document.getElementById('google-signin-button') || document.body,
            {
              theme: 'outline',
              size: 'large',
              width: '100%'
            }
          );
        }
      });

      // Alternative: Use popup flow
      window.google.accounts.oauth2.initTokenClient({
        client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
        scope: 'email profile',
        callback: async (tokenResponse: any) => {
          // Get user info from Google API
          const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: { Authorization: `Bearer ${tokenResponse.access_token}` }
          });
          const userInfo = await userInfoResponse.json();

          const googleData = {
            googleId: userInfo.id,
            email: userInfo.email,
            firstName: userInfo.given_name || '',
            lastName: userInfo.family_name || '',
            profilePicture: userInfo.picture
          };

          const apiResponse = await authApi.googleLogin(googleData);
          
          if (apiResponse.success && apiResponse.data) {
            await login(googleData.email, '');
            navigate('/dashboard');
          }
        }
      }).requestAccessToken();
      
    } catch (error: any) {
      console.error('Google login failed:', error);
      setError(error.message || 'Google login failed');
      setIsGoogleLoading(false);
    }
  };

  const handleFacebookLogin = async () => {
    try {
      setIsFacebookLoading(true);
      setError(null);

      // Facebook OAuth (REQUIREMENT: Facebook)
      // Note: This requires Facebook SDK to be loaded
      if (!window.FB) {
        // Load Facebook SDK
        const script = document.createElement('script');
        script.src = 'https://connect.facebook.net/en_US/sdk.js';
        script.async = true;
        script.defer = true;
        script.crossOrigin = 'anonymous';
        document.body.appendChild(script);

        script.onload = () => {
          window.FB.init({
            appId: import.meta.env.VITE_FACEBOOK_APP_ID || '',
            cookie: true,
            xfbml: true,
            version: 'v18.0'
          });

          // Trigger login
          window.FB.login((response: any) => {
            if (response.authResponse) {
              // Get user info
              window.FB.api('/me', { fields: 'id,name,email,picture' }, async (userInfo: any) => {
                try {
                  const facebookData = {
                    facebookId: userInfo.id,
                    email: userInfo.email || `${userInfo.id}@facebook.com`,
                    firstName: userInfo.name.split(' ')[0] || '',
                    lastName: userInfo.name.split(' ').slice(1).join(' ') || '',
                    profilePicture: userInfo.picture?.data?.url
                  };

                  // Send to backend (REQUIREMENT: Facebook OAuth)
                  const apiResponse = await authApi.facebookLogin(facebookData);
                  
                  if (apiResponse.success && apiResponse.data) {
                    const { token, user } = apiResponse.data;
                    
                    // Use the auth context login method
                    await login(facebookData.email, ''); // Password not needed for SSO
                    
                    // Navigate to dashboard
                    navigate('/dashboard');
                  } else {
                    throw new Error(apiResponse.message || 'Facebook login failed');
                  }
                } catch (err: any) {
                  console.error('Facebook login error:', err);
                  setError(err.message || 'Facebook login failed');
                } finally {
                  setIsFacebookLoading(false);
                }
              });
            } else {
              setError('Facebook login cancelled');
              setIsFacebookLoading(false);
            }
          }, { scope: 'email,public_profile' });
        };
      } else {
        // SDK already loaded, trigger login
        window.FB.login((response: any) => {
          if (response.authResponse) {
            window.FB.api('/me', { fields: 'id,name,email,picture' }, async (userInfo: any) => {
              try {
                const facebookData = {
                  facebookId: userInfo.id,
                  email: userInfo.email || `${userInfo.id}@facebook.com`,
                  firstName: userInfo.name.split(' ')[0] || '',
                  lastName: userInfo.name.split(' ').slice(1).join(' ') || '',
                  profilePicture: userInfo.picture?.data?.url
                };

                const apiResponse = await authApi.facebookLogin(facebookData);
                
                if (apiResponse.success && apiResponse.data) {
                  await login(facebookData.email, '');
                  navigate('/dashboard');
                } else {
                  throw new Error(apiResponse.message || 'Facebook login failed');
                }
              } catch (err: any) {
                console.error('Facebook login error:', err);
                setError(err.message || 'Facebook login failed');
              } finally {
                setIsFacebookLoading(false);
              }
            });
          } else {
            setError('Facebook login cancelled');
            setIsFacebookLoading(false);
          }
        }, { scope: 'email,public_profile' });
      }
    } catch (error: any) {
      console.error('Facebook login failed:', error);
      setError(error.message || 'Facebook login failed');
      setIsFacebookLoading(false);
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

      {/* Error message */}
      {error && (
        <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Responsive grid: 1 column mobile, 2 columns tablet, 3 columns desktop */}
      <div className="mt-4 sm:mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3" role="group" aria-label="Social login options">
        {/* Google Login (REQUIREMENT: Google OAuth) */}
        <button
          onClick={handleGoogleLogin}
          disabled={isGoogleLoading}
          className="group relative w-full inline-flex justify-center items-center min-h-[44px] py-3 px-4 border-2 border-gray-200 rounded-xl shadow-sm bg-white text-sm font-semibold text-gray-700 hover:bg-gray-50 hover:border-blue-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:border-gray-200 disabled:hover:shadow-sm disabled:active:scale-100"
          aria-label="Sign in with Google"
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
          <span className="hidden sm:inline">
            {isGoogleLoading ? 'Connecting...' : 'Google'}
          </span>
        </button>

        {/* Facebook Login (REQUIREMENT: Facebook OAuth) */}
        <button
          onClick={handleFacebookLogin}
          disabled={isFacebookLoading}
          className="group relative w-full inline-flex justify-center items-center min-h-[44px] py-3 px-4 border-2 border-gray-200 rounded-xl shadow-sm bg-white text-sm font-semibold text-gray-700 hover:bg-gray-50 hover:border-blue-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:border-gray-200 disabled:hover:shadow-sm disabled:active:scale-100"
          aria-label="Sign in with Facebook"
        >
          <svg className="w-5 h-5 sm:mr-2 flex-shrink-0" fill="#1877F2" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
          </svg>
          <span className="hidden sm:inline">
            {isFacebookLoading ? 'Connecting...' : 'Facebook'}
          </span>
        </button>

      </div>
    </div>
  );
});

// Extend Window interface for TypeScript
declare global {
  interface Window {
    google?: any;
    FB?: any;
  }
}

SocialLoginButtons.displayName = 'SocialLoginButtons';

export default SocialLoginButtons;