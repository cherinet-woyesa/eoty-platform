import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageCircle, Send, ThumbsUp, ThumbsDown, 
  Flag, MoreVertical, Reply, Pin, 
  Clock, User, ChevronDown, ChevronUp,
  Loader2, AlertCircle, RefreshCw, Plus
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { discussionsApi } from '../../services/api/discussions';

interface Discussion {
  id: string;
  user_id: string;
  lesson_id: string;
  parent_id: string | null;
  content: string;
  video_timestamp: number | null;
  is_approved: boolean;
  is_pinned: boolean;
  likes_count: number;
  replies_count: number;
  created_at: string;
  updated_at: string;
  user?: {
    first_name: string;
    last_name: string;
    profile_picture?: string;
  };
  replies?: Discussion[];
  is_liked?: boolean;
  is_flagged?: boolean;
}

interface DiscussionBoardProps {
  lessonId: number;
  onTimestampClick?: (timestamp: number) => void;
  showVideoTimestamp?: boolean;
}

const DiscussionBoard: React.FC<DiscussionBoardProps> = ({ 
  lessonId, 
  onTimestampClick,
  showVideoTimestamp = true 
}) => {
  const { user } = useAuth();
  const [discussions, setDiscussions] = useState<Discussion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'most_liked'>('newest');
  const [showPinnedOnly, setShowPinnedOnly] = useState(false);
  const [expandedDiscussions, setExpandedDiscussions] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    loadDiscussions();
  }, [lessonId, sortBy, showPinnedOnly]);

  const loadDiscussions = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await discussionsApi.getLessonDiscussions(lessonId, {
        sort_by: sortBy,
        show_pinned_only: showPinnedOnly
      });

      setDiscussions(response.data.discussions);

    } catch (err) {
      console.error('Failed to load discussions:', err);
      setError(err instanceof Error ? err.message : 'Failed to load discussions');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitComment = async () => {
    if (!newComment.trim() || submitting) return;

    try {
      setSubmitting(true);

      const response = await discussionsApi.createDiscussion(lessonId, {
        content: newComment.trim(),
        video_timestamp: null
      });

      setDiscussions(prev => [response.data.discussion, ...prev]);
      setNewComment('');

    } catch (err) {
      console.error('Failed to submit comment:', err);
      setError(err instanceof Error ? err.message : 'Failed to submit comment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitReply = async (parentId: string) => {
    if (!replyContent.trim() || submitting) return;

    try {
      setSubmitting(true);

      const response = await discussionsApi.createDiscussion(lessonId, {
        content: replyContent.trim(),
        parent_id: parentId
      });

      setDiscussions(prev => 
        prev.map(discussion => 
          discussion.id === parentId
            ? {
                ...discussion,
                replies: [...(discussion.replies || []), response.data.discussion],
                replies_count: (discussion.replies_count || 0) + 1
              }
            : discussion
        )
      );

      setReplyContent('');
      setReplyingTo(null);

    } catch (err) {
      console.error('Failed to submit reply:', err);
      setError(err instanceof Error ? err.message : 'Failed to submit reply');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLike = async (discussionId: string) => {
    try {
      const response = await discussionsApi.toggleLike(discussionId);
      
      setDiscussions(prev =>
        prev.map(discussion => {
          if (discussion.id === discussionId) {
            return {
              ...discussion,
              likes_count: discussion.likes_count + (response.data.liked ? 1 : -1),
              is_liked: response.data.liked
            };
          }
          if (discussion.replies) {
            return {
              ...discussion,
              replies: discussion.replies.map(reply =>
                reply.id === discussionId
                  ? {
                      ...reply,
                      likes_count: reply.likes_count + (response.data.liked ? 1 : -1),
                      is_liked: response.data.liked
                    }
                  : reply
              )
            };
          }
          return discussion;
        })
      );
    } catch (err) {
      console.error('Failed to toggle like:', err);
    }
  };

  const toggleExpanded = (discussionId: string) => {
    setExpandedDiscussions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(discussionId)) {
        newSet.delete(discussionId);
      } else {
        newSet.add(discussionId);
      }
      return newSet;
    });
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getTimeAgo = (isoDate: string) => {
    const now = new Date();
    const date = new Date(isoDate);
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return `${seconds} seconds ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} minutes ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hours ago`;
    const days = Math.floor(hours / 24);
    return `${days} days ago`;
  };

  const getUserInitials = (user: any) => {
    return `${user.first_name?.charAt(0)}${user.last_name?.charAt(0)}`.toUpperCase();
  };

  const filteredDiscussions = discussions.filter(discussion => 
    !showPinnedOnly || discussion.is_pinned
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <Loader2 className="h-8 w-8 text-blue-500 animate-spin mx-auto mb-2" />
          <p className="text-gray-600">Loading discussions...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-8">
        <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
        <p className="text-red-600 mb-4">{error}</p>
        <button
          onClick={loadDiscussions}
          className="text-blue-600 hover:text-blue-700 flex items-center mx-auto"
        >
          <RefreshCw className="h-4 w-4 mr-1" />
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <MessageCircle className="h-5 w-5 mr-2 text-blue-600" />
          Lesson Discussions
        </h3>
        <div className="flex items-center space-x-2">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="text-sm border border-gray-300 rounded-lg px-3 py-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="most_liked">Most Liked</option>
          </select>
          <button
            onClick={() => setShowPinnedOnly(!showPinnedOnly)}
            className={`text-sm px-3 py-1 rounded-lg border transition-colors ${
              showPinnedOnly
                ? 'bg-blue-100 text-blue-700 border-blue-300'
                : 'bg-gray-100 text-gray-700 border-gray-300'
            }`}
          >
            <Pin className="h-4 w-4 inline mr-1" />
            Pinned Only
          </button>
        </div>
      </div>

      {/* New Comment Form */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex space-x-3">
          <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-semibold">
            {getUserInitials({ first_name: user?.firstName, last_name: user?.lastName })}
          </div>
          <div className="flex-1">
            <textarea
              ref={textareaRef}
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Share your thoughts about this lesson..."
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              rows={3}
            />
            <div className="flex items-center justify-between mt-2">
              <div className="text-xs text-gray-500">
                {showVideoTimestamp && 'Click on video to add timestamp to your comment'}
              </div>
              <button
                onClick={handleSubmitComment}
                disabled={!newComment.trim() || submitting}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                Post Comment
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Discussions List */}
      <div className="space-y-4">
        {filteredDiscussions.length > 0 ? (
          filteredDiscussions.map((discussion) => (
            <div key={discussion.id} className="bg-white border border-gray-200 rounded-lg p-4">
              {/* Main Discussion */}
              <div className="flex space-x-3">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                  {getUserInitials(discussion.user)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="font-semibold text-gray-900">
                      {discussion.user?.first_name} {discussion.user?.last_name}
                    </span>
                    {discussion.is_pinned && (
                      <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-0.5 rounded-full font-medium">
                        <Pin className="h-3 w-3 inline mr-1" />
                        Pinned
                      </span>
                    )}
                    <span className="text-gray-500 text-sm">{getTimeAgo(discussion.created_at)}</span>
                  </div>
                  
                  <p className="text-gray-800 mb-3">{discussion.content}</p>
                  
                  {discussion.video_timestamp && showVideoTimestamp && (
                    <button
                      onClick={() => onTimestampClick?.(discussion.video_timestamp!)}
                      className="inline-flex items-center text-blue-600 hover:text-blue-700 text-sm mb-3"
                    >
                      <Clock className="h-4 w-4 mr-1" />
                      Jump to {formatTime(discussion.video_timestamp)}
                    </button>
                  )}
                  
                  <div className="flex items-center space-x-4">
                    <button
                      onClick={() => handleLike(discussion.id)}
                      className={`flex items-center space-x-1 text-sm transition-colors ${
                        discussion.is_liked ? 'text-blue-600' : 'text-gray-500 hover:text-blue-600'
                      }`}
                    >
                      <ThumbsUp className="h-4 w-4" />
                      <span>{discussion.likes_count}</span>
                    </button>
                    
                    <button
                      onClick={() => setReplyingTo(replyingTo === discussion.id ? null : discussion.id)}
                      className="flex items-center space-x-1 text-sm text-gray-500 hover:text-blue-600 transition-colors"
                    >
                      <Reply className="h-4 w-4" />
                      <span>Reply</span>
                    </button>
                    
                    <button className="flex items-center space-x-1 text-sm text-gray-500 hover:text-red-600 transition-colors">
                      <Flag className="h-4 w-4" />
                      <span>Report</span>
                    </button>
                  </div>
                  
                  {/* Reply Form */}
                  {replyingTo === discussion.id && (
                    <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                      <div className="flex space-x-2">
                        <textarea
                          value={replyContent}
                          onChange={(e) => setReplyContent(e.target.value)}
                          placeholder="Write a reply..."
                          className="flex-1 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                          rows={2}
                        />
                        <button
                          onClick={() => handleSubmitReply(discussion.id)}
                          disabled={!replyContent.trim() || submitting}
                          className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          <Send className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  )}
                  
                  {/* Replies */}
                  {discussion.replies && discussion.replies.length > 0 && (
                    <div className="mt-4">
                      <button
                        onClick={() => toggleExpanded(discussion.id)}
                        className="flex items-center text-sm text-gray-600 hover:text-gray-800 mb-2"
                      >
                        {expandedDiscussions.has(discussion.id) ? (
                          <ChevronUp className="h-4 w-4 mr-1" />
                        ) : (
                          <ChevronDown className="h-4 w-4 mr-1" />
                        )}
                        {discussion.replies_count} {discussion.replies_count === 1 ? 'reply' : 'replies'}
                      </button>
                      
                      {expandedDiscussions.has(discussion.id) && (
                        <div className="space-y-3 pl-4 border-l-2 border-gray-200">
                          {discussion.replies.map((reply) => (
                            <div key={reply.id} className="flex space-x-3">
                              <div className="w-6 h-6 bg-gray-400 rounded-full flex items-center justify-center text-white text-xs font-semibold">
                                {getUserInitials(reply.user)}
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center space-x-2 mb-1">
                                  <span className="font-medium text-gray-900 text-sm">
                                    {reply.user?.first_name} {reply.user?.last_name}
                                  </span>
                                  <span className="text-gray-500 text-xs">{getTimeAgo(reply.created_at)}</span>
                                </div>
                                <p className="text-gray-700 text-sm mb-2">{reply.content}</p>
                                <div className="flex items-center space-x-3">
                                  <button
                                    onClick={() => handleLike(reply.id)}
                                    className={`flex items-center space-x-1 text-xs transition-colors ${
                                      reply.is_liked ? 'text-blue-600' : 'text-gray-500 hover:text-blue-600'
                                    }`}
                                  >
                                    <ThumbsUp className="h-3 w-3" />
                                    <span>{reply.likes_count}</span>
                                  </button>
                                  <button className="flex items-center space-x-1 text-xs text-gray-500 hover:text-red-600 transition-colors">
                                    <Flag className="h-3 w-3" />
                                    <span>Report</span>
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-8 text-gray-500">
            <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No discussions yet</p>
            <p className="text-sm">Be the first to start a conversation about this lesson!</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DiscussionBoard;
