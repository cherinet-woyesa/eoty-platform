import * as React from 'react';
import { Download, FileText, File, Image, Video, Music, Archive, Loader } from 'lucide-react';
import type { LessonResource } from '../../services/api/lessonResources';

interface ResourceListProps {
  resources: LessonResource[];
  loading: boolean;
  onDownload: (resource: LessonResource) => void;
}

const ResourceList: React.FC<ResourceListProps> = ({ resources, loading, onDownload }) => {
  const [downloadingIds, setDownloadingIds] = React.useState<Set<string>>(new Set());

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return <Image className="h-5 w-5" />;
    if (fileType.startsWith('video/')) return <Video className="h-5 w-5" />;
    if (fileType.startsWith('audio/')) return <Music className="h-5 w-5" />;
    if (fileType.includes('pdf')) return <FileText className="h-5 w-5" />;
    if (fileType.includes('zip') || fileType.includes('rar') || fileType.includes('tar')) 
      return <Archive className="h-5 w-5" />;
    return <File className="h-5 w-5" />;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const handleDownload = async (resource: LessonResource) => {
    setDownloadingIds(prev => new Set(prev).add(resource.id));
    try {
      await onDownload(resource);
    } finally {
      setDownloadingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(resource.id);
        return newSet;
      });
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <Loader className="h-6 w-6 animate-spin mx-auto mb-2 text-blue-400" />
        <p className="text-gray-400 text-sm">Loading resources...</p>
      </div>
    );
  }

  if (resources.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400">
        <Download className="h-12 w-12 mx-auto mb-3 opacity-50" />
        <p className="text-sm font-medium mb-1">No resources available</p>
        <p className="text-xs">Resources will appear here when added by the instructor</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {resources.map((resource) => (
        <div
          key={resource.id}
          className="bg-gray-750 rounded-lg p-3 border border-gray-600 hover:border-gray-500 transition-colors"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 flex-1 min-w-0">
              <div className="text-blue-400 flex-shrink-0">
                {getFileIcon(resource.file_type)}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-white text-sm font-medium truncate">
                  {resource.original_filename}
                </h4>
                <div className="flex items-center space-x-2 text-xs text-gray-400 mt-1">
                  <span>{formatFileSize(resource.file_size)}</span>
                  {resource.download_count > 0 && (
                    <>
                      <span>•</span>
                      <span>{resource.download_count} downloads</span>
                    </>
                  )}
                </div>
                {resource.description && (
                  <p className="text-gray-400 text-xs mt-1 line-clamp-2">
                    {resource.description}
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={() => handleDownload(resource)}
              disabled={downloadingIds.has(resource.id)}
              className="ml-3 px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-1 flex-shrink-0"
              title="Download"
            >
              {downloadingIds.has(resource.id) ? (
                <Loader className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              <span className="hidden sm:inline">Download</span>
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ResourceList;
