import React, { useState, useEffect } from 'react';
import { adminApi } from '@/services/api';
import type { FlaggedContent } from '@/types/admin';
import { AlertCircle, AlertTriangle, Clock, UserX, UserCheck, FileX, FileCheck, Edit, Shield } from 'lucide-react';
import { AIModerationTools } from './AIModerationTools';

const ModerationTools: React.FC = () => {
  const [flaggedContent, setFlaggedContent] = useState<FlaggedContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('pending');
  // FR5: Moderation enhancements
  const [banningUserId, setBanningUserId] = useState<number | null>(null);
  const [banningPostId, setBanningPostId] = useState<number | null>(null);
  const [editingContent, setEditingContent] = useState<{ type: string; id: number } | null>(null);
  const [viewMode, setViewMode] = useState<'content' | 'ai'>('content');

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

  // FR5: Ban user (REQUIREMENT: Ban/unban users)
  const handleBanUser = async (userId: number, reason: string, duration?: number) => {
    try {
      await adminApi.banUser(userId, reason, duration);
      alert('User banned successfully');
      fetchFlaggedContent();
    } catch (err: any) {
      console.error('Failed to ban user:', err);
      alert(err.response?.data?.message || 'Failed to ban user');
    }
  };

  // FR5: Unban user (REQUIREMENT: Ban/unban users)
  const handleUnbanUser = async (userId: number) => {
    try {
      await adminApi.unbanUser(userId);
      alert('User unbanned successfully');
      fetchFlaggedContent();
    } catch (err: any) {
      console.error('Failed to unban user:', err);
      alert(err.response?.data?.message || 'Failed to unban user');
    }
  };

  // FR5: Ban post (REQUIREMENT: Ban/unban posts)
  const handleBanPost = async (postId: number, reason: string) => {
    try {
      await adminApi.banPost(postId, reason);
      alert('Post banned successfully');
      fetchFlaggedContent();
    } catch (err: any) {
      console.error('Failed to ban post:', err);
      alert(err.response?.data?.message || 'Failed to ban post');
    }
  };

  // FR5: Unban post (REQUIREMENT: Ban/unban posts)
  const handleUnbanPost = async (postId: number) => {
    try {
      await adminApi.unbanPost(postId);
      alert('Post unbanned successfully');
      fetchFlaggedContent();
    } catch (err: any) {
      console.error('Failed to unban post:', err);
      alert(err.response?.data?.message || 'Failed to unban post');
    }
  };

  // FR5: Edit content (REQUIREMENT: Edit content)
  const handleEditContent = async (contentType: string, contentId: number, updates: any) => {
    try {
      await adminApi.editContent(contentType, contentId, updates);
      alert('Content edited successfully');
      setEditingContent(null);
      fetchFlaggedContent();
    } catch (err: any) {
      console.error('Failed to edit content:', err);
      alert(err.response?.data?.message || 'Failed to edit content');
    }
  };

  if (loading && viewMode === 'content') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-stone-50 via-neutral-50 to-slate-50 flex items-center justify-center p-4">
        <div className="w-8 h-8 border-t-2 border-[#27AE60] border-solid rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4 sm:space-y-6 p-4 sm:p-6 lg:p-8 bg-gradient-to-br from-stone-50 via-neutral-50 to-slate-50 min-h-screen">
      {/* Header with view toggle */}
      <div className="bg-gradient-to-r from-[#27AE60]/15 via-[#16A085]/15 to-[#2980B9]/15 rounded-xl p-6 border border-[#27AE60]/25 shadow-lg backdrop-blur-sm">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <div className="absolute inset-0 bg-[#27AE60]/25 rounded-lg blur-md"></div>
              <div className="relative p-2 bg-gradient-to-br from-[#27AE60]/15 to-[#16A085]/15 rounded-lg border border-[#27AE60]/25">
                <AlertTriangle className="h-6 w-6 text-[#27AE60]" />
              </div>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-stone-800">Moderation</h1>
              <p className="text-stone-700 text-sm mt-1">
                Guard both community content and AI‑generated answers.
              </p>
            </div>
          </div>
          <div className="inline-flex items-center bg-white/80 rounded-full border border-stone-200/70 p-1">
            <button
              onClick={() => setViewMode('content')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-full transition-all ${
                viewMode === 'content'
                  ? 'bg-[#27AE60]/90 text-white shadow-sm'
                  : 'text-stone-700 hover:bg-stone-100'
              }`}
            >
              User Content
            </button>
            <button
              onClick={() => setViewMode('ai')}
              className={`ml-1 px-3 py-1.5 text-xs font-semibold rounded-full transition-all ${
                viewMode === 'ai'
                  ? 'bg-[#16A085]/90 text-white shadow-sm'
                  : 'text-stone-700 hover:bg-stone-100'
              }`}
            >
              AI (Faith) Moderation
            </button>
          </div>
        </div>
      </div>

      {viewMode === 'ai' ? (
        <AIModerationTools />
      ) : (
        <>
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
                      ? 'bg-gradient-to-r from-[#27AE60] to-[#16A085] text-stone-800 shadow-md'
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
                        {/* FR5: Review time warning (REQUIREMENT: 2-hour review time) */}
                        {flag.review_time_hours && flag.review_time_hours > 2 && (
                          <div className="mt-2 flex items-center text-xs text-red-600">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            <span>Review took {flag.review_time_hours.toFixed(2)} hours (exceeds 2h requirement)</span>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-stone-600">
                          {flag.flagger_first_name} {flag.flagger_last_name}
                        </div>
                        {/* FR5: Review time display */}
                        {flag.review_time_hours && (
                          <div className="text-xs text-stone-500 mt-1 flex items-center">
                            <Clock className="h-3 w-3 mr-1" />
                            {flag.review_time_hours.toFixed(2)}h
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-stone-600">{flag.flag_reason}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          flag.status === 'action_taken' ? 'bg-[#16A085]/20 text-[#16A085] border border-[#16A085]/25' :
                          flag.status === 'dismissed' ? 'bg-stone-100 text-stone-700 border border-stone-200' :
                          'bg-[#F39C12]/20 text-[#F39C12] border border-[#F39C12]/25'
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
                              className="px-3 py-1 bg-[#F39C12]/20 hover:bg-[#F39C12]/25 text-[#F39C12] rounded-lg text-xs font-semibold transition-colors border border-[#F39C12]/25"
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
                            {/* FR5: Ban/unban post (REQUIREMENT: Ban/unban posts) */}
                            {flag.content_type === 'forum_post' && (
                              <>
                                <button
                                  onClick={() => {
                                    const reason = prompt('Enter ban reason:');
                                    if (reason) {
                                      handleBanPost(flag.content_id, reason);
                                    }
                                  }}
                                  className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold transition-colors flex items-center justify-center"
                                >
                                  <FileX className="h-3 w-3 mr-1" />
                                  Ban Post
                                </button>
                              </>
                            )}
                            {/* FR5: Edit content (REQUIREMENT: Edit content) */}
                            <button
                              onClick={() => {
                                const newContent = prompt('Enter new content:');
                                if (newContent) {
                                  handleEditContent(flag.content_type, flag.content_id, { content: newContent });
                                }
                              }}
                              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-colors flex items-center justify-center"
                            >
                              <Edit className="h-3 w-3 mr-1" />
                              Edit
                            </button>
                          </div>
                        )}
                        {flag.status !== 'pending' && (
                          <div className="text-sm text-stone-600">
                            <div>Reviewed by: {flag.reviewer_first_name} {flag.reviewer_last_name}</div>
                            <div>Notes: {flag.review_notes || 'No notes'}</div>
                            {/* FR5: Review time display */}
                            {flag.review_time_hours && (
                              <div className="mt-1 text-xs text-stone-500">
                                Review time: {flag.review_time_hours.toFixed(2)} hours
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* FR5: Policy Reminder */}
          <div className="bg-[#FFFDE7]/90 backdrop-blur-md rounded-xl border border-[#FFF59D]/70 p-4 flex items-start space-x-3 shadow-sm">
            <div className="mt-1">
              <Shield className="h-5 w-5 text-[#FBC02D]" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-800">Moderation Policy Reminder</h3>
              <p className="text-xs text-slate-600 mt-1">
                Please ensure all moderation actions align with the Ethiopian Orthodox Tewahedo Church teachings and the platform&apos;s community guidelines.
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ModerationTools;