import React from 'react';
import { ArrowLeft } from 'lucide-react';

const CourseDetailsSkeleton: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header Skeleton */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="h-5 w-32 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-8 w-64 bg-gray-200 rounded animate-pulse"></div>
          </div>
          <div className="flex gap-2">
            <div className="h-10 w-24 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-10 w-24 bg-gray-200 rounded animate-pulse"></div>
          </div>
        </div>

        {/* Tabs Skeleton */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="flex border-b border-gray-200">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex-1 px-4 py-3 flex justify-center">
                <div className="h-5 w-24 bg-gray-200 rounded animate-pulse"></div>
              </div>
            ))}
          </div>
        </div>

        {/* Content Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content (Video/Details) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Video Player Skeleton */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm aspect-video relative">
              <div className="absolute inset-0 bg-gray-200 animate-pulse"></div>
            </div>
            
            {/* Lesson Details Skeleton */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm space-y-4">
              <div className="flex justify-between">
                <div className="h-6 w-1/2 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-8 w-32 bg-gray-200 rounded animate-pulse"></div>
              </div>
              <div className="space-y-2">
                <div className="h-4 w-full bg-gray-200 rounded animate-pulse"></div>
                <div className="h-4 w-5/6 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-4 w-4/6 bg-gray-200 rounded animate-pulse"></div>
              </div>
            </div>
          </div>

          {/* Sidebar Skeleton */}
          <div className="space-y-4">
            {/* Stats/Progress Skeleton */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm h-32">
              <div className="h-full w-full bg-gray-200 rounded animate-pulse"></div>
            </div>
            
            {/* Search Skeleton */}
            <div className="bg-white rounded-xl border border-gray-200 p-3 shadow-sm h-12">
              <div className="h-full w-full bg-gray-200 rounded animate-pulse"></div>
            </div>

            {/* Lesson List Skeleton */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="p-3 border-b border-gray-200">
                <div className="h-5 w-32 bg-gray-200 rounded animate-pulse"></div>
              </div>
              <div className="p-3 space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-16 w-full bg-gray-200 rounded animate-pulse"></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CourseDetailsSkeleton;
