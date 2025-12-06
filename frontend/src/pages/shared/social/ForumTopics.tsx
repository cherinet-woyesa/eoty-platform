import React, { useMemo, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, MessageSquare, Eye, Pin, Lock, Shield, Search } from 'lucide-react';
import { useForumTopics } from '@/hooks/useCommunity';
import { useAuth } from '@/context/AuthContext';

const ForumTopics: React.FC = () => {
  const { forumId } = useParams<{ forumId: string }>();
  const navigate = useNavigate();
  const { topics, loading, error, hasMore, loadMore } = useForumTopics(Number(forumId));
  const { hasPermission } = useAuth();
  const canCreateTopic = hasPermission('discussion:topic:create') || hasPermission('discussion:create') || hasPermission('admin');
  const [searchTerm, setSearchTerm] = useState('');

  const summary = useMemo(() => {
    const totalTopics = topics.length;
    const pinnedTopics = topics.filter(topic => topic.is_pinned).length;
    const totalReplies = topics.reduce((sum, topic) => sum + (topic.post_count || 0), 0);
    const privateTopics = topics.filter(topic => topic.is_private).length;

    return {
      totalTopics,
      pinnedTopics,
      totalReplies,
      privateTopics
    };
  }, [topics]);

  const filteredTopics = useMemo(() => {
    if (!searchTerm.trim()) {
      return topics;
    }

    const query = searchTerm.toLowerCase();
    return topics.filter(topic =>
      topic.title.toLowerCase().includes(query) ||
      topic.content?.toLowerCase().includes(query) ||
      `${topic.author_first_name} ${topic.author_last_name}`.toLowerCase().includes(query)
    );
  }, [topics, searchTerm]);

  if (loading && topics.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-stone-50 via-neutral-50 to-slate-50 py-12">
        <div className="max-w-4xl mx-auto px-4">
          <div className="animate-pulse">
            <div className="h-8 bg-stone-200 rounded w-1/3 mb-6"></div>
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-24 bg-stone-200 rounded-xl"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-stone-50 via-neutral-50 to-slate-50 py-12">
        <div className="max-w-5xl mx-auto px-4">
          <div className="bg-white/90 backdrop-blur-md rounded-2xl border border-red-200 p-6 shadow-md">
            <h2 className="text-red-800 font-semibold mb-2 flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Error Loading Topics
            </h2>
            <p className="text-red-600">{error}</p>
            <button
              onClick={() => navigate('/forums')}
              className="mt-4 inline-flex items-center gap-2 text-[#27AE60] hover:text-[#1E874B] font-medium"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Forums</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-50 via-neutral-50 to-slate-50 py-12">
      <div className="max-w-5xl mx-auto px-4">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#27AE60]/15 via-[#16A085]/15 to-[#2980B9]/15 rounded-2xl p-6 border border-[#27AE60]/25 shadow-lg mb-6">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-4">
              <button
                onClick={() => navigate('/forums')}
                className="flex items-center gap-2 px-3 py-1.5 bg-white/80 hover:bg-white rounded-lg border border-stone-200 text-stone-700 hover:text-stone-900 transition-all"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Forums
              </button>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-stone-800">Forum Topics</h1>
                <p className="text-stone-600 mt-1 max-w-2xl">Explore current conversations, pinned teachings, and questions raised by the community. Join in with thoughtful, faith-aligned contributions.</p>
              </div>
            </div>
            {canCreateTopic && (
              <Link
                to={`/forums/${forumId}/new-topic`}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#27AE60] to-[#16A085] hover:from-[#27AE60]/90 hover:to-[#16A085]/90 text-stone-900 text-sm font-semibold rounded-lg transition-all duration-200 shadow-md hover:shadow-lg"
              >
                <Plus className="h-4 w-4" />
                Start New Topic
              </Link>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-6">
            <div className="bg-white/90 backdrop-blur-sm rounded-xl border border-[#27AE60]/20 p-4 shadow-sm flex flex-col">
              <span className="text-xs uppercase tracking-wide text-stone-500">Total Topics</span>
              <span className="text-2xl font-bold text-[#27AE60] mt-1">{summary.totalTopics}</span>
              <span className="text-xs text-stone-500 mt-2">Conversations opened in this forum</span>
            </div>
            <div className="bg-white/90 backdrop-blur-sm rounded-xl border border-[#16A085]/20 p-4 shadow-sm flex flex-col">
              <span className="text-xs uppercase tracking-wide text-stone-500">Pinned Teachings</span>
              <span className="text-2xl font-bold text-[#16A085] mt-1">{summary.pinnedTopics}</span>
              <span className="text-xs text-stone-500 mt-2">Highlighted guidance from moderators</span>
            </div>
            <div className="bg-white/90 backdrop-blur-sm rounded-xl border border-[#2980B9]/20 p-4 shadow-sm flex flex-col">
              <span className="text-xs uppercase tracking-wide text-stone-500">Total Replies</span>
              <span className="text-2xl font-bold text-[#2980B9] mt-1">{summary.totalReplies}</span>
              <span className="text-xs text-stone-500 mt-2">Community engagement across topics</span>
            </div>
            <div className="bg-white/90 backdrop-blur-sm rounded-xl border border-[#8E44AD]/20 p-4 shadow-sm flex flex-col">
              <span className="text-xs uppercase tracking-wide text-stone-500">Private Threads</span>
              <span className="text-2xl font-bold text-[#8E44AD] mt-1">{summary.privateTopics}</span>
              <span className="text-xs text-stone-500 mt-2">Conversations for trusted members</span>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="bg-white/90 backdrop-blur-md rounded-2xl border border-stone-200 p-5 shadow-md mb-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-stone-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#27AE60] focus:border-[#27AE60] text-stone-700 transition-all duration-200"
                placeholder="Search topics by question, keyword, or author"
              />
            </div>
            {canCreateTopic && (
              <Link
                to={`/forums/${forumId}/new-topic`}
                className="inline-flex items-center gap-2 px-4 py-2 bg-white/90 backdrop-blur-sm border border-[#27AE60]/40 text-[#27AE60] font-medium rounded-lg hover:bg-[#27AE60]/10 transition-all"
              >
                <Plus className="h-4 w-4" />
                New Topic
              </Link>
            )}
          </div>
          {searchTerm && (
            <p className="text-xs text-stone-500 mt-2">Showing {filteredTopics.length} of {topics.length} topics</p>
          )}
        </div>

        {/* Topics List */}
        <div className="bg-white/90 backdrop-blur-md rounded-2xl border border-stone-200 overflow-hidden shadow-md">
          {filteredTopics.length > 0 ? (
            <>
              {filteredTopics.map(topic => (
                <Link
                  key={topic.id}
                  to={`/forums/${forumId}/topics/${topic.id}`}
                  className="block border-b border-stone-200 last:border-b-0 hover:bg-stone-50 transition-colors"
                >
                  <div className="p-6">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between mb-2">
                      <div className="flex items-start gap-3">
                        {topic.is_pinned && (
                          <Pin className="h-4 w-4 text-amber-500 fill-current mt-1" />
                        )}
                        {topic.is_locked && (
                          <Lock className="h-4 w-4 text-red-500 mt-1" />
                        )}
                        {topic.is_private && (
                          <Shield className="h-4 w-4 text-[#2980B9] mt-1" title="Private topic" />
                        )}
                        <div>
                          <h3 className="text-lg font-semibold text-stone-900">
                            {topic.title}
                          </h3>
                          <p className="text-sm text-stone-500 mt-1 line-clamp-2">{topic.content?.slice(0, 160) || 'Tap to read the full discussion'}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-stone-500">
                        <div className="flex items-center gap-1">
                          <MessageSquare className="h-4 w-4" />
                          <span>{topic.post_count}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Eye className="h-4 w-4" />
                          <span>{topic.view_count}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                      <div className="flex flex-wrap items-center gap-3 text-sm text-stone-600">
                        <span>By {topic.author_first_name} {topic.author_last_name}</span>
                        <span className="hidden md:block">•</span>
                        <span>{new Date(topic.created_at).toLocaleString()}</span>
                        {topic.is_private && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-[#2980B9]/10 text-[#2980B9] rounded-full">
                            <Shield className="h-3 w-3" /> Private
                          </span>
                        )}
                      </div>

                      {topic.last_activity_at && (
                        <div className="text-sm text-stone-500">
                          Last activity: {new Date(topic.last_activity_at).toLocaleString()}
                        </div>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
              
              {hasMore && (
                <div className="p-5 text-center border-t border-stone-200 bg-stone-50/60">
                  <button
                    onClick={loadMore}
                    disabled={loading}
                    className="inline-flex items-center gap-2 px-5 py-2 bg-white border border-[#27AE60]/40 text-[#27AE60] rounded-lg hover:bg-[#27AE60]/10 transition-all disabled:opacity-50"
                  >
                    {loading ? 'Loading...' : 'Load More Topics'}
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-16 bg-gradient-to-r from-stone-50 to-neutral-50">
              <div className="w-16 h-16 bg-gradient-to-r from-[#27AE60]/15 to-[#16A085]/15 rounded-full flex items-center justify-center mx-auto mb-4">
                <MessageSquare className="h-8 w-8 text-[#27AE60]" />
              </div>
              <h3 className="text-lg font-semibold text-stone-900 mb-2">
                {searchTerm ? 'No topics match your search' : 'No topics yet'}
              </h3>
              <p className="text-stone-600 mb-4">
                {searchTerm
                  ? 'Try different keywords or reset your filters.'
                  : canCreateTopic
                    ? 'Be the first to start a discussion rooted in Orthodox wisdom.'
                    : 'Invite a moderator to open the first conversation.'}
              </p>
              {canCreateTopic && (
                <Link
                  to={`/forums/${forumId}/new-topic`}
                  className="inline-flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-[#27AE60] to-[#16A085] hover:from-[#27AE60]/90 hover:to-[#16A085]/90 text-stone-900 text-sm font-semibold rounded-lg transition-all duration-200 shadow-md hover:shadow-lg"
                >
                  <Plus className="h-4 w-4" />
                  {searchTerm ? 'Start a new conversation' : 'Create First Topic'}
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForumTopics;