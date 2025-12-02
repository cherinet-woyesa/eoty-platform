import React from 'react';

export const PinBadge: React.FC<{ pinned?: boolean }> = ({ pinned }) => {
  if (!pinned) return null;
  return (
    <span className="inline-flex items-center rounded bg-blue-100 text-blue-800 text-xs px-2 py-0.5">
      Pinned
    </span>
  );
};

export default PinBadge;
