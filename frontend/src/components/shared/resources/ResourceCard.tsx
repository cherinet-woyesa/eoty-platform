import React from 'react';
import { Resource } from '@/types/resources';
import { FileText, Image, BookOpen, Calendar, User, Tag } from 'lucide-react';

interface ResourceCardProps {
  resource: Resource;
  onClick?: (resource: Resource) => void;
  className?: string;
}

const ResourceCard: React.FC<ResourceCardProps> = ({ resource, onClick, className = '' }) => {
  const getFileIcon = (fileType: string) => {
    if (fileType.includes('pdf')) return <FileText className="h-5 w-5 text-red-500" />;
    if (fileType.includes('image')) return <Image className="h-5 w-5 text-green-500" />;
    return <BookOpen className="h-5 w-5 text-blue-500" />;
  };

  const formatFileSize = (size?: string) => {
    if (!size) return 'N/A';
    const bytes = parseInt(size);
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleClick = () => {
    onClick?.(resource);
  };

  return (
    <div
      onClick={handleClick}
      className={`bg-white/90 backdrop-blur-md rounded-xl border border-stone-200 shadow-md overflow-hidden hover:shadow-lg transition-all duration-200 cursor-pointer hover:border-[#27AE60]/50 ${className}`}
    >
      <div className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {getFileIcon(resource.file_type)}
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-stone-800 truncate">{resource.title}</h3>
              {resource.category && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#27AE60]/10 text-[#27AE60] border border-[#27AE60]/30">
                  {resource.category}
                </span>
              )}
              {resource.author && (
                <p className="text-sm text-stone-600 mt-1 truncate">By {resource.author}</p>
              )}
            </div>
          </div>
        </div>

        {resource.description && (
          <p className="mt-3 text-sm text-stone-600 line-clamp-2">{resource.description}</p>
        )}

        <div className="mt-4 flex items-center justify-between text-xs text-stone-500">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              <span>{new Date(resource.created_at).toLocaleDateString()}</span>
            </div>
            <div className="flex items-center gap-1">
              <span>{resource.file_type.toUpperCase()}</span>
              <span>•</span>
              <span>{formatFileSize(resource.file_size)}</span>
            </div>
          </div>

          {resource.language && (
            <span className="px-2 py-1 bg-stone-100 rounded text-xs capitalize">
              {resource.language}
            </span>
          )}
        </div>

        {resource.tags && resource.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1">
            {resource.tags.slice(0, 3).map((tag, index) => (
              <span
                key={index}
                className="inline-flex items-center gap-1 px-2 py-1 bg-stone-100 text-stone-700 rounded-md text-xs"
              >
                <Tag className="h-2.5 w-2.5" />
                {tag}
              </span>
            ))}
            {resource.tags.length > 3 && (
              <span className="inline-flex items-center px-2 py-1 bg-stone-100 text-stone-700 rounded-md text-xs">
                +{resource.tags.length - 3} more
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ResourceCard;


