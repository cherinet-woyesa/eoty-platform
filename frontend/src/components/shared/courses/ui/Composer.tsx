import React, { useState } from 'react';

type Props = {
  onSubmit: (content: string, attachTimestamp: boolean) => void;
  defaultAttachTimestamp?: boolean;
  submitting?: boolean;
  placeholder?: string;
};

export const Composer: React.FC<Props> = ({ onSubmit, defaultAttachTimestamp = true, submitting, placeholder = "Write a message..." }) => {
  const [content, setContent] = useState('');
  const [attachTimestamp, setAttachTimestamp] = useState<boolean>(defaultAttachTimestamp);

  const canSubmit = content.trim().length > 0 && !submitting;

  return (
    <div className="rounded border border-gray-200 p-3 bg-white">
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        className="w-full border border-gray-300 rounded p-2 text-sm"
        placeholder={placeholder}
        rows={3}
      />
      <div className="mt-2 flex items-center justify-between">
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            className="h-4 w-4"
            checked={attachTimestamp}
            onChange={(e) => setAttachTimestamp(e.target.checked)}
          />
          Attach video timestamp
        </label>
        <button
          type="button"
          disabled={!canSubmit}
          className="px-3 py-1.5 text-sm rounded bg-indigo-600 text-white disabled:opacity-50"
          onClick={() => {
            if (!canSubmit) return;
            onSubmit(content.trim(), attachTimestamp);
            setContent('');
          }}
        >
          {submitting ? 'Posting…' : 'Post'}
        </button>
      </div>
    </div>
  );
};

export default Composer;
