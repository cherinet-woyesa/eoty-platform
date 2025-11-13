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

  useEffect(() => {
    // Check if this is a new user (just signed up)
    const showProfileCompletion = localStorage.getItem('show_profile_completion');
    
    if (show && user && !hasCheckedNewUser.current) {
      hasCheckedNewUser.current = true;
      
      // If new user, show welcome notification with profile completion prompt
      if (showProfileCompletion === 'true') {
        localStorage.removeItem('show_profile_completion');
        
        // Show welcome notification for new users
        setTimeout(() => {
          showNotification({
            type: 'info',
            title: 'Welcome to EOTY Platform! 🎉',
            message: 'Complete your profile to get the most out of the platform. Add your photo, bio, and other details.',
            duration: 12000,
            actions: [
              {
                label: 'Complete Profile',
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
        }, 2000); // Show after 2 seconds
      }
    }

    // Show profile completion reminder if profile is incomplete
    if (show && user && user.profileCompletion && !hasShownNotification.current) {
      const { percentage, isComplete } = user.profileCompletion;
      
      // Only show if profile is not complete (less than 80%) and not a new user
      if (!isComplete && percentage < 80 && showProfileCompletion !== 'true') {
        setTimeout(() => {
          showNotification({
            type: 'info',
            title: 'Complete Your Profile',
            message: `Your profile is ${percentage}% complete. Add more information to enhance your experience.`,
            duration: 10000,
            actions: [
              {
                label: 'Complete Profile',
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

