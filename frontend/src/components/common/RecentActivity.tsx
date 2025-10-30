import React, { useMemo } from 'react';
import { 
  BookOpen, Video, MessageCircle, Award, 
  Users, CheckCircle, Clock, Zap,
  FileText, Star, ThumbsUp, TrendingUp, Target
} from 'lucide-react';

interface Activity {
  id: string;
  type: 'course_started' | 'lesson_completed' | 'achievement_earned' | 
        'discussion_post' | 'course_created' | 'student_enrolled' |
        'video_uploaded' | 'review_received' | 'goal_achieved';
  title: string;
  description: string;
  timestamp: Date;
  user?: {
    name: string;
    avatar?: string;
  };
  metadata?: {
    courseTitle?: string;
    points?: number;
    rating?: number;
    lessonCount?: number;
  };
  read: boolean;
}

interface RecentActivityProps {
  activities: Activity[];
  compact?: boolean;
  maxItems?: number;
}

const RecentActivity: React.FC<RecentActivityProps> = ({ 
  activities, 
  compact = false,
  maxItems = 5 
}) => {
  const sortedActivities = useMemo(() => {
    return [...activities]
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, maxItems);
  }, [activities, maxItems]);

  const getActivityIcon = (type: Activity['type']) => {
    switch (type) {
      case 'course_started':
        return <BookOpen className="h-4 w-4 text-blue-500" />;
      case 'lesson_completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'achievement_earned':
        return <Award className="h-4 w-4 text-yellow-500" />;
      case 'discussion_post':
        return <MessageCircle className="h-4 w-4 text-purple-500" />;
      case 'course_created':
        return <Video className="h-4 w-4 text-red-500" />;
      case 'student_enrolled':
        return <Users className="h-4 w-4 text-green-500" />;
      case 'video_uploaded':
        return <FileText className="h-4 w-4 text-orange-500" />;
      case 'review_received':
        return <Star className="h-4 w-4 text-yellow-500" />;
      case 'goal_achieved':
        return <Target className="h-4 w-4 text-indigo-500" />;
      default:
        return <Zap className="h-4 w-4 text-gray-500" />;
    }
  };

  const getActivityColor = (type: Activity['type']) => {
    switch (type) {
      case 'course_started':
        return 'bg-blue-50 border-blue-200';
      case 'lesson_completed':
        return 'bg-green-50 border-green-200';
      case 'achievement_earned':
        return 'bg-yellow-50 border-yellow-200';
      case 'discussion_post':
        return 'bg-purple-50 border-purple-200';
      case 'course_created':
        return 'bg-red-50 border-red-200';
      case 'student_enrolled':
        return 'bg-green-50 border-green-200';
      case 'video_uploaded':
        return 'bg-orange-50 border-orange-200';
      case 'review_received':
        return 'bg-yellow-50 border-yellow-200';
      case 'goal_achieved':
        return 'bg-indigo-50 border-indigo-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const formatTimeAgo = (timestamp: Date) => {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
    return timestamp.toLocaleDateString();
  };

  const getActivityMessage = (activity: Activity) => {
    const base = activity.description;
    if (activity.metadata?.courseTitle) {
      return `${base} in ${activity.metadata.courseTitle}`;
    }
    if (activity.metadata?.points) {
      return `${base} (+${activity.metadata.points} points)`;
    }
    if (activity.metadata?.rating) {
      return `${base} (${activity.metadata.rating}★)`;
    }
    return base;
  };

  if (compact) {
    return (
      <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Zap className="h-5 w-5 mr-2 text-blue-500" />
          Recent Activity
        </h3>
        
        <div className="space-y-3">
          {sortedActivities.map((activity) => (
            <div
              key={activity.id}
              className={`flex items-start space-x-3 p-2 rounded-lg border-l-4 transition-all duration-150 ${
                getActivityColor(activity.type)
              } ${!activity.read ? 'border-l-2' : 'border-l-0'}`}
            >
              <div className="flex-shrink-0 mt-0.5">
                {getActivityIcon(activity.type)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">
                  {getActivityMessage(activity)}
                </p>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-xs text-gray-500">
                    {formatTimeAgo(activity.timestamp)}
                  </span>
                  {activity.user && (
                    <span className="text-xs text-gray-400">
                      by {activity.user.name}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {sortedActivities.length === 0 && (
          <div className="text-center py-4">
            <Zap className="h-8 w-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No recent activity</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
          <TrendingUp className="h-5 w-5 mr-2 text-blue-500" />
          Recent Activity
        </h3>
        <div className="text-sm text-gray-500">
          {sortedActivities.length} activities
        </div>
      </div>

      <div className="space-y-4">
        {sortedActivities.map((activity) => (
          <div
            key={activity.id}
            className={`flex items-start space-x-4 p-4 rounded-xl border transition-all duration-150 hover:shadow-sm ${
              getActivityColor(activity.type)
            } ${!activity.read ? 'border-l-4' : ''}`}
          >
            {/* Icon */}
            <div className="flex-shrink-0">
              <div className="w-10 h-10 rounded-lg bg-white border flex items-center justify-center shadow-sm">
                {getActivityIcon(activity.type)}
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-semibold text-gray-900 text-sm">
                    {activity.title}
                  </h4>
                  <p className="text-gray-600 text-sm mt-1">
                    {getActivityMessage(activity)}
                  </p>
                </div>
                {!activity.read && (
                  <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1.5"></div>
                )}
              </div>

              {/* Metadata */}
              {activity.metadata && (
                <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                  {activity.metadata.lessonCount && (
                    <div className="flex items-center space-x-1">
                      <BookOpen className="h-3 w-3" />
                      <span>{activity.metadata.lessonCount} lessons</span>
                    </div>
                  )}
                  {activity.metadata.rating && (
                    <div className="flex items-center space-x-1">
                      <Star className="h-3 w-3 text-yellow-500" />
                      <span>{activity.metadata.rating}/5</span>
                    </div>
                  )}
                  {activity.metadata.points && (
                    <div className="flex items-center space-x-1">
                      <Award className="h-3 w-3 text-yellow-500" />
                      <span>+{activity.metadata.points} pts</span>
                    </div>
                  )}
                </div>
              )}

              {/* Footer */}
              <div className="flex items-center justify-between mt-3">
                <div className="flex items-center space-x-2">
                  {activity.user && (
                    <>
                      {activity.user.avatar ? (
                        <img
                          src={activity.user.avatar}
                          alt={activity.user.name}
                          className="w-5 h-5 rounded-full"
                        />
                      ) : (
                        <div className="w-5 h-5 bg-gray-300 rounded-full flex items-center justify-center text-xs text-white">
                          {activity.user.name.charAt(0)}
                        </div>
                      )}
                      <span className="text-xs text-gray-500">{activity.user.name}</span>
                    </>
                  )}
                </div>
                <span className="text-xs text-gray-400">
                  {formatTimeAgo(activity.timestamp)}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {sortedActivities.length === 0 && (
        <div className="text-center py-8">
          <TrendingUp className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h4 className="text-lg font-semibold text-gray-900 mb-2">No activity yet</h4>
          <p className="text-gray-600 text-sm">
            Your recent activities will appear here
          </p>
        </div>
      )}

      {/* View All Link */}
      {sortedActivities.length > 0 && (
        <div className="mt-6 pt-4 border-t border-gray-100">
          <button className="w-full text-center text-sm text-blue-600 hover:text-blue-700 font-medium">
            View All Activity
          </button>
        </div>
      )}
    </div>
  );
};

export default React.memo(RecentActivity);