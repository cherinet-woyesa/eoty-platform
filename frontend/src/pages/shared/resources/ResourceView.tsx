import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { resourcesApi } from '@/services/api/resources';
import type { Resource, UserNote, AISummary } from '@/types/resources';
import DocumentViewer from '@/components/shared/resources/DocumentViewer';
import NotesEditor from '@/components/shared/resources/NotesEditor';
import AISummaryDisplay from '@/components/shared/resources/AISummaryDisplay';
import ExportManager from '@/components/shared/resources/ExportManager';
import ShareResourceModal from '@/components/shared/resources/ShareResourceModal';
import AIFallbackHandler from '@/components/shared/resources/AIFallbackHandler';
import ResourceErrorHandler from '@/components/shared/resources/ResourceErrorHandler';
import { MessageCircle, BookOpen, FileText, ArrowLeft, Share2 } from 'lucide-react';

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

  // Memoized load functions
  const loadResource = useCallback(async (resourceId: number) => {
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
  }, []);

  const loadNotes = useCallback(async (resourceId: number) => {
    try {
      const response = await resourcesApi.getNotes(resourceId);
      if (response.success) {
        setNotes(response.data.user_notes);
        setPublicNotes(response.data.public_notes);
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
  const handleNoteAnchor = useCallback((position: string) => {
    setAnchorPoint(position);
    setEditingNote(null);
    setShowNotesEditor(true);
  }, []);

  const handleSaveNote = useCallback(async (content: string, isPublic: boolean, anchorPoint?: string) => {
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
  }, [id, loadNotes]);

  const handleExport = useCallback(async (format: string) => {
    if (!id) return;
    
    try {
      await resourcesApi.exportContent(parseInt(id), format);
      // In a real implementation, this would trigger a download
      alert(`Exported ${resource?.title} as ${format.toUpperCase()}`);
    } catch (err) {
      console.error('Export error:', err);
    }
  }, [id, resource?.title]);

  const handleShare = useCallback(async (method: string, recipients: string[]) => {
    // In a real implementation, this would call the sharing API
    alert(`Shared ${resource?.title} with ${method === 'chapter' ? 'chapter members' : recipients.join(', ')}`);
  }, [resource?.title]);

  const handleRetrySummary = useCallback(() => {
    loadSummary(summaryType);
  }, [loadSummary, summaryType]);

  const handleAskQuestion = useCallback(() => {
    // Navigate to AI chat with context
    navigate('/ai/chat', { 
      state: { 
        context: `Resource: ${resource?.title}`, 
        resourceId: id 
      } 
    });
  }, [navigate, resource?.title, id]);

  const handleManualSummary = useCallback(() => {
    // Scroll to document viewer
    document.getElementById('document-viewer')?.scrollIntoView({ behavior: 'smooth' });
  }, []);

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
            onAskQuestion={handleAskQuestion}
            onManualSummary={handleManualSummary}
            onTypeChange={handleSummaryTypeChange}
            currentType={summaryType}
          />
          
          <NotesEditor 
            notes={notes}
            publicNotes={publicNotes}
            showEditor={showNotesEditor}
            editingNote={editingNote}
            anchorPoint={anchorPoint}
            onSave={handleSaveNote}
            onCancel={() => setShowNotesEditor(false)}
          />
          
          <ExportManager onExport={handleExport} />
          
          <button
            onClick={() => setShowShareModal(true)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <Share2 className="h-5 w-5" />
            Share Resource
          </button>
        </div>
      </div>
      
      {showShareModal && (
        <ShareResourceModal 
          resource={resource}
          onClose={() => setShowShareModal(false)}
          onShare={handleShare}
        />
      )}
    </div>
  );
};

export default React.memo(ResourceView);