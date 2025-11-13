import React, { useState, useEffect, useRef } from 'react';
import { adminApi } from '@/services/api';
import type { ContentTag } from '@/types/admin';
import { 
  GripVertical, 
  Plus, 
  Edit, 
  Trash2, 
  Save, 
  X, 
  Search,
  Filter,
  Move,
  Hash,
  Tag as TagIcon,
  Palette,
  FolderOpen,
  Users,
  CheckCircle,
  Circle
} from 'lucide-react';

const TagManager: React.FC = () => {
  const [tags, setTags] = useState<ContentTag[]>([]);
  const [filteredTags, setFilteredTags] = useState<ContentTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newTag, setNewTag] = useState({
    name: '',
    category: '',
    color: '#3b82f6' // Default blue color
  });
  const [editingTag, setEditingTag] = useState<ContentTag | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    category: '',
    color: '#3b82f6'
  });
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [draggedTag, setDraggedTag] = useState<ContentTag | null>(null);
  const [chapters] = useState([
    { id: 'addis-ababa', name: 'Addis Ababa' },
    { id: 'toronto', name: 'Toronto' },
    { id: 'washington', name: 'Washington DC' },
    { id: 'london', name: 'London' }
  ]);
  const [selectedChapter, setSelectedChapter] = useState('addis-ababa');

  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);

  useEffect(() => {
    fetchTags();
  }, []);

  useEffect(() => {
    filterTags();
  }, [tags, searchTerm, categoryFilter]);

  const fetchTags = async () => {
    try {
      setLoading(true);
      const response = await adminApi.getTags();
      setTags(response.data.tags);
      setError(null);
    } catch (err: any) {
      console.error('Failed to fetch tags:', err);
      setError('Failed to load tags');
    } finally {
      setLoading(false);
    }
  };

  const filterTags = () => {
    let result = tags;
    
    // Apply search filter
    if (searchTerm) {
      result = result.filter(tag => 
        tag.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (tag.category && tag.category.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }
    
    // Apply category filter
    if (categoryFilter !== 'all') {
      result = result.filter(tag => 
        categoryFilter === 'uncategorized' 
          ? !tag.category 
          : tag.category === categoryFilter
      );
    }
    
    setFilteredTags(result);
  };

  const handleCreateTag = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await adminApi.createTag(newTag);
      setNewTag({
        name: '',
        category: '',
        color: '#3b82f6'
      });
      setShowCreateForm(false);
      fetchTags(); // Refresh the tag list
    } catch (err: any) {
      console.error('Failed to create tag:', err);
      setError('Failed to create tag: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleUpdateTag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTag) return;
    
    try {
      // In a real implementation, we would call an API to update the tag
      // For now, we'll just update the local state
      const updatedTags = tags.map(tag => 
        tag.id === editingTag.id 
          ? { ...tag, ...editForm } 
          : tag
      );
      
      setTags(updatedTags);
      setEditingTag(null);
      setEditForm({
        name: '',
        category: '',
        color: '#3b82f6'
      });
      fetchTags(); // Refresh the tag list
    } catch (err: any) {
      console.error('Failed to update tag:', err);
      setError('Failed to update tag: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleDeleteTag = async (tagId: number) => {
    try {
      // In a real implementation, we would call an API to delete the tag
      // For now, we'll just update the local state
      const updatedTags = tags.filter(tag => tag.id !== tagId);
      setTags(updatedTags);
      fetchTags(); // Refresh the tag list
    } catch (err: any) {
      console.error('Failed to delete tag:', err);
      setError('Failed to delete tag: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setNewTag(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleEditInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setEditForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const startEditing = (tag: ContentTag) => {
    setEditingTag(tag);
    setEditForm({
      name: tag.name,
      category: tag.category || '',
      color: tag.color
    });
  };

  const cancelEditing = () => {
    setEditingTag(null);
    setEditForm({
      name: '',
      category: '',
      color: '#3b82f6'
    });
  };

  const getColorClass = (color: string) => {
    // Convert hex color to a Tailwind-compatible background class
    const colorMap: Record<string, string> = {
      '#3b82f6': 'bg-blue-500',
      '#10b981': 'bg-green-500',
      '#f59e0b': 'bg-yellow-500',
      '#ef4444': 'bg-red-500',
      '#8b5cf6': 'bg-violet-500',
      '#ec4899': 'bg-pink-500',
    };
    
    return colorMap[color] || 'bg-gray-500';
  };

  const getTextColorClass = (color: string) => {
    // Determine if text should be light or dark based on background color
    const darkColors = ['#ef4444', '#8b5cf6', '#ec4899', '#000000'];
    return darkColors.includes(color) ? 'text-white' : 'text-gray-900';
  };

  const getUniqueCategories = () => {
    const categories = tags
      .map(tag => tag.category)
      .filter((category, index, self) => category && self.indexOf(category) === index) as string[];
    return categories;
  };

  // Drag and drop functions
  const handleDragStart = (e: React.DragEvent, index: number) => {
    dragItem.current = index;
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnter = (e: React.DragEvent, index: number) => {
    dragOverItem.current = index;
    e.preventDefault();
  };

  const handleDragEnd = (e: React.DragEvent) => {
    if (dragItem.current !== null && dragOverItem.current !== null) {
      const newTags = [...filteredTags];
      const draggedItem = newTags[dragItem.current];
      newTags.splice(dragItem.current, 1);
      newTags.splice(dragOverItem.current, 0, draggedItem);
      
      // Update the order in the main tags array
      const updatedTags = tags.map(tag => {
        const newIndex = newTags.findIndex(t => t.id === tag.id);
        return newIndex !== -1 ? newTags[newIndex] : tag;
      });
      
      setTags(updatedTags);
    }
    
    dragItem.current = null;
    dragOverItem.current = null;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-stone-50 via-neutral-50 to-slate-50 flex items-center justify-center p-4">
        <div className="w-8 h-8 border-t-2 border-[#39FF14] border-solid rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-50 via-neutral-50 to-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#39FF14]/20 via-[#00FFC6]/20 to-[#00FFFF]/20 rounded-xl p-6 border border-[#39FF14]/30 shadow-lg backdrop-blur-sm">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-2">
                <div className="relative">
                  <div className="absolute inset-0 bg-[#39FF14]/30 rounded-lg blur-md"></div>
                  <div className="relative p-2 bg-gradient-to-br from-[#39FF14]/20 to-[#00FFC6]/20 rounded-lg border border-[#39FF14]/30">
                    <TagIcon className="h-6 w-6 text-[#39FF14]" />
                  </div>
                </div>
                <h1 className="text-3xl font-bold text-stone-800">Content Tags</h1>
              </div>
              <p className="text-stone-700 text-sm mt-2">Manage and organize content with tags</p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex items-center bg-white/90 backdrop-blur-sm rounded-lg px-3 py-2 border border-stone-200">
                <Users className="h-4 w-4 text-stone-500 mr-2" />
                <select
                  value={selectedChapter}
                  onChange={(e) => setSelectedChapter(e.target.value)}
                  className="bg-transparent text-sm font-medium focus:outline-none text-stone-700"
                >
                  {chapters.map(chapter => (
                    <option key={chapter.id} value={chapter.id}>
                      {chapter.name}
                    </option>
                  ))}
                </select>
              </div>
              
              <button
                onClick={() => setShowCreateForm(!showCreateForm)}
                className="flex items-center px-4 py-2 bg-gradient-to-r from-[#39FF14] to-[#00FFC6] hover:from-[#39FF14]/90 hover:to-[#00FFC6]/90 text-stone-800 text-sm font-semibold rounded-lg transition-all shadow-md hover:shadow-lg"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Tag
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50/90 backdrop-blur-sm border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Filters */}
        <div className="bg-white/90 backdrop-blur-md rounded-xl border border-stone-200 p-4 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-stone-400" />
                <input
                  type="text"
                  placeholder="Search tags..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#39FF14]/50 focus:border-[#39FF14]/50 bg-white/90 backdrop-blur-sm"
                />
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-stone-500" />
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#39FF14]/50 focus:border-[#39FF14]/50 bg-white/90 backdrop-blur-sm"
              >
            <option value="all">All Categories</option>
            <option value="uncategorized">Uncategorized</option>
            {getUniqueCategories().map(category => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
            </div>
          </div>
        </div>

      {showCreateForm && (
        <form onSubmit={handleCreateTag} className="bg-gradient-to-r from-[#39FF14]/10 to-[#00FFC6]/10 p-6 rounded-xl mb-6 border border-[#39FF14]/30 backdrop-blur-sm">
          <h3 className="text-lg font-semibold text-stone-800 mb-4 flex items-center">
            <Plus className="h-5 w-5 mr-2 text-[#39FF14]" />
            Create New Tag
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                <TagIcon className="h-4 w-4 mr-1" />
                Tag Name
              </label>
              <input
                type="text"
                name="name"
                value={newTag.name}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
                placeholder="Enter tag name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                <FolderOpen className="h-4 w-4 mr-1" />
                Category
              </label>
              <input
                type="text"
                name="category"
                value={newTag.category}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., subject, difficulty"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                <Palette className="h-4 w-4 mr-1" />
                Color
              </label>
              <div className="flex space-x-2">
                {['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'].map(color => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setNewTag(prev => ({ ...prev, color }))}
                    className={`w-8 h-8 rounded-full ${getColorClass(color)} ${
                      newTag.color === color ? 'ring-2 ring-offset-2 ring-gray-400' : ''
                    }`}
                    aria-label={`Select color ${color}`}
                  />
                ))}
              </div>
              <input
                type="color"
                name="color"
                value={newTag.color}
                onChange={handleInputChange}
                className="w-full mt-2 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="mt-4 flex space-x-3">
            <button
              type="submit"
              className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
            >
              <Save className="h-4 w-4 mr-2" />
              Create Tag
            </button>
            <button
              type="button"
              onClick={() => setShowCreateForm(false)}
              className="flex items-center px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </button>
          </div>
        </form>
      )}

      {editingTag && (
        <form onSubmit={handleUpdateTag} className="bg-gradient-to-r from-amber-50 to-orange-50 p-6 rounded-lg mb-6 border border-amber-200">
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <Edit className="h-5 w-5 mr-2 text-amber-600" />
            Edit Tag
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                <TagIcon className="h-4 w-4 mr-1" />
                Tag Name
              </label>
              <input
                type="text"
                name="name"
                value={editForm.name}
                onChange={handleEditInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                <FolderOpen className="h-4 w-4 mr-1" />
                Category
              </label>
              <input
                type="text"
                name="category"
                value={editForm.category}
                onChange={handleEditInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., subject, difficulty"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                <Palette className="h-4 w-4 mr-1" />
                Color
              </label>
              <div className="flex space-x-2">
                {['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'].map(color => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setEditForm(prev => ({ ...prev, color }))}
                    className={`w-8 h-8 rounded-full ${getColorClass(color)} ${
                      editForm.color === color ? 'ring-2 ring-offset-2 ring-gray-400' : ''
                    }`}
                    aria-label={`Select color ${color}`}
                  />
                ))}
              </div>
              <input
                type="color"
                name="color"
                value={editForm.color}
                onChange={handleEditInputChange}
                className="w-full mt-2 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="mt-4 flex space-x-3">
            <button
              type="submit"
              className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
            >
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </button>
            <button
              type="button"
              onClick={cancelEditing}
              className="flex items-center px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Tags Grid */}
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">
          Tags ({filteredTags.length})
        </h3>
        <div className="text-sm text-gray-500 flex items-center">
          <Move className="h-4 w-4 mr-1" />
          Drag to reorder
        </div>
      </div>

      {filteredTags.length === 0 ? (
        <div className="text-center py-12">
          <TagIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No tags found</h3>
          <p className="text-gray-500">
            {searchTerm || categoryFilter !== 'all' 
              ? 'Try adjusting your search or filters' 
              : 'Create your first tag to get started'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredTags.map((tag, index) => (
            <div 
              key={tag.id} 
              draggable
              onDragStart={(e) => handleDragStart(e, index)}
              onDragEnter={(e) => handleDragEnter(e, index)}
              onDragEnd={handleDragEnd}
              onDragOver={(e) => e.preventDefault()}
              className={`border border-gray-200 rounded-lg p-4 flex items-center justify-between cursor-move transition-all duration-200 hover:shadow-md ${
                editingTag?.id === tag.id ? 'ring-2 ring-blue-500 bg-blue-50' : 'bg-white'
              }`}
            >
              <div className="flex items-center w-full">
                <GripVertical className="h-4 w-4 text-gray-400 mr-2 cursor-move" />
                <div className={`flex-1 min-w-0 ${getTextColorClass(tag.color)}`}>
                  <div className="font-medium truncate">{tag.name}</div>
                  {tag.category && (
                    <div className="text-xs opacity-75 truncate">{tag.category}</div>
                  )}
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <span 
                  className={`w-3 h-3 rounded-full ${getColorClass(tag.color)}`}
                  title={tag.color}
                ></span>
                
                {editingTag?.id !== tag.id ? (
                  <div className="flex space-x-1">
                    <button
                      onClick={() => startEditing(tag)}
                      className="p-1 text-gray-500 hover:text-blue-600 rounded-full hover:bg-blue-100 transition-colors"
                      aria-label="Edit tag"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteTag(tag.id)}
                      className="p-1 text-gray-500 hover:text-red-600 rounded-full hover:bg-red-100 transition-colors"
                      aria-label="Delete tag"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={cancelEditing}
                    className="p-1 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-200 transition-colors"
                    aria-label="Cancel editing"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Category Summary */}
      <div className="mt-8 pt-6 border-t border-gray-200">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Category Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Hash className="h-5 w-5 text-blue-600" />
              </div>
              <div className="ml-3">
                <div className="text-2xl font-bold text-gray-900">{tags.length}</div>
                <div className="text-sm text-gray-600">Total Tags</div>
              </div>
            </div>
          </div>
          
          <div className="bg-green-50 rounded-lg p-4 border border-green-200">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <FolderOpen className="h-5 w-5 text-green-600" />
              </div>
              <div className="ml-3">
                <div className="text-2xl font-bold text-gray-900">{getUniqueCategories().length}</div>
                <div className="text-sm text-gray-600">Categories</div>
              </div>
            </div>
          </div>
          
          <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
            <div className="flex items-center">
              <div className="p-2 bg-amber-100 rounded-lg">
                <CheckCircle className="h-5 w-5 text-amber-600" />
              </div>
              <div className="ml-3">
                <div className="text-2xl font-bold text-gray-900">
                  {tags.filter(tag => tag.is_active).length}
                </div>
                <div className="text-sm text-gray-600">Active Tags</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
};

export default TagManager;
export { TagManager };