import React, { useState } from 'react';
import { ProgressTracker } from './ProgressTracker';
import { Users, TrendingUp, Clock, Award } from 'lucide-react';

/**
 * Demo component showcasing the ProgressTracker component
 * This demonstrates how to integrate the ProgressTracker into a course details page
 */
export const ProgressTrackerDemo: React.FC = () => {
  const [selectedCourseId] = useState('1'); // Example course ID

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Student Progress Tracking</h1>
          <p className="text-gray-600">
            Monitor individual student progress, engagement, and performance in your course
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium text-gray-600">Total Students</div>
              <Users className="h-5 w-5 text-blue-600" />
            </div>
            <div className="text-3xl font-bold text-gray-900">156</div>
            <div className="text-sm text-green-600 mt-1">+12 this week</div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium text-gray-600">Active Students</div>
              <TrendingUp className="h-5 w-5 text-green-600" />
            </div>
            <div className="text-3xl font-bold text-gray-900">89</div>
            <div className="text-sm text-gray-500 mt-1">57% of total</div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium text-gray-600">Avg. Completion</div>
              <Award className="h-5 w-5 text-purple-600" />
            </div>
            <div className="text-3xl font-bold text-gray-900">68%</div>
            <div className="text-sm text-green-600 mt-1">+5% from last month</div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium text-gray-600">Avg. Time Spent</div>
              <Clock className="h-5 w-5 text-orange-600" />
            </div>
            <div className="text-3xl font-bold text-gray-900">4.2h</div>
            <div className="text-sm text-gray-500 mt-1">per student</div>
          </div>
        </div>

        {/* Progress Tracker Component */}
        <ProgressTracker courseId={selectedCourseId} />

        {/* Usage Instructions */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">How to Use Progress Tracker</h3>
          <ul className="space-y-2 text-sm text-blue-800">
            <li className="flex items-start gap-2">
              <span className="font-semibold">•</span>
              <span><strong>Search:</strong> Use the search bar to find students by name or email</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-semibold">•</span>
              <span><strong>Expand Details:</strong> Click the chevron icon to view detailed lesson-by-lesson progress</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-semibold">•</span>
              <span><strong>Sort:</strong> Click column headers to sort by different metrics</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-semibold">•</span>
              <span><strong>Export:</strong> Click "Export Report" to download a CSV file with all student data</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-semibold">•</span>
              <span><strong>Pagination:</strong> Use the pagination controls to navigate through large student lists</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ProgressTrackerDemo;
