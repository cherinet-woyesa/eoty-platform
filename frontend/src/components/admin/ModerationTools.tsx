import React, { useState, useEffect } from 'react';
import { adminApi } from '@/services/api';
import type { FlaggedContent } from '@/types/admin';

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
      <div className="min-h-screen bg-gradient-to-br from-stone-50 via-neutral-50 to-slate-50 flex items-center justify-center p-4">
        <div className="w-8 h-8 border-t-2 border-[#39FF14] border-solid rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-50 via-neutral-50 to-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#39FF14]/20 via-[#00FFC6]/20 to-[#00FFFF]/20 rounded-xl p-6 border border-[#39FF14]/30 shadow-lg backdrop-blur-sm">
          <div className="flex items-center space-x-3 mb-2">
            <div className="relative">
              <div className="absolute inset-0 bg-[#39FF14]/30 rounded-lg blur-md"></div>
              <div className="relative p-2 bg-gradient-to-br from-[#39FF14]/20 to-[#00FFC6]/20 rounded-lg border border-[#39FF14]/30">
                <AlertTriangle className="h-6 w-6 text-[#39FF14]" />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-stone-800">Content Moderation</h1>
          </div>
          <p className="text-stone-700 text-sm mt-2">
            Review and manage flagged content
          </p>
        </div>

        {error && (
          <div className="bg-red-50/90 backdrop-blur-sm border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Status Filter */}
        <div className="bg-white/90 backdrop-blur-md rounded-xl border border-stone-200 p-4 shadow-sm">
          <div className="flex flex-wrap gap-2">
            {['pending', 'reviewed', 'action_taken', 'dismissed'].map(status => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                  statusFilter === status
                    ? 'bg-gradient-to-r from-[#39FF14] to-[#00FFC6] text-stone-800 shadow-md'
                    : 'bg-white/90 text-stone-700 hover:bg-stone-50 border border-stone-200'
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white/90 backdrop-blur-md rounded-xl border border-stone-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-stone-200">
              <thead className="bg-gradient-to-r from-stone-50 to-neutral-50">
            <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-stone-700 uppercase tracking-wider">Content</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-stone-700 uppercase tracking-wider">Flagged By</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-stone-700 uppercase tracking-wider">Reason</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-stone-700 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-stone-700 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-stone-200">
            {flaggedContent.map((flag) => (
              <tr key={flag.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-semibold text-stone-800">
                    {flag.content_type} #{flag.content_id}
                  </div>
                  <div className="text-sm text-stone-600">{flag.flag_details?.substring(0, 50)}...</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-stone-600">
                    {flag.flagger_first_name} {flag.flagger_last_name}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-stone-600">{flag.flag_reason}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    flag.status === 'action_taken' ? 'bg-[#00FFC6]/20 text-[#00FFC6] border border-[#00FFC6]/30' :
                    flag.status === 'dismissed' ? 'bg-stone-100 text-stone-700 border border-stone-200' :
                    'bg-[#FFD700]/20 text-[#FFD700] border border-[#FFD700]/30'
                  }`}>
                    {flag.status.replace('_', ' ')}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  {flag.status === 'pending' && (
                    <div className="flex flex-col space-y-2">
                      <button
                        onClick={() => handleReview(flag.id, 'dismiss')}
                        className="px-3 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg text-xs font-semibold transition-colors"
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
                        className="px-3 py-1 bg-[#FFD700]/20 hover:bg-[#FFD700]/30 text-[#FFD700] rounded-lg text-xs font-semibold transition-colors border border-[#FFD700]/30"
                      >
                        Warn User
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('Are you sure you want to remove this content?')) {
                            handleReview(flag.id, 'remove');
                          }
                        }}
                        className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold transition-colors"
                      >
                        Remove Content
                      </button>
                    </div>
                  )}
                  {flag.status !== 'pending' && (
                    <div className="text-sm text-stone-600">
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
      </div>
    </div>
  );
};

export default ModerationTools;