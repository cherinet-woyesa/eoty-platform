import React, { useState, useEffect } from 'react';
import { Download, Upload, Trash2, FileText, Image, Video, Music, File, Plus, Loader2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { lessonResourcesApi, LessonResource } from '@/services/api';

interface LessonResourcesProps {
  lessonId: number;
  courseId?: string;
  isTeacher?: boolean;
}

const LessonResources: React.FC<LessonResourcesProps> = ({ lessonId, courseId, isTeacher = false }) => {
  const { user } = useAuth();
  const [resources, setResources] = useState<LessonResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadResources();
  }, [lessonId]);

  const loadResources = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await lessonResourcesApi.getResources(lessonId.toString());
      setResources(response.data?.resources || []);
    } catch (err) {
      console.error('Failed to load lesson resources:', err);
      setError('Failed to load resources');
      setResources([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      setError(null);

      await lessonResourcesApi.uploadResource(lessonId.toString(), {
        file,
        description: file.name
      });

      loadResources();
    } catch (err) {
      console.error('Failed to upload resource:', err);
      setError('Failed to upload resource');
    } finally {
      setUploading(false);
      // Clear the input
      event.target.value = '';
    }
  };

  const handleDownload = async (resource: LessonResource) => {
    try {
      const response = await lessonResourcesApi.downloadResource(lessonId.toString(), resource.id);
      window.open(response.data.downloadUrl, '_blank');
    } catch (err) {
      console.error('Failed to download resource:', err);
      setError('Failed to download resource');
    }
  };

  const handleDelete = async (resource: LessonResource) => {
    if (!confirm('Are you sure you want to delete this resource?')) return;

    try {
      await lessonResourcesApi.deleteResource(lessonId.toString(), resource.id);
      setResources(prev => prev.filter(r => r.id !== resource.id));
    } catch (err) {
      console.error('Failed to delete resource:', err);
      setError('Failed to delete resource');
    }
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.includes('pdf')) return <FileText className="h-5 w-5" />;
    if (fileType.includes('image')) return <Image className="h-5 w-5" />;
    if (fileType.includes('video')) return <Video className="h-5 w-5" />;
    if (fileType.includes('audio')) return <Music className="h-5 w-5" />;
    return <File className="h-5 w-5" />;
  };

  const formatFileSize = (size?: string) => {
    if (!size) return '';
    const bytes = parseInt(size);
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-center py-8">
          <div className="text-center">
            <Loader2 className="h-6 w-6 animate-spin text-blue-600 mx-auto mb-2" />
            <p className="text-sm text-gray-600">Loading resources...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <File className="h-5 w-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">Lesson Resources</h3>
        </div>
        {isTeacher && (
          <div className="relative">
            <input
              type="file"
              onChange={handleFileUpload}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              disabled={uploading}
            />
            <button
              disabled={uploading}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
            >
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              {uploading ? 'Uploading...' : 'Add Resource'}
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {resources.length === 0 ? (
        <div className="text-center py-12">
          <File className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No resources yet</h3>
          <p className="text-gray-600 text-sm mb-4">
            {isTeacher
              ? 'Upload files, documents, or materials for your students'
              : 'No resources have been shared for this lesson yet'
            }
          </p>
          {isTeacher && !uploading && (
            <div className="relative inline-block">
              <input
                type="file"
                onChange={handleFileUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <button className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors">
                <Plus className="h-4 w-4" />
                Upload First Resource
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {resources.map((resource) => (
            <div key={resource.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="p-2 bg-gray-100 rounded-lg text-gray-600">
                  {getFileIcon(resource.file_type)}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-gray-900 truncate">{resource.original_filename || resource.filename}</h4>
                  <p className="text-sm text-gray-600 truncate">{resource.description || resource.file_type}</p>
                  <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                    <span>{formatFileSize(resource.file_size?.toString())}</span>
                    <span>•</span>
                    <span>{new Date(resource.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDownload(resource)}
                  className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  title="Download"
                >
                  <Download className="h-4 w-4" />
                </button>
                {isTeacher && (
                  <button
                    onClick={() => handleDelete(resource)}
                    className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default LessonResources;
