import { useState } from 'react';
import { X, ExternalLink, AlertCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { systemConfigApi } from '@/services/api/systemConfig';
import { Spinner } from '@/components/shared/LoadingStates';

interface UsageAnalyticsProps {
  entityType: string;
  entityId: number;
  entityName: string;
  onClose: () => void;
}

export const UsageAnalytics: React.FC<UsageAnalyticsProps> = ({
  entityType,
  entityId,
  entityName,
  onClose,
}) => {
  const { data: usageDetails, isLoading } = useQuery({
    queryKey: ['usage-details', entityType, entityId],
    queryFn: () => systemConfigApi.getUsageDetails(entityType, entityId),
  });

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#27AE60] to-[#16A085] px-6 py-4 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold">Usage Details</h3>
              <p className="text-green-50 mt-1">{entityName}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Spinner size="lg" />
            </div>
          ) : usageDetails ? (
            <>
              {/* Summary */}
              <div className="mb-6">
                <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                  <span className="font-medium">Total Usage:</span>
                  <span className="bg-[#27AE60]/10 text-[#27AE60] px-2.5 py-0.5 rounded-full text-xs font-medium">
                    {usageDetails.usage_count} course{usageDetails.usage_count !== 1 ? 's' : ''}
                  </span>
                </div>

                {usageDetails.usage_count === 0 && (
                  <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-green-900">
                        Not in use
                      </p>
                      <p className="text-sm text-green-700 mt-1">
                        This {entityType} is not currently used by any courses and can be safely deleted.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Courses List */}
              {usageDetails.courses.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-3">
                    Courses using this {entityType}:
                  </h4>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {usageDetails.courses.map(course => (
                      <div
                        key={course.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {course.title}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                course.is_published
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}
                            >
                              {course.is_published ? 'Published' : 'Draft'}
                            </span>
                            <span className="text-xs text-gray-500">
                              ID: {course.id}
                            </span>
                          </div>
                        </div>
                        <a
                          href={`/courses/${course.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-3 p-2 text-gray-400 hover:text-blue-600 transition-colors"
                          title="View course"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Warning for deletion */}
              {usageDetails.usage_count > 0 && (
                <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-yellow-900">
                      Cannot delete while in use
                    </p>
                    <p className="text-sm text-yellow-700 mt-1">
                      This {entityType} is currently used by {usageDetails.usage_count} course{usageDetails.usage_count !== 1 ? 's' : ''}.
                      You must update or remove these courses before deleting this {entityType}.
                    </p>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12 text-gray-500">
              Failed to load usage details
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

// Inline usage badge component for table cells
export const UsageBadgeWithTooltip: React.FC<{
  count: number;
  onClick?: () => void;
}> = ({ count, onClick }) => {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div className="relative inline-block">
      <button
        onClick={onClick}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium transition-colors ${
          count === 0
            ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            : 'bg-blue-100 text-blue-800 hover:bg-blue-200'
        }`}
      >
        {count}
      </button>

      {showTooltip && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg whitespace-nowrap z-10">
          {count === 0
            ? 'Not used by any courses'
            : `Used by ${count} course${count !== 1 ? 's' : ''}`}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
            <div className="border-4 border-transparent border-t-gray-900" />
          </div>
        </div>
      )}
    </div>
  );
};
