import React, { useMemo, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, MessageSquare, Eye, Pin, Lock, Shield, Search, Heart, Calendar, User } from 'lucide-react';
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
      <div className="min-h-screen bg-gray-50/30 py-12">
        <div className="max-w-5xl mx-auto px-4">
          <div className="animate-pulse space-y-6">
            <div className="h-32 bg-gray-200 rounded-2xl w-full"></div>
            <div className="grid grid-cols-1 gap-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-40 bg-gray-200 rounded-xl"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50/30 py-12">
        <div className="max-w-5xl mx-auto px-4">
          <div className="bg-white rounded-2xl border border-red-100 p-8 shadow-sm text-center">
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <MessageSquare className="h-8 w-8 text-red-500" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Unable to load topics</h2>
            <p className="text-gray-500 mb-6">{error}</p>
            <button
              onClick={() => navigate('/forums')}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-white border border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-all shadow-sm"
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
    <div className="min-h-screen bg-gray-50/30 py-12">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/forums')}
            className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors mb-6"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Forums
          </button>
          
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Forum Topics</h1>
              <p className="text-gray-500 mt-2 max-w-2xl text-lg">Join the conversation, share your thoughts, and connect with the community.</p>
            </div>
            {canCreateTopic && (
              <Link
                to={`/forums/${forumId}/new-topic`}
                className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all shadow-md hover:shadow-lg transform active:scale-95"
              >
                <Plus className="h-5 w-5" />
                Start New Topic
              </Link>
            )}
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="bg-white rounded-2xl border border-gray-200 p-2 shadow-sm mb-8 flex items-center gap-2 sticky top-4 z-10">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-transparent border-none focus:ring-0 text-gray-900 placeholder-gray-400 text-base"
              placeholder="Search discussions..."
            />
          </div>
          {/* Add Filter Dropdown here if needed */}
        </div>

        {/* Topics List */}
        <div className="space-y-4">
          {filteredTopics.length > 0 ? (
            <>
              {filteredTopics.map(topic => (
                <Link
                  key={topic.id}
                  to={`/forums/${forumId}/topics/${topic.id}`}
                  className="group block bg-white rounded-2xl border border-gray-200 p-6 hover:border-indigo-300 hover:shadow-md transition-all duration-200 relative overflow-hidden"
                >
                  {/* Left accent border on hover */}
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>

                  <div className="flex flex-col md:flex-row gap-6">
                    {/* Main Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          {topic.is_pinned && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 text-xs font-bold uppercase tracking-wide border border-amber-100">
                              <Pin className="h-3 w-3 fill-current" /> Pinned
                            </span>
                          )}
                          {topic.is_locked && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-gray-100 text-gray-600 text-xs font-bold uppercase tracking-wide border border-gray-200">
                              <Lock className="h-3 w-3" /> Locked
                            </span>
                          )}
                          {topic.is_private && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 text-xs font-bold uppercase tracking-wide border border-indigo-100">
                              <Shield className="h-3 w-3" /> Private
                            </span>
                          )}
                        </div>
                        <span className="text-xs font-medium text-gray-400 whitespace-nowrap flex-shrink-0">
                          {new Date(topic.created_at).toLocaleDateString()}
                        </span>
                      </div>

                      <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-indigo-600 transition-colors line-clamp-1">
                        {topic.title}
                      </h3>
                      
                      {/* Optional: Truncated content or just hide it for cleaner look as requested */}
                      {/* <p className="text-gray-500 text-sm line-clamp-2 mb-4 leading-relaxed">
                        {topic.content?.replace(/<[^>]*>/g, '').slice(0, 160) || 'No preview available'}
                      </p> */}

                      <div className="flex items-center gap-2 mt-4">
                        <div className="h-6 w-6 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-600">
                          {topic.author_first_name ? topic.author_first_name.charAt(0) : <User className="h-3 w-3" />}
                        </div>
                        <span className="text-sm font-medium text-gray-600">
                          {topic.author_first_name} {topic.author_last_name}
                        </span>
                      </div>
                    </div>

                    {/* Stats Column */}
                    <div className="flex md:flex-col items-center md:items-end justify-between md:justify-center gap-4 md:gap-2 md:border-l md:border-gray-100 md:pl-6 min-w-[100px]">
                      <div className="flex items-center gap-2 text-gray-500" title="Replies">
                        <MessageSquare className="h-4 w-4" />
                        <span className="font-semibold text-sm">{topic.post_count || 0}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-500" title="Views">
                        <Eye className="h-4 w-4" />
                        <span className="font-semibold text-sm">{topic.view_count || 0}</span>
                      </div>
                      {/* Assuming like_count is available on topic object, if not it will be 0/undefined */}
                      <div className="flex items-center gap-2 text-gray-500" title="Likes">
                        <Heart className="h-4 w-4" />
                        <span className="font-semibold text-sm">{topic.like_count || 0}</span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
              
              {hasMore && (
                <div className="pt-8 text-center">
                  <button
                    onClick={loadMore}
                    disabled={loading}
                    className="inline-flex items-center gap-2 px-8 py-3 bg-white border border-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all disabled:opacity-50 shadow-sm"
                  >
                    {loading ? 'Loading...' : 'Load More Topics'}
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-20 bg-white rounded-3xl border border-gray-200 border-dashed">
              <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <MessageSquare className="h-10 w-10 text-gray-300" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                {searchTerm ? 'No topics found' : 'No topics yet'}
              </h3>
              <p className="text-gray-500 mb-8 max-w-md mx-auto">
                {searchTerm
                  ? 'Try adjusting your search terms or filters.'
                  : 'Be the first to start a conversation in this forum.'}
              </p>
              {canCreateTopic && (
                <Link
                  to={`/forums/${forumId}/new-topic`}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all shadow-md hover:shadow-lg"
                >
                  <Plus className="h-5 w-5" />
                  {searchTerm ? 'Start New Topic' : 'Create First Topic'}
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
