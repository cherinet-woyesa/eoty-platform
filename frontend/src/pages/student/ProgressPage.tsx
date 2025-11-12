import React from 'react';
import ProgressDashboard from '@/components/shared/courses/ProgressDashboard';

const ProgressPage: React.FC = () => {
  return (
    <div className="w-full space-y-4 sm:space-y-6 p-4 sm:p-6 lg:p-8">
      <ProgressDashboard />
    </div>
  );
};

export default ProgressPage;
