import React, { useState, useEffect } from 'react';
import { adminApi } from '../../services/api';
import type { FlaggedContent } from '../../types/admin';

const ModerationTools: React.FC = () => {
  const [flaggedContent, setFlaggedContent] = useState<FlaggedContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('pending');

  useEffect(() => {
    fetchFlaggedContent();
  }, [statusFilter]);

  const fetchFlaggedContent = async () => {
    try {
      setLoading(true);
      const response = await adminApi.getFlaggedContent(statusFilter);
      setFlaggedContent(response.data.flagged_content);
      setError(null);
    } catch (err: any) {
      console.error('Failed to fetch flagged content:', err);
      setError('Failed to load flagged content');
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async (flagId: number, action: 'dismiss' | 'remove' | 'warn', notes?: string) => {
    try {
      await adminApi.reviewFlaggedContent(flagId, { action, notes });
      fetchFlaggedContent(); // Refresh the list
    } catch (err: any) {
      console.error('Failed to review flagged content:', err);
      setError('Failed to review flagged content: ' + (err.response?.data?.message || err.message));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-t-2 border-blue-500 border-solid rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Content Moderation</h2>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-6">
          {error}
        </div>
      )}

      {/* Status Filter */}
      <div className="mb-6">
        <div className="flex space-x-2">
          {['pending', 'reviewed', 'action_taken', 'dismissed'].map(status => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                statusFilter === status
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Content</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Flagged By</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reason</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {flaggedContent.map((flag) => (
              <tr key={flag.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">
                    {flag.content_type} #{flag.content_id}
                  </div>
                  <div className="text-sm text-gray-500">{flag.flag_details?.substring(0, 50)}...</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500">
                    {flag.flagger_first_name} {flag.flagger_last_name}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500">{flag.flag_reason}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    flag.status === 'action_taken' ? 'bg-green-100 text-green-800' :
                    flag.status === 'dismissed' ? 'bg-gray-100 text-gray-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {flag.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {flag.status === 'pending' && (
                    <div className="flex flex-col space-y-2">
                      <button
                        onClick={() => handleReview(flag.id, 'dismiss')}
                        className="text-gray-600 hover:text-gray-900"
                      >
                        Dismiss
                      </button>
                      <button
                        onClick={() => {
                          const notes = prompt('Enter warning notes:');
                          if (notes !== null) {
                            handleReview(flag.id, 'warn', notes);
                          }
                        }}
                        className="text-yellow-600 hover:text-yellow-900"
                      >
                        Warn User
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('Are you sure you want to remove this content?')) {
                            handleReview(flag.id, 'remove');
                          }
                        }}
                        className="text-red-600 hover:text-red-900"
                      >
                        Remove Content
                      </button>
                    </div>
                  )}
                  {flag.status !== 'pending' && (
                    <div className="text-sm">
                      <div>Reviewed by: {flag.reviewer_first_name} {flag.reviewer_last_name}</div>
                      <div>Notes: {flag.review_notes || 'No notes'}</div>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ModerationTools;