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

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await onExport(exportFormat);
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
    <div className="bg-white rounded-lg shadow-md border border-gray-200">
      <div className="p-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">Export & Share</h3>
      </div>
      
      <div className="p-4">
        <div className="mb-6">
          <h4 className="text-md font-medium text-gray-900 mb-3">Export Options</h4>
          <div className="space-y-3">
            {exportOptions.map((option) => {
              const Icon = option.icon;
              return (
                <div 
                  key={option.id}
                  className={`flex items-center p-3 rounded-lg border cursor-pointer ${
                    exportFormat === option.id 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                  onClick={() => setExportFormat(option.id)}
                >
                  <Icon className={`h-5 w-5 ${exportFormat === option.id ? 'text-blue-500' : 'text-gray-400'}`} />
                  <span className="ml-3 text-sm font-medium text-gray-900">{option.name}</span>
                  {exportFormat === option.id && (
                    <div className="ml-auto w-2 h-2 rounded-full bg-blue-500"></div>
                  )}
                </div>
              );
            })}
          </div>
          
          <div className="mt-4">
            <button
              onClick={handleExport}
              disabled={isExporting}
              className="w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {isExporting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Export {resourceName}
                </>
              )}
            </button>
          </div>
        </div>
        
        <div className="pt-4 border-t border-gray-200">
          <h4 className="text-md font-medium text-gray-900 mb-3">Share with Chapter</h4>
          <button
            onClick={onShare}
            className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Share2 className="h-4 w-4 mr-2" />
            <Users className="h-4 w-4 mr-2" />
            Share with Chapter Members
          </button>
          <p className="mt-2 text-xs text-gray-500">
            Share this resource with other members of your chapter for collaborative study.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ExportManager;