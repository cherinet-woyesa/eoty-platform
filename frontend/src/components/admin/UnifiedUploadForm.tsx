import React, { useState, useRef, useEffect } from 'react';
import { getCategories } from '@/services/api/systemConfig';
import type { CourseCategory } from '@/types/systemConfig';
import {
  Upload,
  X,
  FileText,
  Users,
  Tag,
  Hash,
  Eye,
  CheckCircle
} from 'lucide-react';

interface Chapter {
  id: number;
  name: string;
  location: string;
}

interface UploadMetadata {
  template: {
    title: string;
    description: string;
    category: string;
    tags: string[];
  };
  individual: Record<string, {
    title: string;
    description: string;
    category: string;
    tags: string[];
  }>;
}

interface UnifiedUploadFormProps {
  chapters: Chapter[];
  chapterId: string;
  onChapterChange: (chapterId: string) => void;
  onSubmit: (files: File[], metadata: UploadMetadata) => void;
  onCancel: () => void;
}

const UnifiedUploadForm: React.FC<UnifiedUploadFormProps> = ({
  chapters,
  chapterId,
  onChapterChange,
  onSubmit,
  onCancel
}) => {
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [uploadMetadata, setUploadMetadata] = useState<UploadMetadata>({
    template: {
      title: '{filename}',
      description: 'Uploaded file: {filename}',
      category: '',
      tags: []
    },
    individual: {}
  });
  const [categories, setCategories] = useState<CourseCategory[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const data = await getCategories(true);
        setCategories(data);
      } catch (error) {
        console.error('Failed to fetch categories:', error);
        // Fallback categories if fetch fails
        setCategories([
          { id: 1, name: 'Scripture', slug: 'scripture', description: '', display_order: 1, is_active: true, created_at: '', updated_at: '' },
          { id: 2, name: 'Theology', slug: 'theology', description: '', display_order: 2, is_active: true, created_at: '', updated_at: '' },
          { id: 3, name: 'History', slug: 'history', description: '', display_order: 3, is_active: true, created_at: '', updated_at: '' },
          { id: 4, name: 'Liturgy', slug: 'liturgy', description: '', display_order: 4, is_active: true, created_at: '', updated_at: '' },
          { id: 5, name: 'Saints', slug: 'saints', description: '', display_order: 5, is_active: true, created_at: '', updated_at: '' },
          { id: 6, name: 'Prayers', slug: 'prayers', description: '', display_order: 6, is_active: true, created_at: '', updated_at: '' }
        ]);
      }
    };
    fetchCategories();
  }, []);

  // Template variable processing
  const processTemplate = (template: string, variables: Record<string, any>): string => {
    return template.replace(/{(\w+)}/g, (match, key) => {
      return variables[key] !== undefined ? variables[key] : match;
    });
  };

  // Generate metadata for a file using template or individual settings
  const generateFileMetadata = (file: File, index: number) => {
    const fileName = file.name.replace(/\.[^/.]+$/, ''); // Remove extension
    const variables = {
      filename: fileName,
      index: (index + 1).toString(),
      date: new Date().toISOString().split('T')[0],
      extension: file.name.split('.').pop() || '',
      size: (file.size / 1024 / 1024).toFixed(2) + 'MB'
    };

    const fileKey = `${file.name}-${file.size}`;
    const individual = uploadMetadata.individual[fileKey];

    if (individual) {
      // Use individual metadata
      return {
        title: individual.title || processTemplate(uploadMetadata.template.title, variables),
        description: individual.description || processTemplate(uploadMetadata.template.description, variables),
        category: individual.category || uploadMetadata.template.category,
        tags: individual.tags.length > 0 ? individual.tags : uploadMetadata.template.tags,
        file
      };
    } else {
      // Use template metadata
      return {
        title: processTemplate(uploadMetadata.template.title, variables),
        description: processTemplate(uploadMetadata.template.description, variables),
        category: uploadMetadata.template.category,
        tags: uploadMetadata.template.tags,
        file
      };
    }
  };

  const handleFileSelect = (files: FileList | null) => {
    if (files) {
      const newFiles = Array.from(files);
      setUploadFiles(prev => [...prev, ...newFiles]);
    }
  };

  const removeFile = (index: number) => {
    setUploadFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (uploadFiles.length > 0) {
      onSubmit(uploadFiles, uploadMetadata);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    handleFileSelect(e.dataTransfer.files);
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
      <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
        <Upload className="h-5 w-5 mr-2 text-blue-600" />
        Upload Files
      </h3>

      {/* File Drop Zone */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select Files
        </label>
        <div
          className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors cursor-pointer"
          onClick={() => fileInputRef.current?.click()}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 mb-2">
            Drag & drop files here, or click to select
          </p>
          <p className="text-sm text-gray-500">
            Supports: PDF, DOC, DOCX, TXT, MP3, MP4, AVI, MOV, JPG, PNG, GIF
          </p>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={(e) => handleFileSelect(e.target.files)}
            className="hidden"
            accept=".pdf,.doc,.docx,.txt,.mp3,.mp4,.avi,.mov,.jpg,.jpeg,.png,.gif"
          />
        </div>
      </div>

      {/* Selected Files */}
      {uploadFiles.length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-900 mb-2">
            Selected Files ({uploadFiles.length})
          </h4>
          <div className="max-h-32 overflow-y-auto border border-gray-200 rounded-md">
            {uploadFiles.map((file, index) => (
              <div key={index} className="flex items-center justify-between p-2 border-b border-gray-100 last:border-b-0">
                <div className="flex items-center">
                  <FileText className="h-4 w-4 mr-2 text-gray-400" />
                  <span className="text-sm text-gray-900 truncate max-w-xs">{file.name}</span>
                  <span className="ml-2 text-xs text-gray-500">
                    ({(file.size / 1024 / 1024).toFixed(2)} MB)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => removeFile(index)}
                  className="text-red-500 hover:text-red-700"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Template Metadata (for bulk uploads) */}
      {uploadFiles.length > 1 && (
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-900 mb-3">
            Template Settings (applied to all files)
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Title Template
              </label>
              <input
                type="text"
                value={uploadMetadata.template.title}
                onChange={(e) => setUploadMetadata(prev => ({
                  ...prev,
                  template: { ...prev.template, title: e.target.value }
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#27AE60]"
                placeholder="{filename}"
              />
              <p className="text-xs text-gray-500 mt-1">
                Variables: {'{filename}'}, {'{index}'}, {'{date}'}, {'{extension}'}, {'{size}'}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description Template
              </label>
              <input
                type="text"
                value={uploadMetadata.template.description}
                onChange={(e) => setUploadMetadata(prev => ({
                  ...prev,
                  template: { ...prev.template, description: e.target.value }
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#27AE60]"
                placeholder="Uploaded file: {filename}"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category
              </label>
              <select
                value={uploadMetadata.template.category}
                onChange={(e) => setUploadMetadata(prev => ({
                  ...prev,
                  template: { ...prev.template, category: e.target.value }
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#27AE60]"
              >
                <option value="">Select a category</option>
                {categories.map(category => (
                  <option key={category.id} value={category.name}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tags (comma-separated)
              </label>
              <input
                type="text"
                value={uploadMetadata.template.tags.join(', ')}
                onChange={(e) => setUploadMetadata(prev => ({
                  ...prev,
                  template: {
                    ...prev.template,
                    tags: e.target.value.split(',').map(t => t.trim()).filter(t => t)
                  }
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#27AE60]"
                placeholder="tag1, tag2, tag3"
              />
            </div>
          </div>
        </div>
      )}

      {/* Single File Metadata (for single uploads) */}
      {uploadFiles.length === 1 && (
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-900 mb-3">
            File Details
          </h4>
          {(() => {
            const file = uploadFiles[0];
            const metadata = generateFileMetadata(file, 0);
            return (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Title
                  </label>
                  <input
                    type="text"
                    value={metadata.title}
                    onChange={(e) => {
                      const fileKey = `${file.name}-${file.size}`;
                      setUploadMetadata(prev => ({
                        ...prev,
                        individual: {
                          ...prev.individual,
                          [fileKey]: { ...metadata, title: e.target.value }
                        }
                      }));
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#27AE60]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category
                  </label>
                  <select
                    value={metadata.category}
                    onChange={(e) => {
                      const fileKey = `${file.name}-${file.size}`;
                      setUploadMetadata(prev => ({
                        ...prev,
                        individual: {
                          ...prev.individual,
                          [fileKey]: { ...metadata, category: e.target.value }
                        }
                      }));
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#27AE60]"
                  >
                    <option value="">Select a category</option>
                    {categories.map(category => (
                      <option key={category.id} value={category.name}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={metadata.description}
                    onChange={(e) => {
                      const fileKey = `${file.name}-${file.size}`;
                      setUploadMetadata(prev => ({
                        ...prev,
                        individual: {
                          ...prev.individual,
                          [fileKey]: { ...metadata, description: e.target.value }
                        }
                      }));
                    }}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* Chapter Selection */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
          <Users className="h-4 w-4 mr-1" />
          Chapter
        </label>
        <select
          value={chapterId}
          onChange={(e) => onChapterChange(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#27AE60]"
          required
        >
          {chapters.length === 0 ? (
            <option value="">Loading chapters...</option>
          ) : (
            chapters.map((ch) => (
              <option key={ch.id} value={ch.id.toString()}>
                {ch.name}
              </option>
            ))
          )}
        </select>
      </div>

      {/* Upload Preview */}
      {uploadFiles.length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
            <Eye className="h-4 w-4 mr-1" />
            Upload Preview
          </h4>
          <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-md">
            {uploadFiles.map((file, index) => {
              const metadata = generateFileMetadata(file, index);
              return (
                <div key={index} className="p-3 border-b border-gray-100 last:border-b-0">
                  <div className="font-medium text-sm text-gray-900">{metadata.title}</div>
                  <div className="text-xs text-gray-600 mt-1">
                    Category: {metadata.category || 'None'} •
                    Tags: {metadata.tags.length > 0 ? metadata.tags.join(', ') : 'None'}
                  </div>
                  <div className="text-xs text-gray-500 mt-1 truncate">
                    {metadata.description}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={uploadFiles.length === 0}
          className="px-4 py-2 bg-[#27AE60] text-white rounded-md hover:bg-[#219150] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {uploadFiles.length === 0 ? 'Select Files First' : `Upload ${uploadFiles.length} File${uploadFiles.length !== 1 ? 's' : ''}`}
        </button>
      </div>
    </form>
  );
};

export default UnifiedUploadForm;
