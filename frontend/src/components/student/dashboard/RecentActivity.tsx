import React, { useMemo, useState, useCallback } from 'react';
import { 
  BookOpen, Video, MessageCircle, Award, 
  Users, CheckCircle, Clock, Zap,
  FileText, Star, Target, TrendingUp,
  PlayCircle, Bookmark, GraduationCap,
  Filter, Search, Download, Share2,
  Eye, EyeOff, MoreVertical, ThumbsUp,
  MessageSquare, ExternalLink, Calendar
} from 'lucide-react';

interface Activity {
  id: string;
  type: 'lesson_started' | 'lesson_completed' | 'course_enrolled' | 
        'achievement_earned' | 'discussion_posted' | 'quiz_completed' |
        'bookmark_added' | 'goal_achieved' | 'streak_milestone' |
        'certificate_earned' | 'study_group_joined' | 'resource_downloaded';
  title: string;
  description: string;
  timestamp: Date;
  metadata?: {
    courseTitle?: string;
    points?: number;
    rating?: number;
    lessonCount?: number;
    streakDays?: number;
    progress?: number;
    fileName?: string;
    quizScore?: number;
    comments?: number;
    likes?: number;
    duration?: number;
  };
  read: boolean;
  importance?: 'low' | 'medium' | 'high';
  category?: 'learning' | 'social' | 'achievement' | 'system';
}

interface RecentActivityProps {
  activities: Activity[];
  compact?: boolean;
  maxItems?: number;
  onActivityAction?: (activityId: string, action: string) => void;
  onMarkAllRead?: () => void;
}

const RecentActivity: React.FC<RecentActivityProps> = ({ 
  activities, 
  compact = false,
  maxItems = 10,
  onActivityAction,
  onMarkAllRead
}) => {
  const [filterType, setFilterType] = useState<'all' | Activity['type']>('all');
  const [filterCategory, setFilterCategory] = useState<'all' | Activity['category']>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<string | null>(null);

  const filteredActivities = useMemo(() => {
    let filtered = activities;

    // Filter by type
    if (filterType !== 'all') {
      filtered = filtered.filter(activity => activity.type === filterType);
    }

    // Filter by category
    if (filterCategory !== 'all') {
      filtered = filtered.filter(activity => activity.category === filterCategory);
    }

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(activity =>
        activity.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        activity.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        activity.metadata?.courseTitle?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filter unread only
    if (showUnreadOnly) {
      filtered = filtered.filter(activity => !activity.read);
    }

    // Sort by timestamp (newest first)
    return filtered
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, maxItems);
  }, [activities, filterType, filterCategory, searchQuery, showUnreadOnly, maxItems]);

  const getActivityIcon = (type: Activity['type']) => {
    switch (type) {
      case 'lesson_started':
        return <PlayCircle className="h-4 w-4 text-blue-500" />;
      case 'lesson_completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'course_enrolled':
        return <BookOpen className="h-4 w-4 text-purple-500" />;
      case 'achievement_earned':
        return <Award className="h-4 w-4 text-yellow-500" />;
      case 'discussion_posted':
        return <MessageCircle className="h-4 w-4 text-indigo-500" />;
      case 'quiz_completed':
        return <FileText className="h-4 w-4 text-orange-500" />;
      case 'bookmark_added':
        return <Bookmark className="h-4 w-4 text-pink-500" />;
      case 'goal_achieved':
        return <Target className="h-4 w-4 text-teal-500" />;
      case 'streak_milestone':
        return <Zap className="h-4 w-4 text-amber-500" />;
      case 'certificate_earned':
        return <GraduationCap className="h-4 w-4 text-emerald-500" />;
      case 'study_group_joined':
        return <Users className="h-4 w-4 text-cyan-500" />;
      case 'resource_downloaded':
        return <Download className="h-4 w-4 text-gray-500" />;
      default:
        return <TrendingUp className="h-4 w-4 text-gray-500" />;
    }
  };

  const getActivityColor = (type: Activity['type']) => {
    switch (type) {
      case 'lesson_started':
        return 'bg-blue-50 border-blue-200 hover:bg-blue-100';
      case 'lesson_completed':
        return 'bg-green-50 border-green-200 hover:bg-green-100';
      case 'course_enrolled':
        return 'bg-purple-50 border-purple-200 hover:bg-purple-100';
      case 'achievement_earned':
        return 'bg-yellow-50 border-yellow-200 hover:bg-yellow-100';
      case 'discussion_posted':
        return 'bg-indigo-50 border-indigo-200 hover:bg-indigo-100';
      case 'quiz_completed':
        return 'bg-orange-50 border-orange-200 hover:bg-orange-100';
      case 'bookmark_added':
        return 'bg-pink-50 border-pink-200 hover:bg-pink-100';
      case 'goal_achieved':
        return 'bg-teal-50 border-teal-200 hover:bg-teal-100';
      case 'streak_milestone':
        return 'bg-amber-50 border-amber-200 hover:bg-amber-100';
      case 'certificate_earned':
        return 'bg-emerald-50 border-emerald-200 hover:bg-emerald-100';
      case 'study_group_joined':
        return 'bg-cyan-50 border-cyan-200 hover:bg-cyan-100';
      case 'resource_downloaded':
        return 'bg-gray-50 border-gray-200 hover:bg-gray-100';
      default:
        return 'bg-gray-50 border-gray-200 hover:bg-gray-100';
    }
  };

  const getActivityCategory = (type: Activity['type']): Activity['category'] => {
    const learningTypes: Activity['type'][] = ['lesson_started', 'lesson_completed', 'course_enrolled', 'quiz_completed'];
    const achievementTypes: Activity['type'][] = ['achievement_earned', 'goal_achieved', 'streak_milestone', 'certificate_earned'];
    const socialTypes: Activity['type'][] = ['discussion_posted', 'study_group_joined'];
    
    if (learningTypes.includes(type)) return 'learning';
    if (achievementTypes.includes(type)) return 'achievement';
    if (socialTypes.includes(type)) return 'social';
    return 'system';
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
    if (activity.metadata?.streakDays) {
      return `${base} (${activity.metadata.streakDays} days!)`;
    }
    if (activity.metadata?.progress) {
      return `${base} (${activity.metadata.progress}% complete)`;
    }
    if (activity.metadata?.quizScore) {
      return `${base} (Score: ${activity.metadata.quizScore}%)`;
    }
    
    return base;
  };

  const handleActivityClick = useCallback((activity: Activity) => {
    onActivityAction?.(activity.id, 'view');
    setSelectedActivity(activity.id === selectedActivity ? null : activity.id);
  }, [onActivityAction, selectedActivity]);

  const handleMarkAsRead = useCallback((activityId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onActivityAction?.(activityId, 'mark_read');
  }, [onActivityAction]);

  const handleShareActivity = useCallback((activity: Activity, e: React.MouseEvent) => {
    e.stopPropagation();
    onActivityAction?.(activity.id, 'share');
  }, [onActivityAction]);

  const handleLikeActivity = useCallback((activityId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onActivityAction?.(activityId, 'like');
  }, [onActivityAction]);

  const handleCommentActivity = useCallback((activityId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onActivityAction?.(activityId, 'comment');
  }, [onActivityAction]);

  const clearFilters = useCallback(() => {
    setFilterType('all');
    setFilterCategory('all');
    setSearchQuery('');
    setShowUnreadOnly(false);
  }, []);

  const unreadCount = activities.filter(activity => !activity.read).length;

  const ActivityStats = useMemo(() => {
    const stats = {
      learning: activities.filter(a => getActivityCategory(a.type) === 'learning').length,
      achievement: activities.filter(a => getActivityCategory(a.type) === 'achievement').length,
      social: activities.filter(a => getActivityCategory(a.type) === 'social').length,
      unread: unreadCount
    };

    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="text-center p-3 bg-blue-50 rounded-lg border border-blue-200">
          <div className="text-lg font-bold text-blue-600">{stats.learning}</div>
          <div className="text-xs text-blue-600">Learning</div>
        </div>
        <div className="text-center p-3 bg-green-50 rounded-lg border border-green-200">
          <div className="text-lg font-bold text-green-600">{stats.achievement}</div>
          <div className="text-xs text-green-600">Achievements</div>
        </div>
        <div className="text-center p-3 bg-purple-50 rounded-lg border border-purple-200">
          <div className="text-lg font-bold text-purple-600">{stats.social}</div>
          <div className="text-xs text-purple-600">Social</div>
        </div>
        <div className="text-center p-3 bg-orange-50 rounded-lg border border-orange-200">
          <div className="text-lg font-bold text-orange-600">{stats.unread}</div>
          <div className="text-xs text-orange-600">Unread</div>
        </div>
      </div>
    );
  }, [activities, unreadCount]);

  if (compact) {
    return (
      <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <TrendingUp className="h-5 w-5 mr-2 text-blue-500" />
            Recent Activity
            {unreadCount > 0 && (
              <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                {unreadCount} new
              </span>
            )}
          </h3>
          <button
            onClick={onMarkAllRead}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            disabled={unreadCount === 0}
          >
            Mark all read
          </button>
        </div>
        
        <div className="space-y-3">
          {filteredActivities.map((activity) => (
            <div
              key={activity.id}
              className={`flex items-start space-x-3 p-3 rounded-lg border-l-4 transition-all duration-150 cursor-pointer group ${
                getActivityColor(activity.type)
              } ${!activity.read ? 'border-l-blue-500' : 'border-l-transparent'}`}
              onClick={() => handleActivityClick(activity)}
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
                  <div className="flex items-center space-x-2">
                    {activity.metadata?.points && (
                      <span className="text-xs text-yellow-600 font-medium">
                        +{activity.metadata.points} pts
                      </span>
                    )}
                    {!activity.read && (
                      <button
                        onClick={(e) => handleMarkAsRead(activity.id, e)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-xs text-blue-600 hover:text-blue-700"
                      >
                        Mark read
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredActivities.length === 0 && (
          <div className="text-center py-4">
            <TrendingUp className="h-8 w-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No recent activity</p>
            <p className="text-xs text-gray-400 mt-1">
              {showUnreadOnly ? 'No unread activities' : 'Start learning to see your activity here'}
            </p>
          </div>
        )}

        {/* View All Link */}
        {filteredActivities.length > 0 && (
          <div className="mt-4 pt-3 border-t border-gray-100">
            <button 
              onClick={() => onActivityAction?.('view_all', 'navigate')}
              className="w-full text-center text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              View All Activity
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6 space-y-4 lg:space-y-0">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Learning Activity</h2>
          <p className="text-gray-600 mt-1">
            {filteredActivities.length} of {activities.length} activities • Your learning journey updates
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          {/* Unread Toggle */}
          <button
            onClick={() => setShowUnreadOnly(!showUnreadOnly)}
            className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              showUnreadOnly
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-600 hover:text-gray-700 hover:bg-gray-100'
            }`}
          >
            {showUnreadOnly ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            <span>Unread Only</span>
            {unreadCount > 0 && (
              <span className="px-1.5 py-0.5 bg-blue-200 text-blue-800 text-xs rounded-full">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Mark All Read */}
          {unreadCount > 0 && (
            <button
              onClick={onMarkAllRead}
              className="px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              Mark All Read
            </button>
          )}
        </div>
      </div>

      {/* Activity Stats */}
      {ActivityStats}

      {/* Filters */}
      <div className="flex flex-col lg:flex-row lg:items-center space-y-3 lg:space-y-0 lg:space-x-4 mb-6">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search activities..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Type Filter */}
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value as any)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="all">All Types</option>
          <option value="lesson_completed">Lessons Completed</option>
          <option value="course_enrolled">Courses Enrolled</option>
          <option value="achievement_earned">Achievements</option>
          <option value="quiz_completed">Quizzes</option>
          <option value="discussion_posted">Discussions</option>
        </select>

        {/* Category Filter */}
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value as any)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="all">All Categories</option>
          <option value="learning">Learning</option>
          <option value="achievement">Achievements</option>
          <option value="social">Social</option>
          <option value="system">System</option>
        </select>

        {/* Clear Filters */}
        {(filterType !== 'all' || filterCategory !== 'all' || searchQuery || showUnreadOnly) && (
          <button
            onClick={clearFilters}
            className="px-3 py-2 text-gray-600 hover:text-gray-700 text-sm font-medium"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Activities List */}
      <div className="space-y-4">
        {filteredActivities.map((activity) => (
          <div
            key={activity.id}
            className={`flex items-start space-x-4 p-4 rounded-xl border transition-all duration-150 cursor-pointer group ${
              getActivityColor(activity.type)
            } ${!activity.read ? 'border-l-4 border-l-blue-500' : ''} ${
              selectedActivity === activity.id ? 'ring-2 ring-blue-500' : ''
            }`}
            onClick={() => handleActivityClick(activity)}
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
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <h4 className="font-semibold text-gray-900 text-sm">
                      {activity.title}
                    </h4>
                    {!activity.read && (
                      <span className="px-1.5 py-0.5 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                        New
                      </span>
                    )}
                    {activity.importance === 'high' && (
                      <span className="px-1.5 py-0.5 bg-red-100 text-red-800 text-xs font-medium rounded-full">
                        Important
                      </span>
                    )}
                  </div>
                  <p className="text-gray-600 text-sm mb-2">
                    {getActivityMessage(activity)}
                  </p>
                </div>
                
                {/* Action Menu */}
                <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => handleLikeActivity(activity.id, e)}
                    className="p-1 text-gray-400 hover:text-blue-500 transition-colors"
                    title="Like"
                  >
                    <ThumbsUp className="h-4 w-4" />
                  </button>
                  <button
                    onClick={(e) => handleCommentActivity(activity.id, e)}
                    className="p-1 text-gray-400 hover:text-green-500 transition-colors"
                    title="Comment"
                  >
                    <MessageSquare className="h-4 w-4" />
                  </button>
                  <button
                    onClick={(e) => handleShareActivity(activity, e)}
                    className="p-1 text-gray-400 hover:text-purple-500 transition-colors"
                    title="Share"
                  >
                    <Share2 className="h-4 w-4" />
                  </button>
                  {!activity.read && (
                    <button
                      onClick={(e) => handleMarkAsRead(activity.id, e)}
                      className="p-1 text-gray-400 hover:text-green-500 transition-colors"
                      title="Mark as read"
                    >
                      <CheckCircle className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Metadata */}
              {activity.metadata && (
                <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                  {activity.metadata.lessonCount && (
                    <div className="flex items-center space-x-1">
                      <PlayCircle className="h-3 w-3" />
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
                  {activity.metadata.streakDays && (
                    <div className="flex items-center space-x-1">
                      <Zap className="h-3 w-3 text-amber-500" />
                      <span>{activity.metadata.streakDays} day streak</span>
                    </div>
                  )}
                  {activity.metadata.quizScore && (
                    <div className="flex items-center space-x-1">
                      <FileText className="h-3 w-3 text-orange-500" />
                      <span>Score: {activity.metadata.quizScore}%</span>
                    </div>
                  )}
                  {activity.metadata.duration && (
                    <div className="flex items-center space-x-1">
                      <Clock className="h-3 w-3" />
                      <span>{activity.metadata.duration}m</span>
                    </div>
                  )}
                </div>
              )}

              {/* Social Interactions */}
              {(activity.metadata?.likes || activity.metadata?.comments) && (
                <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                  {activity.metadata.likes && (
                    <div className="flex items-center space-x-1">
                      <ThumbsUp className="h-3 w-3" />
                      <span>{activity.metadata.likes} likes</span>
                    </div>
                  )}
                  {activity.metadata.comments && (
                    <div className="flex items-center space-x-1">
                      <MessageSquare className="h-3 w-3" />
                      <span>{activity.metadata.comments} comments</span>
                    </div>
                  )}
                </div>
              )}

              {/* Footer */}
              <div className="flex items-center justify-between mt-3">
                <div className="flex items-center space-x-2 text-xs text-gray-400">
                  <Clock className="h-3 w-3" />
                  <span>{formatTimeAgo(activity.timestamp)}</span>
                  <span>•</span>
                  <span className="capitalize">{getActivityCategory(activity.type)}</span>
                </div>
                {activity.metadata?.progress !== undefined && (
                  <div className="text-xs text-gray-500">
                    {activity.metadata.progress}% complete
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredActivities.length === 0 && (
        <div className="text-center py-12">
          <TrendingUp className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h4 className="text-lg font-semibold text-gray-900 mb-2">
            {searchQuery || filterType !== 'all' || filterCategory !== 'all' || showUnreadOnly
              ? 'No activities match your filters'
              : 'No activity yet'
            }
          </h4>
          <p className="text-gray-600 text-sm mb-6 max-w-md mx-auto">
            {searchQuery || filterType !== 'all' || filterCategory !== 'all' || showUnreadOnly
              ? 'Try adjusting your search terms or filters to see more activities.'
              : 'Your learning activities will appear here as you start courses, complete lessons, and earn achievements.'
            }
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => onActivityAction?.('explore_courses', 'navigate')}
              className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              <BookOpen className="h-4 w-4 mr-2" />
              Explore Courses
            </button>
            {(searchQuery || filterType !== 'all' || filterCategory !== 'all' || showUnreadOnly) && (
              <button
                onClick={clearFilters}
                className="inline-flex items-center px-6 py-3 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>
      )}

      {/* Export Options */}
      {filteredActivities.length > 0 && (
        <div className="mt-6 pt-6 border-t border-gray-100">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Showing {filteredActivities.length} activities
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => onActivityAction?.('export', 'export')}
                className="inline-flex items-center text-sm text-gray-600 hover:text-gray-700"
              >
                <Download className="h-4 w-4 mr-1" />
                Export
              </button>
              <button
                onClick={() => onActivityAction?.('view_all', 'navigate')}
                className="inline-flex items-center text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                View All Activities
                <ExternalLink className="h-4 w-4 ml-1" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default React.memo(RecentActivity);