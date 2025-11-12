// frontend/src/components/courses/NotificationContainer.tsx
import type { FC } from 'react';
import ErrorNotification, { type NotificationType } from './ErrorNotification';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  recoveryAction?: {
    label: string;
    onClick: () => void;
  };
  autoHide?: boolean;
  autoHideDelay?: number;
}

interface NotificationContainerProps {
  notifications: Notification[];
  onDismiss: (id: string) => void;
}

const NotificationContainer: FC<NotificationContainerProps> = ({
  notifications,
  onDismiss
}) => {
  if (notifications.length === 0) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50 space-y-3 max-w-md">
      {notifications.map((notification) => (
        <ErrorNotification
          key={notification.id}
          type={notification.type}
          title={notification.title}
          message={notification.message}
          recoveryAction={notification.recoveryAction}
          onDismiss={() => onDismiss(notification.id)}
          autoHide={notification.autoHide}
          autoHideDelay={notification.autoHideDelay}
        />
      ))}
    </div>
  );
};

export default NotificationContainer;
