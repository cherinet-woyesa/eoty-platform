import React from 'react';
import ProgressDashboard from '@/components/shared/courses/ProgressDashboard';

const ProgressPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-50 via-neutral-50 to-slate-50">
      <ProgressDashboard />
    </div>
  );
};

export default ProgressPage;
