import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { Resource } from '@/types/resources';
import { Image as ImageIcon, Download, Maximize2, Minimize2, Printer, Highlighter, MousePointer } from 'lucide-react';

interface DocumentViewerProps {
  resource: Resource;
  onNoteAnchor?: (position: string, sectionText?: string, sectionPosition?: number) => void; // REQUIREMENT: Section anchoring
  onExplainSelection?: (text: string) => void;
  id?: string;
}

const DocumentViewer: React.FC<DocumentViewerProps> = ({ resource, onNoteAnchor, onExplainSelection }) => {
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedText, setSelectedText] = useState<string>('');
  const [selectionPosition, setSelectionPosition] = useState<{ start: number; end: number } | null>(null);
  const [highlightMode, setHighlightMode] = useState(false);
  const [highlights, setHighlights] = useState<Array<{ text: string; id: string; range: Range }>>([]);
  const documentRef = useRef<HTMLDivElement>(null);

  const [fileUrl, setFileUrl] = useState<string>('');
  const [textContent, setTextContent] = useState<string>('');

  useEffect(() => {
    // Construct file URL
    let url = resource.file_url || resource.file_path || '';
    if (url && !url.startsWith('http')) {
      // Assuming backend serves uploads at /uploads
      // Use the API_URL from environment or default
      const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
      const BASE_URL = API_URL.replace('/api', '');
      
      // Clean up path
      if (url.startsWith('uploads/')) {
        url = `${BASE_URL}/${url}`;
      } else if (url.startsWith('/uploads/')) {
        url = `${BASE_URL}${url}`;
      } else {
        url = `${BASE_URL}/uploads/${url}`;
      }
    }
    setFileUrl(url);

    // Load content based on type
    const loadContent = async () => {
      setLoading(true);
      try {
        if (resource.file_type.includes('text') || resource.file_type.includes('json') || resource.file_type.includes('md')) {
          const response = await fetch(url);
          if (response.ok) {
            const text = await response.text();
            setTextContent(text);
          }
        }
        // For PDFs and Images, the browser handles loading via iframe/img tags
      } catch (error) {
        console.error('Failed to load resource content:', error);
      } finally {
        setLoading(false);
      }
    };

    if (url) {
      loadContent();
    } else {
      setLoading(false);
    }
  }, [resource]);

  // Handle text selection for note anchoring
  const handleTextSelection = useCallback(() => {
    const selection = window.getSelection();
    if (selection && selection.toString().trim().length > 0) {
      const selectedText = selection.toString().trim();
      setSelectedText(selectedText);
      
      // Get selection range for positioning
      if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const startOffset = range.startOffset;
        const endOffset = range.endOffset;

        setSelectionPosition({ start: startOffset, end: endOffset });
      }
    } else {
      setSelectedText('');
      setSelectionPosition(null);
    }
  }, []);

  // Handle fullscreen toggle
  const toggleFullscreen = useCallback(() => {
    if (!isFullscreen) {
      if (documentRef.current?.requestFullscreen) {
        documentRef.current.requestFullscreen();
      }
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
      setIsFullscreen(false);
    }
  }, [isFullscreen]);

  // Handle print
  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  // Enhanced note creation with selected text
  const handleAddNoteFromSelection = useCallback(() => {
    if (selectedText && onNoteAnchor) {
      const position = resource.file_type.includes('pdf')
        ? `page-${currentPage}-selection`
        : `section-selection-${selectionPosition?.start || 0}`;

      onNoteAnchor(position, selectedText, selectionPosition?.start || currentPage);
      // Clear selection after note creation
      window.getSelection()?.removeAllRanges();
      setSelectedText('');
      setSelectionPosition(null);
    }
  }, [selectedText, selectionPosition, currentPage, resource.file_type, onNoteAnchor]);

  const handleHighlightSelection = useCallback(() => {
    if (selectedText && highlightMode) {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);

        // Create a highlight span
        const highlightSpan = document.createElement('span');
        highlightSpan.className = 'inline-highlight';
        highlightSpan.style.backgroundColor = '#fef3c7'; // yellow-100
        highlightSpan.style.borderRadius = '2px';
        highlightSpan.style.padding = '1px 2px';
        highlightSpan.dataset.highlightId = `highlight-${Date.now()}`;

        try {
          // Wrap the selected text with the highlight span
          range.surroundContents(highlightSpan);

          // Add to highlights list for management
          const newHighlight = {
            text: selectedText,
            id: highlightSpan.dataset.highlightId!,
            range: range // Store range for potential future use
          };
          setHighlights(prev => [...prev, newHighlight]);

          // Clear selection after highlighting
          window.getSelection()?.removeAllRanges();
          setSelectedText('');
          setSelectionPosition(null);
        } catch (error) {
          // surroundContents can fail if selection spans multiple elements
          console.warn('Could not highlight selection inline, using fallback');
          // Fallback to panel-based highlighting
          const newHighlight = {
            text: selectedText,
            id: `highlight-${Date.now()}`,
            range: range
          };
          setHighlights(prev => [...prev, newHighlight]);

          // Clear selection
          window.getSelection()?.removeAllRanges();
          setSelectedText('');
          setSelectionPosition(null);
        }
      }
    }
  }, [selectedText, highlightMode]);

  const removeHighlight = useCallback((highlightId: string) => {
    // Remove inline highlight from DOM
    const highlightElement = document.querySelector(`[data-highlight-id="${highlightId}"]`);
    if (highlightElement) {
      // Move contents out of highlight and remove highlight element
      const parent = highlightElement.parentNode;
      if (parent) {
        while (highlightElement.firstChild) {
          parent.insertBefore(highlightElement.firstChild, highlightElement);
        }
        parent.removeChild(highlightElement);
      }
    }

    // Remove from highlights list
    setHighlights(prev => prev.filter(h => h.id !== highlightId));
  }, []);

  const clearAllHighlights = useCallback(() => {
    // Remove all inline highlights
    highlights.forEach(highlight => {
      const highlightElement = document.querySelector(`[data-highlight-id="${highlight.id}"]`);
      if (highlightElement) {
        const parent = highlightElement.parentNode;
        if (parent) {
          while (highlightElement.firstChild) {
            parent.insertBefore(highlightElement.firstChild, highlightElement);
          }
          parent.removeChild(highlightElement);
        }
      }
    });

    // Clear highlights list
    setHighlights([]);
  }, [highlights]);

  const handleDownload = () => {
    if (fileUrl) {
      const link = document.createElement('a');
      link.href = fileUrl;
      link.download = resource.file_name || 'download';
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      console.error('No file URL available for download');
      alert('Download failed: File URL not available');
    }
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

  const handleAddNote = useCallback(() => {
    if (onNoteAnchor) {
      // REQUIREMENT: Anchor notes to sections - provide section context
      // For PDFs, this would be the current page number
      // For text documents, this could be a line number or section
      // For images, this could be coordinates
      const position = resource.file_type.includes('pdf') 
        ? `page-${currentPage}` 
        : `general`;
      
      // REQUIREMENT: Provide section text and position for anchoring
      const sectionText = resource.description?.substring(0, 200) || resource.title;
      const sectionPosition = resource.file_type.includes('pdf') ? currentPage : 0;
      
      onNoteAnchor(position, sectionText, sectionPosition);
    }
  }, [onNoteAnchor, resource, currentPage]);

  const renderDocument = () => {
    if (loading) {
      return (
        <div className="flex flex-col items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
          <p>Loading document...</p>
        </div>
      );
    }

    // Document content will be rendered here

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
      <div className="flex flex-col h-full" ref={documentRef}>
        {/* Enhanced PDF Controls */}
        <div className="flex items-center justify-between p-4 bg-gray-50 border-b flex-wrap gap-2">
          <div className="flex items-center gap-2">
            {/* PDF Navigation is handled by the native viewer in iframe, so we hide custom nav for now */}
            <span className="text-sm font-medium text-gray-500">
              Use PDF toolbar to navigate
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={handleAddNote}
              className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm transition-colors"
              title="Add note to current page"
            >
              Add Note
            </button>
            <button
              onClick={toggleFullscreen}
              className="p-2 rounded-md hover:bg-gray-200 transition-colors"
              title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
            >
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center gap-2 px-3 py-1.5 bg-gray-600 text-white rounded-md hover:bg-gray-700 text-sm transition-colors"
              title="Download resource"
            >
              <Download className="h-4 w-4" />
              Download
            </button>
          </div>
        </div>
        
        {/* PDF Content */}
        <div className="flex-1 bg-gray-100 relative">
          <iframe 
            src={fileUrl} 
            className="w-full h-full border-0"
            title={resource.title}
          />
          {/* Overlay for note taking (simplified) */}
          <div className="absolute bottom-4 right-4 bg-white/90 p-2 rounded shadow text-xs text-gray-500 pointer-events-none">
            Viewing: {resource.file_name}
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
            className="bg-white p-4 rounded-lg shadow-md transition-transform duration-200"
            style={{ 
              transform: `scale(${zoomLevel / 100})`,
              transformOrigin: 'center center'
            }}
          >
            <img 
              src={fileUrl} 
              alt={resource.title}
              className="max-w-full max-h-[80vh] object-contain"
              onError={(e) => {
                // Fallback if image fails to load
                e.currentTarget.style.display = 'none';
                e.currentTarget.parentElement!.innerHTML = '<div class="p-8 text-center text-red-500">Failed to load image</div>';
              }}
            />
          </div>
        </div>
      </div>
    );
  };

  const renderTextViewer = () => {
    return (
      <div className="flex flex-col h-full" ref={documentRef}>
        {/* Enhanced Text Controls */}
        <div className="flex items-center justify-between p-4 bg-gray-50 border-b flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setHighlightMode(!highlightMode)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors ${
                highlightMode
                  ? 'bg-[#27AE60] text-white hover:bg-[#27AE60]/90'
                  : 'bg-stone-200 text-stone-700 hover:bg-stone-300'
              }`}
              title={highlightMode ? "Exit highlight mode" : "Enter highlight mode"}
            >
              <Highlighter className="h-4 w-4" />
              {highlightMode ? 'Exit Highlight' : 'Highlight Mode'}
            </button>
          </div>
          
          <div className="flex items-center gap-2">
            {selectedText && (
              <button
                onClick={handleAddNoteFromSelection}
                className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-[#27AE60] to-[#16A085] text-stone-900 rounded-md hover:from-[#27AE60]/90 hover:to-[#16A085]/90 text-sm transition-colors"
                title="Add note from selection"
              >
                <MousePointer className="h-4 w-4" />
                📝 Note from Selection
              </button>
            )}
            <button
              onClick={handleAddNote}
              className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-[#27AE60] to-[#16A085] text-stone-900 rounded-md hover:from-[#27AE60]/90 hover:to-[#16A085]/90 text-sm transition-colors"
              title="Add note"
            >
              📝 Add Note
            </button>
            <button
              onClick={toggleFullscreen}
              className="p-2 rounded-md hover:bg-gray-200 transition-colors"
              title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
            >
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </button>
            <button
              onClick={handlePrint}
              className="p-2 rounded-md hover:bg-gray-200 transition-colors"
              title="Print document"
            >
              <Printer className="h-4 w-4" />
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center gap-2 px-3 py-1.5 bg-gray-600 text-white rounded-md hover:bg-gray-700 text-sm transition-colors"
              title="Download resource"
            >
              <Download className="h-4 w-4" />
              Download
            </button>
          </div>
        </div>
        
        {/* Selection Toolbar */}
        {selectedText && (
          <div className="px-4 py-3 bg-gradient-to-r from-[#27AE60]/10 to-[#16A085]/10 border-b border-[#27AE60]/20 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-sm text-[#27AE60] font-semibold">📝 Selected Text:</span>
              <span className="text-sm text-stone-700 italic line-clamp-1 max-w-md">"{selectedText}"</span>
            </div>
            <div className="flex items-center gap-2">
              {highlightMode && (
                <button
                  onClick={handleHighlightSelection}
                  className="flex items-center gap-1 px-3 py-1 bg-yellow-500 text-white text-xs rounded-md hover:bg-yellow-600 transition-colors"
                  title="Highlight this text"
                >
                  <Highlighter className="h-3 w-3" />
                  Highlight
                </button>
              )}
              <button
                onClick={() => {
                  window.getSelection()?.removeAllRanges();
                  setSelectedText('');
                  setSelectionPosition(null);
                }}
                className="text-xs text-stone-600 hover:text-stone-800 font-medium"
              >
                ✕ Clear
              </button>
            </div>
          </div>
        )}

        {/* Highlights Panel */}
        {highlights.length > 0 && (
          <div className="px-4 py-3 bg-yellow-50 border-b border-yellow-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-yellow-800 font-semibold flex items-center gap-2">
                <Highlighter className="h-4 w-4" />
                Text Highlights ({highlights.length})
              </span>
              <button
                onClick={clearAllHighlights}
                className="text-xs text-yellow-700 hover:text-yellow-800 font-medium px-2 py-1 bg-yellow-100 hover:bg-yellow-200 rounded"
              >
                Clear All
              </button>
            </div>
            <div className="text-xs text-yellow-700 mb-2">
              💡 Highlights are applied directly to the text above
            </div>
            <div className="space-y-2">
              {highlights.map((highlight) => (
                <div key={highlight.id} className="flex items-start gap-2 p-2 bg-yellow-100 rounded-md">
                  <span className="text-yellow-700 text-xs mt-0.5">📍</span>
                  <span className="text-sm text-yellow-900 italic flex-1">"{highlight.text}"</span>
                  <button
                    onClick={() => removeHighlight(highlight.id)}
                    className="text-yellow-600 hover:text-yellow-800 text-xs px-1.5 py-0.5 bg-yellow-200 hover:bg-yellow-300 rounded"
                    title="Remove this highlight"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Text Content with Selection Support */}
        <div
          className="flex-1 overflow-auto p-6 bg-white select-text"
          onMouseUp={handleTextSelection}
          onKeyUp={handleTextSelection}
        >
          <h1 className="text-3xl font-bold mb-4">{resource.title}</h1>

          {resource.author && (
            <p className="text-gray-600 mb-6">by {resource.author}</p>
          )}

          {resource.description && (
            <p className="text-gray-700 mb-6 italic">{resource.description}</p>
          )}

          <div className="prose max-w-none">
            {textContent ? (
              <div className="whitespace-pre-wrap">{textContent}</div>
            ) : (
              <>
                <p>
                  Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
                </p>

                <h2 className="text-2xl font-semibold mt-8 mb-4">Introduction</h2>
                <p>
                  Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.
                </p>

                <h2 className="text-2xl font-semibold mt-8 mb-4">Main Content</h2>
                <p>
                  Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.
                </p>

                <blockquote className="border-l-4 border-[#27AE60] pl-4 my-6 italic text-stone-700 bg-[#27AE60]/5 py-2 px-3 rounded-r-md">
                  "This is an important quote from the text that might be worth noting."
                </blockquote>

                <p>
                  Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt.
                </p>

                <h2 className="text-2xl font-semibold mt-8 mb-4">Conclusion</h2>
                <p>
                  Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit, sed quia non numquam eius modi tempora incidunt ut labore et dolore magnam aliquam quaerat voluptatem.
                </p>
              </>
            )}
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