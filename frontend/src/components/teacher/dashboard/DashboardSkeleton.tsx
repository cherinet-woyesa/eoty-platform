import React from 'react';

const DashboardSkeleton: React.FC = () => {
  return (
    <div className="w-full space-y-3 p-3 sm:p-4 lg:p-6 bg-gradient-to-br from-stone-50 via-neutral-50 to-slate-50 min-h-screen animate-pulse">
      {/* Welcome Section Skeleton */}
      <div className="bg-white/90 backdrop-blur-md rounded-lg p-4 border border-stone-200 shadow-sm h-24">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between h-full">
          <div className="flex-1 space-y-2">
            <div className="h-6 bg-stone-200 rounded w-1/3"></div>
            <div className="h-4 bg-stone-200 rounded w-1/4"></div>
          </div>
        </div>
      </div>

      {/* Metrics Skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white/90 backdrop-blur-md rounded-lg p-4 border border-stone-200 shadow-sm h-24 flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <div className="h-8 w-8 bg-stone-200 rounded-lg"></div>
            </div>
            <div className="space-y-1.5">
              <div className="h-6 bg-stone-200 rounded w-1/3"></div>
              <div className="h-3 bg-stone-200 rounded w-2/3"></div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions Skeleton */}
      <div className="bg-white/90 backdrop-blur-md rounded-lg shadow-sm border border-stone-200 p-4">
        <div className="h-5 bg-stone-200 rounded w-1/4 mb-4"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-stone-100 rounded-lg border border-stone-200"></div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DashboardSkeleton;
