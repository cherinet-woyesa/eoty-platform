import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { User, ArrowRight, CheckCircle2 } from 'lucide-react';
import { brandColors } from '@/theme/brand';

interface ProfileCompletionBannerProps {
  completionPercentage: number;
}

const ProfileCompletionBanner: React.FC<ProfileCompletionBannerProps> = ({ completionPercentage }) => {
  const { t } = useTranslation();
  
  if (completionPercentage >= 100) return null;

  return (
    <div className="bg-white rounded-xl border border-stone-200 shadow-sm p-4 sm:p-5 mb-6 relative overflow-hidden">
      <div 
        className="absolute top-0 left-0 h-1 bg-gradient-to-r from-blue-500 to-purple-500" 
        style={{ width: `${completionPercentage}%` }}
      />
      
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-blue-50 rounded-full shrink-0">
            <User className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-stone-800 mb-1">
              {t('student.complete_profile', 'Complete Your Profile')}
            </h3>
            <p className="text-stone-600 text-sm max-w-md">
              {t('student.profile_completion_msg', { percent: completionPercentage, defaultValue: `Your profile is ${completionPercentage}% complete. Add a photo and bio to finish setup.` })}
            </p>
          </div>
        </div>

        <Link 
          to="/member/profile" 
          className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all hover:opacity-90 shadow-sm shrink-0"
          style={{ backgroundColor: brandColors.primaryHex }}
        >
          {t('student.update_profile', 'Update Profile')}
          <ArrowRight className="ml-2 h-4 w-4" />
        </Link>
      </div>
    </div>
  );
};

export default ProfileCompletionBanner;
