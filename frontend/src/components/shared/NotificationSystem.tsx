import React, { useEffect } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import { useNotification, type Notification, type NotificationType } from '@/context/NotificationContext';
import { theme } from '@/styles/theme';

const notificationConfig: Record<NotificationType, { icon: React.ElementType; bgColor: string; iconColor: string; borderColor: string }> = {
  success: {
    icon: CheckCircle,
    bgColor: 'bg-green-50',
    iconColor: 'text-green-600',
    borderColor: 'border-green-200',
  },
  error: {
    icon: XCircle,
    bgColor: 'bg-red-50',
    iconColor: 'text-red-600',
    borderColor: 'border-red-200',
  },
  warning: {
    icon: AlertTriangle,
    bgColor: 'bg-yellow-50',
    iconColor: 'text-yellow-600',
    borderColor: 'border-yellow-200',
  },
  info: {
    icon: Info,
    bgColor: 'bg-blue-50',
    iconColor: 'text-blue-600',
    borderColor: 'border-blue-200',
  },
};

interface NotificationItemProps {
  notification: Notification;
  onClose: (id: string) => void;
}

const NotificationItem: React.FC<NotificationItemProps> = ({ notification, onClose }) => {
  const config = notificationConfig[notification.type];
  const Icon = config.icon;

  useEffect(() => {
    // Animate in
    const timer = setTimeout(() => {
      const element = document.getElementById(notification.id);
      if (element) {
        element.classList.add('notification-enter-active');
      }
    }, 10);

    return () => clearTimeout(timer);
  }, [notification.id]);

  const handleClose = () => {
    const element = document.getElementById(notification.id);
    if (element) {
      element.classList.add('notification-exit-active');
      setTimeout(() => {
        onClose(notification.id);
      }, 200);
    } else {
      onClose(notification.id);
    }
  };

  return (
    <div
      id={notification.id}
      className={`notification-item flex items-start gap-3 p-4 rounded-lg border ${config.bgColor} ${config.borderColor} shadow-lg max-w-md w-full`}
      role="alert"
      aria-live="polite"
    >
      <Icon className={`h-5 w-5 ${config.iconColor} flex-shrink-0 mt-0.5`} />
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-semibold text-gray-900 mb-1">{notification.title}</h4>
        <p className="text-sm text-gray-700">{notification.message}</p>
        {notification.actions && notification.actions.length > 0 && (
          <div className="flex gap-2 mt-3">
            {notification.actions.map((action, index) => (
              <button
                key={index}
                onClick={() => {
                  action.onClick();
                  handleClose();
                }}
                className="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
              >
                {action.label}
              </button>
            ))}
          </div>
        )}
      </div>
      <button
        onClick={handleClose}
        className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
        aria-label="Close notification"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
};

export const NotificationSystem: React.FC = () => {
  const { notifications, hideNotification } = useNotification();

  return (
    <div
      className="fixed top-4 right-4 z-50 flex flex-col gap-3 pointer-events-none"
      style={{ zIndex: theme.zIndex.tooltip }}
    >
      {notifications.map((notification) => (
        <div key={notification.id} className="pointer-events-auto">
          <NotificationItem notification={notification} onClose={hideNotification} />
        </div>
      ))}
    </div>
  );
};

// Add CSS for animations
const style = document.createElement('style');
style.textContent = `
  .notification-item {
    opacity: 0;
    transform: translateX(100%);
    transition: all 200ms ease-in-out;
  }
  
  .notification-item.notification-enter-active {
    opacity: 1;
    transform: translateX(0);
  }
  
  .notification-item.notification-exit-active {
    opacity: 0;
    transform: translateX(100%);
  }
`;
document.head.appendChild(style);
