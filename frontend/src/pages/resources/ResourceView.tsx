import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { resourcesApi } from '../../services/api/resources';
import type { Resource, UserNote, AISummary } from '../../types/resources';
import DocumentViewer from '../../components/resources/DocumentViewer';
import NotesEditor from '../../components/resources/NotesEditor';
import AISummaryDisplay from '../../components/resources/AISummaryDisplay';
import ExportManager from '../../components/resources/ExportManager';
import ShareResourceModal from '../../components/resources/ShareResourceModal';
import AIFallbackHandler from '../../components/resources/AIFallbackHandler';
import ResourceErrorHandler from '../../components/resources/ResourceErrorHandler';
import { MessageCircle, BookOpen, FileText, ArrowLeft, Share2 } from 'lucide-react';

const ResourceView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [resource, setResource] = useState<Resource | null>(null);
  const [notes, setNotes] = useState<UserNote[]>([]);
  const [publicNotes, setPublicNotes] = useState<UserNote[]>([]);
  const [summary, setSummary] = useState<AISummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [showNotesEditor, setShowNotesEditor] = useState(false);
  const [editingNote, setEditingNote] = useState<UserNote | null>(null);
  const [anchorPoint, setAnchorPoint] = useState<string | undefined>(undefined);
  const [showShareModal, setShowShareModal] = useState(false);
  const [summaryType, setSummaryType] = useState('brief');

  useEffect(() => {
    if (id) {
      loadResource(parseInt(id));
      loadNotes(parseInt(id));
    }
  }, [id]);

  const loadResource = async (resourceId: number) => {
    try {
      setLoading(true);
      const response = await resourcesApi.getResource(resourceId);
      if (response.success) {
        setResource(response.data.resource);
      } else {
        setError('Failed to load resource');
      }
    } catch (err: any) {
      console.error('Load resource error:', err);
      setError(err.response?.data?.message || 'Failed to load resource');
    } finally {
      setLoading(false);
    }
  };

  const loadNotes = async (resourceId: number) => {
    try {
      const response = await resourcesApi.getNotes(resourceId);
      if (response.success) {
        setNotes(response.data.user_notes);
        setPublicNotes(response.data.public_notes);
      }
    } catch (err) {
      console.error('Load notes error:', err);
    }
  };

  const loadSummary = async (type: string = 'brief') => {
    if (!id) return;
    
    try {
      setSummaryLoading(true);
      setSummaryError(null);
      const response = await resourcesApi.getSummary(parseInt(id), type);
      if (response.success) {
        setSummary(response.data.summary);
      } else {
        setSummaryError('Failed to generate summary');
      }
    } catch (err: any) {
      console.error('Load summary error:', err);
      setSummaryError(err.response?.data?.message || 'Failed to generate summary');
    } finally {
      setSummaryLoading(false);
    }
  };

  const handleNoteAnchor = (position: string) => {
    setAnchorPoint(position);
    setEditingNote(null);
    setShowNotesEditor(true);
  };

  const handleSaveNote = async (content: string, isPublic: boolean, anchorPoint?: string) => {
    if (!id) return;
    
    try {
      const response = await resourcesApi.createNote({
        resourceId: parseInt(id),
        content,
        isPublic,
        anchorPoint
      });
      
      if (response.success) {
        // Refresh notes
        await loadNotes(parseInt(id));
        setShowNotesEditor(false);
        setAnchorPoint(undefined);
      }
    } catch (err) {
      console.error('Save note error:', err);
    }
  };

  const handleExport = async (format: string) => {
    if (!id) return;
    
    try {
      await resourcesApi.exportContent(parseInt(id), format);
      // In a real implementation, this would trigger a download
      alert(`Exported ${resource?.title} as ${format.toUpperCase()}`);
    } catch (err) {
      console.error('Export error:', err);
    }
  };

  const handleShare = async (method: string, recipients: string[]) => {
    // In a real implementation, this would call the sharing API
    alert(`Shared ${resource?.title} with ${method === 'chapter' ? 'chapter members' : recipients.join(', ')}`);
  };

  const handleRetrySummary = () => {
    loadSummary(summaryType);
  };

  const handleAskQuestion = () => {
    // Navigate to AI chat with context
    navigate('/ai/chat', { 
      state: { 
        context: `Resource: ${resource?.title}`, 
        resourceId: id 
      } 
    });
  };

  const handleManualSummary = () => {
    // Scroll to document viewer
    document.getElementById('document-viewer')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSummaryTypeChange = (type: string) => {
    setSummaryType(type);
    loadSummary(type);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    if (error.includes('Access denied')) {
      return (
        <ResourceErrorHandler 
          errorType="unauthorized" 
          onGoHome={() => navigate('/dashboard')}
          onContactSupport={() => navigate('/support')}
        />
      );
    } else if (error.includes('not found')) {
      return (
        <ResourceErrorHandler 
          errorType="not_found" 
          onGoHome={() => navigate('/dashboard')}
          onContactSupport={() => navigate('/support')}
        />
      );
    } else {
      return (
        <ResourceErrorHandler 
          errorType="generic" 
          onRetry={() => id && loadResource(parseInt(id))}
          onGoHome={() => navigate('/dashboard')}
          onContactSupport={() => navigate('/support')}
        />
      );
    }
  }

  if (!resource) {
    return (
      <div className="p-6">
        <p>Resource not found</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center text-blue-600 hover:text-blue-800 mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back
        </button>
        
        <div className="flex flex-col md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{resource.title}</h1>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              {resource.category && (
                <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                  {resource.category}
                </span>
              )}
              <span className="text-sm text-gray-500">{resource.file_type.toUpperCase()}</span>
              {resource.author && (
                <span className="text-sm text-gray-500">by {resource.author}</span>
              )}
            </div>
          </div>
          
          <div className="mt-4 md:mt-0">
            <button
              onClick={() => setShowShareModal(true)}
              className="flex items-center px-4 py-2 bg-white border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <Share2 className="h-4 w-4 mr-2" />
              Share
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content - Document Viewer */}
        <div className="lg:col-span-2">
          <div id="document-viewer" className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden h-[calc(100vh-200px)]">
            <DocumentViewer 
              resource={resource} 
              onNoteAnchor={handleNoteAnchor}
            />
          </div>
        </div>

        {/* Sidebar - Notes, Summary, Export */}
        <div className="space-y-6">
          {/* AI Summary */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-gray-900">AI Summary</h2>
              <button
                onClick={() => loadSummary(summaryType)}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Refresh
              </button>
            </div>
            
            {summaryError ? (
              <AIFallbackHandler
                resourceId={parseInt(id || '0')}
                onRetry={handleRetrySummary}
                onAskQuestion={handleAskQuestion}
                onManualSummary={handleManualSummary}
              />
            ) : (
              <AISummaryDisplay
                summary={summary}
                loading={summaryLoading}
                error={summaryError}
                onRetry={handleRetrySummary}
                onTypeChange={handleSummaryTypeChange}
              />
            )}
          </div>

          {/* Notes Section */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-gray-900">Notes</h2>
              <button
                onClick={() => {
                  setEditingNote(null);
                  setAnchorPoint(undefined);
                  setShowNotesEditor(true);
                }}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Add Note
              </button>
            </div>
            
            {showNotesEditor && (
              <div className="mb-4">
                <NotesEditor
                  resourceId={parseInt(id || '0')}
                  anchorPoint={anchorPoint}
                  existingNote={editingNote}
                  onSave={handleSaveNote}
                  onCancel={() => {
                    setShowNotesEditor(false);
                    setEditingNote(null);
                    setAnchorPoint(undefined);
                  }}
                />
              </div>
            )}
            
            <div className="space-y-4">
              {notes.length === 0 && publicNotes.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded-lg">
                  <MessageCircle className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-500">No notes yet. Add your first note!</p>
                </div>
              ) : (
                <>
                  {notes.map(note => (
                    <div key={note.id} className="bg-white p-4 rounded-lg border border-gray-200">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-gray-500">
                          {new Date(note.created_at).toLocaleDateString()}
                        </span>
                        {!note.is_public && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            Private
                          </span>
                        )}
                      </div>
                      <p className="text-gray-700">{note.content}</p>
                      {note.anchor_point && (
                        <div className="mt-2 text-xs text-gray-500">
                          Anchored to: {note.anchor_point}
                        </div>
                      )}
                    </div>
                  ))}
                  
                  {publicNotes.map(note => (
                    <div key={note.id} className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-blue-700">
                          {note.first_name} {note.last_name}
                        </span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          Shared
                        </span>
                      </div>
                      <p className="text-gray-700">{note.content}</p>
                      {note.anchor_point && (
                        <div className="mt-2 text-xs text-blue-600">
                          Anchored to: {note.anchor_point}
                        </div>
                      )}
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>

          {/* Export Manager */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Export & Share</h2>
            <ExportManager
              resourceId={parseInt(id || '0')}
              resourceName={resource.title}
              onExport={handleExport}
              onShare={() => setShowShareModal(true)}
            />
          </div>
        </div>
      </div>

      {/* Share Modal */}
      <ShareResourceModal
        resourceId={parseInt(id || '0')}
        resourceName={resource.title}
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        onShare={handleShare}
      />
    </div>
  );
};

export default ResourceView;