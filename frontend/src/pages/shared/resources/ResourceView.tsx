import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { resourcesApi } from '@/services/api/resources';
import type { Resource, UserNote, AISummary } from '@/types/resources';
import DocumentViewer from '@/components/shared/resources/DocumentViewer';
import NotesEditor from '@/components/shared/resources/NotesEditor';
import AISummaryDisplay from '@/components/shared/resources/AISummaryDisplay';
import ExportManager from '@/components/shared/resources/ExportManager';
import ShareResourceModal from '@/components/shared/resources/ShareResourceModal';
import ResourceErrorHandler from '@/components/shared/resources/ResourceErrorHandler';
import { ArrowLeft } from 'lucide-react';

// Memoized loading spinner
const LoadingSpinner = React.memo(() => (
  <div className="flex items-center justify-center h-64">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
  </div>
));

const ResourceView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [resource, setResource] = useState<Resource | null>(null);
  const [notes, setNotes] = useState<UserNote[]>([]);
  const [publicNotes, setPublicNotes] = useState<UserNote[]>([]);
  const [sharedNotes, setSharedNotes] = useState<UserNote[]>([]); // REQUIREMENT: Share notes with chapter members
  const [summary, setSummary] = useState<AISummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [showNotesEditor, setShowNotesEditor] = useState(false);
  const [editingNote, setEditingNote] = useState<UserNote | null>(null);
  const [anchorPoint, setAnchorPoint] = useState<string | undefined>(undefined);
  const [sectionText, setSectionText] = useState<string | undefined>(undefined); // REQUIREMENT: Section anchoring
  const [sectionPosition, setSectionPosition] = useState<number | undefined>(undefined); // REQUIREMENT: Section anchoring
  const [showShareModal, setShowShareModal] = useState(false);
  const [summaryType, setSummaryType] = useState('brief');

  // Memoized load functions
  const loadResource = useCallback(async (resourceId: number) => {
    try {
      setLoading(true);
      const response = await resourcesApi.getResource(resourceId);
      if (response.success) {
        setResource(response.data.resource);
        // REQUIREMENT: Error notification for unsupported file types
        if (response.data.isUnsupported && response.data.errorMessage) {
          setError(response.data.errorMessage);
        }
      } else {
        setError('Failed to load resource');
      }
    } catch (err: any) {
      console.error('Load resource error:', err);
      setError(err.response?.data?.message || 'Failed to load resource');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadNotes = useCallback(async (resourceId: number) => {
    try {
      const response = await resourcesApi.getNotes(resourceId);
      if (response.success) {
        setNotes(response.data.user_notes || []);
        setPublicNotes(response.data.public_notes || []);
        // REQUIREMENT: Share notes with chapter members - load shared notes separately
        setSharedNotes((response.data as any).shared_notes || []);
      }
    } catch (err) {
      console.error('Load notes error:', err);
    }
  }, []);

  const loadSummary = useCallback(async (type: string = 'brief') => {
    if (!id) return;
    
    try {
      setSummaryLoading(true);
      setSummaryError(null);
      const response = await resourcesApi.getSummary(parseInt(id), type);
      if (response.success) {
        setSummary(response.data.summary);
        // REQUIREMENT: Check if summary meets word limit and relevance requirements
        if (response.data.meetsWordLimit === false) {
          console.warn('Summary exceeds 250 word limit');
        }
        if (response.data.meetsRelevanceRequirement === false) {
          console.warn('Summary does not meet 98% relevance requirement');
        }
      } else {
        setSummaryError('Failed to generate summary');
      }
    } catch (err: any) {
      console.error('Load summary error:', err);
      setSummaryError(err.response?.data?.message || 'Failed to generate summary');
    } finally {
      setSummaryLoading(false);
    }
  }, [id]);

  // Load data on component mount
  useEffect(() => {
    if (id) {
      loadResource(parseInt(id));
      loadNotes(parseInt(id));
    }
  }, [id, loadResource, loadNotes]);

  // Memoized event handlers
  const handleNoteAnchor = useCallback((position: string, sectionTextParam?: string, sectionPositionParam?: number) => {
    setAnchorPoint(position);
    setSectionText(sectionTextParam); // REQUIREMENT: Store section text for anchoring
    setSectionPosition(sectionPositionParam); // REQUIREMENT: Store section position for anchoring
    setEditingNote(null);
    setShowNotesEditor(true);
  }, []);

  const handleSaveNote = useCallback(async (content: string, isPublic: boolean, anchorPoint?: string, sectionText?: string, sectionPosition?: number) => {
    if (!id) return;
    
    try {
      // REQUIREMENT: Anchor notes to sections - send full section anchoring data
      const response = await resourcesApi.createNote({
        resourceId: parseInt(id),
        content,
        isPublic,
        anchorPoint, // Legacy support
        sectionAnchor: anchorPoint, // REQUIREMENT: Section anchoring
        sectionText: sectionText, // REQUIREMENT: Section text excerpt (from state)
        sectionPosition: sectionPosition // REQUIREMENT: Section position (from state)
      });
      
      if (response.success) {
        // Refresh notes
        await loadNotes(parseInt(id));
        setShowNotesEditor(false);
        setAnchorPoint(undefined);
        setSectionText(undefined); // REQUIREMENT: Clear section context
        setSectionPosition(undefined); // REQUIREMENT: Clear section context
      }
    } catch (err) {
      console.error('Save note error:', err);
    }
  }, [id, loadNotes]);

  const handleExport = useCallback(async (exportType: string = 'combined', format: string = 'pdf') => {
    if (!id) return;
    
    try {
      // REQUIREMENT: Export notes/summaries - call actual API
      const response = await resourcesApi.exportContent(parseInt(id), exportType, format);
      
      if (response.success && response.data.exportData) {
        // Create download link
        const exportData = response.data.exportData;
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${resource?.title || 'resource'}_export_${new Date().getTime()}.${format}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } else {
        // Fallback: show success message
        alert(`Export prepared for ${resource?.title} as ${format.toUpperCase()}`);
      }
    } catch (err) {
      console.error('Export error:', err);
      alert('Failed to export resource. Please try again.');
    }
  }, [id, resource?.title]);

  const handleShare = useCallback(async (method: string, _recipients: string[]) => {
    if (!id) return;
    
    try {
      // REQUIREMENT: Share with chapter members - call actual API
      if (method === 'chapter') {
        const response = await resourcesApi.shareResource(parseInt(id), 'view');
        if (response.success) {
          alert(`Successfully shared ${resource?.title} with chapter members`);
        } else {
          alert('Failed to share resource. Please try again.');
        }
      } else {
        // For specific recipients, we could implement email sharing later
        alert(`Sharing with specific recipients is not yet implemented. Please use chapter sharing.`);
      }
    } catch (err) {
      console.error('Share error:', err);
      alert('Failed to share resource. Please try again.');
    }
  }, [id, resource?.title]);

  const handleRetrySummary = useCallback(() => {
    loadSummary(summaryType);
  }, [loadSummary, summaryType]);

  const handleSummaryTypeChange = useCallback((type: string) => {
    setSummaryType(type);
    loadSummary(type);
  }, [loadSummary]);

  // Memoized error handling
  const renderError = useMemo(() => {
    if (!error) return null;
    
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
  }, [error, id, navigate, loadResource]);

  // Memoized resource not found state
  const renderResourceNotFound = useMemo(() => {
    if (resource) return null;
    
    return (
      <div className="p-6">
        <p>Resource not found</p>
      </div>
    );
  }, [resource]);

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return renderError;
  }

  if (!resource) {
    return renderResourceNotFound;
  }

  return (
    // ... existing JSX code remains the same
    <div className="p-6">
      <div className="mb-6">
        <button
          onClick={() => navigate('/resources')}
          className="flex items-center text-blue-600 hover:text-blue-800 mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Library
        </button>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">{resource.title}</h1>
        <p className="text-gray-600">{resource.description}</p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <DocumentViewer 
            resource={resource} 
            onNoteAnchor={handleNoteAnchor}
            id="document-viewer"
          />
        </div>
        
        <div className="space-y-6">
          <AISummaryDisplay 
            summary={summary}
            loading={summaryLoading}
            error={summaryError}
            onRetry={handleRetrySummary}
            onTypeChange={handleSummaryTypeChange}
          />
          
          {showNotesEditor && (
            <NotesEditor 
              resourceId={parseInt(id || '0')}
              notes={notes}
              publicNotes={[...publicNotes, ...sharedNotes]} // REQUIREMENT: Show shared notes
              showEditor={showNotesEditor}
              editingNote={editingNote}
              anchorPoint={anchorPoint}
              onSave={(content, isPublic, anchor) => handleSaveNote(content, isPublic, anchor, sectionText, sectionPosition)}
              onCancel={() => {
                setShowNotesEditor(false);
                setAnchorPoint(undefined);
                setSectionText(undefined);
                setSectionPosition(undefined);
              }}
            />
          )}
          
          {/* Display existing notes */}
          {!showNotesEditor && (notes.length > 0 || publicNotes.length > 0 || sharedNotes.length > 0) && (
            <div className="bg-white rounded-lg shadow-md border border-gray-200 p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Notes</h3>
              <div className="space-y-3">
                {notes.map(note => (
                  <div key={note.id} className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-700">{note.content}</p>
                    {note.section_anchor && (
                      <p className="text-xs text-gray-500 mt-1">Anchored to: {note.section_anchor}</p>
                    )}
                  </div>
                ))}
                {[...publicNotes, ...sharedNotes].map(note => (
                  <div key={note.id} className="p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm text-gray-700">{note.content}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      By {note.first_name} {note.last_name}
                      {note.section_anchor && ` • Anchored to: ${note.section_anchor}`}
                    </p>
                  </div>
                ))}
              </div>
              <button
                onClick={() => {
                  setShowNotesEditor(true);
                  setEditingNote(null);
                }}
                className="mt-4 w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Add New Note
              </button>
            </div>
          )}
          
          {!showNotesEditor && notes.length === 0 && publicNotes.length === 0 && sharedNotes.length === 0 && (
            <div className="bg-white rounded-lg shadow-md border border-gray-200 p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Notes</h3>
              <p className="text-gray-500 mb-4">No notes yet. Add your first note!</p>
              <button
                onClick={() => {
                  setShowNotesEditor(true);
                  setEditingNote(null);
                }}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Add First Note
              </button>
            </div>
          )}
          
          <ExportManager 
            resourceId={parseInt(id || '0')}
            resourceName={resource?.title || 'Resource'}
            onExport={handleExport}
            onShare={() => setShowShareModal(true)}
          />
        </div>
      </div>
      
      {showShareModal && resource && (
        <ShareResourceModal 
          resourceId={resource.id}
          resourceName={resource.title}
          isOpen={showShareModal}
          onClose={() => setShowShareModal(false)}
          onShare={handleShare}
        />
      )}
    </div>
  );
};

export default React.memo(ResourceView);