import React, { useState, useRef, useCallback } from 'react';
import type { UserNote } from '@/types/resources';
import { Save, X, Eye, EyeOff, Users, Lock, Bold, Italic, Underline, List, Link2, Tag, Hash } from 'lucide-react';

interface NotesEditorProps {
  resourceId: number;
  notes?: UserNote[];
  publicNotes?: UserNote[];
  showEditor?: boolean;
  editingNote?: UserNote | null;
  anchorPoint?: string;
  existingNote?: UserNote | null;
  sectionText?: string;
  sectionPosition?: number;
  onSave: (content: string, isPublic: boolean, anchorPoint?: string, sectionText?: string, sectionPosition?: number) => void;
  onCancel: () => void;
}

const NotesEditor: React.FC<NotesEditorProps> = ({ 
  resourceId, 
  anchorPoint, 
  existingNote,
  sectionText,
  sectionPosition,
  onSave, 
  onCancel 
}) => {
  const [content, setContent] = useState(existingNote?.content || '');
  const [isPublic, setIsPublic] = useState(existingNote?.is_public || false);
  const [isSaving, setIsSaving] = useState(false);
  const [tags, setTags] = useState<string[]>(existingNote?.tags || []);
  const [newTag, setNewTag] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Rich text formatting functions
  const applyFormat = useCallback((command: string, value?: string) => {
    if (textareaRef.current) {
      textareaRef.current.focus();
      const start = textareaRef.current.selectionStart;
      const end = textareaRef.current.selectionEnd;
      const selectedText = content.substring(start, end);
      
      let formattedText = '';
      switch (command) {
        case 'bold':
          formattedText = `**${selectedText || 'bold text'}**`;
          break;
        case 'italic':
          formattedText = `*${selectedText || 'italic text'}*`;
          break;
        case 'underline':
          formattedText = `<u>${selectedText || 'underlined text'}</u>`;
          break;
        case 'list':
          formattedText = selectedText ? selectedText.split('\n').map(line => `- ${line}`).join('\n') : '- List item';
          break;
        case 'link':
          formattedText = `[${selectedText || 'link text'}](${value || 'https://example.com'})`;
          break;
        default:
          formattedText = selectedText;
      }
      
      const newContent = content.substring(0, start) + formattedText + content.substring(end);
      setContent(newContent);
      
      // Restore cursor position
      setTimeout(() => {
        if (textareaRef.current) {
          const newPosition = start + formattedText.length;
          textareaRef.current.setSelectionRange(newPosition, newPosition);
        }
      }, 0);
    }
  }, [content]);

  const handleAddTag = useCallback(() => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag('');
    }
  }, [newTag, tags]);

  const handleRemoveTag = useCallback((tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  }, [tags]);

  const handleSave = async () => {
    if (!content.trim()) return;
    
    setIsSaving(true);
    try {
      // REQUIREMENT: Pass section anchoring data if available
      await onSave(content, isPublic, anchorPoint, sectionText, sectionPosition);
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
        {/* Rich Text Toolbar */}
        <div className="mb-3 flex items-center gap-1 p-2 bg-gray-50 rounded-md border border-gray-200">
          <button
            type="button"
            onClick={() => applyFormat('bold')}
            className="p-1.5 rounded hover:bg-gray-200 transition-colors"
            title="Bold"
          >
            <Bold className="h-4 w-4 text-gray-600" />
          </button>
          <button
            type="button"
            onClick={() => applyFormat('italic')}
            className="p-1.5 rounded hover:bg-gray-200 transition-colors"
            title="Italic"
          >
            <Italic className="h-4 w-4 text-gray-600" />
          </button>
          <button
            type="button"
            onClick={() => applyFormat('underline')}
            className="p-1.5 rounded hover:bg-gray-200 transition-colors"
            title="Underline"
          >
            <Underline className="h-4 w-4 text-gray-600" />
          </button>
          <div className="w-px h-6 bg-gray-300 mx-1" />
          <button
            type="button"
            onClick={() => applyFormat('list')}
            className="p-1.5 rounded hover:bg-gray-200 transition-colors"
            title="Bullet List"
          >
            <List className="h-4 w-4 text-gray-600" />
          </button>
          <button
            type="button"
            onClick={() => {
              const url = prompt('Enter URL:');
              if (url) applyFormat('link', url);
            }}
            className="p-1.5 rounded hover:bg-gray-200 transition-colors"
            title="Add Link"
          >
            <Link2 className="h-4 w-4 text-gray-600" />
          </button>
        </div>

        <div className="mb-4">
          <label htmlFor="note-content" className="block text-sm font-medium text-gray-700 mb-2">
            Note Content
          </label>
          <textarea
            ref={textareaRef}
            id="note-content"
            rows={8}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
            placeholder="Write your note here... Use Markdown formatting: **bold**, *italic*, - list items"
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
          <p className="mt-1 text-xs text-gray-500">
            Supports Markdown: **bold**, *italic*, - lists, [links](url)
          </p>
        </div>

        {/* Tags Section */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Tags
          </label>
          <div className="flex flex-wrap gap-2 mb-2">
            {tags.map((tag, index) => (
              <span
                key={index}
                className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded-md text-xs"
              >
                <Hash className="h-3 w-3" />
                {tag}
                <button
                  type="button"
                  onClick={() => handleRemoveTag(tag)}
                  className="ml-1 hover:text-blue-600"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddTag();
                }
              }}
              placeholder="Add tag..."
              className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <button
              type="button"
              onClick={handleAddTag}
              className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 text-sm transition-colors"
            >
              <Tag className="h-4 w-4" />
            </button>
          </div>
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