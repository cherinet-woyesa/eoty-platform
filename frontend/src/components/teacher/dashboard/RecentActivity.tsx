import React, { useMemo } from 'react';
import { 
  BookOpen, Video, MessageCircle, Award, 
  Users, CheckCircle, Clock, Zap,
  FileText, Star, ThumbsUp, TrendingUp,
  Eye, Download, Upload
} from 'lucide-react';

interface Activity {
  id: string;
  type: 'course_created' | 'lesson_uploaded' | 'student_enrolled' | 
        'course_completed' | 'review_received' | 'assignment_submitted' |
        'video_uploaded' | 'resource_uploaded' | 'student_progress' |
        'certificate_issued' | 'discussion_replied' | 'course_updated';
  title: string;
  description: string;
  timestamp: Date;
  user?: {
    name: string;
    avatar?: string;
    role?: string;
  };
  metadata?: {
    courseTitle?: string;
    studentCount?: number;
    rating?: number;
    progress?: number;
    fileName?: string;
    fileSize?: string;
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
      case 'course_created':
        return <BookOpen className="h-4 w-4 text-blue-500" />;
      case 'lesson_uploaded':
        return <Video className="h-4 w-4 text-red-500" />;
      case 'student_enrolled':
        return <Users className="h-4 w-4 text-green-500" />;
      case 'course_completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'review_received':
        return <Star className="h-4 w-4 text-yellow-500" />;
      case 'assignment_submitted':
        return <FileText className="h-4 w-4 text-purple-500" />;
      case 'video_uploaded':
        return <Video className="h-4 w-4 text-orange-500" />;
      case 'resource_uploaded':
        return <Upload className="h-4 w-4 text-indigo-500" />;
      case 'student_progress':
        return <TrendingUp className="h-4 w-4 text-teal-500" />;
      case 'certificate_issued':
        return <Award className="h-4 w-4 text-amber-500" />;
      case 'discussion_replied':
        return <MessageCircle className="h-4 w-4 text-pink-500" />;
      case 'course_updated':
        return <BookOpen className="h-4 w-4 text-cyan-500" />;
      default:
        return <Zap className="h-4 w-4 text-gray-500" />;
    }
  };

  const getActivityColor = (type: Activity['type']) => {
    switch (type) {
      case 'course_created':
        return 'bg-blue-50 border-blue-200';
      case 'lesson_uploaded':
        return 'bg-red-50 border-red-200';
      case 'student_enrolled':
        return 'bg-green-50 border-green-200';
      case 'course_completed':
        return 'bg-green-50 border-green-200';
      case 'review_received':
        return 'bg-yellow-50 border-yellow-200';
      case 'assignment_submitted':
        return 'bg-purple-50 border-purple-200';
      case 'video_uploaded':
        return 'bg-orange-50 border-orange-200';
      case 'resource_uploaded':
        return 'bg-indigo-50 border-indigo-200';
      case 'student_progress':
        return 'bg-teal-50 border-teal-200';
      case 'certificate_issued':
        return 'bg-amber-50 border-amber-200';
      case 'discussion_replied':
        return 'bg-pink-50 border-pink-200';
      case 'course_updated':
        return 'bg-cyan-50 border-cyan-200';
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
    if (activity.metadata?.studentCount) {
      return `${base} (${activity.metadata.studentCount} students)`;
    }
    if (activity.metadata?.rating) {
      return `${base} (${activity.metadata.rating}★)`;
    }
    if (activity.metadata?.progress) {
      return `${base} (${activity.metadata.progress}% complete)`;
    }
    if (activity.metadata?.fileName) {
      return `${base}: ${activity.metadata.fileName}`;
    }
    
    return base;
  };

  if (compact) {
    return (
      <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <TrendingUp className="h-5 w-5 mr-2 text-blue-500" />
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
            <TrendingUp className="h-8 w-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No recent activity</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Recent Activity</h2>
          <p className="text-gray-600 mt-1">Latest updates from your teaching activities</p>
        </div>
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
                  {activity.metadata.studentCount && (
                    <div className="flex items-center space-x-1">
                      <Users className="h-3 w-3" />
                      <span>{activity.metadata.studentCount} students</span>
                    </div>
                  )}
                  {activity.metadata.rating && (
                    <div className="flex items-center space-x-1">
                      <Star className="h-3 w-3 text-yellow-500" />
                      <span>{activity.metadata.rating}/5</span>
                    </div>
                  )}
                  {activity.metadata.progress && (
                    <div className="flex items-center space-x-1">
                      <TrendingUp className="h-3 w-3 text-green-500" />
                      <span>{activity.metadata.progress}% progress</span>
                    </div>
                  )}
                  {activity.metadata.fileName && (
                    <div className="flex items-center space-x-1">
                      <FileText className="h-3 w-3" />
                      <span>{activity.metadata.fileName}</span>
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
                      <div>
                        <span className="text-xs text-gray-500">{activity.user.name}</span>
                        {activity.user.role && (
                          <span className="text-xs text-gray-400 ml-1">• {activity.user.role}</span>
                        )}
                      </div>
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
            Your teaching activities will appear here as you create courses and interact with students.
          </p>
        </div>
      )}

      {/* Quick Actions */}
      <div className="mt-6 grid grid-cols-2 gap-3">
        <button className="flex items-center justify-center space-x-2 px-3 py-2 bg-blue-50 text-blue-700 rounded-lg border border-blue-200 hover:bg-blue-100 transition-colors">
          <Download className="h-4 w-4" />
          <span className="text-sm font-medium">Export Data</span>
        </button>
        <button className="flex items-center justify-center space-x-2 px-3 py-2 bg-gray-50 text-gray-700 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors">
          <Eye className="h-4 w-4" />
          <span className="text-sm font-medium">View All</span>
        </button>
      </div>
    </div>
  );
};

export default React.memo(RecentActivity);