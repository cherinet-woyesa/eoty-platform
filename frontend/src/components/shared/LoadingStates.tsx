import React from 'react';
import { Loader2 } from 'lucide-react';

// Spinner Component
interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export const Spinner: React.FC<SpinnerProps> = ({ size = 'md', className = '' }) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
    xl: 'h-16 w-16',
  };

  return (
    <Loader2 className={`animate-spin text-blue-600 ${sizeClasses[size]} ${className}`} />
  );
};

// Skeleton Component
interface SkeletonProps {
  width?: string;
  height?: string;
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular';
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = '1rem',
  className = '',
  variant = 'rectangular',
}) => {
  const variantClasses = {
    text: 'rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-md',
  };

  return (
    <div
      className={`bg-gray-200 animate-pulse ${variantClasses[variant]} ${className}`}
      style={{ width, height }}
      aria-hidden="true"
    />
  );
};

// Card Skeleton
export const CardSkeleton: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
      <Skeleton height="1.5rem" width="60%" className="mb-4" />
      <Skeleton height="1rem" width="100%" className="mb-2" />
      <Skeleton height="1rem" width="90%" className="mb-2" />
      <Skeleton height="1rem" width="80%" className="mb-4" />
      <div className="flex gap-2">
        <Skeleton height="2rem" width="5rem" />
        <Skeleton height="2rem" width="5rem" />
      </div>
    </div>
  );
};

// Table Skeleton
interface TableSkeletonProps {
  rows?: number;
  columns?: number;
  className?: string;
}

export const TableSkeleton: React.FC<TableSkeletonProps> = ({
  rows = 5,
  columns = 4,
  className = '',
}) => {
  return (
    <div className={`bg-white rounded-lg shadow overflow-hidden ${className}`}>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {Array.from({ length: columns }).map((_, i) => (
                <th key={i} className="px-6 py-3">
                  <Skeleton height="1rem" width="80%" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {Array.from({ length: rows }).map((_, rowIndex) => (
              <tr key={rowIndex}>
                {Array.from({ length: columns }).map((_, colIndex) => (
                  <td key={colIndex} className="px-6 py-4">
                    <Skeleton height="1rem" width="90%" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// List Skeleton
interface ListSkeletonProps {
  items?: number;
  className?: string;
}

export const ListSkeleton: React.FC<ListSkeletonProps> = ({ items = 5, className = '' }) => {
  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-4 bg-white rounded-lg shadow">
          <Skeleton variant="circular" width="3rem" height="3rem" />
          <div className="flex-1">
            <Skeleton height="1rem" width="40%" className="mb-2" />
            <Skeleton height="0.875rem" width="60%" />
          </div>
        </div>
      ))}
    </div>
  );
};

// Full Page Loading
interface FullPageLoadingProps {
  message?: string;
}

export const FullPageLoading: React.FC<FullPageLoadingProps> = ({ message = 'Loading...' }) => {
  return (
    <div className="fixed inset-0 bg-white bg-opacity-90 flex items-center justify-center z-50">
      <div className="text-center">
        <Spinner size="xl" />
        <p className="mt-4 text-gray-600 text-lg">{message}</p>
      </div>
    </div>
  );
};

// Button Loading State
interface LoadingButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  children: React.ReactNode;
}

export const LoadingButton: React.FC<LoadingButtonProps> = ({
  loading = false,
  children,
  disabled,
  className = '',
  ...props
}) => {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={`relative ${className}`}
    >
      {loading && (
        <span className="absolute inset-0 flex items-center justify-center">
          <Spinner size="sm" />
        </span>
      )}
      <span className={loading ? 'invisible' : ''}>{children}</span>
    </button>
  );
};

// Content Loading Overlay
interface LoadingOverlayProps {
  loading: boolean;
  children: React.ReactNode;
  message?: string;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  loading,
  children,
  message = 'Loading...',
}) => {
  return (
    <div className="relative">
      {children}
      {loading && (
        <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center rounded-lg">
          <div className="text-center">
            <Spinner size="lg" />
            <p className="mt-2 text-sm text-gray-600">{message}</p>
          </div>
        </div>
      )}
    </div>
  );
};
