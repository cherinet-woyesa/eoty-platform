import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Users, Link, Copy, Check, Mail, MessageCircle } from 'lucide-react';

interface ShareResourceModalProps {
  resourceId: number;
  resourceName: string;
  isOpen: boolean;
  onClose: () => void;
  onShare: (method: string, recipients: string[]) => void;
}

const ShareResourceModal: React.FC<ShareResourceModalProps> = ({ 
  resourceId, 
  resourceName, 
  isOpen, 
  onClose,
  onShare
}) => {
  const { t } = useTranslation();
  const [shareMethod, setShareMethod] = useState('chapter');
  const [recipients, setRecipients] = useState<string[]>([]);
  const [email, setEmail] = useState('');
  const [copied, setCopied] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  if (!isOpen) return null;

  const shareableLink = `${window.location.origin}/resources/${resourceId}`;

  const handleAddEmail = () => {
    if (email && email.includes('@')) {
      setRecipients([...recipients, email]);
      setEmail('');
    }
  };

  const handleRemoveEmail = (index: number) => {
    setRecipients(recipients.filter((_, i) => i !== index));
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareableLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    setIsSharing(true);
    try {
      await onShare(shareMethod, recipients);
      onClose();
    } catch (error) {
      console.error('Share failed:', error);
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl border border-brand-soft/20 max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-gray-900">{t('resources.share_modal.title')}</h3>
            <button
              onClick={onClose}
              className="p-1 rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          
          <div className="mb-6 p-3 bg-gray-50 rounded-lg border border-gray-100">
            <p className="text-gray-700 font-medium line-clamp-2">{resourceName}</p>
          </div>
          
          <div className="space-y-6">
            {/* Share Method Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('resources.share_modal.share_with')}
              </label>
              <div className="space-y-2">
                <div 
                  className={`flex items-center p-3 rounded-lg border cursor-pointer transition-all ${
                    shareMethod === 'chapter' 
                      ? 'border-brand-primary bg-brand-soft/10 shadow-sm' 
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                  onClick={() => setShareMethod('chapter')}
                >
                  <Users className={`h-5 w-5 ${shareMethod === 'chapter' ? 'text-brand-primary' : 'text-gray-400'}`} />
                  <div className="ml-3">
                    <div className="text-sm font-medium text-gray-900">{t('resources.share_modal.chapter_members')}</div>
                    <div className="text-xs text-gray-500">{t('resources.share_modal.chapter_members_desc')}</div>
                  </div>
                  {shareMethod === 'chapter' && (
                    <div className="ml-auto w-2 h-2 rounded-full bg-brand-primary"></div>
                  )}
                </div>
                
                <div 
                  className={`flex items-center p-3 rounded-lg border cursor-pointer transition-all ${
                    shareMethod === 'email' 
                      ? 'border-brand-primary bg-brand-soft/10 shadow-sm' 
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                  onClick={() => setShareMethod('email')}
                >
                  <Mail className={`h-5 w-5 ${shareMethod === 'email' ? 'text-brand-primary' : 'text-gray-400'}`} />
                  <div className="ml-3">
                    <div className="text-sm font-medium text-gray-900">{t('resources.share_modal.specific_people')}</div>
                    <div className="text-xs text-gray-500">{t('resources.share_modal.specific_people_desc')}</div>
                  </div>
                  {shareMethod === 'email' && (
                    <div className="ml-auto w-2 h-2 rounded-full bg-brand-primary"></div>
                  )}
                </div>
              </div>
            </div>

            {/* Email Input */}
            {shareMethod === 'email' && (
              <div className="animate-fadeIn">
                <div className="flex gap-2 mb-2">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t('resources.share_modal.email_placeholder')}
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-brand-primary focus:border-transparent outline-none"
                    onKeyDown={(e) => e.key === 'Enter' && handleAddEmail()}
                  />
                  <button
                    onClick={handleAddEmail}
                    disabled={!email || !email.includes('@')}
                    className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 text-sm font-medium transition-colors"
                  >
                    {t('resources.share_modal.add')}
                  </button>
                </div>
                
                {recipients.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {recipients.map((recipient, index) => (
                      <span key={index} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-brand-soft/10 text-brand-primary border border-brand-soft/20">
                        {recipient}
                        <button
                          onClick={() => handleRemoveEmail(index)}
                          className="ml-1.5 text-brand-primary hover:text-brand-primary-dark"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Copy Link */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  {t('resources.share_modal.copy_link')}
                </label>
                {copied && (
                  <span className="text-xs text-green-600 flex items-center animate-fadeIn">
                    <Check className="h-3 w-3 mr-1" />
                    {t('resources.share_modal.copied')}
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={shareableLink}
                  className="flex-1 bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-500"
                />
                <button
                  onClick={handleCopyLink}
                  className="p-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-600 transition-colors"
                  title={t('resources.share_modal.copy_link')}
                >
                  <Copy className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          <div className="mt-8 flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium transition-colors"
            >
              {t('resources.share_modal.cancel')}
            </button>
            <button
              onClick={handleShare}
              disabled={isSharing || (shareMethod === 'email' && recipients.length === 0)}
              className="px-4 py-2 bg-brand-primary text-white rounded-lg hover:bg-brand-primary-dark disabled:opacity-60 disabled:cursor-not-allowed font-medium shadow-sm transition-colors"
            >
              {isSharing ? t('resources.share_modal.sharing') : t('resources.share_modal.share_button')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShareResourceModal;