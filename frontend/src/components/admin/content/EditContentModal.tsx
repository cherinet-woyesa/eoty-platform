/**
 * FR5: Edit Content Modal
 * Component for editing any content type
 * REQUIREMENT: Edit content
 */

import React, { useState, useEffect } from 'react';
import { X, Save, AlertTriangle } from 'lucide-react';

interface EditContentModalProps {
  isOpen: boolean;
  contentType: string;
  contentId: number;
  currentContent: any;
  onClose: () => void;
  onSave: (updates: any) => Promise<void>;
}

const EditContentModal: React.FC<EditContentModalProps> = ({
  isOpen,
  contentType,
  contentId,
  currentContent,
  onClose,
  onSave
}) => {
  const [updates, setUpdates] = useState<any>({});
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (isOpen && currentContent) {
      // Initialize updates based on content type
      if (contentType === 'forum_post') {
        setUpdates({
          content: currentContent.content || '',
          title: currentContent.title || ''
        });
      } else if (contentType === 'resource') {
        setUpdates({
          title: currentContent.title || '',
          description: currentContent.description || ''
        });
      } else if (contentType === 'course') {
        setUpdates({
          title: currentContent.title || '',
          description: currentContent.description || ''
        });
      }
    }
  }, [isOpen, currentContent, contentType]);

  if (!isOpen) return null;

  const handleSave = async () => {
    setIsProcessing(true);
    try {
      await onSave(updates);
      setUpdates({});
      onClose();
    } catch (error) {
      console.error('Failed to edit content:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const renderFormFields = () => {
    switch (contentType) {
      case 'forum_post':
        return (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Post Title
              </label>
              <input
                type="text"
                value={updates.title || ''}
                onChange={(e) => setUpdates({ ...updates, title: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Post Content
              </label>
              <textarea
                value={updates.content || ''}
                onChange={(e) => setUpdates({ ...updates, content: e.target.value })}
                rows={8}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </>
        );
      case 'resource':
        return (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Resource Title
              </label>
              <input
                type="text"
                value={updates.title || ''}
                onChange={(e) => setUpdates({ ...updates, title: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                value={updates.description || ''}
                onChange={(e) => setUpdates({ ...updates, description: e.target.value })}
                rows={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </>
        );
      case 'course':
        return (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Course Title
              </label>
              <input
                type="text"
                value={updates.title || ''}
                onChange={(e) => setUpdates({ ...updates, title: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                value={updates.description || ''}
                onChange={(e) => setUpdates({ ...updates, description: e.target.value })}
                rows={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </>
        );
      default:
        return (
          <div className="text-sm text-gray-600">
            Editing for {contentType} is not yet supported.
          </div>
        );
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-screen overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Edit {contentType.replace('_', ' ')}
            </h3>
            <button
              onClick={onClose}
              className="p-1 rounded-md hover:bg-gray-100"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>

          <div className="mb-4">
            <p className="text-sm text-gray-600">
              Content ID: <span className="font-semibold text-gray-900">{contentId}</span>
            </p>
          </div>

          <div className="space-y-4 mb-4">
            {renderFormFields()}
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <div className="flex items-start">
              <AlertTriangle className="h-5 w-5 text-blue-600 mr-2 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-blue-800">Note</p>
                <p className="text-xs text-blue-700 mt-1">
                  All content edits are logged in the audit trail for compliance.
                </p>
              </div>
            </div>
          </div>

          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isProcessing}
              className="flex-1 flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {isProcessing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditContentModal;


