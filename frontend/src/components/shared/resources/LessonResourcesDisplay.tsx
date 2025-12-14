import React, { useEffect, useState } from 'react';
import { FileText, Download, File, FileSpreadsheet, FileImage, FileArchive, Link as LinkIcon } from 'lucide-react';
import type { Resource } from '@/types/resources';
import { useNotification } from '../../../context/NotificationContext';

interface LessonResourcesDisplayProps {
  lessonId: number;
  canManage?: boolean;
}

const getFileIcon = (fileType: string) => {
  if (fileType.includes('pdf')) return FileText;
  if (fileType.includes('image')) return FileImage;
  if (fileType.includes('spreadsheet') || fileType.includes('excel')) return FileSpreadsheet;
  if (fileType.includes('zip') || fileType.includes('archive')) return FileArchive;
  if (fileType.includes('text') || fileType.includes('document')) return FileText;
  return File;
};

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
};

export const LessonResourcesDisplay: React.FC<LessonResourcesDisplayProps> = ({
  lessonId,
  canManage = false
}) => {
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const { showNotification } = useNotification();

  useEffect(() => {
    loadResources();
  }, [lessonId]);

  const loadResources = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/resources/lesson/${lessonId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      const data = await response.json();
      if (data.success) {
        setResources(data.data.resources);
      }
    } catch (error) {
      console.error('Failed to load resources:', error);
      showNotification({ title: 'Error', message: 'Failed to load resources', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleDetach = async (resourceId: number) => {
    if (!confirm('Are you sure you want to detach this resource from this lesson?')) {
      return;
    }

    try {
      const response = await fetch('/api/resources/detach-from-lesson', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ resourceId })
      });

      const data = await response.json();
      if (data.success) {
        showNotification({ title: 'Success', message: 'Resource detached successfully', type: 'success' });
        loadResources();
      } else {
        showNotification({ title: 'Error', message: data.message || 'Failed to detach resource', type: 'error' });
      }
    } catch (error) {
      console.error('Failed to detach resource:', error);
      showNotification({ title: 'Error', message: 'Failed to detach resource', type: 'error' });
    }
  };

  const handleDownload = async (resource: Resource) => {
    try {
      const response = await fetch(`/api/resources/${resource.id}/download`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = resource.title || 'resource';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Failed to download resource:', error);
      showNotification({ title: 'Error', message: 'Failed to download resource', type: 'error' });
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse flex space-x-4">
          <div className="flex-1 space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  if (resources.length === 0) {
    return (
      <div className="bg-gray-50 rounded-lg p-6 text-center">
        <FileText className="mx-auto h-12 w-12 text-gray-400 mb-3" />
        <p className="text-gray-600">No resources attached to this lesson yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
        <FileText className="h-5 w-5" />
        Lesson Resources
      </h3>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {resources.map(resource => {
          const FileIcon = getFileIcon(resource.file_type || 'file');
          
          return (
            <div
              key={resource.id}
              className="bg-white rounded-lg border border-gray-200 hover:border-blue-500 transition-all duration-200 shadow-sm hover:shadow-md overflow-hidden"
            >
              <div className="p-4">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <FileIcon className="h-6 w-6 text-blue-600" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold text-gray-900 truncate">
                      {resource.title}
                    </h4>
                    
                    {resource.description && (
                      <p className="mt-1 text-xs text-gray-600 line-clamp-2">
                        {resource.description}
                      </p>
                    )}
                    
                    <div className="mt-2 flex items-center gap-3 text-xs text-gray-500">
                      {resource.file_size && (
                        <span>{formatFileSize(Number(resource.file_size))}</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() => handleDownload(resource)}
                    className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium flex items-center justify-center gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Download
                  </button>
                  
                  {resource.file_url && (
                    <a
                      href={resource.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
                    >
                      <LinkIcon className="h-4 w-4" />
                    </a>
                  )}

                  {canManage && (
                    <button
                      onClick={() => handleDetach(resource.id)}
                      className="px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-sm font-medium"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default LessonResourcesDisplay;
