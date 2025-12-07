import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, MessageSquare, Heart, Share2, Flag, User, Clock, Pin, Lock, Shield } from 'lucide-react';
import { useTopicDetail } from '@/hooks/useCommunity';
import { useAuth } from '@/context/AuthContext';

const TopicDetail: React.FC = () => {
  const { forumId, topicId } = useParams<{ forumId: string; topicId: string }>();
  const navigate = useNavigate();
  const { topic, replies, loading, error, likeTopic, replyToTopic, likeReply, replyToReply, shareTopic, reportTopic } = useTopicDetail(Number(topicId));
  const { user, hasPermission } = useAuth();
  const [newReply, setNewReply] = useState('');
  const [isReplying, setIsReplying] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportDetails, setReportDetails] = useState('');
  const [activeReply, setActiveReply] = useState<number | null>(null);
  const [replyDrafts, setReplyDrafts] = useState<Record<number, string>>({});
  const [pendingLike, setPendingLike] = useState<Record<number, boolean>>({});
  const [sendingReply, setSendingReply] = useState<Record<number, boolean>>({});

  if (loading && !topic) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-stone-50 via-neutral-50 to-slate-50 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="animate-pulse">
            <div className="h-8 bg-stone-200 rounded w-1/3 mb-6"></div>
            <div className="bg-white rounded-xl p-6 shadow-md mb-6">
              <div className="h-6 bg-stone-200 rounded w-3/4 mb-4"></div>
              <div className="h-4 bg-stone-200 rounded w-full mb-2"></div>
              <div className="h-4 bg-stone-200 rounded w-2/3"></div>
            </div>
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-white rounded-lg p-4 shadow-sm">
                  <div className="h-4 bg-stone-200 rounded w-1/4 mb-2"></div>
                  <div className="h-4 bg-stone-200 rounded w-full"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !topic) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-stone-50 via-neutral-50 to-slate-50 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="bg-white/90 backdrop-blur-md rounded-xl border border-red-200 p-6 shadow-md">
            <h2 className="text-red-800 font-semibold mb-2 flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Error Loading Topic
            </h2>
            <p className="text-red-600">{error || 'Topic not found'}</p>
            <div className="mt-4 flex gap-3">
              <button
                onClick={() => navigate(`/forums/${forumId}`)}
                className="flex items-center gap-2 px-4 py-2 bg-[#27AE60] text-white rounded-lg hover:bg-[#27AE60]/90 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Forum
              </button>
              <button
                onClick={() => navigate('/forums')}
                className="px-4 py-2 text-stone-600 hover:text-stone-800 transition-colors"
              >
                All Forums
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const topicAuthor = (topic as any)?.author_name ?? (topic as any)?.authorName ?? 'Anonymous';
  const topicUserLiked = Boolean((topic as any)?.user_liked ?? (topic as any)?.liked);
  const topicLikes = (topic as any)?.likes_count ?? (topic as any)?.likes ?? 0;

  const handleLike = async () => {
    if (user) {
      await likeTopic();
    }
  };

  const handleReply = async () => {
    if (newReply.trim() && user) {
      await replyToTopic(newReply);
      setNewReply('');
      setIsReplying(false);
    }
  };

  const handleLikeReply = async (postId: number) => {
    try {
      setPendingLike((prev) => ({ ...prev, [postId]: true }));
      await likeReply(postId);
    } finally {
      setPendingLike((prev) => {
        const next = { ...prev };
        delete next[postId];
        return next;
      });
    }
  };

  const handleReplyToReply = async (postId: number, content: string) => {
    if (!content.trim()) return;
    try {
      setSendingReply((prev) => ({ ...prev, [postId]: true }));
      await replyToReply(postId, content);
      setReplyDrafts((prev) => {
        const next = { ...prev };
        delete next[postId];
        return next;
      });
      setActiveReply(null);
    } catch (err) {
      alert('Failed to post reply');
    } finally {
      setSendingReply((prev) => {
        const next = { ...prev };
        delete next[postId];
        return next;
      });
    }
  };

  const handleShare = async () => {
    if (!topic) return;
    try {
      const result = await shareTopic();
      if (result) {
        // Show success message
        alert(`Share link copied to clipboard!\n${result.shareLink}`);
      }
    } catch (err) {
      alert('Failed to generate share link');
    }
  };

  const handleReport = async () => {
    if (!reportReason.trim()) {
      alert('Please select a reason for reporting');
      return;
    }

    try {
      await reportTopic(reportReason, reportDetails);
      setShowReportModal(false);
      setReportReason('');
      setReportDetails('');
      alert('Topic reported successfully');
    } catch (err) {
      alert('Failed to report topic');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-50 via-neutral-50 to-slate-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Ethiopian Orthodox Themed Header */}
        <div className="bg-gradient-to-r from-[#27AE60]/15 via-[#16A085]/15 to-[#2980B9]/15 rounded-xl p-6 border border-[#27AE60]/25 shadow-lg mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                to={`/forums/${forumId}`}
                className="flex items-center gap-2 px-3 py-1.5 bg-white/80 hover:bg-white rounded-lg border border-stone-200 text-stone-700 hover:text-stone-900 transition-all"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Forum
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-stone-800">{topic.title}</h1>
                <p className="text-stone-600 mt-1">Forum Discussion</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {topic.is_pinned && <Pin className="h-4 w-4 text-amber-600" aria-label="Pinned Topic" />}
              {topic.is_locked && <Lock className="h-4 w-4 text-stone-500" aria-label="Locked Topic" />}
            </div>
          </div>
        </div>

        {/* Original Topic Post */}
        <div className="bg-white/90 backdrop-blur-md rounded-xl border border-stone-200 p-6 shadow-md mb-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-gradient-to-r from-[#27AE60] to-[#16A085] rounded-full flex items-center justify-center flex-shrink-0">
              <User className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <span className="font-semibold text-stone-800">{topicAuthor}</span>
                <span className="text-sm text-stone-500 flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {new Date(topic.created_at).toLocaleDateString()}
                </span>
              </div>
              <div className="prose prose-stone max-w-none mb-4">
                <p className="text-stone-700 leading-relaxed whitespace-pre-wrap">{topic.content}</p>
              </div>
              <div className="flex items-center gap-4 pt-4 border-t border-stone-200">
                <button
                  onClick={handleLike}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all ${
                    topicUserLiked
                      ? 'bg-red-50 text-red-600 border border-red-200'
                      : 'text-stone-600 hover:bg-stone-50 border border-stone-200'
                  }`}
                >
                  <Heart className={`h-4 w-4 ${topicUserLiked ? 'fill-current' : ''}`} />
                  <span className="text-sm">{topicLikes || 0}</span>
                </button>
                <button
                  onClick={handleShare}
                  className="flex items-center gap-2 px-3 py-1.5 text-stone-600 hover:bg-stone-50 rounded-lg border border-stone-200 transition-all"
                >
                  <Share2 className="h-4 w-4" />
                  <span className="text-sm">Share</span>
                </button>
                <button
                  onClick={() => setShowReportModal(true)}
                  className="flex items-center gap-2 px-3 py-1.5 text-stone-600 hover:bg-stone-50 rounded-lg border border-stone-200 transition-all"
                >
                  <Flag className="h-4 w-4" />
                  <span className="text-sm">Report</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Replies Section */}
        <div className="bg-white/90 backdrop-blur-md rounded-xl border border-stone-200 shadow-md overflow-hidden">
          <div className="p-6 border-b border-stone-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-stone-800 flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Replies ({replies.length})
              </h2>
              {!topic?.is_locked && hasPermission('discussion:create') && (
                <button
                  onClick={() => setIsReplying(!isReplying)}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#27AE60] to-[#16A085] text-stone-900 rounded-lg hover:from-[#27AE60]/90 hover:to-[#16A085]/90 transition-all shadow-sm"
                >
                  <MessageSquare className="h-4 w-4" />
                  Reply
                </button>
              )}
            </div>
          </div>

          {/* Reply Form */}
          {isReplying && !topic.is_locked && (
            <div className="p-6 border-b border-stone-200 bg-stone-50/50">
              <div className="space-y-4">
                <textarea
                  value={newReply}
                  onChange={(e) => setNewReply(e.target.value)}
                  placeholder="Share your thoughts..."
                  rows={4}
                  className="w-full px-4 py-3 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#27AE60] focus:border-[#27AE60] resize-none"
                />
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setIsReplying(false)}
                    className="px-4 py-2 text-stone-600 hover:text-stone-800 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleReply}
                    disabled={!newReply.trim()}
                    className="px-4 py-2 bg-gradient-to-r from-[#27AE60] to-[#16A085] text-stone-900 rounded-lg hover:from-[#27AE60]/90 hover:to-[#16A085]/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    Post Reply
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Replies List */}
          <div className="divide-y divide-stone-200">
            {replies.length > 0 ? (
              replies.map((reply) => {
                const replyAuthor = (reply as any).author_name ?? (reply as any).authorName ?? 'Anonymous';
                const replyUserLiked = Boolean((reply as any).user_liked ?? (reply as any).liked);
                const replyLikes = (reply as any).likes_count ?? (reply as any).like_count ?? (reply as any).likes ?? 0;
                return (
                <div key={reply.id} className="p-6 hover:bg-stone-50/50 transition-colors">
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 bg-gradient-to-r from-[#2980B9] to-[#27AE60] rounded-full flex items-center justify-center flex-shrink-0">
                      <User className="h-4 w-4 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="font-semibold text-stone-800">{replyAuthor}</span>
                        <span className="text-sm text-stone-500 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(reply.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="prose prose-stone max-w-none">
                        <p className="text-stone-700 leading-relaxed whitespace-pre-wrap">{reply.content}</p>
                      </div>
                      <div className="flex items-center gap-4 pt-3 mt-3 border-t border-stone-200">
                        <button
                          onClick={() => handleLikeReply(Number(reply.id))}
                          disabled={pendingLike[Number(reply.id)]}
                          className={`flex items-center gap-2 px-3 py-1 rounded-lg transition-all ${
                            replyUserLiked
                              ? 'text-red-600 bg-red-50 border border-red-200'
                              : 'text-stone-600 hover:text-red-600 hover:bg-red-50 border border-transparent'
                          } ${pendingLike[Number(reply.id)] ? 'opacity-60 cursor-not-allowed' : ''}`}
                        >
                          <Heart className={`h-3 w-3 ${replyUserLiked ? 'fill-current' : ''}`} />
                          <span className="text-sm">{replyLikes}</span>
                        </button>
                        <button
                          onClick={() => {
                            setActiveReply((prev) => (prev === reply.id ? null : Number(reply.id)));
                            setReplyDrafts((prev) => ({
                              ...prev,
                              [Number(reply.id)]: prev[Number(reply.id)] || `@${replyAuthor || 'user'} `
                            }));
                          }}
                          className="px-3 py-1 text-stone-600 hover:text-stone-800 transition-all"
                        >
                          <span className="text-sm">Reply</span>
                        </button>
                      </div>

                      {activeReply === reply.id && (
                        <div className="mt-3 space-y-2">
                          <textarea
                            value={replyDrafts[Number(reply.id)] || ''}
                            onChange={(e) =>
                              setReplyDrafts((prev) => ({
                                ...prev,
                                [Number(reply.id)]: e.target.value
                              }))
                            }
                            rows={3}
                            className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#27AE60]"
                            placeholder={`Reply to ${replyAuthor || 'this user'}...`}
                          />
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => {
                                setActiveReply(null);
                                setReplyDrafts((prev) => {
                                  const next = { ...prev };
                                  delete next[Number(reply.id)];
                                  return next;
                                });
                              }}
                              className="px-3 py-1.5 text-sm text-stone-600 hover:text-stone-800"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => handleReplyToReply(Number(reply.id), replyDrafts[Number(reply.id)] || '')}
                              disabled={sendingReply[Number(reply.id)] || !(replyDrafts[Number(reply.id)] || '').trim()}
                              className="px-4 py-1.5 text-sm bg-gradient-to-r from-[#27AE60] to-[#16A085] text-white rounded-lg hover:shadow disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                              {sendingReply[Number(reply.id)] ? 'Sending...' : 'Send Reply'}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
              })
            ) : (
              <div className="p-12 text-center">
                <MessageSquare className="h-12 w-12 text-stone-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-stone-800 mb-2">No replies yet</h3>
                <p className="text-stone-600 mb-4">Be the first to share your thoughts on this topic!</p>
                {!topic.is_locked && hasPermission('discussion:create') && (
                  <button
                    onClick={() => setIsReplying(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#27AE60] to-[#16A085] text-stone-900 rounded-lg hover:from-[#27AE60]/90 hover:to-[#16A085]/90 transition-all shadow-sm"
                  >
                    <MessageSquare className="h-4 w-4" />
                    Start the Conversation
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Topic Actions */}
        <div className="mt-6 flex justify-center">
          <div className="flex gap-3">
            <Link
              to={`/forums/${forumId}`}
              className="flex items-center gap-2 px-4 py-2 bg-white/90 hover:bg-white rounded-lg border border-stone-200 text-stone-700 hover:text-stone-900 transition-all shadow-sm"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Forum
            </Link>
            {hasPermission('discussion:moderate') && (
              <button className="flex items-center gap-2 px-4 py-2 bg-amber-50 hover:bg-amber-100 rounded-lg border border-amber-200 text-amber-700 hover:text-amber-800 transition-all shadow-sm">
                <Shield className="h-4 w-4" />
                Moderate
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <Flag className="h-6 w-6 text-red-500" />
                <h3 className="text-lg font-semibold text-stone-800">Report Topic</h3>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-2">
                    Reason for reporting
                  </label>
                  <select
                    value={reportReason}
                    onChange={(e) => setReportReason(e.target.value)}
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#27AE60] focus:border-[#27AE60]"
                  >
                    <option value="">Select a reason...</option>
                    <option value="inappropriate">Inappropriate content</option>
                    <option value="spam">Spam</option>
                    <option value="harassment">Harassment</option>
                    <option value="offensive">Offensive language</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-2">
                    Additional details (optional)
                  </label>
                  <textarea
                    value={reportDetails}
                    onChange={(e) => setReportDetails(e.target.value)}
                    placeholder="Provide more details about why you're reporting this topic..."
                    rows={3}
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#27AE60] focus:border-[#27AE60] resize-none"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowReportModal(false)}
                  className="flex-1 px-4 py-2 text-stone-600 hover:text-stone-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReport}
                  disabled={!reportReason.trim()}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Report
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TopicDetail;
