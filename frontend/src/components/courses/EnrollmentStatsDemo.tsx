import React, { useState } from 'react';
import { EnrollmentStats } from './EnrollmentStats';
import { useEngagementAnalytics } from '../../hooks/useAnalytics';
import { Download, RefreshCw } from 'lucide-react';
import { useExportAnalytics } from '../../hooks/useAnalytics';

interface EnrollmentStatsDemoProps {
  courseId: string;
}

/**
 * Demo component showing how to use EnrollmentStats with real data
 */
export const EnrollmentStatsDemo: React.FC<EnrollmentStatsDemoProps> = ({ courseId }) => {
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    endDate: new Date().toISOString(),
  });

  const { data, isLoading, error, refetch } = useEngagementAnalytics(courseId, {
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
    granularity: 'daily',
  });

  const { exportAnalytics } = useExportAnalytics();
  const [exporting, setExporting] = useState(false);

  const handleDateRangeChange = (startDate: Date, endDate: Date) => {
    setDateRange({
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    });
  };

  const handleExport = async (format: 'csv' | 'json', reportType: 'summary' | 'students') => {
    setExporting(true);
    try {
      await exportAnalytics(courseId, format, reportType);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export analytics. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-red-800 mb-2">Error Loading Analytics</h3>
        <p className="text-red-600 mb-4">
          {error instanceof Error ? error.message : 'Failed to load analytics data'}
        </p>
        <button
          onClick={() => refetch()}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Action Bar */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Course Analytics</h1>
          <p className="text-gray-600 mt-1">
            Track student engagement and course performance
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => refetch()}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <div className="relative group">
            <button
              disabled={exporting || isLoading}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              <Download className="h-4 w-4" />
              Export
            </button>
            {/* Export Dropdown */}
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
              <div className="py-1">
                <button
                  onClick={() => handleExport('csv', 'summary')}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  Summary (CSV)
                </button>
                <button
                  onClick={() => handleExport('csv', 'students')}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  Students (CSV)
                </button>
                <button
                  onClick={() => handleExport('json', 'summary')}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  Summary (JSON)
                </button>
                <button
                  onClick={() => handleExport('json', 'students')}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  Students (JSON)
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* EnrollmentStats Component */}
      <EnrollmentStats
        courseId={courseId}
        data={data}
        loading={isLoading}
        onDateRangeChange={handleDateRangeChange}
      />
    </div>
  );
};

export default EnrollmentStatsDemo;
