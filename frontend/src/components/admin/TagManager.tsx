import React, { useState, useEffect } from 'react';
import { adminApi } from '../../services/api';
import type { ContentTag } from '../../types/admin';

const TagManager: React.FC = () => {
  const [tags, setTags] = useState<ContentTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newTag, setNewTag] = useState({
    name: '',
    category: '',
    color: '#3b82f6' // Default blue color
  });
  const [showCreateForm, setShowCreateForm] = useState(false);

  useEffect(() => {
    fetchTags();
  }, []);

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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setNewTag(prev => ({
      ...prev,
      [name]: value
    }));
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-t-2 border-blue-500 border-solid rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Content Tags</h2>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          {showCreateForm ? 'Cancel' : 'Create Tag'}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-6">
          {error}
        </div>
      )}

      {showCreateForm && (
        <form onSubmit={handleCreateTag} className="bg-gray-50 p-6 rounded-lg mb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Create New Tag</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tag Name</label>
              <input
                type="text"
                name="name"
                value={newTag.name}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <input
                type="text"
                name="category"
                value={newTag.category}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., subject, difficulty"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
              <div className="flex space-x-2">
                {['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'].map(color => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setNewTag(prev => ({ ...prev, color }))}
                    className={`w-8 h-8 rounded-full ${getColorClass(color)} ${
                      newTag.color === color ? 'ring-2 ring-offset-2 ring-gray-400' : ''
                    }`}
                  />
                ))}
              </div>
              <input
                type="color"
                name="color"
                value={newTag.color}
                onChange={handleInputChange}
                className="w-full mt-2 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="mt-4">
            <button
              type="submit"
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
            >
              Create Tag
            </button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {tags.map(tag => (
          <div 
            key={tag.id} 
            className="border border-gray-200 rounded-lg p-4 flex items-center justify-between"
          >
            <div className="flex items-center">
              <span 
                className={`w-3 h-3 rounded-full mr-3 ${getColorClass(tag.color)}`}
              ></span>
              <div>
                <div className="font-medium text-gray-900">{tag.name}</div>
                {tag.category && (
                  <div className="text-sm text-gray-500">{tag.category}</div>
                )}
              </div>
            </div>
            <div className="text-xs text-gray-400">
              {tag.is_active ? 'Active' : 'Inactive'}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TagManager;