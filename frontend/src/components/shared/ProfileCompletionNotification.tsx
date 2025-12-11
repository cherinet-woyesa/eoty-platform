import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNotification } from '@/context/NotificationContext';
import { useAuth } from '@/context/AuthContext';

interface ProfileCompletionNotificationProps {
  show: boolean;
  onDismiss?: () => void;
}

const ProfileCompletionNotification: React.FC<ProfileCompletionNotificationProps> = ({ 
  show, 
  onDismiss 
}) => {
  const { user } = useAuth();
  const { showNotification } = useNotification();
  const navigate = useNavigate();
  const hasShownNotification = useRef(false);
  const hasCheckedNewUser = useRef(false);
  const timeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    // Clear any pending timeouts on re-render/unmount to prevent duplicates
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    // Check if this is a new user (just signed up)
    const showProfileCompletion = localStorage.getItem('show_profile_completion');
    const sessionNotificationShown = sessionStorage.getItem('profile_notification_shown');
    
    if (show && user && !hasCheckedNewUser.current && !sessionNotificationShown) {
      hasCheckedNewUser.current = true;
      
      // If new user, show welcome notification with profile completion prompt
      if (showProfileCompletion === 'true') {
        localStorage.removeItem('show_profile_completion');
        sessionStorage.setItem('profile_notification_shown', 'true');
        
        // Clear previous timeout if exists
        if (timeoutRef.current) clearTimeout(timeoutRef.current);

        // Show welcome notification for new users
        timeoutRef.current = setTimeout(() => {
          showNotification({
            type: 'success',
            title: 'Welcome to the Family! 🎉',
            message: 'We are blessed to have you. Please complete your profile to connect with the community.',
            duration: 8000,
            actions: [
              {
                label: 'Setup Profile',
                onClick: () => {
                  navigate('/complete-profile');
                }
              }
            ]
          });
          hasShownNotification.current = true;
        }, 2000); // Show after 2 seconds
      }
    }

    // Show profile completion reminder if profile is incomplete
    if (show && user && user.profileCompletion && !hasShownNotification.current && !sessionNotificationShown) {
      const { percentage, isComplete } = user.profileCompletion;
      
      // Only show if profile is not complete (less than 80%) and not a new user
      if (!isComplete && percentage < 80 && showProfileCompletion !== 'true') {
        // Clear previous timeout if exists
        if (timeoutRef.current) clearTimeout(timeoutRef.current);

        sessionStorage.setItem('profile_notification_shown', 'true');
        timeoutRef.current = setTimeout(() => {
          showNotification({
            type: 'info',
            title: 'Complete Your Profile',
            message: percentage > 0 
              ? `Your profile is ${percentage}% complete. Add a photo and bio to finish setup.`
              : 'Please complete your profile to get the best experience.',
            duration: 8000,
            actions: [
              {
                label: 'Update Profile',
                onClick: () => {
                  if (user.role === 'teacher') {
                    navigate('/teacher/profile');
                  } else {
                    navigate('/dashboard');
                  }
                }
              }
            ]
          });
          hasShownNotification.current = true;
        }, 3000);
      }
    }
  }, [show, user, showNotification, navigate]);

  return null; // This component doesn't render anything itself
};

export default ProfileCompletionNotification;

