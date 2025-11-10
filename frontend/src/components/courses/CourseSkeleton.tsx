import React from 'react';

export const CourseSkeleton: React.FC<{ count?: number; viewMode?: 'grid' | 'list' }> = ({
  count = 6,
  viewMode = 'grid',
}) => {
  const skeletonItems = Array(count).fill(0);

  if (viewMode === 'grid') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-6">
        {skeletonItems.map((_, index) => (
          <div key={index} className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm animate-pulse">
            <div className="h-40 bg-gray-200"></div>
            <div className="p-4">
              <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-4 bg-gray-100 rounded w-full mb-4"></div>
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="h-16 bg-gray-100 rounded-lg"></div>
                <div className="h-16 bg-gray-100 rounded-lg"></div>
                <div className="h-16 bg-gray-100 rounded-lg"></div>
              </div>
              <div className="h-10 bg-gray-200 rounded-lg w-full"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // List view skeleton
  return (
    <div className="space-y-4">
      {skeletonItems.map((_, index) => (
        <div key={index} className="flex items-center p-4 bg-white rounded-lg border border-gray-200 animate-pulse">
          <div className="w-16 h-16 bg-gray-200 rounded-lg mr-4"></div>
          <div className="flex-1">
            <div className="h-5 bg-gray-200 rounded w-1/2 mb-2"></div>
            <div className="h-4 bg-gray-100 rounded w-3/4 mb-3"></div>
            <div className="flex space-x-4">
              <div className="h-4 bg-gray-100 rounded w-16"></div>
              <div className="h-4 bg-gray-100 rounded w-20"></div>
              <div className="h-4 bg-gray-100 rounded w-16"></div>
            </div>
          </div>
          <div className="w-24 h-8 bg-gray-200 rounded-lg ml-4"></div>
        </div>
      ))}
    </div>
  );
};

export const StatsSkeleton: React.FC = () => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
    {[1, 2, 3, 4].map((i) => (
      <div key={i} className="bg-white rounded-lg border border-gray-200 p-6 animate-pulse">
        <div className="h-12 w-12 bg-gray-200 rounded-lg mb-4"></div>
        <div className="h-4 bg-gray-100 rounded w-1/2 mb-1"></div>
        <div className="h-8 bg-gray-200 rounded w-1/4 mb-2"></div>
        <div className="h-3 bg-gray-100 rounded w-3/4"></div>
      </div>
    ))}
  </div>
);
