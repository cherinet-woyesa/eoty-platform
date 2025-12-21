import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  MessageSquare, Heart, Share2, Flag, MoreVertical, 
  Calendar, User, ArrowLeft, Paperclip, Send, 
  AlertCircle, Check, Lock, Pin, Eye, X, Sparkles 
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { forumApi, ForumTopic, ForumPost } from '../../../services/api/forums';
import { useAuth } from '../../../hooks/useAuth';
import LoadingSpinner from '../../../components/common/LoadingSpinner';
import ErrorAlert from '../../../components/common/ErrorAlert';

interface DiscussionThreadProps {
  embedded?: boolean;
}

const DiscussionThread: React.FC<DiscussionThreadProps> = ({ embedded }) => {
  const { t } = useTranslation();
  const { discussionId } = useParams<{ discussionId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [topic, setTopic] = useState<ForumTopic | null>(null);
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [replying, setReplying] = useState(false);
  const [replyParentId, setReplyParentId] = useState<string | null>(null);
  const [likes, setLikes] = useState(0);
  const [likedTopic, setLikedTopic] = useState(false);
  const [likedReplies, setLikedReplies] = useState<Set<string>>(new Set());
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [copied, setCopied] = useState(false);
  const [relatedTopics, setRelatedTopics] = useState<any[]>([]);

  // Brand colors (can be moved to a theme config)
  const brandColors = {
    primary: 'indigo-600',
    primaryHex: '#4f46e5',
    secondary: 'purple-600',
  };

  useEffect(() => {
    loadTopic();
  }, [discussionId]);

  const loadTopic = async () => {
    if (!discussionId) return;
    try {
      setLoading(true);
      setError(null);
      
      // Fetch topic details
      const response = await forumApi.getTopic(discussionId);
      
      if (response.success && response.data) {
        const { topic: topicData, replies } = response.data;
        setTopic(topicData);
        setLikes(topicData.like_count || 0);
        setPosts(replies || []);

        // Fetch related topics (from same forum)
        try {
          const relatedRes = await forumApi.getTopics(topicData.forum_id, 1, 6);
          const relatedList = (relatedRes?.data?.topics || relatedRes?.topics || [])
            .filter((t: any) => String(t.id) !== String(discussionId))
            .slice(0, 5)
            .map((t: any) => ({
              id: t.id,
              title: t.title,
              lastActivity: t.last_activity_at || t.created_at
            }));
          setRelatedTopics(relatedList);
        } catch (e) {
          console.warn('Failed to load related topics', e);
        }
      } else {
        throw new Error(response.message || 'Failed to load topic');
      }

    } catch (err) {
      console.error('Failed to load topic:', err);
      setError(t('community.discussion.error_loading'));
    } finally {
      setLoading(false);
    }
  };

  const handlePostReply = async () => {
    if (!replyContent.trim() || !discussionId) return;

    try {
      setReplying(true);
      const response = await forumApi.createReply(discussionId, {
        content: replyContent,
        parent_id: replyParentId || undefined
      });

      if (response.success && response.data) {
        const newPost = response.data.reply;
        
        // Optimistically add the post
        // In a real app, the backend returns the created post with author info
        // We might need to enrich it with current user info if the backend doesn't return full author object
        const enrichedPost = {
          ...newPost,
          author_name: user?.firstName ? `${user.firstName} ${user.lastName || ''}` : 'Me',
          created_at: new Date().toISOString(),
          like_count: 0
        };

        setPosts([...posts, enrichedPost]);
        setReplyContent('');
        setReplyParentId(null);
        
        // Update topic post count if available
        if (topic) {
          setTopic({ ...topic, post_count: (topic.post_count || 0) + 1 });
        }
      } else {
        throw new Error(response.message || 'Failed to post reply');
      }

    } catch (err) {
      console.error('Failed to post reply:', err);
      // Show error toast or alert
    } finally {
      setReplying(false);
    }
  };

  const handleLikeTopic = async () => {
    if (!discussionId || likedTopic) return;
    try {
      await forumApi.likeTopic(discussionId);
      setLikes(prev => prev + 1);
      setLikedTopic(true);
    } catch (err) {
      console.error('Failed to like topic:', err);
    }
  };

  const handleLikeReply = async (postId: string) => {
    if (likedReplies.has(postId)) return;
    try {
      await forumApi.likePost(postId);
      setLikedReplies(prev => new Set(prev).add(postId));
      setPosts(posts.map(p => 
        p.id === postId ? { ...p, like_count: (p.like_count || 0) + 1 } : p
      ));
    } catch (err) {
      console.error('Failed to like reply:', err);
    }
  };

  const handleShare = async () => {
    if (!discussionId) return;
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      
      // Optional: Track share
      // await forumApi.shareTopic(discussionId, { share_type: 'link' });
    } catch (err) {
      console.error('Failed to share:', err);
    }
  };

  const handleReport = async () => {
    if (!discussionId || !reportReason.trim()) return;
    try {
      await forumApi.reportTopic(discussionId, { reason: reportReason });
      setReportOpen(false);
      setReportReason('');
      // Show success message
    } catch (err) {
      console.error('Failed to report:', err);
    }
  };

  const renderAttachments = (attachments?: any[]) => {
    if (!attachments || attachments.length === 0) return null;
    return (
      <div className="flex flex-wrap gap-3 mt-4">
        {attachments.map((file: any) => (
          <a 
            key={file.id} 
            href={file.url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <Paperclip className="h-4 w-4 text-gray-400" />
            <span className="truncate max-w-[200px]">{file.name || file.file_name}</span>
          </a>
        ))}
      </div>
    );
  };

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorAlert message={error} />;
  if (!topic) return <ErrorAlert message={t('community.discussion.not_found')} />;

  // Organize posts into threads
  const rootPosts = posts.filter(p => !p.parent_id);
  const childrenMap: Record<string, ForumPost[]> = {};
  posts.forEach(p => {
    if (p.parent_id) {
      if (!childrenMap[p.parent_id]) childrenMap[p.parent_id] = [];
      childrenMap[p.parent_id].push(p);
    }
  });

  return (
    <div className={`${embedded ? '' : 'min-h-screen bg-gray-50/30'} pb-12`}>
      <div className={`${embedded ? '' : 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'} py-8`}>
        
        {/* Navigation / Breadcrumbs */}
        <div className="mb-8">
          <button 
            onClick={() => navigate(-1)} 
            className="flex items-center text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            {t('common.back')}
          </button>
          <nav className="flex items-center text-sm text-gray-500">
            <span>{t('community.title')}</span>
            <span className="mx-2">/</span>
            <span>{t('community.forums')}</span>
            <span className="mx-2">/</span>
            <span className="font-medium text-gray-900 truncate max-w-md">{topic.title}</span>
          </nav>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Main Content */}
          <div className="lg:col-span-8 space-y-8">
            
            {/* Topic Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-6 sm:p-8">
                {/* Topic Header */}
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-lg">
                      {topic.author_name ? topic.author_name.charAt(0).toUpperCase() : <User className="h-6 w-6" />}
                    </div>
                    <div>
                      <h1 className="text-2xl font-bold text-gray-900 leading-tight mb-1">{topic.title}</h1>
                      <div className="flex items-center gap-3 text-sm text-gray-500">
                        <span className="font-medium text-gray-900">{topic.author_name || 'Unknown Author'}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          {new Date(topic.created_at).toLocaleDateString()}
                        </span>
                        {topic.is_pinned && (
                          <span className="flex items-center gap-1 text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full text-xs font-medium">
                            <Pin className="h-3 w-3" /> {t('community.pinned')}
                          </span>
                        )}
                        {topic.is_locked && (
                          <span className="flex items-center gap-1 text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full text-xs font-medium">
                            <Lock className="h-3 w-3" /> {t('community.locked')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Context Menu (Optional) */}
                  <button className="text-gray-400 hover:text-gray-600 p-1">
                    <MoreVertical className="h-5 w-5" />
                  </button>
                </div>

                {/* Topic Body */}
                <div className="prose prose-indigo max-w-none text-gray-800 leading-relaxed mb-6">
                  <div dangerouslySetInnerHTML={{ __html: topic.content || '' }} />
                </div>

                {renderAttachments(topic.attachments)}

                {/* Tags */}
                {topic.tags && topic.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-6">
                    {topic.tags.map((tag: string) => (
                      <span key={tag} className="px-2.5 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-600">
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Topic Actions Footer */}
              <div className="bg-gray-50 px-6 py-4 border-t border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-6">
                  <button
                    onClick={handleLikeTopic}
                    disabled={likedTopic}
                    className={`flex items-center gap-2 text-sm font-medium transition-colors ${
                      likedTopic ? 'text-rose-600' : 'text-gray-500 hover:text-rose-600'
                    }`}
                  >
                    <Heart className={`h-5 w-5 ${likedTopic ? 'fill-current' : ''}`} />
                    <span>{likes}</span>
                  </button>
                  
                  <div className="flex items-center gap-2 text-sm font-medium text-gray-500">
                    <MessageSquare className="h-5 w-5" />
                    <span>{posts.length}</span>
                  </div>

                  <div className="flex items-center gap-2 text-sm font-medium text-gray-500" title="Views">
                    <Eye className="h-5 w-5" />
                    <span>{topic.view_count || 0}</span>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <button
                    onClick={handleShare}
                    className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-indigo-600 transition-colors"
                  >
                    {copied ? <Check className="h-5 w-5 text-green-600" /> : <Share2 className="h-5 w-5" />}
                    <span className="hidden sm:inline">{t('community.discussion.share')}</span>
                  </button>
                  
                  <button
                    onClick={() => setReportOpen(true)}
                    className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-rose-600 transition-colors"
                  >
                    <Flag className="h-5 w-5" />
                    <span className="hidden sm:inline">{t('community.discussion.report')}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Replies Section */}
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-gray-900">
                  {t('community.discussion.replies_count', { count: posts.length })}
                </h2>
                {/* Sort Dropdown could go here */}
              </div>

              {/* Reply Input */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
                {replyParentId && (
                  <div className="flex items-center justify-between bg-indigo-50 px-4 py-2 rounded-lg mb-4 text-sm text-indigo-900 border border-indigo-100">
                    <span className="font-medium">
                      {t('community.discussion.replying_to')}
                    </span>
                    <button onClick={() => setReplyParentId(null)} className="text-indigo-600 hover:text-indigo-800">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}
                
                <div className="flex gap-4">
                  <div className="flex-shrink-0 hidden sm:block">
                    <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 font-bold border border-gray-200">
                      {user?.firstName?.charAt(0) || 'U'}
                    </div>
                  </div>
                  <div className="flex-1">
                    <textarea
                      value={replyContent}
                      onChange={(e) => setReplyContent(e.target.value)}
                      placeholder={t('community.discussion.reply_placeholder')}
                      className="w-full min-h-[100px] p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-y text-gray-900 text-sm mb-3"
                    />
                    <div className="flex justify-end">
                      <button
                        onClick={handlePostReply}
                        disabled={!replyContent.trim() || replying}
                        className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-white font-medium text-sm shadow-sm hover:shadow transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{ backgroundColor: brandColors.primaryHex }}
                      >
                        {replying ? (
                          <LoadingSpinner size="sm" color="white" />
                        ) : (
                          <>
                            <Send className="h-4 w-4" />
                            {t('community.discussion.post_reply')}
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Reply List */}
              <div className="space-y-6">
                {rootPosts.length === 0 ? (
                  <div className="text-center py-12 bg-white rounded-xl border border-gray-200 border-dashed">
                    <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 font-medium">{t('community.discussion.no_replies')}</p>
                    <p className="text-sm text-gray-400">{t('community.discussion.be_first')}</p>
                  </div>
                ) : (
                  rootPosts.map((post) => (
                    <div key={post.id} className="bg-white rounded-xl border border-gray-200 p-6">
                      <div className="flex items-start gap-4">
                        <div className="h-10 w-10 rounded-full bg-gray-100 flex-shrink-0 flex items-center justify-center text-gray-600 font-bold text-sm">
                          {post.author_name ? post.author_name.charAt(0).toUpperCase() : 'U'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-bold text-gray-900 text-sm">{post.author_name || 'Member'}</h4>
                            <span className="text-xs text-gray-500">{new Date(post.created_at).toLocaleString()}</span>
                          </div>

                          <div className="text-gray-800 text-sm leading-relaxed mb-3 whitespace-pre-wrap">
                            {post.content}
                          </div>
                          
                          {renderAttachments(post.attachments)}

                          <div className="flex items-center gap-4 mt-3">
                            <button
                              onClick={() => handleLikeReply(post.id)}
                              className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${
                                likedReplies.has(String(post.id)) ? 'text-rose-600' : 'text-gray-500 hover:text-rose-600'
                              }`}
                            >
                              <Heart className={`h-4 w-4 ${likedReplies.has(String(post.id)) ? 'fill-current' : ''}`} />
                              {post.like_count || 0}
                            </button>
                            <button
                              onClick={() => {
                                setReplyParentId(post.id);
                                window.scrollTo({ top: 400, behavior: 'smooth' });
                              }}
                              className="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-indigo-600 transition-colors"
                            >
                              <MessageSquare className="h-4 w-4" />
                              {t('community.discussion.reply')}
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Threaded Replies */}
                      {childrenMap[post.id] && (
                        <div className="mt-6 pl-14 space-y-6 border-l-2 border-gray-100">
                          {childrenMap[post.id].map((child: any) => (
                            <div key={child.id} className="pl-6 relative">
                              {/* Horizontal connector */}
                              <div className="absolute left-0 top-5 w-4 h-0.5 bg-gray-100"></div>
                              
                              <div className="flex items-start gap-3">
                                <div className="h-8 w-8 rounded-full bg-gray-50 border border-gray-200 flex-shrink-0 flex items-center justify-center text-gray-500 font-bold text-xs">
                                  {child.author_name ? child.author_name.charAt(0).toUpperCase() : 'U'}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between mb-1">
                                    <h5 className="font-bold text-gray-900 text-xs">{child.author_name || 'Member'}</h5>
                                    <span className="text-[10px] text-gray-400">{new Date(child.created_at).toLocaleDateString()}</span>
                                  </div>
                                  <div className="text-gray-700 text-sm leading-relaxed mb-2">
                                    {child.content}
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <button
                                      onClick={() => handleLikeReply(child.id)}
                                      className={`flex items-center gap-1 text-xs font-medium transition-colors ${
                                        likedReplies.has(String(child.id)) ? 'text-rose-600' : 'text-gray-400 hover:text-rose-600'
                                      }`}
                                    >
                                      <Heart className={`h-3 w-3 ${likedReplies.has(String(child.id)) ? 'fill-current' : ''}`} />
                                      {child.like_count || 0}
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-4 space-y-6">
            {/* Related Topics */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2 text-sm uppercase tracking-wider">
                <Sparkles className="h-4 w-4 text-indigo-500" />
                {t('community.discussion.related_topics')}
              </h3>
              {relatedTopics.length > 0 ? (
                <div className="space-y-3">
                  {relatedTopics.map((item) => {
                    const currentPath = window.location.pathname;
                    let link = `/forums/${item.id}/thread`;
                    // Simple path logic
                    if (currentPath.includes('/admin/')) link = `/admin/community/forums/${item.id}/thread`;
                    else if (currentPath.includes('/teacher/')) link = `/teacher/community/forums/${item.id}/thread`;
                    else if (currentPath.includes('/member/')) link = `/member/community/forums/${item.id}/thread`;

                    return (
                      <a key={item.id} href={link} className="block group p-3 rounded-lg hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-200">
                        <h4 className="text-sm font-medium text-gray-800 group-hover:text-indigo-600 transition-colors line-clamp-2 mb-1">{item.title}</h4>
                        <p className="text-xs text-gray-400">
                          {new Date(item.lastActivity).toLocaleDateString()}
                        </p>
                      </a>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-gray-500 italic">{t('community.discussion.no_related')}</p>
              )}
            </div>

            {/* Guidelines */}
            <div className="bg-indigo-50 rounded-xl border border-indigo-100 p-6">
              <h3 className="font-bold text-indigo-900 mb-4 text-sm uppercase tracking-wider flex items-center gap-2">
                <Check className="h-4 w-4" />
                {t('community.discussion.guidelines_title')}
              </h3>
              <ul className="space-y-3 text-sm text-indigo-800/80">
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 mt-1.5 rounded-full bg-indigo-400 flex-shrink-0" />
                  {t('community.discussion.guidelines_items.0')}
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 mt-1.5 rounded-full bg-indigo-400 flex-shrink-0" />
                  {t('community.discussion.guidelines_items.1')}
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 mt-1.5 rounded-full bg-indigo-400 flex-shrink-0" />
                  {t('community.discussion.guidelines_items.2')}
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Report Modal */}
      {reportOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Flag className="h-5 w-5 text-rose-500" />
                {t('community.discussion.reports.title')}
              </h3>
              <button onClick={() => setReportOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-gray-600 text-sm mb-4">
              {t('community.discussion.reports.desc')}
            </p>

            <textarea
              className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 min-h-[100px] mb-6 resize-none"
              placeholder={t('community.discussion.reports.placeholder')}
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
            />

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setReportOpen(false)}
                className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
              >
                {t('community.discussion.reports.cancel')}
              </button>
              <button
                onClick={handleReport}
                disabled={!reportReason.trim()}
                className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-rose-600 hover:bg-rose-700 transition-colors disabled:opacity-50"
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
