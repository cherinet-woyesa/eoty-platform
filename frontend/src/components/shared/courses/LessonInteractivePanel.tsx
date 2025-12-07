import React, { useEffect, useMemo, useState } from 'react';
import { interactiveApi } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { MessageSquare, Highlighter, Clock, Loader2, Bookmark } from 'lucide-react';
import { useConfirmDialog } from '@/context/ConfirmDialogContext';
import Composer from './ui/Composer';
import ThreadItem, { type ThreadItemData } from './ui/ThreadItem';
import TimestampBadge from './ui/TimestampBadge';

interface LessonInteractivePanelProps {
  lessonId: string;
  currentTime?: number;
  onTimestampClick?: (timestamp: number) => void;
}

interface Annotation {
  id: number;
  content: string;
  type: 'highlight' | 'comment' | 'bookmark';
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
  video_timestamp?: number | null;
  replies?: DiscussionReply[];
  is_pinned?: boolean;
  is_moderated?: boolean;
  is_auto_flagged?: boolean;
}

const LessonInteractivePanel: React.FC<LessonInteractivePanelProps> = ({ lessonId, currentTime = 0, onTimestampClick }) => {
  const { user } = useAuth();
  const { confirm } = useConfirmDialog();
  const canModerate = user?.role === 'teacher' || user?.role === 'admin' || user?.role === 'chapter_admin';
  const [activeTab, setActiveTab] = useState<'discussion' | 'annotations' | 'bookmarks'>('discussion');
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [discussions, setDiscussions] = useState<DiscussionPost[]>([]);
  const [bookmarks, setBookmarks] = useState<Array<{ id: string; videoTimestamp: number; note?: string }>>([]);
  const [loadingAnnotations, setLoadingAnnotations] = useState(false);
  const [loadingDiscussions, setLoadingDiscussions] = useState(false);

  useEffect(() => {
    loadAnnotations();
    loadDiscussions();
    loadBookmarks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonId]);

  const formatTime = (seconds: number) => {
    const total = Math.max(0, Math.floor(seconds));
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    const mm = h > 0 ? String(m).padStart(2, '0') : String(m);
    const ss = String(s).padStart(2, '0');
    return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
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
        const posts: DiscussionPost[] = response.data.posts;
        // Backend already filters for non-moderated (safe) posts
        setDiscussions(posts);
      }
    } catch (error) {
      console.error('Failed to load discussions:', error);
    } finally {
      setLoadingDiscussions(false);
    }
  };

  const loadBookmarks = async () => {
    try {
      const response = await interactiveApi.getLessonBookmarks(lessonId);
      const bms = response?.data?.bookmarks || [];
      setBookmarks(Array.isArray(bms) ? bms : []);
    } catch (error) {
      setBookmarks([]);
    }
  };

  const handleCreateAnnotation = async (content: string, attachTimestamp: boolean) => {
    const text = content?.trim();
    if (!text) return;
    try {
      await interactiveApi.createAnnotation({
        lessonId,
        timestamp: attachTimestamp ? currentTime : null,
        content: text,
        type: 'comment',
        metadata: {},
        isPublic: true
      });
      await loadAnnotations();
    } catch (error) {
      console.error('Failed to create annotation:', error);
      alert('Failed to save annotation. Please try again.');
    }
  };

  const handleCreateDiscussion = async (content: string, attachTimestamp: boolean) => {
    const text = content?.trim();
    if (!text) return;
    try {
      await interactiveApi.createDiscussionPost({
        lessonId,
        content: text,
        videoTimestamp: attachTimestamp ? currentTime : null
      });
      await loadDiscussions();
    } catch (error) {
      console.error('Failed to create discussion:', error);
      alert('Failed to post discussion. Please try again.');
    }
  };

  const handleModeration = async (id: number, action: 'approve' | 'reject' | 'pin') => {
    try {
      await interactiveApi.moderateDiscussionPost(id, action);
      await loadDiscussions();
    } catch (error) {
      console.error('Failed to moderate post:', error);
      alert('Failed to update post. Please try again.');
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
          <button
            onClick={() => setActiveTab('bookmarks')}
            className={`inline-flex items-center px-3 py-2 rounded-t-lg border-b-2 ${
              activeTab === 'bookmarks'
                ? 'border-[#2980B9] text-[#2980B9]'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Bookmark className="h-4 w-4 mr-1.5" />
            Bookmarks
          </button>
        </div>
        <div className="hidden sm:flex items-center text-xs text-slate-500 pr-2">
          <Clock className="h-3.5 w-3.5 mr-1" />
          <span>Current time: {formatTime(currentTime)}</span>
        </div>
      </div>

      <div className="p-4 sm:p-6">
                        {activeTab === 'discussion' && (
                          <div>
                            <div className="mb-3 flex items-center gap-2">
                              {currentTime != null && (
                                <TimestampBadge seconds={currentTime} />
                              )}
                            </div>
                            <Composer
                              onSubmit={(content, attachTimestamp) => {
                                void handleCreateDiscussion(content, attachTimestamp);
                              }}
                              defaultAttachTimestamp={true}
                            />
                            <div className="mt-4">
                              {loadingDiscussions ? (
                                <div className="flex items-center gap-2 text-slate-600 text-sm">
                                  <Loader2 className="h-4 w-4 animate-spin" /> Loading discussion...
                                </div>
                              ) : discussions.length === 0 ? (
                                <div className="text-sm text-slate-600">No discussion yet. Be the first to start one.</div>
                              ) : (
                                discussions.map((post) => (
                                  <ThreadItem
                                    key={post.id}
                                    item={{
                                      id: String(post.id),
                                      authorName: `${post.first_name || ''} ${post.last_name || ''}`.trim() || 'User',
                                      content: post.content,
                                      createdAt: post.created_at || new Date().toISOString(),
                                      videoTimestamp: post.video_timestamp ?? null,
                                      flagged: !!post.is_auto_flagged,
                                      pinned: !!post.is_pinned,
                                      replies: (post.replies || []).map(r => ({
                                        id: String(r.id),
                                        authorName: `${r.first_name || ''} ${r.last_name || ''}`.trim() || 'User',
                                        content: r.content,
                                        createdAt: r.created_at || new Date().toISOString()
                                      }))
                                    } as ThreadItemData}
                                    onApprove={canModerate ? (id) => handleModeration(Number(id), 'approve') : undefined}
                                    onReject={canModerate ? (id) => handleModeration(Number(id), 'reject') : undefined}
                                    onPin={canModerate ? (id) => handleModeration(Number(id), 'pin') : undefined}
                                  />
                                ))
                              )}
                            </div>
                          </div>
                        )}

                        {activeTab === 'annotations' && (
                          <div>
                            <Composer
                              onSubmit={(content, attachTimestamp) => {
                                void handleCreateAnnotation(content, attachTimestamp);
                              }}
                              defaultAttachTimestamp={true}
                              placeholder="Add an annotation…"
                            />
                            <div className="mt-4">
                              {loadingAnnotations ? (
                                <div className="flex items-center gap-2 text-slate-600 text-sm">
                                  <Loader2 className="h-4 w-4 animate-spin" /> Loading annotations...
                                </div>
                              ) : annotations.length === 0 ? (
                                <div className="text-sm text-slate-600">No annotations yet.</div>
                              ) : (
                                annotations.map((a) => (
                                  <div key={a.id} className="rounded border border-slate-200 p-3">
                                    <button 
                                      onClick={() => onTimestampClick?.(a.timestamp)}
                                      className="hover:opacity-80 transition-opacity mb-1 block"
                                      type="button"
                                    >
                                      <TimestampBadge seconds={a.timestamp} />
                                    </button>
                                    <div className="mt-1 text-sm text-slate-900 whitespace-pre-wrap">{a.content}</div>
                                  </div>
                                ))
                              )}
                            </div>
                          </div>
                        )}

                        {activeTab === 'bookmarks' && (
                          <div>
                            <div className="text-sm text-slate-600 mb-2">Quick bookmarks at timestamps.</div>
                            <button
                              type="button"
                              className="px-3 py-1.5 text-sm rounded bg-gray-900 text-white"
                              onClick={async () => {
                                try {
                                  await interactiveApi.createAnnotation({
                                    lessonId,
                                    timestamp: currentTime,
                                    content: `Bookmark at ${formatTime(currentTime)}`,
                                    type: 'bookmark',
                                    metadata: {},
                                    isPublic: false
                                  });
                                  await loadBookmarks();
                                } catch {}
                              }}
                            >
                              Add bookmark at current time
                            </button>
                            <div className="mt-3">
                              {bookmarks.length === 0 ? (
                                <div className="text-sm text-slate-600">No bookmarks yet.</div>
                              ) : (
                                bookmarks.map((b) => (
                                  <div key={b.id} className="flex items-center gap-2 py-1">
                                    <button 
                                      onClick={() => onTimestampClick?.(b.videoTimestamp)}
                                      className="hover:opacity-80 transition-opacity"
                                      type="button"
                                    >
                                      <TimestampBadge seconds={b.videoTimestamp} />
                                    </button>
                                    <span className="text-sm text-slate-800">{b.note || 'Bookmark'}</span>
                                  </div>
                                ))
                              )}
                            </div>
                          </div>
                        )}
      </div>
    </div>
  );
};

export default LessonInteractivePanel;


