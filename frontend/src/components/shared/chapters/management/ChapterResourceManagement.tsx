import React from 'react';
import { useTranslation } from 'react-i18next';
import { FileText, Plus, Link as LinkIcon, Download } from 'lucide-react';
import LoadingSpinner from '@/components/shared/LoadingSpinner';

interface Resource {
  id: number;
  title: string;
  type: 'link' | 'file';
  url: string;
  description?: string;
  created_at: string;
}

interface ChapterResourceManagementProps {
  resources: Resource[];
  onCreateResource: () => void;
  isLoading: boolean;
}

const ChapterResourceManagement: React.FC<ChapterResourceManagementProps> = ({
  resources,
  onCreateResource,
  isLoading
}) => {
  const { t } = useTranslation();

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden h-full flex flex-col">
      <div className="p-6 border-b border-slate-100 flex justify-between items-center">
        <h3 className="text-lg font-bold text-slate-900">{t('chapters.manage.resources.title', 'Resources')}</h3>
        <button
          onClick={onCreateResource}
          className="p-2 bg-brand-primary/10 text-brand-primary rounded-lg hover:bg-brand-primary/20 transition-colors"
        >
          <Plus className="h-5 w-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {resources.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <FileText className="h-12 w-12 mx-auto mb-3 text-slate-300" />
            <p>{t('chapters.manage.resources.no_resources', 'No resources shared yet')}</p>
          </div>
        ) : (
          resources.map((resource) => (
            <div key={resource.id} className="flex items-start gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors group">
              <div className="p-2 bg-slate-100 rounded-lg text-slate-500 group-hover:bg-white group-hover:shadow-sm transition-all">
                {resource.type === 'link' ? <LinkIcon className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-bold text-slate-900 truncate">{resource.title}</h4>
                <p className="text-xs text-slate-500 truncate">{resource.description || resource.url}</p>
              </div>
              <a
                href={resource.url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 text-slate-400 hover:text-brand-primary transition-colors"
              >
                <Download className="h-4 w-4" />
              </a>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ChapterResourceManagement;
