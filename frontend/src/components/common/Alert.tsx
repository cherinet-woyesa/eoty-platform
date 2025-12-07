import React from 'react';

type AlertVariant = 'error' | 'warning' | 'info' | 'success';

interface AlertProps {
  title?: string;
  description?: string;
  variant?: AlertVariant;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

const variantStyles: Record<AlertVariant, { bg: string; border: string; text: string; icon: string }> = {
  error:   { bg: 'bg-red-50',    border: 'border-red-200',    text: 'text-red-800',    icon: 'text-red-500' },
  warning: { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-800', icon: 'text-yellow-600' },
  info:    { bg: 'bg-blue-50',   border: 'border-blue-200',   text: 'text-blue-800',   icon: 'text-blue-500' },
  success: { bg: 'bg-green-50',  border: 'border-green-200',  text: 'text-green-800',  icon: 'text-green-500' },
};

const Alert: React.FC<AlertProps> = ({
  title,
  description,
  variant = 'info',
  actionLabel,
  onAction,
  className = ''
}) => {
  const styles = variantStyles[variant];

  return (
    <div className={`w-full rounded-lg border ${styles.border} ${styles.bg} p-4 ${className}`} role="alert" aria-live="polite">
      <div className="flex items-start gap-3">
        <div className={`mt-0.5 ${styles.icon}`}>●</div>
        <div className="flex-1">
          {title && <p className={`text-sm font-semibold ${styles.text}`}>{title}</p>}
          {description && <p className="text-sm text-stone-700 mt-0.5">{description}</p>}
        </div>
        {actionLabel && onAction && (
          <button
            onClick={onAction}
            className="text-sm font-semibold text-stone-800 hover:text-stone-900"
          >
            {actionLabel}
          </button>
        )}
      </div>
    </div>
  );
};

export default Alert;

