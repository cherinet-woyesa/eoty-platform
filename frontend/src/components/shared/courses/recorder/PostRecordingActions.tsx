import React from 'react';
import { CheckCircle, ArrowRight, RotateCcw, Scissors, Download } from 'lucide-react';

interface PostRecordingActionsProps {
  recordedVideo: string | null;
  selectedFile: File | null;
  uploading: boolean;
  uploadSuccess: boolean;
  showLessonForm: boolean;
  showPreview: boolean;
  recordingDuration: number;
  videoBlob: Blob | null;
  activeTab: 'record' | 'upload';
  setShowPreview: (show: boolean) => void;
  setShowLessonForm: (show: boolean) => void;
  handleReset: () => void;
  setShowTimelineEditor: (show: boolean) => void;
  downloadRecording: () => void;
  formatTime: (seconds: number) => string;
}

const PostRecordingActions: React.FC<PostRecordingActionsProps> = ({
  recordedVideo,
  selectedFile,
  uploading,
  uploadSuccess,
  showLessonForm,
  showPreview,
  recordingDuration,
  videoBlob,
  activeTab,
  setShowPreview,
  setShowLessonForm,
  handleReset,
  setShowTimelineEditor,
  downloadRecording,
  formatTime
}) => {
  const getFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (!((recordedVideo || selectedFile) && !uploading && !uploadSuccess && !showLessonForm && showPreview)) {
    return null;
  }

  return (
    <div className="mt-4 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
        <div className="flex items-center space-x-4">
          <h3 className="text-sm font-semibold text-slate-800 flex items-center">
            <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
            Recording Ready
          </h3>
          <div className="h-4 w-px bg-slate-200"></div>
          <div className="flex items-center space-x-3 text-xs text-slate-500">
            <span>{formatTime(recordingDuration)}</span>
            <span>•</span>
            <span>{videoBlob ? getFileSize(videoBlob.size) : 'Unknown'}</span>
          </div>
        </div>
      </div>

      <div className="p-4 flex flex-wrap items-center gap-3">
        {/* Primary Actions */}
        <button
          onClick={() => {
            setShowPreview(false);
            setShowLessonForm(true);
          }}
          className="flex-1 min-w-[140px] py-2 px-4 bg-indigo-900 text-white rounded-lg hover:bg-indigo-800 font-medium shadow-sm hover:shadow transition-all flex items-center justify-center space-x-2 text-sm"
        >
          <span>Continue to Upload</span>
          <ArrowRight className="h-4 w-4" />
        </button>

        {/* Secondary Actions Group */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Record Again Button - Moved here as requested */}
          <button
            onClick={handleReset}
            className="py-2 px-3 bg-indigo-50 text-indigo-700 rounded-lg border border-indigo-100 hover:bg-indigo-100 transition-all flex items-center space-x-1.5 text-sm font-medium"
          >
            <RotateCcw className="h-4 w-4" />
            <span>Record Again</span>
          </button>

          {activeTab === 'record' && videoBlob && (
            <button
              onClick={() => {
                setShowTimelineEditor(true);
                setShowPreview(false);
              }}
              className="py-2 px-3 bg-amber-50 text-amber-700 rounded-lg border border-amber-100 hover:bg-amber-100 transition-all flex items-center space-x-1.5 text-sm font-medium"
            >
              <Scissors className="h-4 w-4" />
              <span>Edit</span>
            </button>
          )}

          <button
            onClick={downloadRecording}
            className="py-2 px-3 bg-slate-50 text-slate-700 rounded-lg border border-slate-100 hover:bg-slate-100 transition-all flex items-center space-x-1.5 text-sm font-medium"
          >
            <Download className="h-4 w-4" />
            <span>Download</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default PostRecordingActions;
