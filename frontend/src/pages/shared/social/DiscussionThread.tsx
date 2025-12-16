import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Heart, Share2, Flag, Eye, MessageSquare, ArrowLeft,
  Sparkles, AlertTriangle, Check, Calendar, User, Clock
} from 'lucide-react';
import { forumApi } from '@/services/api/forums';
import { useNotification } from '@/context/NotificationContext';
import { brandColors } from '@/theme/brand';
import { useAuth } from '@/context/AuthContext';

const DiscussionThread: React.FC = () => {
  const navigate = useNavigate();
  const { discussionId } = useParams<{ discussionId: string }>();
  const { user } = useAuth();
  const [topic, setTopic] = useState<any | null>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [replyContent, setReplyContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [likes, setLikes] = useState<number>(0);
  const [relatedTopics, setRelatedTopics] = useState<any[]>([]);
  const [copied, setCopied] = useState(false);
  const [replying, setReplying] = useState(false);
  const [likingTopic, setLikingTopic] = useState(false);
  const [likedTopic, setLikedTopic] = useState(false);
  const [likedReplies, setLikedReplies] = useState<Set<string>>(new Set());
  const { showNotification } = useNotification();
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [replyParentId, setReplyParentId] = useState<string | null>(null);

  const loadTopic = async () => {
    if (!discussionId) return;
    try {
      setLoading(true);
      const res = await forumApi.getTopic(discussionId);
      const data = res?.data?.data || res?.data || res;
      let topicPayload = data.topic || data;

      if (topicPayload) {
        topicPayload = {
          ...topicPayload,
          author_name: topicPayload.author_name ||
            (topicPayload.author ? `${topicPayload.author.first_name || ''} ${topicPayload.author.last_name || ''}`.trim() : '') ||
            'Anonymous User'
        };
      }

      const replies = data.replies || data.posts || [];
      // Normalize reply author names
      const normalizedReplies = replies.map((r: any) => ({
        ...r,
        author_name: r.author_name ||
          (r.author ? `${r.author.first_name || ''} ${r.author.last_name || ''}`.trim() : '') ||
          'Anonymous'
      }));

      setTopic(topicPayload);
      setPosts(normalizedReplies);
      setLikes(topicPayload?.like_count || topicPayload?.likes_count || 0);
      setLikedTopic(Boolean(topicPayload?.user_liked));
      setLikedReplies(new Set()); // In a real app, populate this based on user_liked property of posts
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
        const res = await forumApi.getTopics(String(topic.forum_id), 1, 5);
        const topics = res?.data?.topics || res?.topics || [];
        const filtered = topics
          .filter((t: any) => String(t.id) !== String(topic.id))
          .map((t: any) => ({
            id: String(t.id),
            title: t.title,
            lastActivity: t.last_activity_at || t.updated_at
          }));
        setRelatedTopics(filtered);
      } catch {
        setRelatedTopics([]);
      }
    };
    if (topic) loadRelated();
  }, [topic]);

  const handlePostReply = async () => {
    if (!discussionId || !replyContent.trim()) return;
    try {
      setReplying(true);
      await forumApi.createReply(discussionId, {
        content: replyContent.trim(),
        parent_id: replyParentId || undefined
      });
      setReplyContent('');
      setReplyParentId(null);
      await loadTopic();
      showNotification({ type: 'success', title: 'Success', message: 'Your reply has been posted.' });
    } catch (err) {
      console.error('Failed to post reply', err);
      showNotification({ type: 'error', title: 'Error', message: 'Failed to post reply' });
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
      showNotification({ type: 'error', title: 'Error', message: 'Could not like discussion' });
    } finally {
      setLikingTopic(false);
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
            ? { ...p, like_count: (p.like_count || 0) + 1 }
            : p
        )
      );
    } catch (err) {
      console.error('Failed to like reply', err);
    }
  };

  const handleShare = async () => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(window.location.href);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        showNotification({ type: 'success', title: 'Copied', message: 'Link copied to clipboard' });
      }
    } catch (err) {
      showNotification({ type: 'error', title: 'Error', message: 'Failed to copy link' });
    }
  };

  const handleReport = async () => {
    if (!discussionId || !reportReason.trim()) return;
    try {
      await forumApi.reportTopic(discussionId, { reason: 'user_report', details: reportReason.trim() });
      setReportOpen(false);
      setReportReason('');
      showNotification({ type: 'success', title: 'Reported', message: 'Thank you for your report.' });
    } catch (err) {
      showNotification({ type: 'error', title: 'Error', message: 'Failed to submit report' });
    }
  };

  // Attachments rendering helper
  const renderAttachments = (attachments?: any[]) => {
    if (!attachments?.length) return null;
    return (
      <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-4">
        {attachments.map((att, idx) => {
          const url = att.url || att.file_url || att.link;
          if (!url) return null;
          const isImage = /\.(png|jpe?g|gif|webp|bmp)$/i.test(url) || att.mime_type?.startsWith('image');

          if (isImage) {
            return (
              <a key={idx} href={url} target="_blank" rel="noreferrer" className="block rounded-lg overflow-hidden border border-slate-200">
                <img src={url} alt="Attachment" className="w-full h-32 object-cover hover:scale-105 transition-transform" />
              </a>
            );
          }
          return (
            <a key={idx} href={url} target="_blank" rel="noreferrer" className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg border border-slate-200 text-sm hover:bg-slate-100 transition-colors">
              <span className="text-xl">📎</span>
              <span className="truncate">{att.name || 'Attachment'}</span>
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

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="h-8 w-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto"></div>
          <p className="text-slate-500 font-medium">Loading conversation...</p>
        </div>
      </div>
    );
  }

  if (error || !topic) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 text-center max-w-md w-full">
          <AlertTriangle className="h-12 w-12 text-rose-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-900 mb-2">Discussion Not Found</h2>
          <p className="text-slate-600 mb-6">{error || "The discussion you're looking for doesn't exist or has been removed."}</p>
          <button onClick={() => navigate('/community')} className="px-6 py-2.5 rounded-xl font-semibold text-white transition-colors" style={{ backgroundColor: brandColors.primaryHex }}>
            Return to Community
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Header / Nav */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 rounded-full hover:bg-slate-100 transition-colors text-slate-600"
            aria-label="Go back"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-semibold text-slate-900 truncate">
              {topic.title}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleShare} className="p-2 rounded-full hover:bg-slate-100 text-slate-600">
              {copied ? <Check className="h-5 w-5 text-green-600" /> : <Share2 className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr,320px] gap-8">
          {/* Main Content */}
          <div className="space-y-6">

            {/* Original Post Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-6 sm:p-8 space-y-6">
                {/* Meta Header */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-700 font-bold text-lg border border-indigo-100">
                      {topic.author_name ? topic.author_name.charAt(0).toUpperCase() : <User className="h-6 w-6" />}
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900 text-lg">
                        {topic.author_name || 'Anonymous User'}
                      </h3>
                      <div className="flex items-center gap-2 text-sm text-slate-500">
                        <Calendar className="h-3.5 w-3.5" />
                        <span>{new Date(topic.created_at || Date.now()).toLocaleDateString()}</span>
                        <span>•</span>
                        <Clock className="h-3.5 w-3.5" />
                        <span>{new Date(topic.created_at || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>
                  </div>

                  {topic.is_pinned && (
                    <span className="bg-amber-50 text-amber-700 text-xs px-2.5 py-1 rounded-full font-medium border border-amber-100 flex items-center gap-1">
                      <Sparkles className="h-3 w-3" /> Pinned
                    </span>
                  )}
                </div>

                {/* Content */}
                <div className="prose prose-slate max-w-none prose-headings:text-slate-900 prose-a:text-indigo-600 hover:prose-a:underline">
                  <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-4">{topic.title}</h1>
                  <div className="text-slate-700 text-lg leading-relaxed whitespace-pre-wrap">
                    <div dangerouslySetInnerHTML={{ __html: topic.content || '' }} />
                  </div>
                </div>

                {/* Attachments */}
                {renderAttachments(topic.attachments)}

                {/* Tags */}
                {topic.tags && topic.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-2">
                    {topic.tags.map((tag: string) => (
                      <span key={tag} className="px-3 py-1 rounded-full text-sm bg-slate-100 text-slate-700 font-medium">
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Action Bar */}
              <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <button
                    onClick={handleLikeTopic}
                    disabled={likedTopic}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors font-medium ${likedTopic
                      ? 'text-rose-600 bg-rose-50'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                      }`}
                  >
                    <Heart className={`h-5 w-5 ${likedTopic ? 'fill-current' : ''}`} />
                    <span>{likes} {likes === 1 ? 'Like' : 'Likes'}</span>
                  </button>
                  <div className="flex items-center gap-2 text-slate-600 px-3 py-1.5">
                    <Eye className="h-5 w-5" />
                    <span>{topic.view_count || 0} Views</span>
                  </div>
                </div>
                <button
                  onClick={() => setReportOpen(true)}
                  className="text-slate-400 hover:text-rose-600 flex items-center gap-1 text-sm font-medium transition-colors"
                >
                  <Flag className="h-4 w-4" /> Report
                </button>
              </div>
            </div>

            {/* Replies Section */}
            <div className="space-y-6">
              <div className="flex items-center justify-between px-2">
                <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-indigo-600" />
                  {posts.length} Replies
                </h2>
              </div>

              {/* Reply Input */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-6">
                {replyParentId && (
                  <div className="flex items-center justify-between bg-indigo-50 p-3 rounded-lg mb-4 text-sm text-indigo-800">
                    <span>Replying to a comment...</span>
                    <button onClick={() => setReplyParentId(null)} className="text-indigo-900 font-bold hover:underline">Cancel</button>
                  </div>
                )}
                <div className="flex gap-4">
                  <div className="flex-shrink-0">
                    <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold border border-indigo-200">
                      {user?.firstName?.charAt(0) || 'U'}
                    </div>
                  </div>
                  <div className="flex-1 space-y-3">
                    <textarea
                      value={replyContent}
                      onChange={(e) => setReplyContent(e.target.value)}
                      placeholder="Write a thoughtful reply..."
                      className="w-full min-h-[120px] p-4 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all resize-y text-slate-700"
                    />
                    <div className="flex justify-end">
                      <button
                        onClick={handlePostReply}
                        disabled={!replyContent.trim() || replying}
                        className="px-6 py-2.5 rounded-xl text-white font-semibold shadow-sm hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{ backgroundColor: brandColors.primaryHex }}
                      >
                        {replying ? 'Posting...' : 'Post Reply'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Reply List */}
              <div className="space-y-4">
                {rootPosts.map((post) => (
                  <div key={post.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4">
                    {/* Post Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-sm">
                          {post.author_name ? post.author_name.charAt(0).toUpperCase() : 'A'}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">{post.author_name || 'Anonymous'}</p>
                          <p className="text-xs text-slate-500">{new Date(post.created_at).toLocaleString()}</p>
                        </div>
                      </div>
                    </div>

                    {/* Post Content */}
                    <div className="text-slate-700 whitespace-pre-wrap leading-relaxed pl-13">
                      {post.content}
                    </div>
                    {renderAttachments(post.attachments)}

                    {/* Post Actions */}
                    <div className="flex items-center gap-4 pt-2">
                      <button
                        onClick={() => handleLikeReply(post.id)}
                        className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${likedReplies.has(String(post.id)) ? 'text-rose-600' : 'text-slate-500 hover:text-slate-800'
                          }`}
                      >
                        <Heart className={`h-4 w-4 ${likedReplies.has(String(post.id)) ? 'fill-current' : ''}`} />
                        {post.like_count || 0}
                      </button>
                      <button
                        onClick={() => {
                          setReplyParentId(post.id);
                          window.scrollTo({ top: 350, behavior: 'smooth' }); // Scroll to input
                        }}
                        className="flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-indigo-600 transition-colors"
                      >
                        <MessageSquare className="h-4 w-4" /> Reply
                      </button>
                    </div>

                    {/* Nested Replies */}
                    {childrenMap[post.id] && (
                      <div className="mt-4 pl-6 border-l-2 border-slate-100 space-y-4">
                        {childrenMap[post.id].map((child: any) => (
                          <div key={child.id} className="bg-slate-50 rounded-xl p-4 border border-slate-200/60">
                            <div className="flex items-center gap-3 mb-2">
                              <div className="h-8 w-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-600 font-bold text-xs">
                                {child.author_name ? child.author_name.charAt(0).toUpperCase() : 'A'}
                              </div>
                              <div>
                                <p className="font-semibold text-slate-900 text-sm">{child.author_name || 'Anonymous'}</p>
                                <p className="text-xs text-slate-500">{new Date(child.created_at).toLocaleString()}</p>
                              </div>
                            </div>
                            <div className="text-slate-700 text-sm leading-relaxed mb-3">
                              {child.content}
                            </div>
                            <div className="flex items-center gap-4">
                              <button
                                onClick={() => handleLikeReply(child.id)}
                                className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${likedReplies.has(String(child.id)) ? 'text-rose-600' : 'text-slate-500 hover:text-slate-800'
                                  }`}
                              >
                                <Heart className={`h-3.5 w-3.5 ${likedReplies.has(String(child.id)) ? 'fill-current' : ''}`} />
                                {child.like_count || 0}
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

          {/* Sidebar */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 sticky top-24">
              <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-indigo-500" />
                Related Topics
              </h3>
              {relatedTopics.length > 0 ? (
                <div className="space-y-4">
                  {relatedTopics.map((item) => (
                    <a
                      key={item.id}
                      href={`/forums/${item.id}/thread`}
                      className="block group"
                    >
                      <h4 className="text-sm font-medium text-slate-700 group-hover:text-indigo-600 transition-colors line-clamp-2 mb-1">
                        {item.title}
                      </h4>
                      <p className="text-xs text-slate-400">
                        {new Date(item.lastActivity).toLocaleDateString()}
                      </p>
                    </a>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500 italic">No related topics found.</p>
              )}

              <div className="mt-8 pt-6 border-t border-slate-100">
                <h3 className="font-bold text-slate-900 mb-3 text-sm uppercase tracking-wide">Community Guidelines</h3>
                <ul className="space-y-2 text-sm text-slate-600 marker:text-indigo-500 list-disc pl-4">
                  <li>Be respectful and kind</li>
                  <li>Stay on topic</li>
                  <li>No spam or self-promotion</li>
                  <li>Report inappropriate content</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Report Modal */}
      {reportOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-6 w-full max-w-md scale-100 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-rose-500" />
                Report Discussion
              </h3>
              <button onClick={() => setReportOpen(false)} className="text-slate-400 hover:text-slate-600">
                <span className="sr-only">Close</span>
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <p className="text-slate-600 text-sm mb-4">
              Please help us understand what's going on. What's the issue with this post?
            </p>

            <textarea
              className="w-full border border-slate-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-100 focus:border-rose-400 min-h-[100px] mb-4"
              placeholder="Describe the issue..."
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
            />

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setReportOpen(false)}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleReport}
                disabled={!reportReason.trim()}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 shadow-sm transition-all disabled:opacity-50"
              >
                Submit Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DiscussionThread;
