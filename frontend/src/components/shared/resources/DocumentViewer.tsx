import React, { useState, useEffect } from 'react';
import { Resource } from '@/types/resources';
import { FileText, Image as ImageIcon, BookOpen, AlertCircle, Download, RotateCw } from 'lucide-react';

interface DocumentViewerProps {
  resource: Resource;
  onNoteAnchor?: (position: string) => void;
}

const DocumentViewer: React.FC<DocumentViewerProps> = ({ resource, onNoteAnchor }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [zoomLevel, setZoomLevel] = useState(100);

  useEffect(() => {
    // Simulate loading document
    const timer = setTimeout(() => {
      setLoading(false);
      // For PDFs, we would normally get page count from the PDF library
      if (resource.file_type.includes('pdf')) {
        setTotalPages(10); // Simulated page count
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [resource]);

  const handleDownload = () => {
    // In a real implementation, this would trigger a download of the resource
    console.log('Downloading resource:', resource.file_name);
  };

  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev + 25, 200));
  };

  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(prev - 25, 50));
  };

  const handlePreviousPage = () => {
    setCurrentPage(prev => Math.max(prev - 1, 1));
  };

  const handleNextPage = () => {
    setCurrentPage(prev => Math.min(prev + 1, totalPages));
  };

  const handleAddNote = () => {
    if (onNoteAnchor) {
      // For PDFs, this would be the current page number
      // For text documents, this could be a line number or section
      // For images, this could be coordinates
      const position = resource.file_type.includes('pdf') 
        ? `page-${currentPage}` 
        : `section-${Math.floor(Math.random() * 10) + 1}`;
      
      onNoteAnchor(position);
    }
  };

  const renderDocument = () => {
    if (loading) {
      return (
        <div className="flex flex-col items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
          <p>Loading document...</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex flex-col items-center justify-center h-96 bg-red-50 rounded-lg p-8">
          <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
          <h3 className="text-lg font-medium text-red-800 mb-2">Unable to load document</h3>
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
          >
            <RotateCw className="h-4 w-4" />
            Retry
          </button>
        </div>
      );
    }

    // Determine document type and render appropriately
    if (resource.file_type.includes('pdf')) {
      return renderPDFViewer();
    } else if (resource.file_type.includes('image')) {
      return renderImageViewer();
    } else {
      return renderTextViewer();
    }
  };

  const renderPDFViewer = () => {
    return (
      <div className="flex flex-col h-full">
        {/* PDF Controls */}
        <div className="flex items-center justify-between p-4 bg-gray-50 border-b">
          <div className="flex items-center gap-2">
            <button
              onClick={handlePreviousPage}
              disabled={currentPage === 1}
              className="p-2 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ←
            </button>
            <span className="text-sm">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={handleNextPage}
              disabled={currentPage === totalPages}
              className="p-2 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              →
            </button>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={handleZoomOut}
              className="p-2 rounded-md hover:bg-gray-200"
            >
              -
            </button>
            <span className="text-sm">{zoomLevel}%</span>
            <button
              onClick={handleZoomIn}
              className="p-2 rounded-md hover:bg-gray-200"
            >
              +
            </button>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={handleAddNote}
              className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
            >
              Add Note
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center gap-2 px-3 py-1.5 bg-gray-600 text-white rounded-md hover:bg-gray-700 text-sm"
            >
              <Download className="h-4 w-4" />
              Download
            </button>
          </div>
        </div>
        
        {/* PDF Content */}
        <div className="flex-1 overflow-auto p-4 bg-gray-100">
          <div 
            className="bg-white shadow-md mx-auto"
            style={{ 
              width: `${zoomLevel}%`, 
              minWidth: '600px',
              height: '800px'
            }}
          >
            {/* This would be replaced with actual PDF rendering in a real implementation */}
            <div className="p-8 h-full">
              <h2 className="text-2xl font-bold mb-4">{resource.title}</h2>
              <p className="text-gray-600 mb-4">This is a simulated PDF viewer. In a production environment, this would display the actual PDF content.</p>
              <p className="text-gray-500">Page {currentPage} content would appear here...</p>
              <div className="mt-8 space-y-4">
                <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</p>
                <p>Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.</p>
                <p>Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderImageViewer = () => {
    return (
      <div className="flex flex-col h-full">
        {/* Image Controls */}
        <div className="flex items-center justify-between p-4 bg-gray-50 border-b">
          <div className="flex items-center gap-2">
            <button
              onClick={handleZoomOut}
              className="p-2 rounded-md hover:bg-gray-200"
            >
              -
            </button>
            <span className="text-sm">{zoomLevel}%</span>
            <button
              onClick={handleZoomIn}
              className="p-2 rounded-md hover:bg-gray-200"
            >
              +
            </button>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={handleAddNote}
              className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
            >
              Add Note
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center gap-2 px-3 py-1.5 bg-gray-600 text-white rounded-md hover:bg-gray-700 text-sm"
            >
              <Download className="h-4 w-4" />
              Download
            </button>
          </div>
        </div>
        
        {/* Image Content */}
        <div className="flex-1 overflow-auto p-4 bg-gray-100 flex items-center justify-center">
          <div 
            className="bg-white p-4 rounded-lg shadow-md"
            style={{ 
              transform: `scale(${zoomLevel / 100})`,
              transformOrigin: 'center center'
            }}
          >
            {/* This would be replaced with actual image rendering in a real implementation */}
            <div className="border-2 border-dashed border-gray-300 rounded-lg w-96 h-96 flex items-center justify-center">
              <div className="text-center">
                <ImageIcon className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-500">Image: {resource.file_name}</p>
                <p className="text-sm text-gray-400 mt-2">This is a simulated image viewer</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderTextViewer = () => {
    return (
      <div className="flex flex-col h-full">
        {/* Text Controls */}
        <div className="flex items-center justify-between p-4 bg-gray-50 border-b">
          <div></div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={handleAddNote}
              className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
            >
              Add Note
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center gap-2 px-3 py-1.5 bg-gray-600 text-white rounded-md hover:bg-gray-700 text-sm"
            >
              <Download className="h-4 w-4" />
              Download
            </button>
          </div>
        </div>
        
        {/* Text Content */}
        <div className="flex-1 overflow-auto p-6 bg-white">
          <h1 className="text-3xl font-bold mb-4">{resource.title}</h1>
          
          {resource.author && (
            <p className="text-gray-600 mb-6">by {resource.author}</p>
          )}
          
          {resource.description && (
            <p className="text-gray-700 mb-6 italic">{resource.description}</p>
          )}
          
          <div className="prose max-w-none">
            <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.</p>
            
            <h2 className="text-2xl font-semibold mt-8 mb-4">Introduction</h2>
            <p>Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.</p>
            
            <h2 className="text-2xl font-semibold mt-8 mb-4">Main Content</h2>
            <p>Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.</p>
            
            <blockquote className="border-l-4 border-blue-500 pl-4 my-6 italic text-gray-700">
              "This is an important quote from the text that might be worth noting."
            </blockquote>
            
            <p>Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt.</p>
            
            <h2 className="text-2xl font-semibold mt-8 mb-4">Conclusion</h2>
            <p>Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit, sed quia non numquam eius modi tempora incidunt ut labore et dolore magnam aliquam quaerat voluptatem.</p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col">
      {/* Document Header */}
      <div className="p-4 border-b">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{resource.title}</h2>
            <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
              {resource.category && (
                <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full">
                  {resource.category}
                </span>
              )}
              <span>{resource.file_type.toUpperCase()}</span>
              {resource.author && <span>by {resource.author}</span>}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">
              {new Date(resource.created_at).toLocaleDateString()}
            </span>
          </div>
        </div>
      </div>
      
      {/* Document Content */}
      <div className="flex-1">
        {renderDocument()}
      </div>
    </div>
  );
};

export default DocumentViewer;