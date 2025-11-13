import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, MessageCircle, Users, Clock, ThumbsUp, Reply } from 'lucide-react';
import DiscussionBoard from '@/components/shared/courses/DiscussionBoard';

const DiscussionDemo: React.FC = () => {
  const [currentTimestamp, setCurrentTimestamp] = useState<number>(0);

  const handleTimestampClick = (timestamp: number) => {
    setCurrentTimestamp(timestamp);
    console.log('Jumping to timestamp:', timestamp);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link 
            to="/courses" 
            className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Courses
          </Link>
          
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Discussion Board Demo</h1>
          <p className="text-gray-600">
            Experience interactive lesson discussions with threaded comments, video timestamps, and community moderation.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Discussion Board */}
          <div className="lg:col-span-2">
            <DiscussionBoard
              lessonId={1}
              onTimestampClick={handleTimestampClick}
              showVideoTimestamp={true}
            />
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Video Player Mock */}
            <div className="bg-gray-900 rounded-lg p-4">
              <h3 className="text-white font-semibold mb-3">Video Player</h3>
              <div className="bg-gray-800 rounded-lg h-48 flex items-center justify-center mb-3">
                <div className="text-center text-gray-400">
                  <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-2">
                    <MessageCircle className="h-8 w-8" />
                  </div>
                  <p className="text-sm">Video Player</p>
                  <p className="text-xs">Current: {Math.floor(currentTimestamp / 60)}:{(currentTimestamp % 60).toString().padStart(2, '0')}</p>
                </div>
              </div>
              <div className="text-xs text-gray-400">
                Click discussion timestamps to jump to specific moments
              </div>
            </div>

            {/* Discussion Stats */}
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                <MessageCircle className="h-4 w-4 mr-2 text-blue-600" />
                Discussion Stats
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Total Comments</span>
                  <span className="font-semibold text-gray-900">Loading...</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Active Users</span>
                  <span className="font-semibold text-gray-900">Loading...</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Pinned Posts</span>
                  <span className="font-semibold text-gray-900">Loading...</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Total Likes</span>
                  <span className="font-semibold text-gray-900">Loading...</span>
                </div>
              </div>
            </div>

            {/* Features List */}
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h3 className="font-semibold text-gray-900 mb-3">Discussion Features</h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-start space-x-2">
                  <div className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-blue-600 text-xs font-semibold">1</span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Threaded Discussions</p>
                    <p className="text-gray-600 text-xs">Nested replies and conversations</p>
                  </div>
                </div>

                <div className="flex items-start space-x-2">
                  <div className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-blue-600 text-xs font-semibold">2</span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Video Timestamps</p>
                    <p className="text-gray-600 text-xs">Link comments to specific moments</p>
                  </div>
                </div>

                <div className="flex items-start space-x-2">
                  <div className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-blue-600 text-xs font-semibold">3</span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Community Moderation</p>
                    <p className="text-gray-600 text-xs">Like, flag, and report system</p>
                  </div>
                </div>

                <div className="flex items-start space-x-2">
                  <div className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-blue-600 text-xs font-semibold">4</span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Real-time Updates</p>
                    <p className="text-gray-600 text-xs">Live discussion updates</p>
                  </div>
                </div>

                <div className="flex items-start space-x-2">
                  <div className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-blue-600 text-xs font-semibold">5</span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Smart Sorting</p>
                    <p className="text-gray-600 text-xs">Filter by newest, oldest, most liked</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200 p-4">
              <h3 className="font-semibold text-gray-900 mb-3">Quick Actions</h3>
              <div className="space-y-2">
                <button className="w-full text-left p-2 rounded-lg hover:bg-blue-100 transition-colors text-sm">
                  <Users className="h-4 w-4 inline mr-2" />
                  View All Participants
                </button>
                <button className="w-full text-left p-2 rounded-lg hover:bg-blue-100 transition-colors text-sm">
                  <Clock className="h-4 w-4 inline mr-2" />
                  Jump to Recent Activity
                </button>
                <button className="w-full text-left p-2 rounded-lg hover:bg-blue-100 transition-colors text-sm">
                  <ThumbsUp className="h-4 w-4 inline mr-2" />
                  View Most Liked Posts
                </button>
                <button className="w-full text-left p-2 rounded-lg hover:bg-blue-100 transition-colors text-sm">
                  <Reply className="h-4 w-4 inline mr-2" />
                  My Replies
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DiscussionDemo;
