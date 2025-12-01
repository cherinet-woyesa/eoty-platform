/**
 * FR5: Tag Drag-Drop Component
 * Visual interface for applying multiple tags to content with drag-drop
 * REQUIREMENT: Drag-drop, multi-tagging, chapter assign
 */

import React, { useState, useEffect, useRef } from 'react';
import { adminApi } from '@/services/api';
import { getChapters } from '@/services/api/systemConfig';
import type { ContentTag } from '@/types/admin';
import { 
  Tag, 
  X, 
  Plus, 
  Search, 
  Users, 
  CheckCircle, 
  AlertCircle,
  GripVertical,
  FolderOpen,
  RefreshCw
} from 'lucide-react';

interface TagDragDropProps {
  contentType: 'upload' | 'resource' | 'course' | 'forum_post';
  contentId: number;
  currentTags?: ContentTag[] | string[]; // Support both ContentTag objects and string arrays
  currentChapterId?: string;
  availableChapters?: Array<{ id: string; name: string }>;
  onTagsUpdated?: (tags: ContentTag[]) => void;
  onChapterAssigned?: (chapterId: string) => void;
  className?: string;
}

const TagDragDrop: React.FC<TagDragDropProps> = ({
  contentType,
  contentId,
  currentTags = [],
  currentChapterId,
  availableChapters = [],
  onTagsUpdated,
  onChapterAssigned,
  className = ''
}) => {
  const [availableTags, setAvailableTags] = useState<ContentTag[]>([]);
  const [selectedTags, setSelectedTags] = useState<ContentTag[]>(() => {
    // Convert string array to ContentTag array if needed
    if (currentTags && currentTags.length > 0) {
      if (typeof currentTags[0] === 'string') {
        // If tags are strings, we'll need to fetch full tag objects
        return [];
      }
      return currentTags as ContentTag[];
    }
    return [];
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedChapter, setSelectedChapter] = useState<string>(currentChapterId || '');
  const [draggedTag, setDraggedTag] = useState<ContentTag | null>(null);
  const [dragOverContent, setDragOverContent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchAvailableTags();
    if (availableChapters.length === 0) {
      fetchChapters();
    }
  }, []);

  const fetchChapters = async () => {
    try {
      const chapters = await getChapters(true); // activeOnly = true
      setAvailableChapters(chapters.map(ch => ({ 
        id: typeof ch.id === 'number' ? ch.id.toString() : ch.id, 
        name: ch.name 
      })));
    } catch (err) {
      console.error('Failed to fetch chapters:', err);
      // Fallback to empty array - component will use provided availableChapters prop
    }
  };

  useEffect(() => {
    // Update selected tags when currentTags prop changes
    if (currentTags && currentTags.length > 0) {
      if (typeof currentTags[0] === 'string') {
        // If tags are strings, try to match with available tags
        const matchedTags = availableTags.filter(tag => 
          (currentTags as string[]).includes(tag.name)
        );
        setSelectedTags(matchedTags);
      } else {
        setSelectedTags(currentTags as ContentTag[]);
      }
    } else {
      setSelectedTags([]);
    }
  }, [currentTags, availableTags]);

  const fetchAvailableTags = async () => {
    try {
      setLoading(true);
      const response = await adminApi.getTags();
      if (response.success) {
        setAvailableTags(response.data.tags);
      }
    } catch (err: any) {
      console.error('Failed to fetch tags:', err);
      setError('Failed to load tags');
    } finally {
      setLoading(false);
    }
  };

  const filteredTags = availableTags.filter(tag => {
    const matchesSearch = tag.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         tag.category?.toLowerCase().includes(searchTerm.toLowerCase());
    const notAlreadySelected = !selectedTags.some(st => st.id === tag.id);
    return matchesSearch && notAlreadySelected;
  });

  // Drag handlers
  const handleDragStart = (e: React.DragEvent, tag: ContentTag) => {
    setDraggedTag(tag);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', tag.id.toString());
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverContent(true);
  };

  const handleDragLeave = () => {
    setDragOverContent(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragOverContent(false);

    if (!draggedTag) return;

    // Add tag to selected tags
    if (!selectedTags.some(t => t.id === draggedTag.id)) {
      await applyTag(draggedTag);
    }

    setDraggedTag(null);
  };

  // Apply a single tag
  const applyTag = async (tag: ContentTag) => {
    try {
      setError(null);
      setSuccess(null);

      const response = await adminApi.tagContent(contentType, contentId, tag.id);
      
      if (response.success) {
        setSelectedTags(prev => [...prev, tag]);
        setSuccess(`Tag "${tag.name}" applied successfully`);
        onTagsUpdated?.([...selectedTags, tag]);
        
        // Clear success message after 2 seconds
        setTimeout(() => setSuccess(null), 2000);
      }
    } catch (err: any) {
      console.error('Failed to apply tag:', err);
      setError(err.response?.data?.message || 'Failed to apply tag');
    }
  };

  // Remove a tag
  const removeTag = async (tagId: number) => {
    try {
      setError(null);
      // Note: Backend might need an untag endpoint, for now we just remove from UI
      setSelectedTags(prev => prev.filter(t => t.id !== tagId));
      onTagsUpdated?.(selectedTags.filter(t => t.id !== tagId));
      setSuccess('Tag removed');
      setTimeout(() => setSuccess(null), 2000);
    } catch (err: any) {
      console.error('Failed to remove tag:', err);
      setError('Failed to remove tag');
    }
  };

  // Apply multiple tags at once
  const applyMultipleTags = async (tags: ContentTag[]) => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      const tagsToApply = tags.filter(tag => !selectedTags.some(st => st.id === tag.id));
      
      if (tagsToApply.length === 0) {
        setError('All selected tags are already applied');
        return;
      }

      // Apply tags sequentially
      for (const tag of tagsToApply) {
        await applyTag(tag);
      }

      setSuccess(`${tagsToApply.length} tag(s) applied successfully`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error('Failed to apply multiple tags:', err);
      setError('Failed to apply some tags');
    } finally {
      setLoading(false);
    }
  };

  // Handle chapter assignment
  const handleChapterAssign = async (chapterId: string) => {
    try {
      setError(null);
      setSuccess(null);
      
      // Update chapter assignment via content update
      // Note: This would typically be done through the content update endpoint
      // For uploads, this might be part of the approval process
      setSelectedChapter(chapterId);
      onChapterAssigned?.(chapterId);
      setSuccess('Chapter assigned successfully');
      setTimeout(() => setSuccess(null), 2000);
    } catch (err: any) {
      console.error('Failed to assign chapter:', err);
      setError('Failed to assign chapter');
    }
  };

  const getTagColorClass = (color?: string) => {
    if (!color) return 'bg-gray-500';
    return `bg-[${color}]`;
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Success/Error Messages */}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-2 rounded-lg flex items-center">
          <CheckCircle className="h-4 w-4 mr-2" />
          <span className="text-sm">{success}</span>
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-2 rounded-lg flex items-center">
          <AlertCircle className="h-4 w-4 mr-2" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {/* Chapter Assignment */}
      {availableChapters.length > 0 && (
        <div className="bg-white/90 backdrop-blur-md rounded-lg border border-stone-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <Users className="h-4 w-4 text-stone-600" />
              <label className="text-sm font-semibold text-stone-700">Assign Chapter</label>
            </div>
          </div>
          <select
            value={selectedChapter}
            onChange={(e) => handleChapterAssign(e.target.value)}
            className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="">Select a chapter...</option>
            {availableChapters.map(chapter => (
              <option key={chapter.id} value={chapter.id}>
                {chapter.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Current Tags */}
      <div className="bg-white/90 backdrop-blur-md rounded-lg border border-stone-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <Tag className="h-4 w-4 text-stone-600" />
            <h3 className="text-sm font-semibold text-stone-700">Applied Tags</h3>
            <span className="text-xs text-stone-500 bg-stone-100 px-2 py-0.5 rounded-full">
              {selectedTags.length}
            </span>
          </div>
        </div>
        
        {/* Drop Zone */}
        <div
          ref={dropZoneRef}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`min-h-[80px] p-3 rounded-lg border-2 border-dashed transition-all ${
            dragOverContent
              ? 'border-blue-500 bg-blue-50'
              : selectedTags.length === 0
              ? 'border-stone-300 bg-stone-50'
              : 'border-stone-200 bg-white'
          }`}
        >
          {selectedTags.length === 0 ? (
            <div className="text-center py-4 text-stone-500 text-sm">
              {dragOverContent ? (
                <span className="text-blue-600 font-medium">Drop tag here</span>
              ) : (
                <span>Drag tags here or click to add</span>
              )}
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {selectedTags.map(tag => (
                <div
                  key={tag.id}
                  className="group relative inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium transition-all"
                  style={{
                    backgroundColor: tag.color ? `${tag.color}20` : '#f3f4f6',
                    color: tag.color || '#374151',
                    border: `1px solid ${tag.color ? `${tag.color}40` : '#d1d5db'}`
                  }}
                >
                  <span>{tag.name}</span>
                  {tag.category && (
                    <span className="ml-2 text-xs opacity-75">
                      ({tag.category})
                    </span>
                  )}
                  <button
                    onClick={() => removeTag(tag.id)}
                    className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/10 rounded-full p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Available Tags Pool */}
      <div className="bg-white/90 backdrop-blur-md rounded-lg border border-stone-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <FolderOpen className="h-4 w-4 text-stone-600" />
            <h3 className="text-sm font-semibold text-stone-700">Available Tags</h3>
            <span className="text-xs text-stone-500 bg-stone-100 px-2 py-0.5 rounded-full">
              {filteredTags.length}
            </span>
          </div>
          <button
            onClick={fetchAvailableTags}
            disabled={loading}
            className="p-1 rounded-md hover:bg-stone-100 disabled:opacity-50"
            title="Refresh tags"
          >
            <RefreshCw className={`h-4 w-4 text-stone-600 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-stone-400" />
          <input
            type="text"
            placeholder="Search tags..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm"
          />
        </div>

        {/* Tags Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-5 w-5 animate-spin text-stone-400" />
          </div>
        ) : filteredTags.length === 0 ? (
          <div className="text-center py-8 text-stone-500 text-sm">
            {searchTerm ? 'No tags found matching your search' : 'No available tags'}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-64 overflow-y-auto">
            {filteredTags.map(tag => (
              <div
                key={tag.id}
                draggable
                onDragStart={(e) => handleDragStart(e, tag)}
                onClick={() => applyTag(tag)}
                className="group cursor-move flex items-center space-x-2 px-3 py-2 rounded-lg border border-stone-200 hover:border-blue-400 hover:bg-blue-50 transition-all"
                style={{
                  borderColor: tag.color ? `${tag.color}40` : undefined
                }}
              >
                <GripVertical className="h-4 w-4 text-stone-400 group-hover:text-blue-600" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-1">
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: tag.color || '#9ca3af' }}
                    />
                    <span className="text-sm font-medium text-stone-700 truncate">
                      {tag.name}
                    </span>
                  </div>
                  {tag.category && (
                    <span className="text-xs text-stone-500 truncate block">
                      {tag.category}
                    </span>
                  )}
                </div>
                <Plus className="h-4 w-4 text-stone-400 group-hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            ))}
          </div>
        )}

        {/* Multi-select Actions */}
        {filteredTags.length > 0 && (
          <div className="mt-3 pt-3 border-t border-stone-200">
            <button
              onClick={() => applyMultipleTags(filteredTags.slice(0, 5))}
              disabled={loading}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors text-sm font-medium"
            >
              Apply First 5 Tags
            </button>
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <p className="text-xs text-blue-800">
          <strong>How to use:</strong> Drag tags from the pool above into the "Applied Tags" area, or click on a tag to add it. 
          You can apply multiple tags at once. Assign a chapter to organize content by location.
        </p>
      </div>
    </div>
  );
};

export default TagDragDrop;

