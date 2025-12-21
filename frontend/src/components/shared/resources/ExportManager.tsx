import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Download, FileText, FileSpreadsheet, FileCode, Users, Share2 } from 'lucide-react';

interface ExportManagerProps {
  resourceId: number;
  resourceName: string;
  onExport: (format: string, type?: string) => void;
  onShare: () => void;
}

const ExportManager: React.FC<ExportManagerProps> = ({ 
  resourceId, 
  resourceName, 
  onExport,
  onShare
}) => {
  const { t } = useTranslation();
  const [isExporting, setIsExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState('pdf');
  const [exportType, setExportType] = useState('combined'); // REQUIREMENT: Export type (notes, summary, combined)

  const handleExport = async () => {
    setIsExporting(true);
    try {
      // REQUIREMENT: Export notes/summaries - pass both type and format
      await onExport(exportFormat, exportType);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const exportOptions = [
    { id: 'pdf', name: t('resources.export.formats.pdf'), icon: FileText },
    { id: 'docx', name: t('resources.export.formats.docx'), icon: FileCode },
    { id: 'txt', name: t('resources.export.formats.txt'), icon: FileText },
  ];

  const exportTypes = [
    { id: 'combined', name: t('resources.export.types.combined'), desc: t('resources.export.types.combined_desc') },
    { id: 'notes', name: t('resources.export.types.notes'), desc: t('resources.export.types.notes_desc') },
    { id: 'summary', name: t('resources.export.types.summary'), desc: t('resources.export.types.summary_desc') }
  ];

  return (
    <div className="bg-white/90 backdrop-blur-md rounded-xl shadow-lg border border-brand-soft/20">
      <div className="p-6 border-b border-brand-soft/20">
        <h3 className="text-xl font-bold text-gray-900">📤 {t('resources.export.title')}</h3>
        <p className="text-sm text-gray-600 mt-1">{t('resources.export.subtitle')}</p>
      </div>

      <div className="p-6">
        <div className="mb-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">📋 {t('resources.export.type_title')}</h4>
          <div className="space-y-3 mb-6">
            {exportTypes.map((type) => (
              <div
                key={type.id}
                className={`flex items-center p-4 rounded-lg border cursor-pointer transition-all duration-200 ${
                  exportType === type.id
                    ? 'border-brand-primary bg-brand-soft/10 shadow-sm'
                    : 'border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                }`}
                onClick={() => setExportType(type.id)}
              >
                <div className="flex-1">
                  <span className="text-sm font-semibold text-gray-900">{type.name}</span>
                  <p className="text-xs text-gray-600 mt-1">{type.desc}</p>
                </div>
                {exportType === type.id && (
                  <div className="w-3 h-3 rounded-full bg-brand-primary"></div>
                )}
              </div>
            ))}
          </div>

          <h4 className="text-lg font-semibold text-gray-900 mb-4">📄 {t('resources.export.format_title')}</h4>
          <div className="space-y-3 mb-6">
            {exportOptions.map((option) => {
              const Icon = option.icon;
              return (
                <div
                  key={option.id}
                  className={`flex items-center p-4 rounded-lg border cursor-pointer transition-all duration-200 ${
                    exportFormat === option.id
                      ? 'border-brand-primary bg-brand-soft/10 shadow-sm'
                      : 'border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                  }`}
                  onClick={() => setExportFormat(option.id)}
                >
                  <Icon className={`h-5 w-5 ${exportFormat === option.id ? 'text-brand-primary' : 'text-gray-400'}`} />
                  <span className="ml-3 text-sm font-medium text-gray-900">{option.name}</span>
                  {exportFormat === option.id && (
                    <div className="ml-auto w-3 h-3 rounded-full bg-brand-primary"></div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-6">
            <button
              onClick={handleExport}
              disabled={isExporting}
              className="w-full flex items-center justify-center px-4 py-3 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-brand-primary hover:bg-brand-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isExporting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  {t('resources.export.exporting')}
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  {t('resources.export.button')}
                </>
              )}
            </button>

            <button
              onClick={onShare}
              className="w-full mt-3 flex items-center justify-center px-4 py-3 border border-gray-300 text-sm font-medium rounded-lg shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-primary transition-colors"
            >
              <Share2 className="h-4 w-4 mr-2" />
              {t('resources.export.share_button')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExportManager;