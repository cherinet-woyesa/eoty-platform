import React, { useState } from 'react';

interface RequestAccessModalProps {
  resourceId: number;
  resourceName?: string;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (message: string) => Promise<void>;
}

const RequestAccessModal: React.FC<RequestAccessModalProps> = ({ resourceId, resourceName, isOpen, onClose, onSubmit }) => {
  const [message, setMessage] = useState<string>(`Hi, I would like access to the resource '${resourceName || resourceId}'. Please grant view permission.`);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSend = async () => {
    setLoading(true);
    setError(null);
    try {
      await onSubmit(message);
      setLoading(false);
    } catch (err: any) {
      setError(err?.message || 'Failed to send request');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-lg bg-white rounded-lg shadow-lg p-6">
        <h3 className="text-lg font-semibold mb-2">Request Access</h3>
        <p className="text-sm text-gray-600 mb-4">Send a request to the resource owner or administrator to request view access.</p>

        <label className="block text-sm font-medium text-gray-700 mb-2">Message</label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={6}
          className="w-full border border-gray-300 rounded-md p-2 text-sm"
        />

        {error && <p className="text-sm text-red-600 mt-2">{error}</p>}

        <div className="mt-4 flex justify-end space-x-2">
          <button onClick={onClose} className="px-4 py-2 bg-gray-100 rounded-md">Cancel</button>
          <button
            onClick={handleSend}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md disabled:opacity-60"
          >
            {loading ? 'Sending…' : 'Send Request'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RequestAccessModal;
