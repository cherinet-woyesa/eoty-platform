import React from 'react';
import { Play, Pause, Square, Save } from 'lucide-react';

interface RecordingControlsProps {
  activeTab: 'record' | 'upload';
  recordedVideo: string | null;
  isRecording: boolean;
  handleStartRecording: () => void;
  recordingSources: { camera?: MediaStream; screen?: MediaStream; microphone?: MediaStream };
  t: (key: string, defaultVal?: string) => string;
  isPaused: boolean;
  resumeRecording: () => void;
  pauseRecording: () => void;
  handleStopRecording: () => void;
  recordingTime: number;
  isStopping: boolean;
  showAdvancedTools: boolean;
  handleSaveSession: () => void;
}

const RecordingControls: React.FC<RecordingControlsProps> = ({
  activeTab,
  recordedVideo,
  isRecording,
  handleStartRecording,
  recordingSources,
  t,
  isPaused,
  resumeRecording,
  pauseRecording,
  handleStopRecording,
  recordingTime,
  isStopping,
  showAdvancedTools,
  handleSaveSession
}) => {
  if (activeTab !== 'record' || recordedVideo) {
    return null;
  }

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30">
      {!isRecording ? (
        <div className="flex flex-col items-center space-y-2">
          <button
            onClick={handleStartRecording}
            className="group relative flex items-center justify-center w-12 h-12 bg-white/10 backdrop-blur-md rounded-full border-2 border-white/30 hover:border-red-500 hover:bg-red-500/20 transition-all duration-300 disabled:opacity-50 disabled:hover:border-white/30 disabled:hover:bg-white/10"
          >
            <div className="w-6 h-6 bg-red-600 rounded-full shadow-lg group-hover:scale-90 transition-transform duration-300"></div>
          </button>
          <span className="text-white/90 text-xs font-medium bg-black/60 px-3 py-1 rounded-full backdrop-blur-md border border-white/10">
            {t('record_video.start_recording', 'Start Recording')}
          </span>
        </div>
      ) : (
        <div className="flex items-center space-x-3 bg-black/60 backdrop-blur-xl px-4 py-2 rounded-full border border-white/10 shadow-lg transform transition-all hover:scale-105">
          {/* Pause/Resume */}
          <button
            onClick={isPaused ? resumeRecording : pauseRecording}
            className="group flex flex-col items-center space-y-0.5"
            title={isPaused ? "Resume" : "Pause"}
          >
            <div className={`p-2 rounded-full transition-all ${isPaused ? 'bg-green-500 hover:bg-green-600' : 'bg-white/10 hover:bg-white/20'}`}>
              {isPaused ? <Play className="h-4 w-4 text-white fill-current" /> : <Pause className="h-4 w-4 text-white fill-current" />}
            </div>
            <span className="text-[9px] font-medium text-white/70 uppercase tracking-wider">{isPaused ? 'Resume' : 'Pause'}</span>
          </button>

          {/* Stop Button (Main Action) */}
          <button
            onClick={handleStopRecording}
            disabled={recordingTime < 1 || isStopping || !isRecording}
            className="group flex flex-col items-center space-y-0.5"
            title="Stop Recording"
          >
            <div className="p-2 rounded-full bg-red-600 hover:bg-red-700 text-white transition-all shadow-lg shadow-red-900/30 group-hover:scale-110">
              <Square className="h-4 w-4 fill-current" />
            </div>
            <span className="text-[9px] font-medium text-white/70 uppercase tracking-wider">Stop</span>
          </button>

          {/* Save Session (Advanced) */}
          {showAdvancedTools && (
            <button
              onClick={handleSaveSession}
              className="group flex flex-col items-center space-y-0.5"
              title="Save Session Draft"
            >
              <div className="p-2 rounded-full bg-indigo-600/80 hover:bg-indigo-600 text-white transition-all hover:scale-105">
                <Save className="h-4 w-4" />
              </div>
              <span className="text-[9px] font-medium text-white/70 uppercase tracking-wider">Save</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default RecordingControls;
