import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Heart, Share2, Flag, Eye, MessageSquare, ArrowLeft,
  Sparkles, AlertTriangle, Check, User, X
} from 'lucide-react';
import { forumApi } from '@/services/api/forums';
import { useNotification } from '@/context/NotificationContext';
import { brandColors } from '@/theme/brand';
import { useAuth } from '@/context/AuthContext';
import { useTranslation } from 'react-i18next';

const DiscussionThread: React.FC = () => {
  const { t } = useTranslation();
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

  // Helper to safely get user display name
  const getUserName = (entity: any) => {
    if (!entity) return 'Member';
    if (entity.author_name) return entity.author_name;
    if (entity.display_name) return entity.display_name;
    if (entity.first_name && entity.last_name) return `${entity.first_name} ${entity.last_name}`;
    if (entity.name) return entity.name;
    return 'Member';
  };

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
          author_name: getUserName(topicPayload)
        };
      }

      const replies = data.replies || data.posts || [];
      const normalizedReplies = replies.map((r: any) => ({
        ...r,
        author_name: getUserName(r)
      }));

      setTopic(topicPayload);
      setPosts(normalizedReplies);
      setLikes(topicPayload?.like_count || topicPayload?.likes_count || 0);
      setLikedTopic(Boolean(topicPayload?.user_liked));
      setLikedReplies(new Set());
      setError(null);
    } catch (err: any) {
      setError(err?.message || t('community.discussion.not_found_body'));
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
      showNotification({ type: 'success', title: 'Success', message: t('community.discussion.posted_success') });
    } catch (err) {
      console.error('Failed to post reply', err);
      showNotification({ type: 'error', title: 'Error', message: t('community.discussion.post_error') });
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
      showNotification({ type: 'error', title: 'Error', message: t('community.discussion.like_error') });
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
        showNotification({ type: 'success', title: 'Copied', message: t('community.discussion.copied') });
      }
    } catch (err) {
      showNotification({ type: 'error', title: 'Error', message: t('community.discussion.copy_error') });
    }
  };

  const handleReport = async () => {
    if (!discussionId || !reportReason.trim()) return;
    try {
      await forumApi.reportTopic(discussionId, { reason: 'user_report', details: reportReason.trim() });
      setReportOpen(false);
      setReportReason('');
      showNotification({ type: 'success', title: 'Reported', message: t('community.discussion.reports.success') });
    } catch (err) {
      showNotification({ type: 'error', title: 'Error', message: t('community.discussion.reports.error') });
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
          <div className="h-10 w-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto"></div>
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
          <h2 className="text-xl font-bold text-slate-900 mb-2">{t('community.discussion.not_found_title')}</h2>
          <p className="text-slate-600 mb-6">{error || t('community.discussion.not_found_body')}</p>
          <button onClick={() => navigate('/community')} className="px-6 py-2.5 rounded-xl font-semibold text-white transition-colors" style={{ backgroundColor: brandColors.primaryHex }}>
            {t('community.discussion.return_community')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/50 pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb / Back */}
        <div className="mb-6">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            {t('community.discussion.back')}
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-8 space-y-8">
            {/* Topic Card */}
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-6 sm:p-8">
                {/* Topic Header */}
                <div className="flex items-start justify-between gap-4 mb-8">
                  <div className="flex items-center gap-4">
                    <div className="h-14 w-14 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center text-indigo-700 font-bold text-xl border-2 border-white shadow-md">
                      {topic.author_name ? topic.author_name.charAt(0).toUpperCase() : <User className="h-7 w-7" />}
                    </div>
                    <div>
                      <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 leading-tight tracking-tight mb-1">{topic.title}</h1>
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <span className="font-semibold text-gray-900">{topic.author_name || 'Member'}</span>
                        <span className="text-gray-300">•</span>
                        <span>{new Date(topic.created_at || Date.now()).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}</span>
                      </div>
                    </div>
                  </div>
                  {topic.is_pinned && (
                    <span className="bg-amber-50 text-amber-700 text-xs px-3 py-1.5 rounded-full font-bold border border-amber-100 flex items-center gap-1.5 shrink-0 uppercase tracking-wide">
                      <Sparkles className="h-3.5 w-3.5" />
                      {t('community.discussion.pinned')}
                    </span>
                  )}
                </div>

                {/* Topic Body */}
                <div className="prose prose-lg prose-indigo max-w-none text-gray-700 leading-relaxed mb-8">
                  <div dangerouslySetInnerHTML={{ __html: topic.content || '' }} />
                </div>

                {renderAttachments(topic.attachments)}

                {/* Tags */}
                {topic.tags && topic.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-8">
                    {topic.tags.map((tag: string) => (
                      <span key={tag} className="px-3 py-1 rounded-full text-sm bg-gray-100/80 text-gray-600 font-medium hover:bg-gray-200 transition-colors cursor-pointer border border-transparent hover:border-gray-300">#{tag}</span>
                    ))}
                  </div>
                )}
              </div>

              {/* Topic Actions */}
              <div className="bg-gray-50/50 px-6 sm:px-8 py-5 border-t border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-6">
                  <button
                    onClick={handleLikeTopic}
                    disabled={likedTopic}
                    className={`flex items-center gap-2 transition-all font-semibold ${likedTopic
                        ? 'text-rose-600'
                        : 'text-gray-500 hover:text-rose-600 hover:scale-105'
                      }`}
                  >
                    <Heart className={`h-6 w-6 ${likedTopic ? 'fill-current' : ''}`} />
                    <span className="text-lg">{likes}</span>
                  </button>
                  <div className="flex items-center gap-2 text-gray-400" title="Views">
                    <Eye className="h-6 w-6" />
                    <span className="text-lg">{topic.view_count || 0}</span>
                  </div>
                  <button
                    onClick={handleShare}
                    className="flex items-center gap-2 text-gray-500 hover:text-indigo-600 transition-colors group"
                  >
                    {copied ? <Check className="h-6 w-6 text-green-600" /> : <Share2 className="h-6 w-6 group-hover:scale-110 transition-transform" />}
                    <span className="font-medium hidden sm:inline">{t('community.discussion.share')}</span>
                  </button>
                </div>
                <button
                  onClick={() => setReportOpen(true)}
                  className="text-gray-400 hover:text-rose-600 flex items-center gap-1.5 text-sm font-medium transition-colors px-3 py-1.5 rounded-lg hover:bg-rose-50"
                >
                  <Flag className="h-4 w-4" />
                  <span className="hidden sm:inline">{t('community.discussion.report')}</span>
                </button>
              </div>
            </div>

            {/* Replies Section */}
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2 pl-2">
                <MessageSquare className="h-6 w-6 text-indigo-600" />
                {posts.length} {t('community.discussion.replies_count')}
              </h2>

              {/* Reply Input */}
              <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 sm:p-8 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-indigo-500"></div>
                {replyParentId && (
                  <div className="flex items-center justify-between bg-indigo-50 p-4 rounded-xl mb-6 text-sm text-indigo-900 border border-indigo-100 animate-in fade-in slide-in-from-top-2">
                    <span className="font-medium flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div>
                      {t('community.discussion.replying_to')}
                    </span>
                    <button onClick={() => setReplyParentId(null)} className="text-indigo-600 hover:text-indigo-800 p-1 rounded-full hover:bg-indigo-100 transition-colors">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}
                <div className="flex gap-4">
                  <div className="flex-shrink-0 hidden sm:block">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-gray-700 font-bold border border-gray-300">
                      {user?.firstName?.charAt(0) || 'U'}
                    </div>
                  </div>
                  <div className="flex-1 space-y-4">
                    <textarea
                      value={replyContent}
                      onChange={(e) => setReplyContent(e.target.value)}
                      placeholder={t('community.discussion.reply_placeholder')}
                      className="w-full min-h-[120px] p-4 rounded-2xl border-2 border-gray-100 focus:outline-none focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/10 transition-all resize-y text-gray-700 bg-gray-50 focus:bg-white text-base"
                    />
                    <div className="flex justify-end">
                      <button
                        onClick={handlePostReply}
                        disabled={!replyContent.trim() || replying}
                        className="px-8 py-3 rounded-xl text-white font-bold shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed transform active:scale-95"
                        style={{ backgroundColor: brandColors.primaryHex }}
                      >
                        {replying ? t('community.discussion.posting') : t('community.discussion.post_reply')}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Reply List */}
              <div className="space-y-6">
                {rootPosts.map((post) => (
                  <div key={post.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8 hover:border-gray-200 transition-colors">
                    <div className="flex items-start gap-4 mb-4">
                      <div className="h-12 w-12 rounded-full bg-gray-100 flex-shrink-0 flex items-center justify-center text-gray-600 font-bold text-lg border border-white shadow-sm">
                        {post.author_name ? post.author_name.charAt(0).toUpperCase() : 'U'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <p className="font-bold text-gray-900 text-base">{post.author_name || 'Member'}</p>
                            <p className="text-xs text-gray-500 font-medium">{new Date(post.created_at).toLocaleString()}</p>
                          </div>
                        </div>

                        <div className="text-gray-700 whitespace-pre-wrap leading-relaxed text-base mb-4">
                          {post.content}
                        </div>
                        {renderAttachments(post.attachments)}

                        <div className="flex items-center gap-6 mt-4">
                          <button
                            onClick={() => handleLikeReply(post.id)}
                            className={`flex items-center gap-2 text-sm font-semibold transition-colors group ${likedReplies.has(String(post.id)) ? 'text-rose-600' : 'text-gray-500 hover:text-rose-600'
                              }`}
                          >
                            <Heart className={`h-4.5 w-4.5 group-hover:scale-110 transition-transform ${likedReplies.has(String(post.id)) ? 'fill-current' : ''}`} />
                            {post.like_count || 0}
                          </button>
                          <button
                            onClick={() => {
                              setReplyParentId(post.id);
                              window.scrollTo({ top: 350, behavior: 'smooth' });
                            }}
                            className="flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-indigo-600 transition-colors group"
                          >
                            <MessageSquare className="h-4.5 w-4.5 group-hover:scale-110 transition-transform" />
                            {t('community.discussion.replies_label')}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Threaded Replies */}
                    {childrenMap[post.id] && (
                      <div className="mt-6 pl-8 sm:pl-16 relative space-y-6">
                        {/* Vertical Thread Line */}
                        <div className="absolute left-6 sm:left-14 top-0 bottom-6 w-0.5 bg-gray-200"></div>

                        {childrenMap[post.id].map((child: any) => (
                          <div key={child.id} className="relative">
                            {/* Connector Curve (Optional styling) */}
                            <div className="absolute -left-6 top-6 w-4 h-0.5 bg-gray-200"></div>

                            <div className="bg-gray-50/80 rounded-2xl p-6 border border-gray-100 hover:bg-white hover:shadow-sm transition-all">
                              <div className="flex items-center gap-3 mb-3">
                                <div className="h-8 w-8 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-600 font-bold text-xs shadow-sm">
                                  {child.author_name ? child.author_name.charAt(0).toUpperCase() : 'U'}
                                </div>
                                <div>
                                  <p className="font-bold text-gray-900 text-sm">{child.author_name || 'Member'}</p>
                                  <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">{new Date(child.created_at).toLocaleDateString()}</p>
                                </div>
                              </div>
                              <div className="text-gray-700 text-sm leading-relaxed mb-3 pl-1">
                                {child.content}
                              </div>
                              <div className="flex items-center gap-4 pl-1">
                                <button
                                  onClick={() => handleLikeReply(child.id)}
                                  className={`flex items-center gap-1.5 text-xs font-bold transition-colors ${likedReplies.has(String(child.id)) ? 'text-rose-600' : 'text-gray-400 hover:text-rose-600'
                                    }`}
                                >
                                  <Heart className={`h-3.5 w-3.5 ${likedReplies.has(String(child.id)) ? 'fill-current' : ''}`} />
                                  {child.like_count || 0}
                                </button>
                              </div>
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
          <div className="lg:col-span-4 space-y-6">
            {/* Related Topics */}
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 sm:p-8">
              <h3 className="font-bold text-gray-900 mb-6 flex items-center gap-2 text-lg">
                <Sparkles className="h-5 w-5 text-indigo-500" />
                {t('community.discussion.related_topics')}
              </h3>
              {relatedTopics.length > 0 ? (
                <div className="space-y-4">
                  {relatedTopics.map((item) => (
                    <a key={item.id} href={`/forums/${item.id}/thread`} className="block group p-4 rounded-2xl hover:bg-indigo-50/50 transition-all border border-transparent hover:border-indigo-100">
                      <h4 className="text-sm font-bold text-gray-800 group-hover:text-indigo-700 transition-colors line-clamp-2 mb-2 leading-snug">{item.title}</h4>
                      <p className="text-xs text-gray-400 font-medium flex items-center gap-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-300"></div>
                        {new Date(item.lastActivity).toLocaleDateString()}
                      </p>
                    </a>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 italic text-center py-4">{t('community.discussion.no_related')}</p>
              )}
            </div>

            {/* Guidelines */}
            <div className="bg-gradient-to-br from-indigo-50 to-white rounded-3xl border border-indigo-100 p-6 sm:p-8">
              <h3 className="font-bold text-indigo-900 mb-5 text-sm uppercase tracking-wider flex items-center gap-2">
                <Check className="h-4 w-4" />
                {t('community.discussion.guidelines_title')}
              </h3>
              <ul className="space-y-4 text-sm text-indigo-900/80 font-medium">
                <li className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 mt-2 rounded-full bg-indigo-400 flex-shrink-0 ring-4 ring-indigo-100" />
                  {t('community.discussion.guidelines_items.0')}
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 mt-2 rounded-full bg-indigo-400 flex-shrink-0 ring-4 ring-indigo-100" />
                  {t('community.discussion.guidelines_items.1')}
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 mt-2 rounded-full bg-indigo-400 flex-shrink-0 ring-4 ring-indigo-100" />
                  {t('community.discussion.guidelines_items.2')}
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Report Modal */}
      {reportOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 p-8 w-full max-w-md scale-100 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <AlertTriangle className="h-6 w-6 text-rose-500" />
                {t('community.discussion.reports.title')}
              </h3>
              <button onClick={() => setReportOpen(false)} className="text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-100 transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-gray-600 text-sm mb-6 leading-relaxed">
              {t('community.discussion.reports.desc')}
            </p>

            <textarea
              className="w-full border-2 border-gray-100 rounded-2xl p-4 text-sm focus:outline-none focus:ring-4 focus:ring-rose-500/10 focus:border-rose-400 min-h-[140px] mb-8 resize-none bg-gray-50 focus:bg-white transition-all font-medium"
              placeholder={t('community.discussion.reports.placeholder')}
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
            />

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setReportOpen(false)}
                className="px-6 py-3 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50 border border-transparent hover:border-gray-200 transition-all"
              >
                {t('community.discussion.reports.cancel')}
              </button>
              <button
                onClick={handleReport}
                disabled={!reportReason.trim()}
                className="px-6 py-3 rounded-xl text-sm font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t('community.discussion.reports.submit')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DiscussionThread;
