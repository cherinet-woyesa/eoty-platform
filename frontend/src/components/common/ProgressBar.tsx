import React from 'react';

interface ProgressBarProps {
  value: number;
  height?: number;
  className?: string;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ value, height = 8, className = '' }) => {
  const clamped = Math.max(0, Math.min(100, value || 0));

  return (
    <div
      className={`w-full bg-stone-200 rounded-full overflow-hidden ${className}`}
      style={{ height }}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={clamped}
    >
      <div
        className="h-full bg-gradient-to-r from-[#27AE60] to-[#16A085] transition-all duration-300"
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
};

export default ProgressBar;

