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
    <div className="bg-white/90 backdrop-blur-md rounded-xl shadow-lg border border-stone-200">
      <div className="p-6 border-b border-stone-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-r from-[#27AE60] to-[#16A085] rounded-lg flex items-center justify-center">
              📝
            </div>
            <h3 className="text-xl font-bold text-stone-800">
              {existingNote ? '✏️ Edit Note' : '📝 Add New Note'}
            </h3>
          </div>
          <button
            onClick={onCancel}
            className="p-2 rounded-lg hover:bg-stone-100 transition-colors"
          >
            <X className="h-5 w-5 text-stone-500" />
          </button>
        </div>

        {anchorPoint && (
          <div className="mt-3 p-3 bg-gradient-to-r from-[#27AE60]/10 to-[#16A085]/10 rounded-lg border border-[#27AE60]/20">
            <div className="flex items-center gap-2">
              <span className="text-[#27AE60]">📍</span>
              <span className="text-sm font-medium text-[#27AE60]">
                Note anchored to: <span className="font-semibold">{anchorPoint}</span>
              </span>
            </div>
            {sectionText && (
              <p className="text-xs text-stone-600 mt-1 italic">
                "{sectionText.substring(0, 100)}{sectionText.length > 100 ? '...' : ''}"
              </p>
            )}
          </div>
        )}
      </div>

      <div className="p-6">
        {/* Rich Text Toolbar */}
        <div className="mb-4 flex items-center gap-1 p-3 bg-gradient-to-r from-stone-50 to-neutral-50 rounded-lg border border-stone-200">
          <button
            type="button"
            onClick={() => applyFormat('bold')}
            className="p-2 rounded-md hover:bg-[#27AE60]/10 transition-colors"
            title="Bold"
          >
            <Bold className="h-4 w-4 text-stone-600" />
          </button>
          <button
            type="button"
            onClick={() => applyFormat('italic')}
            className="p-2 rounded-md hover:bg-[#27AE60]/10 transition-colors"
            title="Italic"
          >
            <Italic className="h-4 w-4 text-stone-600" />
          </button>
          <button
            type="button"
            onClick={() => applyFormat('underline')}
            className="p-2 rounded-md hover:bg-[#27AE60]/10 transition-colors"
            title="Underline"
          >
            <Underline className="h-4 w-4 text-stone-600" />
          </button>
          <div className="w-px h-6 bg-stone-300 mx-2" />
          <button
            type="button"
            onClick={() => applyFormat('list')}
            className="p-2 rounded-md hover:bg-[#27AE60]/10 transition-colors"
            title="Bullet List"
          >
            <List className="h-4 w-4 text-stone-600" />
          </button>
          <button
            type="button"
            onClick={() => {
              const url = prompt('Enter URL:');
              if (url) applyFormat('link', url);
            }}
            className="p-2 rounded-md hover:bg-[#27AE60]/10 transition-colors"
            title="Add Link"
          >
            <Link2 className="h-4 w-4 text-stone-600" />
          </button>
        </div>

        <div className="mb-6">
          <label htmlFor="note-content" className="block text-sm font-semibold text-stone-800 mb-3">
            ✍️ Note Content
          </label>
          <textarea
            ref={textareaRef}
            id="note-content"
            rows={8}
            className="w-full px-4 py-3 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#27AE60] focus:border-[#27AE60] font-mono text-sm bg-white/80 transition-all duration-200"
            placeholder="Write your note here... Use Markdown formatting: **bold**, *italic*, - list items"
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
          <p className="mt-2 text-xs text-stone-600 bg-stone-50 px-3 py-2 rounded-md border border-stone-200">
            💡 Supports Markdown: **bold**, *italic*, - lists, [links](url)
          </p>
        </div>

        {/* Tags Section */}
        <div className="mb-6">
          <label className="block text-sm font-semibold text-stone-800 mb-3">
            🏷️ Tags
          </label>
          <div className="flex flex-wrap gap-2 mb-3">
            {tags.map((tag, index) => (
              <span
                key={index}
                className="inline-flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-[#27AE60]/10 to-[#16A085]/10 text-[#27AE60] border border-[#27AE60]/30 rounded-full text-sm font-medium"
              >
                <Hash className="h-3 w-3" />
                {tag}
                <button
                  type="button"
                  onClick={() => handleRemoveTag(tag)}
                  className="ml-1 hover:text-[#27AE60]/80 transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-3">
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
              placeholder="Add a tag..."
              className="flex-1 px-4 py-2 text-sm border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#27AE60] focus:border-[#27AE60] bg-white/80 transition-all duration-200"
            />
            <button
              type="button"
              onClick={handleAddTag}
              className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg transition-colors font-medium"
            >
              <Tag className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Privacy Settings */}
        <div className="mb-6 p-4 bg-gradient-to-r from-stone-50 to-neutral-50 rounded-lg border border-stone-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => setIsPublic(!isPublic)}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isPublic
                    ? 'bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-800 border border-blue-200 shadow-sm'
                    : 'bg-gradient-to-r from-stone-100 to-neutral-100 text-stone-700 border border-stone-300 shadow-sm'
                }`}
              >
                {isPublic ? (
                  <>
                    <Users className="h-4 w-4" />
                    👥 Shared with Chapter
                  </>
                ) : (
                  <>
                    <Lock className="h-4 w-4" />
                    🔒 Private Note
                  </>
                )}
              </button>

              <div className="text-sm text-stone-600">
                {isPublic ? (
                  <span>📖 Visible to all chapter members for collaborative learning</span>
                ) : (
                  <span>👤 Only visible to you for personal reflection</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-200">
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-2.5 text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-lg font-medium transition-colors"
          >
            ❌ Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!content.trim() || isSaving}
            className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-[#27AE60] to-[#16A085] hover:from-[#27AE60]/90 hover:to-[#16A085]/90 text-stone-900 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-md hover:shadow-lg"
          >
            {isSaving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-stone-900"></div>
                💾 Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                💾 Save Note
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotesEditor;