import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

interface DateTimeDisplayProps {
  className?: string;
}

export const DateTimeDisplay: React.FC<DateTimeDisplayProps> = React.memo(({ className }) => {
  const { i18n } = useTranslation();
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    // Update immediately to sync with minute start if possible, or just run every minute
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString(i18n.language, { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString(i18n.language, { 
      weekday: 'long',
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  return (
    <span className={className}>
      {formatDate(currentTime)} • {formatTime(currentTime)}
    </span>
  );
});
