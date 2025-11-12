import React, { useMemo } from 'react';
import { 
  Users, UserPlus, UserCheck, BookOpen, 
  Video, FileText, Shield, Settings,
  TrendingUp, AlertTriangle, CheckCircle,
  Clock, Zap, DollarSign, MessageCircle
} from 'lucide-react';

interface Activity {
  id: string;
  type: 'user_registered' | 'user_verified' | 'course_created' | 
        'content_uploaded' | 'moderation_action' | 'system_update' |
        'revenue_generated' | 'admin_login' | 'content_approved' |
        'user_suspended' | 'bulk_operation' | 'settings_updated';
  title: string;
  description: string;
  timestamp: Date;
  user?: {
    name: string;
    avatar?: string;
    role?: string;
  };
  metadata?: {
    count?: number;
    amount?: number;
    action?: string;
    resource?: string;
    ipAddress?: string;
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
      case 'user_registered':
        return <UserPlus className="h-4 w-4 text-green-500" />;
      case 'user_verified':
        return <UserCheck className="h-4 w-4 text-blue-500" />;
      case 'course_created':
        return <BookOpen className="h-4 w-4 text-purple-500" />;
      case 'content_uploaded':
        return <Video className="h-4 w-4 text-orange-500" />;
      case 'moderation_action':
        return <Shield className="h-4 w-4 text-red-500" />;
      case 'system_update':
        return <Settings className="h-4 w-4 text-gray-500" />;
      case 'revenue_generated':
        return <DollarSign className="h-4 w-4 text-emerald-500" />;
      case 'admin_login':
        return <TrendingUp className="h-4 w-4 text-cyan-500" />;
      case 'content_approved':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'user_suspended':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'bulk_operation':
        return <Zap className="h-4 w-4 text-amber-500" />;
      case 'settings_updated':
        return <Settings className="h-4 w-4 text-indigo-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getActivityColor = (type: Activity['type']) => {
    switch (type) {
      case 'user_registered':
        return 'bg-green-50 border-green-200';
      case 'user_verified':
        return 'bg-blue-50 border-blue-200';
      case 'course_created':
        return 'bg-purple-50 border-purple-200';
      case 'content_uploaded':
        return 'bg-orange-50 border-orange-200';
      case 'moderation_action':
        return 'bg-red-50 border-red-200';
      case 'system_update':
        return 'bg-gray-50 border-gray-200';
      case 'revenue_generated':
        return 'bg-emerald-50 border-emerald-200';
      case 'admin_login':
        return 'bg-cyan-50 border-cyan-200';
      case 'content_approved':
        return 'bg-green-50 border-green-200';
      case 'user_suspended':
        return 'bg-yellow-50 border-yellow-200';
      case 'bulk_operation':
        return 'bg-amber-50 border-amber-200';
      case 'settings_updated':
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
    
    if (activity.metadata?.count) {
      return `${base} (${activity.metadata.count} items)`;
    }
    if (activity.metadata?.amount) {
      return `${base} ($${activity.metadata.amount})`;
    }
    if (activity.metadata?.action) {
      return `${base}: ${activity.metadata.action}`;
    }
    if (activity.metadata?.resource) {
      return `${base}: ${activity.metadata.resource}`;
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
          <h2 className="text-xl font-bold text-gray-900">Admin Activity</h2>
          <p className="text-gray-600 mt-1">Recent platform administration activities</p>
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
                  {activity.metadata.count && (
                    <div className="flex items-center space-x-1">
                      <Users className="h-3 w-3" />
                      <span>{activity.metadata.count} items</span>
                    </div>
                  )}
                  {activity.metadata.amount && (
                    <div className="flex items-center space-x-1">
                      <DollarSign className="h-3 w-3 text-emerald-500" />
                      <span>${activity.metadata.amount}</span>
                    </div>
                  )}
                  {activity.metadata.ipAddress && (
                    <div className="flex items-center space-x-1">
                      <Shield className="h-3 w-3" />
                      <span>{activity.metadata.ipAddress}</span>
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
            Admin activities will appear here as you manage the platform.
          </p>
        </div>
      )}

      {/* Activity Summary */}
      <div className="mt-6 grid grid-cols-3 gap-4 text-center">
        <div>
          <div className="text-lg font-bold text-blue-600">
            {sortedActivities.filter(a => a.type.includes('user')).length}
          </div>
          <div className="text-xs text-gray-500">User Actions</div>
        </div>
        <div>
          <div className="text-lg font-bold text-purple-600">
            {sortedActivities.filter(a => a.type.includes('content')).length}
          </div>
          <div className="text-xs text-gray-500">Content Actions</div>
        </div>
        <div>
          <div className="text-lg font-bold text-green-600">
            {sortedActivities.filter(a => a.type.includes('revenue')).length}
          </div>
          <div className="text-xs text-gray-500">Revenue Events</div>
        </div>
      </div>
    </div>
  );
};

export default React.memo(RecentActivity);