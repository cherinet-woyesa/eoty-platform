import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Bell, X, CheckCircle, AlertTriangle, Info, MessageSquare, Users, Award } from 'lucide-react';
import { useWebSocket } from '@/hooks/useWebSocket';
import { interactiveApi } from '@/services/api';
import { useNavigate } from 'react-router-dom';

interface NotificationBellProps {
  onDark?: boolean;
}

interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'message' | 'achievement';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  actionUrl?: string;
  sender?: string;
}

const NotificationBell: React.FC<NotificationBellProps> = ({ onDark = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Simulate real-time notifications via WebSocket
  const { lastMessage } = useWebSocket('/notifications');

  const mapType = (rawType?: string): Notification['type'] => {
    const type = (rawType || '').toLowerCase();
    if (type === 'success') return 'success';
    if (type === 'warning') return 'warning';
    if (type === 'error' || type === 'danger') return 'error';
    if (type === 'message' || type === 'message_received') return 'message';
    if (type === 'achievement' || type === 'badge') return 'achievement';
    return 'info';
  };

  const mapNotification = (n: any): Notification => {
    const ts = n?.created_at || n?.timestamp;
    const parsedTs = ts ? new Date(ts) : new Date();
    return {
      id: String(n?.id ?? n?.notification_id ?? crypto.randomUUID()),
      type: mapType(n?.notification_type || n?.type),
      title: n?.title || n?.type || 'Notification',
      message: n?.message || n?.content || '',
      timestamp: parsedTs,
      read: Boolean(n?.is_read ?? n?.read),
      actionUrl: n?.action_url || n?.actionUrl || (n?.data?.action_url ?? n?.data?.url),
      sender: n?.sender || n?.data?.sender
    };
  };

  // Load initial notifications
  useEffect(() => {
    const loadNotifications = async () => {
      setIsLoading(true);
      try {
        setError(null);
        const res = await interactiveApi.getNotifications();
        const apiNotifications = res?.data?.notifications || res?.notifications || [];
        setNotifications(apiNotifications.map(mapNotification));
      } catch (error) {
        console.error('Failed to load notifications', error);
        setError('Could not load notifications');
      } finally {
        setIsLoading(false);
      }
    };

    loadNotifications();
  }, []);

  // Handle new WebSocket messages
  useEffect(() => {
    if (lastMessage) {
      try {
        const incoming = JSON.parse(lastMessage.data);
        setNotifications(prev => [mapNotification(incoming), ...prev]);
      } catch (e) {
        console.error('Failed to parse incoming notification', e);
      }
    }
  }, [lastMessage]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'error':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'message':
        return <MessageSquare className="h-4 w-4 text-blue-500" />;
      case 'achievement':
        return <Award className="h-4 w-4 text-purple-500" />;
      default:
        return <Info className="h-4 w-4 text-gray-500" />;
    }
  };

  const getNotificationColor = (type: Notification['type']) => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      case 'message':
        return 'bg-blue-50 border-blue-200';
      case 'achievement':
        return 'bg-purple-50 border-purple-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const handleToggleDropdown = useCallback(() => {
    setIsOpen(prev => !prev);
  }, []);

  const handleMarkAsRead = useCallback(async (id: string) => {
    setNotifications(prev =>
      prev.map(notif =>
        notif.id === id ? { ...notif, read: true } : notif
      )
    );
    try {
      await interactiveApi.markNotificationAsRead(id);
    } catch (e) {
      console.error('Failed to mark notification as read', e);
      setError('Could not mark notification as read');
    }
  }, []);

  const handleMarkAllAsRead = useCallback(async () => {
    const unreadIds = notifications.filter(n => !n.read).map(n => n.id);
    if (unreadIds.length === 0) return;
    setNotifications(prev => prev.map(notif => ({ ...notif, read: true })));
    try {
      await Promise.all(unreadIds.map(id => interactiveApi.markNotificationAsRead(id)));
    } catch (e) {
      console.error('Failed to mark all notifications as read', e);
      setError('Could not mark notifications as read');
    }
  }, [notifications]);

  const handleClearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  const handleNotificationClick = useCallback((notification: Notification) => {
    if (notification.actionUrl) {
      navigate(notification.actionUrl);
    }
    handleMarkAsRead(notification.id);
    setIsOpen(false);
  }, [handleMarkAsRead, navigate]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const formatTime = (timestamp: Date) => {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return `${Math.floor(diff / 86400000)}d ago`;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={handleToggleDropdown}
        className={`relative p-1.5 rounded-lg transition-colors duration-200 group focus:outline-none focus:ring-2 ${
          onDark ? 'hover:bg-white/10 focus:ring-white/30' : 'hover:bg-gray-100 focus:ring-blue-500/20'
        }`}
        aria-label={`Notifications ${unreadCount > 0 ? `(${unreadCount} unread)` : ''}`}
      >
        <Bell
          className={`h-4 w-4 transition-colors ${
            onDark ? 'text-white group-hover:text-white' : 'text-gray-600 group-hover:text-blue-600'
          }`}
        />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 h-3.5 w-3.5 bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs rounded-full flex items-center justify-center font-semibold animate-pulse shadow-sm">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-xl border border-gray-200/60 py-2 z-50 animate-in slide-in-from-top-2 max-h-96 overflow-hidden flex flex-col">
          {/* Header */}
          <div className="px-4 py-2 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
              <div className="flex items-center space-x-2">
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllAsRead}
                    className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Mark all read
                  </button>
                )}
                <button
                  onClick={handleClearAll}
                  className="text-xs text-gray-500 hover:text-gray-700"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            </div>
          </div>

          {error && (
            <div className="px-4 py-2 text-xs text-red-600 bg-red-50 border-b border-red-100">
              {error}
            </div>
          )}

          {/* Notifications List */}
          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="px-4 py-8 text-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-sm text-gray-500 mt-2">Loading notifications...</p>
              </div>
            ) : notifications.length > 0 ? (
              <div className="py-1">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`px-4 py-3 border-l-4 cursor-pointer transition-all duration-150 hover:bg-gray-50/50 ${
                      getNotificationColor(notification.type)
                    } ${!notification.read ? 'border-l-2' : 'border-l-0'}`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 mt-0.5">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <p className="text-sm font-medium text-gray-900 pr-2">
                            {notification.title}
                          </p>
                          {!notification.read && (
                            <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1.5"></div>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                          {notification.message}
                        </p>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs text-gray-400">
                            {formatTime(notification.timestamp)}
                          </span>
                          {notification.sender && (
                            <span className="text-xs text-gray-500">
                              from {notification.sender}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="px-4 py-8 text-center">
                <Bell className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">No notifications</p>
                <p className="text-xs text-gray-400 mt-1">
                  We'll notify you when something arrives
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2 border-t border-gray-100 bg-gray-50/50">
            <button
              onClick={() => {
                // Navigate to notifications page
                console.log('View all notifications');
                setIsOpen(false);
              }}
              className="w-full text-center text-xs text-blue-600 hover:text-blue-700 font-medium py-1"
            >
              View all notifications
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default React.memo(NotificationBell);