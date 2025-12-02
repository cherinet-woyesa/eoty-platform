import React from 'react';
import TimestampBadge from './TimestampBadge';
import FlagBadge from './FlagBadge';
import PinBadge from './PinBadge';

export type ThreadReply = {
  id: string;
  authorName: string;
  content: string;
  createdAt: string | number;
};

export type ThreadItemData = {
  id: string;
  authorName: string;
  content: string;
  createdAt: string | number;
  videoTimestamp?: number | null;
  flagged?: boolean;
  pinned?: boolean;
  replies?: ThreadReply[];
};

type Props = {
  item: ThreadItemData;
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
  onPin?: (id: string) => void;
};

export const ThreadItem: React.FC<Props> = ({ item, onApprove, onReject, onPin }) => {
  return (
    <div className="rounded border border-gray-200 p-3 mb-3 bg-white">
      <div className="flex items-center gap-2 mb-1">
        {item.videoTimestamp != null && <TimestampBadge seconds={item.videoTimestamp} />}
        <FlagBadge flagged={item.flagged} />
        <PinBadge pinned={item.pinned} />
      </div>
      <div className="text-sm text-gray-700">
        <span className="font-semibold">{item.authorName}</span>
        <span className="mx-2 text-gray-400">•</span>
        <span className="text-gray-500">{new Date(item.createdAt).toLocaleString()}</span>
      </div>
      <div className="mt-2 text-gray-900 text-sm whitespace-pre-wrap">{item.content}</div>

      {item.replies && item.replies.length > 0 && (
        <div className="mt-3 pl-3 border-l border-gray-200">
          {item.replies.map((r) => (
            <div key={r.id} className="mb-2">
              <div className="text-sm text-gray-700">
                <span className="font-semibold">{r.authorName}</span>
                <span className="mx-2 text-gray-400">•</span>
                <span className="text-gray-500">{new Date(r.createdAt).toLocaleString()}</span>
              </div>
              <div className="text-sm text-gray-900 whitespace-pre-wrap">{r.content}</div>
            </div>
          ))}
        </div>
      )}

      {(onApprove || onReject || onPin) && (
        <div className="mt-3 flex gap-2">
          {onApprove && (
            <button
              type="button"
              className="px-2 py-1 text-xs rounded bg-green-600 text-white hover:bg-green-700"
              onClick={() => onApprove(item.id)}
            >
              Approve
            </button>
          )}
          {onReject && (
            <button
              type="button"
              className="px-2 py-1 text-xs rounded bg-red-600 text-white hover:bg-red-700"
              onClick={() => onReject(item.id)}
            >
              Reject
            </button>
          )}
          {onPin && (
            <button
              type="button"
              className="px-2 py-1 text-xs rounded bg-blue-600 text-white hover:bg-blue-700"
              onClick={() => onPin(item.id)}
            >
              Pin
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default ThreadItem;
