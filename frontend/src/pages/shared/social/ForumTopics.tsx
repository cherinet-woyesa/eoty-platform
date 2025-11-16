import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, MessageSquare, Eye, Pin, Lock, Shield } from 'lucide-react';
import { useForumTopics } from '@/hooks/useCommunity';
import { useAuth } from '@/context/AuthContext';

const ForumTopics: React.FC = () => {
  const { forumId } = useParams<{ forumId: string }>();
  const navigate = useNavigate();
  const { topics, loading, error, hasMore, loadMore } = useForumTopics(Number(forumId));
  const { hasPermission } = useAuth();

  if (loading && topics.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-20 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h2 className="text-red-800 font-semibold mb-2">Error Loading Topics</h2>
            <p className="text-red-600">{error}</p>
            <button
              onClick={() => navigate('/forums')}
              className="mt-4 flex items-center space-x-2 text-blue-600 hover:text-blue-700"
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
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/forums')}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-800"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Forums</span>
            </button>
          </div>
          
          <Link
            to={`/forums/${forumId}/new-topic`}
            className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>New Topic</span>
          </Link>
        </div>

        {/* Topics List */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {topics.length > 0 ? (
            <>
              {topics.map(topic => (
                <Link
                  key={topic.id}
                  to={`/forums/topics/${topic.id}`}
                  className="block border-b border-gray-200 last:border-b-0 hover:bg-gray-50 transition-colors"
                >
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center space-x-3">
                        {topic.is_pinned && (
                          <Pin className="h-4 w-4 text-yellow-500 fill-current" />
                        )}
                        {topic.is_locked && (
                          <Lock className="h-4 w-4 text-red-500" />
                        )}
                        {topic.is_private && (
                          <Shield className="h-4 w-4 text-blue-500" title="Private topic" />
                        )}
                        <h3 className="text-lg font-semibold text-gray-900">
                          {topic.title}
                        </h3>
                      </div>
                      
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <div className="flex items-center space-x-1">
                          <MessageSquare className="h-4 w-4" />
                          <span>{topic.post_count}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Eye className="h-4 w-4" />
                          <span>{topic.view_count}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4 text-sm text-gray-600">
                        <span>
                          By {topic.author_first_name} {topic.author_last_name}
                        </span>
                        <span>•</span>
                        <span>
                          {new Date(topic.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      
                      {topic.last_post_at && (
                        <div className="text-sm text-gray-500">
                          Last activity: {new Date(topic.last_activity_at).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
              
              {hasMore && (
                <div className="p-4 text-center border-t border-gray-200">
                  <button
                    onClick={loadMore}
                    disabled={loading}
                    className="bg-gray-100 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
                  >
                    {loading ? 'Loading...' : 'Load More Topics'}
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12">
              <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No topics yet</h3>
              <p className="text-gray-600 mb-4">Be the first to start a discussion!</p>
              <Link
                to={`/forums/${forumId}/new-topic`}
                className="inline-flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="h-4 w-4" />
                <span>Create First Topic</span>
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForumTopics;