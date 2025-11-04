import { useAuth } from '../context/AuthContext';
import { useBetterAuth } from '../context/BetterAuthContext';

/**
 * Unified auth hook that works with both legacy auth and Better Auth
 * Automatically selects the correct auth provider based on feature flag
 */
export function useUnifiedAuth() {
  const isBetterAuthEnabled = import.meta.env.VITE_ENABLE_BETTER_AUTH === 'true';
  
  if (isBetterAuthEnabled) {
    const betterAuth = useBetterAuth();
    return {
      user: betterAuth.user ? {
        id: betterAuth.user.id,
        firstName: betterAuth.user.first_name,
        lastName: betterAuth.user.last_name,
        email: betterAuth.user.email,
        role: betterAuth.user.role,
        chapter: String(betterAuth.user.chapter_id),
        profilePicture: betterAuth.user.profile_picture,
      } : null,
      isLoading: betterAuth.isLoading,
      isAuthenticated: betterAuth.isAuthenticated,
      hasPermission: betterAuth.hasPermission,
      hasRole: betterAuth.hasRole,
    };
  } else {
    const legacyAuth = useAuth();
    return {
      user: legacyAuth.user,
      isLoading: legacyAuth.isLoading,
      isAuthenticated: legacyAuth.isAuthenticated,
      hasPermission: legacyAuth.hasPermission,
      hasRole: legacyAuth.hasRole,
    };
  }
}
