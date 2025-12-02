import React from 'react';

export const FlagBadge: React.FC<{ flagged?: boolean }> = ({ flagged }) => {
  if (!flagged) return null;
  return (
    <span className="inline-flex items-center rounded bg-yellow-100 text-yellow-800 text-xs px-2 py-0.5">
      Flagged
    </span>
  );
};

export default FlagBadge;
