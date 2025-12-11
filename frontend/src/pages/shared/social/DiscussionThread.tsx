import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Heart, Share2, Flag, Eye, MessageSquare, ArrowLeft, Tag, Sparkles, ShieldCheck, AlertTriangle, Check } from 'lucide-react';
import { DiscussionCardData } from '@/components/shared/social/DiscussionCard';
import { forumApi } from '@/services/api/forums';
import { useNotification } from '@/context/NotificationContext';

const primaryButton = 'bg-[#1e1b4b] text-white hover:bg-[#312e81]';
const secondaryButton = 'bg-white text-[#1e1b4b] border border-[#1e1b4b] hover:border-[#312e81]';

const DiscussionThread: React.FC = () => {
  const navigate = useNavigate();
  const { discussionId } = useParams<{ discussionId: string }>();
  const [topic, setTopic] = useState<any | null>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [replyContent, setReplyContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [likes, setLikes] = useState<number>(0);
  const [relatedTopics, setRelatedTopics] = useState<DiscussionCardData[]>([]);
  const [copied, setCopied] = useState(false);
  const [replying, setReplying] = useState(false);
  const [likingTopic, setLikingTopic] = useState(false);
  const [likedTopic, setLikedTopic] = useState(false);
  const [likedReplies, setLikedReplies] = useState<Set<string>>(new Set());
  const { showNotification } = useNotification();

  const loadTopic = async () => {
    if (!discussionId) return;
    try {
      setLoading(true);
      const res = await forumApi.getTopic(discussionId);
      const data = res?.data?.data || res?.data || res;
      const topicPayload = data.topic || data;
      const replies = data.replies || data.posts || [];
      setTopic(topicPayload);
      setPosts(replies);
      setLikes(topicPayload?.like_count || topicPayload?.likes_count || 0);
      setLikedTopic(Boolean(topicPayload?.user_liked));
      setLikedReplies(new Set());
      setError(null);
    } catch (err: any) {
      setError(err?.message || 'Failed to load discussion');
      showNotification({ type: 'error', title: 'Error', message: err?.message || 'Failed to load discussion' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTopic();
  }, [discussionId]);

  useEffect(() => {
    const loadRelated = async () => {
      if (!topic?.forum_id) return;
      try {
        const res = await forumApi.getTopics(String(topic.forum_id), 1, 10);
        const topics = res?.data?.topics || res?.topics || [];
        const tags = topic.tags || [];
        const filtered = topics
          .filter((t: any) => String(t.id) !== String(topic.id))
          .filter((t: any) => {
            if (!tags.length || !t.tags) return true;
            return t.tags.some((tag: string) => tags.includes(tag));
          })
          .slice(0, 6)
          .map((t: any) => ({
            id: String(t.id),
            title: t.title,
            excerpt: t.content ? t.content.slice(0, 120) : 'No summary',
            tags: t.tags || [],
            visibility: t.is_private ? 'private' : 'public',
            replies: t.post_count || 0,
            lastActivity: t.last_activity_at || t.updated_at || 'Recently'
          }));
        setRelatedTopics(filtered);
      } catch {
        setRelatedTopics([]);
      }
    };
    loadRelated();
  }, [topic]);

  const handlePostReply = async () => {
    if (!discussionId || !replyContent.trim()) return;
    try {
      setReplying(true);
      await forumApi.createReply(discussionId, { content: replyContent.trim() });
      setReplyContent('');
      await loadTopic();
      showNotification({ type: 'success', title: 'Reply posted', message: 'Your reply was added.' });
    } catch (err) {
      console.error('Failed to post reply', err);
      showNotification({ type: 'error', title: 'Reply failed', message: 'Could not post your reply.' });
    } finally {
      setReplying(false);
    }
  };

  const handleLikeTopic = async () => {
    if (!discussionId || likedTopic || likingTopic) return;
    try {
      setLikingTopic(true);
      await forumApi.likeTopic(discussionId);
      setLikes((prev) => prev + 1);
      setLikedTopic(true);
      setTopic((prev: any) => (prev ? { ...prev, user_liked: true } : prev));
    } catch (err) {
      console.error('Failed to like topic', err);
      showNotification({ type: 'error', title: 'Like failed', message: 'Could not like this discussion.' });
    } finally {
      setLikingTopic(false);
    }
  };

  const handleShare = async () => {
    if (!discussionId) return;
    try {
      await forumApi.shareTopic(discussionId, { share_type: 'copy' });
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(window.location.href);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
      showNotification({ type: 'success', title: 'Link copied', message: 'Discussion link copied to clipboard.' });
    } catch (err) {
      console.error('Failed to share topic', err);
      showNotification({ type: 'error', title: 'Share failed', message: 'Could not copy the link.' });
    }
  };

  const handleLikeReply = async (postId: string) => {
    if (!postId || likedReplies.has(String(postId))) return;
    try {
      await forumApi.likePost(postId);
      setLikedReplies((prev) => new Set(prev).add(String(postId)));
      setPosts((prev) =>
        prev.map((p) =>
          String(p.id) === String(postId)
            ? {
                ...p,
                like_count: (p.like_count || p.likes_count || 0) + 1,
                likes_count: (p.likes_count || p.like_count || 0) + 1
              }
            : p
        )
      );
    } catch (err) {
      console.error('Failed to like reply', err);
      showNotification({ type: 'error', title: 'Like failed', message: 'Could not like this reply.' });
    }
  };

  const handleReport = async () => {
    if (!discussionId || !reportReason.trim()) return;
    try {
      await forumApi.reportTopic(discussionId, { reason: 'user_report', details: reportReason.trim() });
      setReportOpen(false);
      setReportReason('');
      showNotification({ type: 'success', title: 'Reported', message: 'Your report was submitted.' });
    } catch (err) {
      console.error('Failed to report topic', err);
      showNotification({ type: 'error', title: 'Report failed', message: 'Could not submit your report.' });
    }
  };

  const renderImagePreviews = (attachments?: any[]) => {
    if (!attachments?.length) return null;
    const images = attachments.filter((att) => {
      const mime = att.mime_type || att.content_type || att.type;
      const url = att.url || att.file_url || att.link;
      return (mime && mime.startsWith('image')) || (url && /\.(png|jpe?g|gif|webp|bmp)$/i.test(url));
    });
    if (!images.length) return null;
    return (
      <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-3">
        {images.map((att, idx) => {
          const url = att.url || att.file_url || att.link;
          if (!url) return null;
          const name = att.name || att.filename || `image-${idx + 1}`;
          return (
            <a
              key={att.id || url || idx}
              href={url}
              target="_blank"
              rel="noreferrer"
              className="block rounded-lg overflow-hidden border border-slate-200 hover:border-indigo-200 bg-slate-50"
            >
              <img src={url} alt={name} className="w-full h-32 object-cover" />
            </a>
          );
        })}
      </div>
    );
  };

  const renderFileAttachments = (attachments?: any[]) => {
    if (!attachments?.length) return null;
    const files = attachments.filter((att) => {
      const mime = att.mime_type || att.content_type || att.type;
      const url = att.url || att.file_url || att.link;
      const isImage = (mime && mime.startsWith('image')) || (url && /\.(png|jpe?g|gif|webp|bmp)$/i.test(url));
      return !isImage && url;
    });
    if (!files.length) return null;
    return (
      <div className="mt-2 space-y-1 text-sm">
        {files.map((att, idx) => {
          const url = att.url || att.file_url || att.link;
          const name = att.name || att.original_name || att.filename || `file-${idx + 1}`;
          return (
            <a
              key={att.id || url || idx}
              href={url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-2 py-1 rounded border border-slate-200 text-indigo-700 hover:border-indigo-300"
            >
              📎 {name}
            </a>
          );
        })}
      </div>
    );
  };

  const rootPosts = useMemo(() => posts.filter((p) => !p.parent_id), [posts]);
  const childrenMap = useMemo(() => {
    const map: Record<string, any[]> = {};
    posts.forEach((p) => {
      if (p.parent_id) {
        if (!map[p.parent_id]) map[p.parent_id] = [];
        map[p.parent_id].push(p);
      }
    });
    return map;
  }, [posts]);

  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState('');

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-500">
        Loading discussion...
      </div>
    );
  }

  if (error || !topic) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-rose-600">
        {error || 'Discussion not found'}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-7">
        <div className="flex items-center gap-3 text-sm text-slate-600">
          <button onClick={() => navigate(-1)} className="inline-flex items-center gap-2 text-[#1e1b4b] hover:text-[#312e81] font-semibold">
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          <span className="text-slate-400">/</span>
          <span className="font-semibold text-slate-700">Discussions</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[2.2fr,1fr] gap-8">
          <div className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-2xl p-7 shadow-sm">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-xs font-semibold px-2 py-1 rounded-full bg-green-50 text-green-700 border border-green-100">
                    {topic.is_private ? 'Private Thread' : 'Public Thread'}
                  </span>
                  <span className="text-xs text-slate-500">
                    {topic.is_private ? 'Visible to allowed members only' : 'Visible to everyone'}
                  </span>
                  {topic.is_locked && (
                    <span className="text-xs font-semibold px-2 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-100">
                      Locked
                    </span>
                  )}
                  {topic.is_pinned && (
                    <span className="text-xs font-semibold px-2 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-100">
                      Pinned
                    </span>
                  )}
                </div>
              <h1 className="mt-3 text-3xl font-bold text-slate-900 leading-tight">
                {topic.title}
              </h1>
              <div className="mt-2 flex items-center gap-3 text-sm text-slate-600 flex-wrap">
                <span className="font-semibold text-[#1e1b4b]">
                  {topic.author_name || `${topic.author_first_name || ''} ${topic.author_last_name || ''}`.trim() || 'Unknown Author'}
                </span>
                <span className="text-slate-400">•</span>
                <span>{topic.updated_at ? new Date(topic.updated_at).toLocaleString() : 'Recently'}</span>
              </div>

              <div className="mt-5 prose prose-slate max-w-none text-base leading-relaxed">
                <div dangerouslySetInnerHTML={{ __html: topic.content || '' }} />
              </div>
              {renderImagePreviews(topic.attachments)}
              {renderFileAttachments(topic.attachments)}

              <div className="mt-5 flex flex-wrap items-center gap-4 text-sm text-slate-600">
                <div className="inline-flex items-center gap-2">
                  <Eye className="h-4 w-4 text-[#1e1b4b]" />
                  <span>{topic.view_count || 0} views</span>
                </div>
                <button
                  onClick={handleLikeTopic}
                  disabled={likedTopic || likingTopic}
                  className="inline-flex items-center gap-2 text-rose-600 hover:text-rose-500 font-semibold disabled:opacity-60"
                >
                  <Heart className="h-4 w-4" />
                  {likedTopic ? 'Liked' : 'Like'} ({likes})
                </button>
                <button onClick={handleShare} className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-800">
                  <Share2 className="h-4 w-4" />
                  {copied ? 'Copied!' : 'Share'}
                </button>
                {copied && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
                    <Check className="h-3.5 w-3.5" />
                    Link copied
                  </span>
                )}
                <button onClick={() => setReportOpen(true)} className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-800">
                  <Flag className="h-4 w-4" />
                  Report
                </button>
              </div>

              <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
                {['Problem Solving', 'Clarity', 'Communication', 'Critical Thinking'].map((label) => (
                  <div key={label} className="border border-slate-200 rounded-lg p-3 bg-slate-50">
                    <p className="text-xs text-slate-500">{label}</p>
                    <p className="text-lg font-semibold text-slate-900">Rate this</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-3">
              <h3 className="text-base font-semibold text-slate-900">Replies ({posts.length})</h3>
              <div className="border border-slate-200 rounded-lg">
                <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-200 text-slate-500 text-sm">
                  <button type="button" className="hover:text-indigo-700 font-semibold">B</button>
                  <button type="button" className="hover:text-indigo-700 italic font-semibold">I</button>
                  <button type="button" className="hover:text-indigo-700 underline font-semibold">U</button>
                  <span className="text-slate-300">|</span>
                  <button type="button" className="hover:text-indigo-700 text-xs">• List</button>
                  <button type="button" className="hover:text-indigo-700 text-xs">1. List</button>
                  <span className="text-slate-300">|</span>
                  <button type="button" className="hover:text-indigo-700 text-xs">Link</button>
                  <button type="button" className="hover:text-indigo-700 text-xs">Quote</button>
                  <button type="button" className="hover:text-indigo-700 text-xs">Image</button>
                </div>
                <textarea
                  className="w-full min-h-[140px] p-3 text-sm text-slate-800 focus:outline-none"
                  placeholder="Write a thoughtful reply..."
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                />
              </div>
              <div className="flex justify-end">
                <button
                  onClick={handlePostReply}
                  disabled={replying || !replyContent.trim()}
                  className={`px-4 py-2 rounded-lg font-semibold shadow-sm ${primaryButton} disabled:opacity-60`}
                >
                  {replying ? 'Posting…' : 'Post Reply'}
                </button>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-7 shadow-sm space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-slate-900">Replies</h3>
                <span className="text-sm text-slate-500">Sorted by newest</span>
              </div>

              <div className="space-y-4">
                {rootPosts.map((reply, idx) => (
                  <div key={idx} className="border border-slate-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-sm text-slate-700 mb-1">
                      <div className="h-8 w-8 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-xs font-semibold">
                        {(reply.author_name || 'AU').slice(0, 2).toUpperCase()}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-semibold text-slate-900">{reply.author_name || 'Anonymous'}</span>
                        <span className="text-xs text-slate-500">{new Date(reply.created_at).toLocaleString()}</span>
                      </div>
                    </div>
                    <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{reply.content}</div>
                    {renderImagePreviews(reply.attachments)}
                    {renderFileAttachments(reply.attachments)}
                    <div className="mt-3 flex items-center gap-3 text-xs text-slate-600">
                      <button className="inline-flex items-center gap-1 text-indigo-700 font-semibold">
                        <MessageSquare className="h-4 w-4" />
                        Reply
                      </button>
                      <button
                        className="inline-flex items-center gap-1 text-rose-600 hover:text-rose-500"
                        onClick={() => handleLikeReply(reply.id)}
                        disabled={likedReplies.has(String(reply.id))}
                      >
                        <Heart className="h-4 w-4" />
                        {likedReplies.has(String(reply.id)) ? 'Liked' : 'Like'} ({reply.like_count || reply.likes_count || 0})
                      </button>
                    </div>

                    {childrenMap[reply.id] && (
                      <div className="mt-4 space-y-3 border-l-2 border-slate-200 pl-4">
                        {childrenMap[reply.id].map((child: any, cIdx: number) => (
                          <div key={cIdx} className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                            <div className="flex items-center gap-2 text-sm text-slate-700 mb-1">
                              <div className="h-7 w-7 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-xs font-semibold">
                                {(child.author_name || 'RE').slice(0, 2).toUpperCase()}
                              </div>
                              <div className="flex flex-col">
                                <span className="font-semibold text-slate-900">{child.author_name || 'Reply'}</span>
                                <span className="text-xs text-slate-500">{new Date(child.created_at).toLocaleString()}</span>
                              </div>
                            </div>
                            <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{child.content}</div>
                            {renderImagePreviews(child.attachments)}
                            {renderFileAttachments(child.attachments)}
                            <div className="mt-3 flex items-center gap-3 text-xs text-slate-600">
                              <button className="inline-flex items-center gap-1 text-indigo-700 font-semibold">
                                <MessageSquare className="h-4 w-4" />
                                Reply
                              </button>
                              <button
                                className="inline-flex items-center gap-1 text-rose-600 hover:text-rose-500"
                                onClick={() => handleLikeReply(child.id)}
                                disabled={likedReplies.has(String(child.id))}
                              >
                                <Heart className="h-4 w-4" />
                                {likedReplies.has(String(child.id)) ? 'Liked' : 'Like'} ({child.like_count || child.likes_count || 0})
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="h-5 w-5 text-indigo-700" />
                <h3 className="text-sm font-semibold text-slate-900">Related Threads</h3>
              </div>
              {relatedTopics.length > 0 ? (
                <div className="space-y-3">
                  {relatedTopics.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => navigate(`/forums/${item.id}/thread`)}
                      className="w-full text-left p-3 rounded-lg border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/40 transition-colors"
                    >
                      <p className="text-sm font-semibold text-slate-900 line-clamp-2">{item.title}</p>
                      <p className="text-xs text-slate-500 mt-1">{item.lastActivity}</p>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500">No related threads yet.</p>
              )}
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-900 mb-2">Tags</h3>
              <div className="flex flex-wrap gap-2">
                {['AI', 'Education', 'Technology', 'Sustainability', 'Lifestyle', 'Work-Life'].map((tag) => (
                  <span key={tag} className="px-3 py-1 rounded-full text-xs bg-slate-100 text-slate-700 border border-slate-200">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {reportOpen && (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-4">
            <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-5 w-full max-w-md">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="h-5 w-5 text-rose-600" />
                <h3 className="text-base font-semibold text-slate-900">Report Discussion</h3>
              </div>
              <p className="text-sm text-slate-600 mb-2">Tell us what’s wrong with this thread.</p>
              <textarea
                className="w-full border border-slate-200 rounded-lg p-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-100"
                rows={4}
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                placeholder="Reason for reporting..."
              />
              <div className="mt-4 flex justify-end gap-2">
                <button
                  onClick={() => setReportOpen(false)}
                  className="px-4 py-2 rounded-lg text-sm font-semibold bg-white text-slate-800 border border-slate-200 hover:border-slate-300"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReport}
                  disabled={!reportReason.trim()}
                  className="px-4 py-2 rounded-lg text-sm font-semibold shadow-sm bg-[#1e1b4b] text-white hover:bg-[#312e81] disabled:opacity-60"
                >
                  Submit report
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DiscussionThread;

