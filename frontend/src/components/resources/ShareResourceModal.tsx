import React, { useState } from 'react';
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-screen overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Share Resource</h3>
            <button
              onClick={onClose}
              className="p-1 rounded-md hover:bg-gray-100"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>
          
          <div className="mb-6">
            <p className="text-gray-700 font-medium">{resourceName}</p>
          </div>
          
          <div className="space-y-6">
            {/* Share Method Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Share with
              </label>
              <div className="space-y-2">
                <div 
                  className={`flex items-center p-3 rounded-lg border cursor-pointer ${
                    shareMethod === 'chapter' 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                  onClick={() => setShareMethod('chapter')}
                >
                  <Users className={`h-5 w-5 ${shareMethod === 'chapter' ? 'text-blue-500' : 'text-gray-400'}`} />
                  <div className="ml-3">
                    <div className="text-sm font-medium text-gray-900">Chapter Members</div>
                    <div className="text-xs text-gray-500">Share with all members of your chapter</div>
                  </div>
                  {shareMethod === 'chapter' && (
                    <div className="ml-auto w-2 h-2 rounded-full bg-blue-500"></div>
                  )}
                </div>
                
                <div 
                  className={`flex items-center p-3 rounded-lg border cursor-pointer ${
                    shareMethod === 'specific' 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                  onClick={() => setShareMethod('specific')}
                >
                  <Mail className={`h-5 w-5 ${shareMethod === 'specific' ? 'text-blue-500' : 'text-gray-400'}`} />
                  <div className="ml-3">
                    <div className="text-sm font-medium text-gray-900">Specific People</div>
                    <div className="text-xs text-gray-500">Share with specific email addresses</div>
                  </div>
                  {shareMethod === 'specific' && (
                    <div className="ml-auto w-2 h-2 rounded-full bg-blue-500"></div>
                  )}
                </div>
              </div>
            </div>
            
            {/* Email Input for Specific Sharing */}
            {shareMethod === 'specific' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Recipients
                </label>
                <div className="flex">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter email address"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    onKeyPress={(e) => e.key === 'Enter' && handleAddEmail()}
                  />
                  <button
                    onClick={handleAddEmail}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-r-md hover:bg-gray-200"
                  >
                    Add
                  </button>
                </div>
                
                {recipients.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {recipients.map((recipient, index) => (
                      <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                        <span className="text-sm text-gray-700">{recipient}</span>
                        <button
                          onClick={() => handleRemoveEmail(index)}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            
            {/* Copy Link */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Or share via link
              </label>
              <div className="flex">
                <input
                  type="text"
                  value={shareableLink}
                  readOnly
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md bg-gray-50 text-sm"
                />
                <button
                  onClick={handleCopyLink}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-r-md hover:bg-gray-200 flex items-center"
                >
                  {copied ? (
                    <>
                      <Check className="h-4 w-4 text-green-500 mr-1" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 mr-1" />
                      Copy
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
          
          <div className="mt-6 flex space-x-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancel
            </button>
            <button
              onClick={handleShare}
              disabled={isSharing || (shareMethod === 'specific' && recipients.length === 0)}
              className="flex-1 flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {isSharing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Sharing...
                </>
              ) : (
                'Share Resource'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShareResourceModal;