import React from 'react';

type Props = {
  seconds?: number | null;
};

function formatTimestamp(s: number) {
  const total = Math.max(0, Math.floor(s));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const sec = total % 60;
  const mm = h > 0 ? String(m).padStart(2, '0') : String(m);
  const ss = String(sec).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

export const TimestampBadge: React.FC<Props> = ({ seconds }) => {
  if (seconds == null) return null;
  return (
    <span className="inline-flex items-center rounded bg-gray-800/70 text-white text-xs px-2 py-0.5">
      {formatTimestamp(seconds)}
    </span>
  );
};

export default TimestampBadge;
