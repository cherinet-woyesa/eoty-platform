import React from 'react';
import { Link as LinkIcon, X, FileText, Image as ImageIcon, Video as VideoIcon, Music } from 'lucide-react';
import type { Resource } from '@/types/resources';

interface AttachedResourcesListProps {
  lessonId?: string;
  attachedResources: Resource[];
  handleDetachResource: (resourceId: number) => void;
  t: (key: string, defaultVal?: string) => string;
}

const AttachedResourcesList: React.FC<AttachedResourcesListProps> = ({
  lessonId,
  attachedResources,
  handleDetachResource,
  t
}) => {
  const getFileIcon = (fileType: string = '') => {
    if (fileType.includes('pdf')) return <FileText className="h-5 w-5 text-red-500" />;
    if (fileType.includes('image')) return <ImageIcon className="h-5 w-5 text-blue-500" />;
    if (fileType.includes('video')) return <VideoIcon className="h-5 w-5 text-purple-500" />;
    if (fileType.includes('audio')) return <Music className="h-5 w-5 text-amber-500" />;
    return <FileText className="h-5 w-5 text-gray-500" />;
  };

  if (!lessonId) return null;

  return (
    <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl border border-emerald-100 p-6">
      <h3 className="text-sm font-bold text-emerald-900 mb-4 flex items-center gap-2 uppercase tracking-wider">
        <LinkIcon className="h-4 w-4" />
        {t('teacher_content.resources.attached_title', 'Attached to Current Lesson')}
      </h3>
      {attachedResources.length === 0 ? (
        <div className="text-center py-8 border-2 border-dashed border-emerald-200/50 rounded-xl bg-white/50">
          <p className="text-sm text-emerald-600/70 italic">{t('teacher_content.resources.no_attached', 'No resources attached to this lesson yet.')}</p>
          <p className="text-xs text-emerald-500 mt-1">{t('teacher_content.resources.attach_hint', 'Select resources from the library below to attach them.')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {attachedResources.map(resource => (
            <div key={resource.id} className="bg-white p-3 rounded-xl border border-emerald-200 shadow-sm flex items-center justify-between group hover:shadow-md transition-all">
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="w-10 h-10 bg-gray-50 rounded-lg flex items-center justify-center flex-shrink-0 border border-gray-100">
                  {getFileIcon(resource.file_type)}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">{resource.title}</p>
                  <p className="text-xs text-gray-500 truncate">{resource.file_type?.split('/')[1] || 'file'}</p>
                </div>
              </div>
              <button
                onClick={() => handleDetachResource(resource.id)}
                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                title={t('teacher_content.resources.remove_from_lesson', 'Remove from lesson')}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AttachedResourcesList;
