import React from 'react';
import ProgressDashboard from '@/components/shared/courses/ProgressDashboard';

const ProgressPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-50 via-neutral-50 to-slate-50">
      <div className="w-full p-4 sm:p-6 lg:p-8">
        <ProgressDashboard />
      </div>
    </div>
  );
};

export default ProgressPage;
