import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import type { Resource } from '@/types/resources';
import { Image as ImageIcon, Download, Maximize2, Minimize2, Printer, Highlighter, MousePointer } from 'lucide-react';

interface DocumentViewerProps {
  resource: Resource;
  onNoteAnchor?: (position: string, sectionText?: string, sectionPosition?: number) => void; // REQUIREMENT: Section anchoring
  onExplainSelection?: (text: string) => void;
  id?: string;
}

const DocumentViewer: React.FC<DocumentViewerProps> = ({ resource, onNoteAnchor, onExplainSelection }) => {
  const { t } = useTranslation();
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

  // Handle adding note from selection
  const handleAddNoteFromSelection = useCallback(() => {
    if (selectedText && onNoteAnchor) {
      // Create a snippet for context
      const snippet = selectedText.length > 50 ? selectedText.substring(0, 50) + '...' : selectedText;
      onNoteAnchor(`Selection: "${snippet}"`, selectedText, selectionPosition?.start);
    }
  }, [selectedText, onNoteAnchor, selectionPosition]);

  // Handle adding general note
  const handleAddNote = useCallback(() => {
    if (onNoteAnchor) {
      onNoteAnchor('General Note');
    }
  }, [onNoteAnchor]);

  // Handle highlighting
  const handleHighlightSelection = useCallback(() => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const text = selection.toString();
      
      if (text.trim().length > 0) {
        const newHighlight = {
          text,
          id: Date.now().toString(),
          range: range.cloneRange()
        };
        
        setHighlights([...highlights, newHighlight]);
        
        // Clear selection
        selection.removeAllRanges();
        setSelectedText('');
        setSelectionPosition(null);
      }
    }
  }, [highlights]);

  const removeHighlight = (id: string) => {
    setHighlights(highlights.filter(h => h.id !== id));
  };

  const clearAllHighlights = () => {
    setHighlights([]);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    if (fileUrl) {
      const link = document.createElement('a');
      link.href = fileUrl;
      link.download = resource.title || 'document';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const renderDocument = () => {
    if (loading) {
      return (
        <div className="flex flex-col items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-primary mb-4"></div>
          <p>{t('resources.loading')}</p>
        </div>
      );
    }

    if (resource.file_type.includes('pdf')) {
      return (
        <iframe
          src={`${fileUrl}#toolbar=0`}
          className="w-full h-full min-h-[600px] border-0"
          title={resource.title}
        />
      );
    }

    if (resource.file_type.includes('image')) {
      return (
        <div className="flex items-center justify-center h-full bg-gray-100 p-4 overflow-auto">
          <img
            src={fileUrl}
            alt={resource.title}
            className="max-w-full max-h-full object-contain shadow-lg"
          />
        </div>
      );
    }

    return renderTextViewer();
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
                  ? 'bg-brand-primary text-white hover:bg-brand-primary-dark'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
              title={highlightMode ? t('resources.viewer.exit_highlight') : t('resources.viewer.highlight_mode')}
            >
              <Highlighter className="h-4 w-4" />
              {highlightMode ? t('resources.viewer.exit_highlight') : t('resources.viewer.highlight_mode')}
            </button>
          </div>
          
          <div className="flex items-center gap-2">
            {selectedText && (
              <button
                onClick={handleAddNoteFromSelection}
                className="flex items-center gap-2 px-3 py-1.5 bg-brand-primary text-white rounded-md hover:bg-brand-primary-dark text-sm transition-colors"
                title={t('resources.viewer.note_from_selection')}
              >
                <MousePointer className="h-4 w-4" />
                {t('resources.viewer.note_from_selection')}
              </button>
            )}
            <button
              onClick={handleAddNote}
              className="flex items-center gap-2 px-3 py-1.5 bg-brand-primary text-white rounded-md hover:bg-brand-primary-dark text-sm transition-colors"
              title={t('resources.viewer.add_note')}
            >
              📝 {t('resources.viewer.add_note')}
            </button>
            <button
              onClick={toggleFullscreen}
              className="p-2 rounded-md hover:bg-gray-200 transition-colors"
              title={isFullscreen ? t('resources.viewer.exit_fullscreen') : t('resources.viewer.enter_fullscreen')}
            >
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </button>
            <button
              onClick={handlePrint}
              className="p-2 rounded-md hover:bg-gray-200 transition-colors"
              title={t('resources.viewer.print')}
            >
              <Printer className="h-4 w-4" />
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center gap-2 px-3 py-1.5 bg-gray-600 text-white rounded-md hover:bg-gray-700 text-sm transition-colors"
              title={t('resources.viewer.download')}
            >
              <Download className="h-4 w-4" />
              {t('resources.viewer.download')}
            </button>
          </div>
        </div>
        
        {/* Selection Toolbar */}
        {selectedText && (
          <div className="px-4 py-3 bg-brand-soft/10 border-b border-brand-soft/20 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-sm text-brand-primary font-semibold">📝 {t('resources.viewer.selected_text')}:</span>
              <span className="text-sm text-gray-700 italic line-clamp-1 max-w-md">"{selectedText}"</span>
            </div>
            <div className="flex items-center gap-2">
              {highlightMode && (
                <button
                  onClick={handleHighlightSelection}
                  className="flex items-center gap-1 px-3 py-1 bg-yellow-500 text-white text-xs rounded-md hover:bg-yellow-600 transition-colors"
                  title={t('resources.viewer.highlight')}
                >
                  <Highlighter className="h-3 w-3" />
                  {t('resources.viewer.highlight')}
                </button>
              )}
              <button
                onClick={() => {
                  window.getSelection()?.removeAllRanges();
                  setSelectedText('');
                  setSelectionPosition(null);
                }}
                className="text-xs text-gray-600 hover:text-gray-800 font-medium"
              >
                ✕ {t('resources.viewer.clear')}
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
                {t('resources.viewer.text_highlights')} ({highlights.length})
              </span>
              <button
                onClick={clearAllHighlights}
                className="text-xs text-yellow-700 hover:text-yellow-800 font-medium px-2 py-1 bg-yellow-100 hover:bg-yellow-200 rounded"
              >
                {t('resources.viewer.clear_all')}
              </button>
            </div>
            <div className="text-xs text-yellow-700 mb-2">
              💡 {t('resources.viewer.highlights_info')}
            </div>
            <div className="space-y-2">
              {highlights.map((highlight) => (
                <div key={highlight.id} className="flex items-start gap-2 p-2 bg-yellow-100 rounded-md">
                  <span className="text-yellow-700 text-xs mt-0.5">📍</span>
                  <span className="text-sm text-yellow-900 italic flex-1">"{highlight.text}"</span>
                  <button
                    onClick={() => removeHighlight(highlight.id)}
                    className="text-yellow-600 hover:text-yellow-800 text-xs px-1.5 py-0.5 bg-yellow-200 hover:bg-yellow-300 rounded"
                    title={t('resources.viewer.remove_highlight')}
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
            <p className="text-gray-600 mb-6">{t('resources.viewer.by')} {resource.author}</p>
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

                <h2 className="text-2xl font-semibold mt-8 mb-4">{t('resources.viewer.introduction')}</h2>
                <p>
                  Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.
                </p>

                <h2 className="text-2xl font-semibold mt-8 mb-4">{t('resources.viewer.main_content')}</h2>
                <p>
                  Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.
                </p>

                <blockquote className="border-l-4 border-brand-primary pl-4 my-6 italic text-gray-700 bg-brand-soft/5 py-2 px-3 rounded-r-md">
                  "This is an important quote from the text that might be worth noting."
                </blockquote>

                <p>
                  Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt.
                </p>

                <h2 className="text-2xl font-semibold mt-8 mb-4">{t('resources.viewer.conclusion')}</h2>
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
              {resource.author && <span>{t('resources.viewer.by')} {resource.author}</span>}
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