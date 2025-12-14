import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ message, size = 'md' }) => {
  const spinnerSizeClass = 
    size === 'sm' ? 'h-5 w-5' : 
    size === 'lg' ? 'h-10 w-10' : 
    'h-8 w-8';

  return (
    <div className="flex flex-col items-center justify-center p-6">
      <Loader2 className={`animate-spin text-brand-primary ${spinnerSizeClass}`} />
      {message && <p className="mt-3 text-slate-500 text-sm">{message}</p>}
    </div>
  );
};

export default LoadingSpinner;





