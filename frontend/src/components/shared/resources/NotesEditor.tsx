import React, { useState } from 'react';
import type { UserNote } from '@/types/resources';
import { Save, X, Eye, EyeOff, Users, Lock } from 'lucide-react';

interface NotesEditorProps {
  resourceId: number;
  anchorPoint?: string;
  existingNote?: UserNote | null;
  onSave: (content: string, isPublic: boolean, anchorPoint?: string) => void;
  onCancel: () => void;
}

const NotesEditor: React.FC<NotesEditorProps> = ({ 
  resourceId, 
  anchorPoint, 
  existingNote, 
  onSave, 
  onCancel 
}) => {
  const [content, setContent] = useState(existingNote?.content || '');
  const [isPublic, setIsPublic] = useState(existingNote?.is_public || false);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!content.trim()) return;
    
    setIsSaving(true);
    try {
      await onSave(content, isPublic, anchorPoint);
    } catch (error) {
      console.error('Failed to save note:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">
            {existingNote ? 'Edit Note' : 'Add New Note'}
          </h3>
          <button
            onClick={onCancel}
            className="p-1 rounded-md hover:bg-gray-100"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>
        
        {anchorPoint && (
          <div className="mt-2 text-sm text-gray-500">
            Note anchored to: {anchorPoint}
          </div>
        )}
      </div>
      
      <div className="p-4">
        <div className="mb-4">
          <label htmlFor="note-content" className="block text-sm font-medium text-gray-700 mb-2">
            Note Content
          </label>
          <textarea
            id="note-content"
            rows={6}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Write your note here..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <button
              type="button"
              onClick={() => setIsPublic(!isPublic)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm ${
                isPublic 
                  ? 'bg-blue-100 text-blue-800 hover:bg-blue-200' 
                  : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
              }`}
            >
              {isPublic ? (
                <>
                  <Users className="h-4 w-4" />
                  Shared with chapter
                </>
              ) : (
                <>
                  <Lock className="h-4 w-4" />
                  Private
                </>
              )}
            </button>
            
            <div className="ml-3 text-sm text-gray-500">
              {isPublic ? (
                <span>Visible to chapter members</span>
              ) : (
                <span>Only visible to you</span>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!content.trim() || isSaving}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save Note
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotesEditor;