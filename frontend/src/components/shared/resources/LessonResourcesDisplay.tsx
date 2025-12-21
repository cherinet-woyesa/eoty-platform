import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FileText, Download, File, FileSpreadsheet, FileImage, FileArchive, Link as LinkIcon, Trash2, Eye } from 'lucide-react';
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
  const { t } = useTranslation();
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
      showNotification({ title: 'Error', message: t('resources.lesson.load_error'), type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleDetach = async (resourceId: number) => {
    if (!confirm(t('resources.lesson.detach_confirm'))) {
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
        showNotification({ title: 'Success', message: t('resources.lesson.detach_success'), type: 'success' });
        loadResources();
      } else {
        showNotification({ title: 'Error', message: data.message || t('resources.lesson.detach_error'), type: 'error' });
      }
    } catch (error) {
      console.error('Failed to detach resource:', error);
      showNotification({ title: 'Error', message: t('resources.lesson.detach_error'), type: 'error' });
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
        a.download = resource.title;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        showNotification({ title: 'Error', message: t('resources.lesson.download_error'), type: 'error' });
      }
    } catch (error) {
      console.error('Failed to download resource:', error);
      showNotification({ title: 'Error', message: t('resources.lesson.download_error'), type: 'error' });
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-primary"></div>
      </div>
    );
  }

  if (resources.length === 0) {
    return (
      <div className="text-center p-8 bg-gray-50 rounded-lg border border-gray-200">
        <File className="h-12 w-12 text-gray-400 mx-auto mb-3" />
        <p className="text-gray-500">{t('resources.lesson.empty')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">{t('resources.lesson.title')}</h3>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {resources.map((resource) => {
          const Icon = getFileIcon(resource.file_type);
          return (
            <div
              key={resource.id}
              className="flex flex-col p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="p-2 bg-brand-soft/10 rounded-lg">
                  <Icon className="h-6 w-6 text-brand-primary" />
                </div>
                {canManage && (
                  <button
                    onClick={() => handleDetach(resource.id)}
                    className="text-gray-400 hover:text-red-500 transition-colors"
                    title={t('resources.lesson.detach')}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
              
              <h4 className="font-medium text-gray-900 mb-1 line-clamp-1" title={resource.title}>
                {resource.title}
              </h4>
              
              <div className="flex items-center gap-2 text-xs text-gray-500 mb-4">
                <span>{resource.file_type.toUpperCase()}</span>
                <span>•</span>
                <span>{formatFileSize(resource.file_size || 0)}</span>
              </div>

              <div className="mt-auto flex gap-2">
                <button
                  onClick={() => window.open(`/resources/${resource.id}`, '_blank')}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 text-sm font-medium transition-colors"
                >
                  <Eye className="h-4 w-4" />
                  {t('resources.lesson.view')}
                </button>
                <button
                  onClick={() => handleDownload(resource)}
                  className="flex items-center justify-center px-3 py-2 bg-brand-primary text-white rounded-md hover:bg-brand-primary-dark transition-colors"
                  title={t('resources.lesson.download')}
                >
                  <Download className="h-4 w-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
