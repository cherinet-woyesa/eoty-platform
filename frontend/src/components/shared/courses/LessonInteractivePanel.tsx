import React, { useEffect, useState } from 'react';
import { interactiveApi } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { MessageSquare, Highlighter, Bookmark, Clock, Send, Loader2, Shield, Pin, XCircle, CheckCircle2 } from 'lucide-react';

interface LessonInteractivePanelProps {
  lessonId: string;
  currentTime?: number;
}

interface Annotation {
  id: number;
  content: string;
  type: 'highlight' | 'comment' | 'bookmark' | string;
  timestamp: number;
  created_at?: string;
}

interface DiscussionReply {
  id: number;
  content: string;
  first_name?: string;
  last_name?: string;
  created_at?: string;
}

interface DiscussionPost extends DiscussionReply {
  video_timestamp?: number;
  replies?: DiscussionReply[];
  is_pinned?: boolean;
}

const LessonInteractivePanel: React.FC<LessonInteractivePanelProps> = ({ lessonId, currentTime = 0 }) => {
  const { user } = useAuth();
  const canModerate =
    user?.role === 'teacher' ||
    user?.role === 'admin' ||
    user?.role === 'admin' ||
    user?.role === 'chapter_admin';
  const [activeTab, setActiveTab] = useState<'annotations' | 'discussion'>('annotations');
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [discussions, setDiscussions] = useState<DiscussionPost[]>([]);
  const [loadingAnnotations, setLoadingAnnotations] = useState(false);
  const [loadingDiscussions, setLoadingDiscussions] = useState(false);
  const [newAnnotationText, setNewAnnotationText] = useState('');
  const [annotationType, setAnnotationType] = useState<'highlight' | 'comment' | 'bookmark'>('comment');
  const [newDiscussion, setNewDiscussion] = useState('');
  const [newReply, setNewReply] = useState<Record<number, string>>({});

  useEffect(() => {
    loadAnnotations();
    loadDiscussions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonId]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds);
    const s = Math.floor((seconds - mins) * 60);
    return `${mins}:${s.toString().padStart(2, '0')}`;
  };

  const loadAnnotations = async () => {
    try {
      setLoadingAnnotations(true);
      const response = await interactiveApi.getLessonAnnotations(lessonId);
      if (response.success && response.data?.annotations) {
        setAnnotations(response.data.annotations);
      }
    } catch (error) {
      console.error('Failed to load annotations:', error);
    } finally {
      setLoadingAnnotations(false);
    }
  };

  const loadDiscussions = async () => {
    try {
      setLoadingDiscussions(true);
      const response = await interactiveApi.getLessonDiscussions(lessonId);
      if (response.success && response.data?.posts) {
        setDiscussions(response.data.posts);
      }
    } catch (error) {
      console.error('Failed to load discussions:', error);
    } finally {
      setLoadingDiscussions(false);
    }
  };

  const handleCreateAnnotation = async () => {
    if (annotationType !== 'bookmark' && !newAnnotationText.trim()) return;

    try {
      await interactiveApi.createAnnotation({
        lessonId,
        timestamp: currentTime,
        content: newAnnotationText.trim() || `Bookmark at ${formatTime(currentTime)}`,
        type: annotationType,
        metadata: {},
        isPublic: annotationType !== 'bookmark'
      });
      setNewAnnotationText('');
      await loadAnnotations();
    } catch (error) {
      console.error('Failed to create annotation:', error);
      alert('Failed to save annotation. Please try again.');
    }
  };

  const handleCreateDiscussion = async () => {
    if (!newDiscussion.trim()) return;

    try {
      await interactiveApi.createDiscussionPost({
        lessonId,
        content: newDiscussion.trim(),
        videoTimestamp: currentTime
      });
      setNewDiscussion('');
      await loadDiscussions();
    } catch (error) {
      console.error('Failed to create discussion:', error);
      alert('Failed to post discussion. Please try again.');
    }
  };

  const handleCreateReply = async (parentId: number) => {
    const content = newReply[parentId];
    if (!content?.trim()) return;

    try {
      await interactiveApi.createDiscussionPost({
        lessonId,
        content: content.trim(),
        parentId
      });
      setNewReply(prev => ({ ...prev, [parentId]: '' }));
      await loadDiscussions();
    } catch (error) {
      console.error('Failed to create reply:', error);
      alert('Failed to post reply. Please try again.');
    }
  };

  return (
    <div className="mt-6 bg-white/90 backdrop-blur-sm rounded-xl border border-slate-200/60 shadow-sm">
      <div className="border-b border-slate-200 flex items-center justify-between px-4 sm:px-6 pt-3">
        <div className="flex gap-2 text-sm font-semibold">
          <button
            onClick={() => setActiveTab('annotations')}
            className={`inline-flex items-center px-3 py-2 rounded-t-lg border-b-2 ${
              activeTab === 'annotations'
                ? 'border-[#16A085] text-[#16A085]'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Highlighter className="h-4 w-4 mr-1.5" />
            Annotations
          </button>
          <button
            onClick={() => setActiveTab('discussion')}
            className={`inline-flex items-center px-3 py-2 rounded-t-lg border-b-2 ${
              activeTab === 'discussion'
                ? 'border-[#2980B9] text-[#2980B9]'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <MessageSquare className="h-4 w-4 mr-1.5" />
            Discussion
          </button>
        </div>
        <div className="hidden sm:flex items-center text-xs text-slate-500 pr-2">
          <Clock className="h-3.5 w-3.5 mr-1" />
          <span>Current time: {formatTime(currentTime)}</span>
        </div>
      </div>

      <div className="p-4 sm:p-6">
        {activeTab === 'annotations' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
              <div className="inline-flex rounded-lg bg-slate-100 p-1 text-xs font-medium">
                <button
                  onClick={() => setAnnotationType('highlight')}
                  className={`px-3 py-1 rounded-md flex items-center ${
                    annotationType === 'highlight' ? 'bg-[#16A085] text-white' : 'text-slate-700'
                  }`}
                >
                  <Highlighter className="h-3.5 w-3.5 mr-1" />
                  Highlight
                </button>
                <button
                  onClick={() => setAnnotationType('comment')}
                  className={`px-3 py-1 rounded-md flex items-center ${
                    annotationType === 'comment' ? 'bg-[#2980B9] text-white' : 'text-slate-700'
                  }`}
                >
                  <MessageSquare className="h-3.5 w-3.5 mr-1" />
                  Comment
                </button>
                <button
                  onClick={() => setAnnotationType('bookmark')}
                  className={`px-3 py-1 rounded-md flex items-center ${
                    annotationType === 'bookmark' ? 'bg-[#8E44AD] text-white' : 'text-slate-700'
                  }`}
                >
                  <Bookmark className="h-3.5 w-3.5 mr-1" />
                  Bookmark
                </button>
              </div>
            </div>

            {annotationType !== 'bookmark' && (
              <textarea
                value={newAnnotationText}
                onChange={e => setNewAnnotationText(e.target.value)}
                rows={2}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#16A085]/40 focus:border-[#16A085]/60"
                placeholder="Write a reflection, highlight, or insight tied to this moment in the lesson..."
              />
            )}

            <div className="flex justify-between items-center">
              <div className="flex items-center text-xs text-slate-500 sm:hidden">
                <Clock className="h-3.5 w-3.5 mr-1" />
                <span>At {formatTime(currentTime)}</span>
              </div>
              <button
                onClick={handleCreateAnnotation}
                className="ml-auto inline-flex items-center px-4 py-2 rounded-lg bg-gradient-to-r from-[#16A085] to-[#27AE60] text-white text-xs sm:text-sm font-semibold shadow-sm hover:shadow-md transition-all disabled:opacity-50"
                disabled={annotationType !== 'bookmark' && !newAnnotationText.trim()}
              >
                <Bookmark className="h-4 w-4 mr-1.5" />
                Save Annotation
              </button>
            </div>

            <div className="border-t border-slate-100 pt-4">
              {loadingAnnotations ? (
                <div className="flex items-center justify-center py-6 text-slate-500 text-sm">
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Loading annotations...
                </div>
              ) : annotations.length === 0 ? (
                <div className="text-center py-6 text-xs sm:text-sm text-slate-500">
                  No annotations yet. Start marking key moments and reflections in this lesson.
                </div>
              ) : (
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {annotations.map(a => (
                    <div
                      key={a.id}
                      className="rounded-lg border border-slate-200 px-3 py-2 bg-white/80 hover:bg-slate-50 transition-colors cursor-default"
                    >
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[11px] uppercase tracking-wide font-semibold text-slate-500">
                          {a.type === 'highlight'
                            ? 'Highlight'
                            : a.type === 'bookmark'
                            ? 'Bookmark'
                            : 'Comment'}
                        </span>
                        <span className="inline-flex items-center text-[11px] text-slate-500">
                          <Clock className="h-3 w-3 mr-1" />
                          {formatTime(a.timestamp)}
                        </span>
                      </div>
                      <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">{a.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'discussion' && (
          <div className="space-y-4">
            {loadingDiscussions ? (
              <div className="flex items-center justify-center py-6 text-slate-500 text-sm">
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Loading discussion...
              </div>
            ) : discussions.length === 0 ? (
              <div className="text-center py-6 text-xs sm:text-sm text-slate-500">
                No comments yet. Share your reflections or questions on this lesson.
              </div>
            ) : (
              <div className="space-y-3 max-h-72 overflow-y-auto">
                {discussions.map(post => (
                  <div key={post.id} className="border border-slate-200 rounded-lg p-3 bg-white/80">
                    <div className="flex justify-between items-center mb-1">
                      <div className="flex items-center gap-1.5">
                        <div className="text-xs font-semibold text-slate-700">
                          {post.first_name} {post.last_name}
                        </div>
                        {post.is_pinned && (
                          <span className="inline-flex items-center text-[10px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                            <Pin className="h-3 w-3 mr-1" />
                            Pinned
                          </span>
                        )}
                      </div>
                      {typeof post.video_timestamp === 'number' && (
                        <span className="inline-flex items-center text-[11px] text-slate-500">
                          <Clock className="h-3 w-3 mr-1" />
                          {formatTime(post.video_timestamp)}
                        </span>
                      )}
                    </div>
                    <p className="text-xs sm:text-sm text-slate-700 mb-2">{post.content}</p>

                    {canModerate && (
                      <div className="mb-2 flex flex-wrap gap-2 text-[11px]">
                        <button
                          onClick={async () => {
                            try {
                              await interactiveApi.moderateDiscussionPost(post.id as number, 'approve');
                              await loadDiscussions();
                            } catch (err) {
                              console.error('Approve discussion failed', err);
                              alert('Failed to approve post.');
                            }
                          }}
                          className="inline-flex items-center px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                        >
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Approve
                        </button>
                        <button
                          onClick={async () => {
                            if (!window.confirm('Hide this post from the discussion?')) return;
                            try {
                              await interactiveApi.moderateDiscussionPost(post.id as number, 'reject');
                              await loadDiscussions();
                            } catch (err) {
                              console.error('Reject discussion failed', err);
                              alert('Failed to reject post.');
                            }
                          }}
                          className="inline-flex items-center px-2.5 py-1 rounded-full bg-red-50 text-red-700 border border-red-200 hover:bg-red-100"
                        >
                          <XCircle className="h-3 w-3 mr-1" />
                          Reject
                        </button>
                        <button
                          onClick={async () => {
                            try {
                              await interactiveApi.moderateDiscussionPost(
                                post.id as number,
                                post.is_pinned ? 'unpin' : 'pin'
                              );
                              await loadDiscussions();
                            } catch (err) {
                              console.error('Pin toggle failed', err);
                              alert('Failed to update pin status.');
                            }
                          }}
                          className="inline-flex items-center px-2.5 py-1 rounded-full bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100"
                        >
                          <Pin className="h-3 w-3 mr-1" />
                          {post.is_pinned ? 'Unpin' : 'Pin'}
                        </button>
                        <span className="inline-flex items-center text-[10px] text-slate-500">
                          <Shield className="h-3 w-3 mr-1" />
                          Visible only after approval for flagged users
                        </span>
                      </div>
                    )}

                    {post.replies && post.replies.length > 0 && (
                      <div className="ml-3 mt-2 space-y-2 border-l border-slate-200 pl-3">
                        {post.replies.map(reply => (
                          <div key={reply.id} className="bg-slate-50 rounded-md px-2 py-1.5">
                            <div className="flex justify-between items-center mb-0.5">
                              <span className="text-[11px] font-semibold text-slate-700">
                                {reply.first_name} {reply.last_name}
                              </span>
                              {reply.created_at && (
                                <span className="text-[10px] text-slate-400">
                                  {new Date(reply.created_at).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-700">{reply.content}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="mt-2 flex items-center gap-2">
                      <input
                        type="text"
                        value={newReply[post.id] || ''}
                        onChange={e => setNewReply(prev => ({ ...prev, [post.id]: e.target.value }))}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleCreateReply(post.id);
                          }
                        }}
                        placeholder="Reply with a spiritual reflection..."
                        className="flex-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#2980B9]/40"
                      />
                      <button
                        onClick={() => handleCreateReply(post.id)}
                        className="inline-flex items-center px-3 py-1.5 rounded-lg bg-[#2980B9] text-white text-xs font-semibold shadow-sm hover:bg-[#2471A3]"
                      >
                        <Send className="h-3.5 w-3.5 mr-1" />
                        Reply
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="pt-3 border-t border-slate-100">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newDiscussion}
                  onChange={e => setNewDiscussion(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleCreateDiscussion();
                    }
                  }}
                  placeholder="Ask a question or share a reflection rooted in the lesson..."
                  className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#2980B9]/40"
                />
                <button
                  onClick={handleCreateDiscussion}
                  className="inline-flex items-center px-4 py-2 rounded-lg bg-gradient-to-r from-[#2980B9] to-[#2C3E50] text-white text-xs sm:text-sm font-semibold shadow-sm hover:shadow-md"
                  disabled={!newDiscussion.trim()}
                >
                  <MessageSquare className="h-4 w-4 mr-1.5" />
                  Post
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LessonInteractivePanel;


