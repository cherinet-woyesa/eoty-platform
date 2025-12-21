import React, { useState, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
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
    <div className="bg-white/90 backdrop-blur-md rounded-xl shadow-lg border border-gray-200">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-brand-soft rounded-lg flex items-center justify-center">
              <span className="text-lg">📝</span>
            </div>
            <h3 className="text-xl font-bold text-gray-800">
              {existingNote ? t('resources.notes.edit_note') : t('resources.notes.add_new_note')}
            </h3>
          </div>
          <button
            onClick={onCancel}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {anchorPoint && (
          <div className="mt-3 p-3 bg-brand-soft/30 rounded-lg border border-brand-soft">
            <div className="flex items-center gap-2">
              <span className="text-brand-primary">📍</span>
              <span className="text-sm font-medium text-brand-primary">
                {t('resources.notes.anchored_to')}: <span className="font-semibold">{anchorPoint}</span>
              </span>
            </div>
            {sectionText && (
              <p className="text-xs text-gray-600 mt-1 italic">
                "{sectionText.substring(0, 100)}{sectionText.length > 100 ? '...' : ''}"
              </p>
            )}
          </div>
        )}
      </div>

      <div className="p-6">
        {/* Rich Text Toolbar */}
        <div className="mb-4 flex items-center gap-1 p-3 bg-gray-50 rounded-lg border border-gray-200">
          <button
            type="button"
            onClick={() => applyFormat('bold')}
            className="p-2 rounded-md hover:bg-brand-soft/50 transition-colors"
            title="Bold"
          >
            <Bold className="h-4 w-4 text-gray-600" />
          </button>
          <button
            type="button"
            onClick={() => applyFormat('italic')}
            className="p-2 rounded-md hover:bg-brand-soft/50 transition-colors"
            title="Italic"
          >
            <Italic className="h-4 w-4 text-gray-600" />
          </button>
          <button
            type="button"
            onClick={() => applyFormat('underline')}
            className="p-2 rounded-md hover:bg-brand-soft/50 transition-colors"
            title="Underline"
          >
            <Underline className="h-4 w-4 text-gray-600" />
          </button>
          <div className="w-px h-6 bg-gray-300 mx-2" />
          <button
            type="button"
            onClick={() => applyFormat('list')}
            className="p-2 rounded-md hover:bg-brand-soft/50 transition-colors"
            title="Bullet List"
          >
            <List className="h-4 w-4 text-gray-600" />
          </button>
          <button
            type="button"
            onClick={() => {
              const url = prompt(t('resources.notes.enter_url'));
              if (url) applyFormat('link', url);
            }}
            className="p-2 rounded-md hover:bg-brand-soft/50 transition-colors"
            title="Add Link"
          >
            <Link2 className="h-4 w-4 text-gray-600" />
          </button>
        </div>

        <div className="mb-6">
          <label htmlFor="note-content" className="block text-sm font-semibold text-gray-800 mb-3">
            ✍️ {t('resources.notes.note_content')}
          </label>
          <textarea
            ref={textareaRef}
            id="note-content"
            rows={8}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-brand-primary font-mono text-sm bg-white/80 transition-all duration-200"
            placeholder={t('resources.notes.placeholder')}
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />
          <p className="mt-2 text-xs text-gray-600 bg-gray-50 px-3 py-2 rounded-md border border-gray-200">
            💡 {t('resources.notes.markdown_support')}
          </p>
        </div>

        {/* Tags Section */}
        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-800 mb-3">
            🏷️ {t('resources.notes.tags')}
          </label>
          <div className="flex flex-wrap gap-2 mb-3">
            {tags.map((tag, index) => (
              <span
                key={index}
                className="inline-flex items-center gap-2 px-3 py-1.5 bg-brand-soft/20 text-brand-primary border border-brand-soft/50 rounded-full text-sm font-medium"
              >
                <Hash className="h-3 w-3" />
                {tag}
                <button
                  type="button"
                  onClick={() => handleRemoveTag(tag)}
                  className="ml-1 hover:text-brand-primary/80 transition-colors"
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
              placeholder={t('resources.notes.add_tag_placeholder')}
              className="flex-1 px-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-brand-primary bg-white/80 transition-all duration-200"
            />
            <button
              type="button"
              onClick={handleAddTag}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors font-medium"
            >
              <Tag className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Privacy Settings */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => setIsPublic(!isPublic)}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isPublic
                    ? 'bg-blue-50 text-blue-800 border border-blue-200 shadow-sm'
                    : 'bg-gray-100 text-gray-700 border border-gray-300 shadow-sm'
                }`}
              >
                {isPublic ? (
                  <>
                    <Users className="h-4 w-4" />
                    👥 {t('resources.notes.shared_with_chapter')}
                  </>
                ) : (
                  <>
                    <Lock className="h-4 w-4" />
                    🔒 {t('resources.notes.private_note')}
                  </>
                )}
              </button>

              <div className="text-sm text-gray-600">
                {isPublic ? (
                  <span>📖 {t('resources.notes.visible_to_chapter')}</span>
                ) : (
                  <span>👤 {t('resources.notes.visible_to_you')}</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-2.5 bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 rounded-lg font-medium transition-colors"
          >
            ❌ {t('resources.notes.cancel')}
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!content.trim() || isSaving}
            className="flex items-center gap-2 px-6 py-2.5 bg-brand-primary hover:bg-brand-primary-dark text-white border border-transparent rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-md hover:shadow-lg"
          >
            {isSaving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                💾 {t('resources.notes.saving')}
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                💾 {t('resources.notes.save_note')}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotesEditor;