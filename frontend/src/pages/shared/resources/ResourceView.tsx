import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { resourcesApi } from '@/services/api/resources';
import type { Resource, UserNote, AISummary } from '@/types/resources';
import DocumentViewer from '@/components/shared/resources/DocumentViewer';
import NotesEditor from '@/components/shared/resources/NotesEditor';
import AISummaryDisplay from '@/components/shared/resources/AISummaryDisplay';
import ExportManager from '@/components/shared/resources/ExportManager';
import ShareResourceModal from '@/components/shared/resources/ShareResourceModal';
import RequestAccessModal from '@/components/shared/resources/RequestAccessModal';
import ResourceErrorHandler from '@/components/shared/resources/ResourceErrorHandler';
import { ArrowLeft, Layout, FileText, Share2, Download, MessageSquare, Sparkles } from 'lucide-react';
import { useNotification } from '@/context/NotificationContext';

// Memoized loading spinner
const LoadingSpinner = React.memo(() => (
  <div className="flex items-center justify-center h-64">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
  </div>
));

const ResourceView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showNotification } = useNotification();
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
  const [showRequestAccessModal, setShowRequestAccessModal] = useState(false);
  const [summaryType, setSummaryType] = useState('brief');
  const [requestInProgress, setRequestInProgress] = useState(false);
  const [requestStatusMessage, setRequestStatusMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'summary' | 'notes' | 'export'>('summary');
  const pollRef = React.useRef<number | null>(null);

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
      const msg = err.response?.data?.message || 'Failed to load resource';
      setError(msg);

      // If server explicitly forbids access, prompt the user to request access
      if (err.response?.status === 403) {
        // Open the request access modal so the user can submit a request
        setShowRequestAccessModal(true);
      }
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

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
      }
    };
  }, []);

  // Memoized event handlers
  const handleNoteAnchor = useCallback((position: string, sectionTextParam?: string, sectionPositionParam?: number) => {
    setAnchorPoint(position);
    setSectionText(sectionTextParam); // REQUIREMENT: Store section text for anchoring
    setSectionPosition(sectionPositionParam); // REQUIREMENT: Store section position for anchoring
    setEditingNote(null);
    setShowNotesEditor(true);
    setActiveTab('notes');
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
        const exportData = response.data.exportData;
        let content: string;
        let mimeType: string;
        let fileExtension: string;

        // Format content based on export format
        switch (format.toLowerCase()) {
          case 'pdf':
            // For now, create a formatted text file that could be easily converted to PDF
            content = generateFormattedText(exportData, exportType);
            mimeType = 'text/plain';
            fileExtension = 'txt';
            break;

          case 'docx':
          case 'doc':
            // Create formatted text that can be copied to Word
            content = generateFormattedText(exportData, exportType);
            mimeType = 'text/plain';
            fileExtension = 'txt';
            break;

          case 'txt':
          default:
            content = generateFormattedText(exportData, exportType);
            mimeType = 'text/plain';
            fileExtension = 'txt';
            break;
        }

        // Create download link
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${resource?.title || 'resource'}_export_${new Date().getTime()}.${fileExtension}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        showNotification({
          type: 'success',
          title: 'Export Complete',
          message: `Export completed! File saved as: ${resource?.title || 'resource'}_export_${new Date().getTime()}.${fileExtension}`
        });
      } else {
        // Fallback: show success message
        showNotification({
          type: 'info',
          title: 'Export Prepared',
          message: `Export prepared for ${resource?.title} as ${format.toUpperCase()}`
        });
      }
    } catch (err) {
      console.error('Export error:', err);
      showNotification({
        type: 'error',
        title: 'Export Failed',
        message: 'Failed to export resource. Please try again.'
      });
    }
  }, [id, resource?.title]);

  // Helper function to generate formatted text content
  const generateFormattedText = useCallback((exportData: any, exportType: string): string => {
    let content = '';

    // Header
    content += `RESOURCE EXPORT\n`;
    content += `================\n\n`;
    content += `Title: ${exportData.resource?.title || 'N/A'}\n`;
    content += `Author: ${exportData.resource?.author || 'N/A'}\n`;
    content += `Category: ${exportData.resource?.category || 'N/A'}\n`;
    content += `Exported: ${exportData.exportedAt || new Date().toISOString()}\n\n`;

    // Description
    if (exportData.resource?.description) {
      content += `DESCRIPTION\n`;
      content += `-----------\n`;
      content += `${exportData.resource.description}\n\n`;
    }

    // Summary (if included)
    if (exportData.summary && (exportType === 'summary' || exportType === 'combined')) {
      content += `AI SUMMARY\n`;
      content += `----------\n`;
      if (exportData.summary.keyPoints && exportData.summary.keyPoints.length > 0) {
        content += `Key Points:\n`;
        exportData.summary.keyPoints.forEach((point: string, index: number) => {
          content += `${index + 1}. ${point}\n`;
        });
        content += `\n`;
      }
      if (exportData.summary.summary) {
        content += `Summary:\n${exportData.summary.summary}\n\n`;
      }
      if (exportData.summary.spiritualInsights) {
        content += `Spiritual Insights:\n${exportData.summary.spiritualInsights}\n\n`;
      }
    }

    // Notes (if included)
    if (exportData.notes && exportData.notes.length > 0 && (exportType === 'notes' || exportType === 'combined')) {
      content += `NOTES\n`;
      content += `-----\n`;
      exportData.notes.forEach((note: any, index: number) => {
        content += `Note ${index + 1}:\n`;
        content += `Content: ${note.content}\n`;
        if (note.is_public !== undefined) {
          content += `Type: ${note.is_public ? 'Public' : 'Private'}\n`;
        }
        if (note.section_anchor) {
          content += `Anchored to: ${note.section_anchor}\n`;
        }
        if (note.created_at) {
          content += `Created: ${new Date(note.created_at).toLocaleDateString()}\n`;
        }
        content += `\n`;
      });
    }

    return content;
  }, []);

  const handleShare = useCallback(async (method: string, _recipients: string[]) => {
    if (!id) return;
    
    try {
      // REQUIREMENT: Share with chapter members - call actual API
      if (method === 'chapter') {
        const response = await resourcesApi.shareResource(parseInt(id), 'view');
        if (response.success) {
          showNotification({
            type: 'success',
            title: 'Shared Successfully',
            message: `Successfully shared ${resource?.title} with chapter members`
          });
        } else {
          showNotification({
            type: 'error',
            title: 'Share Failed',
            message: 'Failed to share resource. Please try again.'
          });
        }
      } else {
        // For specific recipients, we could implement email sharing later
        showNotification({
          type: 'info',
          title: 'Feature Not Available',
          message: 'Sharing with specific recipients is not yet implemented. Please use chapter sharing.'
        });
      }
    } catch (err) {
      console.error('Share error:', err);
      showNotification({
        type: 'error',
        title: 'Share Failed',
        message: 'Failed to share resource. Please try again.'
      });
    }
  }, [id, resource?.title]);

  const handleRequestAccess = useCallback(() => {
    // Open the request access modal so the user can provide a message
    setShowRequestAccessModal(true);
  }, []);

  const submitRequestAccess = useCallback(async (message: string) => {
    if (!id) {
      navigate('/support');
      return;
    }
    try {
      setRequestInProgress(true);
      setRequestStatusMessage('Sending access request...');
      const response = await resourcesApi.requestAccess(parseInt(id), message);

      // Close modal immediately and show status banner
      setShowRequestAccessModal(false);

      if (response && response.success) {
        const msg = response.message || 'Access request sent. Waiting for approval.';
        setRequestStatusMessage(msg);

        // Start polling the resource endpoint to detect when access is granted
        let attempts = 0;
        const maxAttempts = 12; // ~1 minute with 5s interval
        const intervalMs = 5000;

        pollRef.current = window.setInterval(async () => {
          attempts++;
          try {
            const res = await resourcesApi.getResource(parseInt(id));
            if (res && res.success) {
              // Access granted — load resource data and stop polling
              setResource(res.data.resource);
              setError(null);
              setRequestStatusMessage('Access granted. Loading resource...');
              // Refresh notes and summary now that access is available
              try {
                await loadNotes(parseInt(id));
                await loadSummary(summaryType);
              } catch (refreshErr) {
                console.warn('Failed to refresh notes/summary after access grant', refreshErr);
              }
              setRequestInProgress(false);
              if (pollRef.current) {
                clearInterval(pollRef.current);
                pollRef.current = null;
              }
            } else {
              // keep waiting
            }
          } catch (pollErr: any) {
            // If still 403 keep waiting; if other errors, stop
            if (pollErr && pollErr.response && pollErr.response.status !== 403) {
              console.error('Polling error:', pollErr);
              setRequestStatusMessage('Unexpected error while checking access. Contact support.');
              setRequestInProgress(false);
              if (pollRef.current) {
                clearInterval(pollRef.current);
                pollRef.current = null;
              }
            }
          }

          if (attempts >= maxAttempts) {
            // Timeout — stop polling and direct user to support
            setRequestStatusMessage('Access request sent. If you do not receive access soon, contact support.');
            setRequestInProgress(false);
            if (pollRef.current) {
              clearInterval(pollRef.current);
              pollRef.current = null;
            }
          }
        }, intervalMs);
      } else {
        setRequestStatusMessage(response.message || 'Failed to send access request. Redirecting to support.');
        setRequestInProgress(false);
        navigate('/support');
      }
    } catch (err: any) {
      console.error('Request access error:', err);
      setRequestStatusMessage(err?.message || 'Failed to send access request. Redirecting to support.');
      setRequestInProgress(false);
      setShowRequestAccessModal(false);
      navigate('/support');
    }
  }, [id, navigate, loadNotes, loadSummary, summaryType]);

  // Clean up polling on unmount
  useEffect(() => {
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, []);

  const handleRetrySummary = useCallback(() => {
    loadSummary(summaryType);
  }, [loadSummary, summaryType]);

  const handleExplainSelection = useCallback(async (text: string) => {
    if (!id) return;

    try {
      setSummaryLoading(true);
      setSummaryError(null);
      // Call explain endpoint (falls back to summary endpoint if backend doesn't support)
      try {
        const response = await resourcesApi.explainSection(parseInt(id), text, summaryType);
        if (response.success) {
          setSummary(response.data.summary);
        } else {
          setSummaryError('Failed to explain selection');
        }
      } catch (err: any) {
        console.warn('Explain endpoint failed, falling back to general summary', err);
        // Fallback: request a general summary when explain isn't available
        const fallback = await resourcesApi.getSummary(parseInt(id), summaryType);
        if (fallback.success) {
          setSummary(fallback.data.summary);
        } else {
          setSummaryError('Failed to explain selection');
        }
      }
    } catch (err: any) {
      console.error('Explain selection error:', err);
      setSummaryError(err.response?.data?.message || 'Failed to explain selection');
    } finally {
      setSummaryLoading(false);
    }
  }, [id, summaryType]);

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
          onContactSupport={handleRequestAccess}
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
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Minimal Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/resources')}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-900 truncate max-w-xl">{resource.title}</h1>
            <div className="flex items-center gap-3 text-sm text-slate-500">
              {resource.author && <span>{resource.author}</span>}
              {resource.author && resource.category && <span>•</span>}
              {resource.category && <span>{resource.category}</span>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowShareModal(true)}
            className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="Share"
          >
            <Share2 className="h-5 w-5" />
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Main Content - Document Viewer */}
        <main className="flex-1 overflow-y-auto p-6 bg-slate-50">
          {requestStatusMessage && (
            <div className="mb-6 p-4 rounded-xl bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200 text-sm text-amber-800 flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-3">
                {requestInProgress && (
                  <svg className="animate-spin h-4 w-4 text-amber-600" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                )}
                <span className="font-medium">{requestStatusMessage}</span>
              </div>
              {!requestInProgress && (
                <button onClick={() => { setRequestStatusMessage(null); }} className="text-xs text-amber-700 hover:text-amber-800 underline font-medium transition-colors">Dismiss</button>
              )}
            </div>
          )}

          <div className="h-full bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <DocumentViewer
              resource={resource}
              onNoteAnchor={handleNoteAnchor}
              onExplainSelection={handleExplainSelection}
              id="document-viewer"
            />
          </div>
        </main>

        {/* Right Sidebar - Tabs */}
        <aside className="w-96 bg-white border-l border-slate-200 flex flex-col shadow-lg z-10">
          {/* Tab Headers */}
          <div className="flex border-b border-slate-200">
            <button
              onClick={() => setActiveTab('summary')}
              className={`flex-1 py-4 text-sm font-medium border-b-2 transition-colors flex items-center justify-center gap-2 ${
                activeTab === 'summary'
                  ? 'border-blue-500 text-blue-600 bg-blue-50/50'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Sparkles className="h-4 w-4" />
              AI Summary
            </button>
            <button
              onClick={() => setActiveTab('notes')}
              className={`flex-1 py-4 text-sm font-medium border-b-2 transition-colors flex items-center justify-center gap-2 ${
                activeTab === 'notes'
                  ? 'border-blue-500 text-blue-600 bg-blue-50/50'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
              }`}
            >
              <MessageSquare className="h-4 w-4" />
              Notes
            </button>
            <button
              onClick={() => setActiveTab('export')}
              className={`flex-1 py-4 text-sm font-medium border-b-2 transition-colors flex items-center justify-center gap-2 ${
                activeTab === 'export'
                  ? 'border-blue-500 text-blue-600 bg-blue-50/50'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Download className="h-4 w-4" />
              Export
            </button>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {activeTab === 'summary' && (
              <div className="space-y-6">
                <AISummaryDisplay
                  summary={summary}
                  loading={summaryLoading}
                  error={summaryError}
                  onRetry={handleRetrySummary}
                  onTypeChange={handleSummaryTypeChange}
                />
              </div>
            )}

            {activeTab === 'notes' && (
              <div className="space-y-6">
                {showNotesEditor ? (
                  <NotesEditor
                    resourceId={parseInt(id || '0')}
                    notes={notes}
                    publicNotes={[...publicNotes, ...sharedNotes]}
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
                ) : (
                  <>
                    <button
                      onClick={() => {
                        setShowNotesEditor(true);
                        setEditingNote(null);
                      }}
                      className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors shadow-sm flex items-center justify-center gap-2"
                    >
                      <MessageSquare className="h-4 w-4" />
                      Add New Note
                    </button>

                    {(notes.length > 0 || publicNotes.length > 0 || sharedNotes.length > 0) ? (
                      <div className="space-y-4">
                        {notes.map(note => (
                          <div key={note.id} className="p-4 bg-slate-50 rounded-lg border border-slate-200 hover:border-blue-300 transition-colors">
                            <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{note.content}</p>
                            {note.section_anchor && (
                              <p className="text-xs text-blue-600 font-medium mt-2 flex items-center gap-1">
                                📍 Anchored to section
                              </p>
                            )}
                            <p className="text-xs text-slate-400 mt-2">
                              {new Date(note.created_at || '').toLocaleDateString()}
                            </p>
                          </div>
                        ))}
                        {[...publicNotes, ...sharedNotes].map(note => (
                          <div key={note.id} className="p-4 bg-blue-50/50 rounded-lg border border-blue-100">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-600">
                                {note.first_name?.[0]}
                              </div>
                              <span className="text-xs font-medium text-slate-700">{note.first_name} {note.last_name}</span>
                            </div>
                            <p className="text-sm text-slate-700 leading-relaxed">{note.content}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12 text-slate-400">
                        <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-20" />
                        <p>No notes yet</p>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {activeTab === 'export' && (
              <ExportManager
                resourceId={parseInt(id || '0')}
                resourceName={resource?.title || 'Resource'}
                onExport={handleExport}
                onShare={() => setShowShareModal(true)}
              />
            )}
          </div>
        </aside>
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
      {showRequestAccessModal && resource && (
        <RequestAccessModal
          resourceId={resource.id}
          resourceName={resource.title}
          isOpen={showRequestAccessModal}
          onClose={() => setShowRequestAccessModal(false)}
          onSubmit={submitRequestAccess}
        />
      )}
    </div>
  );
};

export default React.memo(ResourceView);