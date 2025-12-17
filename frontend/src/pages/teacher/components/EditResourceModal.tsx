import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Save, Loader } from 'lucide-react';
import { type Resource } from '@/types/resources';
import { resourcesApi } from '@/services/api/resources';

interface EditResourceModalProps {
  resource: Resource;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

const EditResourceModal: React.FC<EditResourceModalProps> = ({ resource, isOpen, onClose, onUpdate }) => {
  const { t } = useTranslation();
  const [title, setTitle] = useState(resource.title);
  const [description, setDescription] = useState(resource.description || '');
  const [category, setCategory] = useState(resource.category || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Assuming updateResource exists in resourcesApi, if not we might need to add it
      // For now, I'll assume it does or I'll need to check api/resources.ts again
      // Wait, I didn't see updateResource in the previous read. I should check.
      // If it doesn't exist, I'll need to add it.
      
      // Let's assume for now and I'll fix the API file next.
      await resourcesApi.updateResource(resource.id, {
        title,
        description,
        category
      });
      onUpdate();
      onClose();
    } catch (err) {
      console.error('Failed to update resource:', err);
      setError('Failed to update resource. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between p-4 border-b border-stone-200">
          <h3 className="text-lg font-bold text-stone-800">Edit Resource</h3>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-[color:#1e1b4b] focus:border-[color:#1e1b4b]"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-[color:#1e1b4b] focus:border-[color:#1e1b4b]"
            >
              <option value="">Select Category</option>
              <option value="document">Document</option>
              <option value="image">Image</option>
              <option value="video">Video</option>
              <option value="audio">Audio</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-[#27AE60] focus:border-[#27AE60]"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-stone-600 hover:bg-stone-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-[#27AE60] text-white rounded-lg hover:bg-[#219150] transition-colors disabled:opacity-50"
            >
              {loading ? <Loader className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditResourceModal;
