import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';

interface RequestAccessModalProps {
  resourceId: number;
  resourceName?: string;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (message: string) => Promise<void>;
}

const RequestAccessModal: React.FC<RequestAccessModalProps> = ({ resourceId, resourceName, isOpen, onClose, onSubmit }) => {
  const { t } = useTranslation();
  const [message, setMessage] = useState<string>(
    t('resources.request_access.default_message', { name: resourceName || resourceId })
  );
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
      setError(err?.message || t('resources.request_access.error'));
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-white rounded-xl shadow-2xl p-6 border border-brand-soft/20">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-gray-900">{t('resources.request_access.title')}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <p className="text-sm text-gray-600 mb-6">{t('resources.request_access.description')}</p>

        <label className="block text-sm font-medium text-gray-700 mb-2">{t('resources.request_access.message_label')}</label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={6}
          className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-brand-primary focus:border-transparent outline-none transition-all"
        />

        {error && <p className="text-sm text-red-600 mt-2 bg-red-50 p-2 rounded border border-red-100">{error}</p>}

        <div className="mt-6 flex justify-end space-x-3">
          <button 
            onClick={onClose} 
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
          >
            {t('resources.request_access.cancel')}
          </button>
          <button
            onClick={handleSend}
            disabled={loading}
            className="px-4 py-2 bg-brand-primary text-white rounded-lg hover:bg-brand-primary-dark disabled:opacity-60 disabled:cursor-not-allowed transition-colors font-medium shadow-sm"
          >
            {loading ? t('resources.request_access.sending') : t('resources.request_access.send')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RequestAccessModal;