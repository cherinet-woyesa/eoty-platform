import { useState, useEffect, useRef } from 'react';
import { 
  Bookmark, 
  FileText, 
  Plus, 
  Edit2, 
  Trash2, 
  Clock, 
  Eye, 
  EyeOff,
  X,
  Save,
  Tag
} from 'lucide-react';
import { videoNotesApi, type VideoNote, type CreateNoteData } from '@/services/api/videoNotes';

// Mobile detection hook
const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return isMobile;
};

interface VideoNotesPanelProps {
  lessonId: string;
  currentTime: number;
  onSeekTo: (timestamp: number) => void;
  isOpen: boolean;
  onClose: () => void;
}

const VideoNotesPanel: React.FC<VideoNotesPanelProps> = ({
  lessonId,
  currentTime,
  onSeekTo,
  isOpen,
  onClose
}) => {
  const isMobile = useIsMobile();
  const [notes, setNotes] = useState<VideoNote[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingNote, setEditingNote] = useState<VideoNote | null>(null);
  const [formData, setFormData] = useState<CreateNoteData>({
    content: '',
    timestamp: 0,
    type: 'note',
    color: 'default',
    visibility: 'private'
  });
  const [toast, setToast] = useState<{ type: 'error' | 'success'; message: string } | null>(null);

  const formRef = useRef<HTMLFormElement>(null);

  // Load notes
  useEffect(() => {
    if (isOpen && lessonId) {
      loadNotes();
    }
  }, [isOpen, lessonId]);

  const loadNotes = async () => {
    setLoading(true);
    try {
      const response = await videoNotesApi.getNotes(lessonId);
      if (response.success) {
        setNotes(response.data.notes || []);
      }
    } catch (error) {
      console.error('Failed to load notes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddNote = () => {
    setFormData({
      content: '',
      timestamp: currentTime,
      type: 'note',
      color: 'default',
      visibility: 'private'
    });
    setShowAddForm(true);
    setEditingNote(null);
  };

  const handleAddBookmark = () => {
    setFormData({
      content: '',
      timestamp: currentTime,
      type: 'bookmark',
      color: 'yellow',
      visibility: 'private'
    });
    setShowAddForm(true);
    setEditingNote(null);
  };

  const handleEditNote = (note: VideoNote) => {
    setFormData({
      content: note.content,
      timestamp: note.timestamp,
      type: note.type,
      color: note.color,
      title: note.title || undefined,
      visibility: note.visibility
    });
    setEditingNote(note);
    setShowAddForm(true);
  };

  const handleSaveNote = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingNote) {
        // Update existing note
        await videoNotesApi.updateNote(lessonId, editingNote.id, formData);
      } else {
        // Create new note
        const res = await videoNotesApi.createNote(lessonId, formData);
        if (!res.success) {
          throw new Error(res.message || 'Failed to save note');
        }
      }
      
      await loadNotes();
      setShowAddForm(false);
      setEditingNote(null);
      setFormData({
        content: '',
        timestamp: 0,
        type: 'note',
        color: 'default',
        visibility: 'private'
      });
    } catch (error: any) {
      console.error('Failed to save note:', error);
      // Show inline, user-facing banner instead of console-only
      const msg = error?.message || 'Failed to save note. Please try again.';
      setToast({ type: 'error', message: msg });
    }
  };

  const handleDeleteNote = async (noteId: number) => {
    if (!confirm('Are you sure you want to delete this note?')) {
      return;
    }

    try {
      await videoNotesApi.deleteNote(lessonId, noteId);
      await loadNotes();
    } catch (error) {
      console.error('Failed to delete note:', error);
      alert('Failed to delete note. Please try again.');
    }
  };

  const formatTimestamp = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getColorClass = (color: string) => {
    const colorMap: Record<string, string> = {
      default: 'bg-slate-100 border-slate-300',
      yellow: 'bg-yellow-50 border-yellow-300',
      green: 'bg-green-50 border-green-300',
      blue: 'bg-blue-50 border-blue-300',
      red: 'bg-red-50 border-red-300',
      purple: 'bg-purple-50 border-purple-300'
    };
    return colorMap[color] || colorMap.default;
  };

  const getColorDot = (color: string) => {
    const colorMap: Record<string, string> = {
      default: 'bg-slate-400',
      yellow: 'bg-[#FFD700]',
      green: 'bg-[#39FF14]',
      blue: 'bg-[#4FC3F7]',
      red: 'bg-[#FF6B35]',
      purple: 'bg-purple-500'
    };
    return colorMap[color] || colorMap.default;
  };

  if (!isOpen) return null;

  return (
    <div className={`fixed right-0 top-0 h-full bg-white shadow-2xl z-50 flex flex-col border-l border-slate-200/50 ${
        isMobile ? 'w-full' : 'w-96'
      } overflow-y-auto`}> 
      {toast && (
        <div className={`px-4 py-2 ${toast.type === 'error' ? 'bg-red-50 text-red-700 border-b border-red-200' : 'bg-green-50 text-green-700 border-b border-green-200'}`}>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">{toast.message}</span>
            <button onClick={() => setToast(null)} className="text-xs text-slate-500 hover:text-slate-700">Dismiss</button>
          </div>
        </div>
      )}
      {/* Header */}
      <div className="bg-gradient-to-br from-white/90 via-[#FAF8F3]/90 to-[#F5F3ED]/90 backdrop-blur-sm p-4 border-b border-slate-200/50">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-slate-700">Notes & Bookmarks</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-slate-600" />
          </button>
        </div>
        
        <div className="flex space-x-2">
          <button
            onClick={handleAddNote}
            className="flex-1 px-3 py-2 bg-gradient-to-r from-[#00D4FF]/90 to-[#00B8E6]/90 text-white rounded-lg hover:from-[#00B8E6] hover:to-[#0099CC] transition-all text-sm font-medium flex items-center justify-center space-x-2"
          >
            <FileText className="h-4 w-4" />
            <span>Add Note</span>
          </button>
          <button
            onClick={handleAddBookmark}
            className="flex-1 px-3 py-2 bg-gradient-to-r from-[#FFD700]/90 to-[#FFA500]/90 text-white rounded-lg hover:from-[#FFA500] hover:to-[#FF8C00] transition-all text-sm font-medium flex items-center justify-center space-x-2"
          >
            <Bookmark className="h-4 w-4" />
            <span>Bookmark</span>
          </button>
        </div>
      </div>

      {/* Add/Edit Form */}
      {showAddForm && (
        <div className="p-4 border-b border-slate-200/50 bg-slate-50/50">
          <form ref={formRef} onSubmit={handleSaveNote} className="space-y-3">
            {formData.type === 'bookmark' && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Title (optional)
                </label>
                <input
                  type="text"
                  value={formData.title || ''}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Bookmark title..."
                  className="w-full p-2 border border-slate-300 rounded-lg bg-white text-slate-700 text-sm focus:ring-2 focus:ring-[#4FC3F7]/50 focus:border-transparent"
                />
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                {formData.type === 'bookmark' ? 'Note (optional)' : 'Note'}
              </label>
              <textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder={formData.type === 'bookmark' ? 'Add a note to this bookmark...' : 'Write your note...'}
                rows={3}
                required={formData.type === 'note'}
                className="w-full p-2 border border-slate-300 rounded-lg bg-white text-slate-700 text-sm focus:ring-2 focus:ring-[#4FC3F7]/50 focus:border-transparent"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Timestamp
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.timestamp}
                  onChange={(e) => setFormData({ ...formData, timestamp: parseFloat(e.target.value) || 0 })}
                  className="w-full p-2 border border-slate-300 rounded-lg bg-white text-slate-700 text-sm focus:ring-2 focus:ring-[#4FC3F7]/50 focus:border-transparent"
                />
                <p className="text-xs text-slate-500 mt-1">{formatTimestamp(formData.timestamp)}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Color
                </label>
                <select
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg bg-white text-slate-700 text-sm focus:ring-2 focus:ring-[#4FC3F7]/50 focus:border-transparent"
                >
                  <option value="default">Default</option>
                  <option value="yellow">Yellow</option>
                  <option value="green">Green</option>
                  <option value="blue">Blue</option>
                  <option value="red">Red</option>
                  <option value="purple">Purple</option>
                </select>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="visibility"
                checked={formData.visibility === 'public'}
                onChange={(e) => setFormData({ ...formData, visibility: e.target.checked ? 'public' : 'private' })}
                className="h-4 w-4 text-[#4FC3F7] rounded focus:ring-2 focus:ring-[#4FC3F7]/50"
              />
              <label htmlFor="visibility" className="text-sm text-slate-700 flex items-center space-x-1">
                {formData.visibility === 'public' ? (
                  <Eye className="h-4 w-4" />
                ) : (
                  <EyeOff className="h-4 w-4" />
                )}
                <span>Make public (visible to other students)</span>
              </label>
            </div>

            <div className="flex space-x-2">
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-gradient-to-r from-[#39FF14]/90 to-[#00FF41]/90 text-white rounded-lg hover:from-[#00FF41] hover:to-[#39FF14] transition-all text-sm font-medium flex items-center justify-center space-x-2"
              >
                <Save className="h-4 w-4" />
                <span>{editingNote ? 'Update' : 'Save'}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false);
                  setEditingNote(null);
                }}
                className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition-all text-sm font-medium"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Notes List */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="text-center py-8 text-slate-500">Loading notes...</div>
        ) : notes.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <FileText className="h-12 w-12 mx-auto mb-2 text-slate-300" />
            <p>No notes yet</p>
            <p className="text-sm mt-1">Add a note or bookmark to get started</p>
          </div>
        ) : (
          <div className="space-y-3">
            {notes.map((note) => (
              <div
                key={note.id}
                className={`p-3 rounded-lg border-2 ${getColorClass(note.color)} transition-all hover:shadow-md`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    {note.type === 'bookmark' ? (
                      <Bookmark className={`h-4 w-4 ${getColorDot(note.color)}`} />
                    ) : (
                      <FileText className={`h-4 w-4 ${getColorDot(note.color)}`} />
                    )}
                    <button
                      onClick={() => onSeekTo(note.timestamp)}
                      className="flex items-center space-x-1 text-sm font-medium text-slate-700 hover:text-[#4FC3F7] transition-colors"
                    >
                      <Clock className="h-3 w-3" />
                      <span>{formatTimestamp(note.timestamp)}</span>
                    </button>
                  </div>
                  <div className="flex items-center space-x-1">
                    {note.visibility === 'public' && (
                      <Eye className="h-3 w-3 text-slate-400" title="Public" />
                    )}
                    <button
                      onClick={() => handleEditNote(note)}
                      className="p-1 hover:bg-white/50 rounded transition-colors"
                      title="Edit"
                    >
                      <Edit2 className="h-3 w-3 text-slate-600" />
                    </button>
                    <button
                      onClick={() => handleDeleteNote(note.id)}
                      className="p-1 hover:bg-red-50 rounded transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="h-3 w-3 text-red-600" />
                    </button>
                  </div>
                </div>
                
                {note.title && (
                  <h4 className="font-semibold text-slate-800 mb-1">{note.title}</h4>
                )}
                
                {note.content && (
                  <p className="text-sm text-slate-700 whitespace-pre-wrap">{note.content}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default VideoNotesPanel;

