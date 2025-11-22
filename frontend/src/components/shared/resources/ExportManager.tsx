import React, { useState } from 'react';
import { Download, FileText, FileSpreadsheet, FileCode, Users, Share2 } from 'lucide-react';

interface ExportManagerProps {
  resourceId: number;
  resourceName: string;
  onExport: (format: string) => void;
  onShare: () => void;
}

const ExportManager: React.FC<ExportManagerProps> = ({ 
  resourceId, 
  resourceName, 
  onExport,
  onShare
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState('pdf');
  const [exportType, setExportType] = useState('combined'); // REQUIREMENT: Export type (notes, summary, combined)

  const handleExport = async () => {
    setIsExporting(true);
    try {
      // REQUIREMENT: Export notes/summaries - pass both type and format
      await onExport(exportType, exportFormat);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const exportOptions = [
    { id: 'pdf', name: 'PDF Document', icon: FileText },
    { id: 'docx', name: 'Word Document', icon: FileCode },
    { id: 'txt', name: 'Text File', icon: FileText },
  ];

  return (
    <div className="bg-white/90 backdrop-blur-md rounded-xl shadow-lg border border-stone-200">
      <div className="p-6 border-b border-stone-200">
        <h3 className="text-xl font-bold text-stone-800">📤 Export & Share</h3>
        <p className="text-sm text-stone-600 mt-1">Download content or share with your chapter</p>
      </div>

      <div className="p-6">
        <div className="mb-6">
          <h4 className="text-lg font-semibold text-stone-800 mb-4">📋 Export Type</h4>
          <div className="space-y-3 mb-6">
            {[
              { id: 'combined', name: 'Combined (Notes + Summary)', desc: 'Export both notes and AI summary' },
              { id: 'notes', name: 'Notes Only', desc: 'Export personal and public notes' },
              { id: 'summary', name: 'Summary Only', desc: 'Export AI-generated summary' }
            ].map((type) => (
              <div
                key={type.id}
                className={`flex items-center p-4 rounded-lg border cursor-pointer transition-all duration-200 ${
                  exportType === type.id
                    ? 'border-[#27AE60] bg-[#27AE60]/5 shadow-sm'
                    : 'border-stone-200 hover:bg-stone-50 hover:border-stone-300'
                }`}
                onClick={() => setExportType(type.id)}
              >
                <div className="flex-1">
                  <span className="text-sm font-semibold text-stone-800">{type.name}</span>
                  <p className="text-xs text-stone-600 mt-1">{type.desc}</p>
                </div>
                {exportType === type.id && (
                  <div className="w-3 h-3 rounded-full bg-[#27AE60]"></div>
                )}
              </div>
            ))}
          </div>

          <h4 className="text-lg font-semibold text-stone-800 mb-4">📄 Export Format</h4>
          <div className="space-y-3 mb-6">
            {exportOptions.map((option) => {
              const Icon = option.icon;
              return (
                <div
                  key={option.id}
                  className={`flex items-center p-4 rounded-lg border cursor-pointer transition-all duration-200 ${
                    exportFormat === option.id
                      ? 'border-[#27AE60] bg-[#27AE60]/5 shadow-sm'
                      : 'border-stone-200 hover:bg-stone-50 hover:border-stone-300'
                  }`}
                  onClick={() => setExportFormat(option.id)}
                >
                  <Icon className={`h-5 w-5 ${exportFormat === option.id ? 'text-[#27AE60]' : 'text-stone-400'}`} />
                  <span className="ml-3 text-sm font-medium text-stone-800">{option.name}</span>
                  {exportFormat === option.id && (
                    <div className="ml-auto w-3 h-3 rounded-full bg-[#27AE60]"></div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-6">
            <button
              onClick={handleExport}
              disabled={isExporting}
              className="w-full flex items-center justify-center px-6 py-3 bg-gradient-to-r from-[#27AE60] to-[#16A085] hover:from-[#27AE60]/90 hover:to-[#16A085]/90 text-stone-900 rounded-lg font-semibold transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isExporting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-stone-900 mr-2"></div>
                  📤 Exporting...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  📤 Export {resourceName}
                </>
              )}
            </button>
          </div>
        </div>

        <div className="pt-6 border-t border-stone-200">
          <h4 className="text-lg font-semibold text-stone-800 mb-4">👥 Share with Chapter</h4>
          <button
            onClick={onShare}
            className="w-full flex items-center justify-center px-6 py-3 border border-stone-300 rounded-lg shadow-sm text-sm font-medium text-stone-700 bg-white hover:bg-stone-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#27AE60] transition-all duration-200"
          >
            <Share2 className="h-4 w-4 mr-2" />
            <Users className="h-4 w-4 mr-2" />
            Share with Chapter Members
          </button>
          <p className="mt-3 text-sm text-stone-600">
            📖 Share this resource with other members of your chapter for collaborative study and learning.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ExportManager;