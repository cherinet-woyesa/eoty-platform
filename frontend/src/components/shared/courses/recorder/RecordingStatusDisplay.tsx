import React from 'react';
import { Timer } from 'lucide-react';

interface RecordingStatusDisplayProps {
  isRecording: boolean;
  activeTab: 'record' | 'upload';
  isMobile: boolean;
  recordingTime: number;
  formatTime: (seconds: number) => string;
  isPaused: boolean;
  autoStopTimer: number;
}

const RecordingStatusDisplay: React.FC<RecordingStatusDisplayProps> = React.memo(({
  isRecording,
  activeTab,
  isMobile,
  recordingTime,
  formatTime,
  isPaused,
  autoStopTimer
}) => {
  if (!isRecording || activeTab !== 'record') {
    return null;
  }

  return (
    <div className={`absolute flex items-center z-30 ${isMobile ? 'top-2 left-2 space-x-1.5 flex-wrap' : 'top-4 left-4 space-x-3'}`}>
      <div className={`flex items-center bg-gradient-to-r from-[#FF6B35]/90 to-[#FF8C42]/90 text-white rounded-full shadow-lg backdrop-blur-sm border border-[#FF6B35]/30 ${isMobile ? 'space-x-1 px-2 py-0.5' : 'space-x-2 px-3 py-1'
        }`}>
        <div className={`bg-white rounded-full animate-pulse ${isMobile ? 'w-1.5 h-1.5' : 'w-2 h-2'}`} />
        <span className={`font-semibold ${isMobile ? 'text-xs' : ''}`}>REC</span>
      </div>
      <div className={`bg-black/70 backdrop-blur-sm text-white rounded-full border border-white/20 ${isMobile ? 'px-2 py-0.5' : 'px-3 py-1'
        }`}>
        <span className={`font-medium ${isMobile ? 'text-xs' : ''}`}>{formatTime(recordingTime)}</span>
      </div>
      {isPaused && (
        <div className={`bg-gradient-to-r from-[#FFD700]/90 to-[#FFA500]/90 text-white rounded-full shadow-lg backdrop-blur-sm border border-[#FFD700]/30 ${isMobile ? 'px-2 py-0.5' : 'px-3 py-1'
          }`}>
          <span className={`font-semibold ${isMobile ? 'text-xs' : ''}`}>PAUSED</span>
        </div>
      )}
      {autoStopTimer > 0 && (
        <div className={`bg-gradient-to-r from-[#00D4FF]/90 to-[#00B8E6]/90 text-white rounded-full flex items-center shadow-lg backdrop-blur-sm border border-[#00D4FF]/30 ${isMobile ? 'space-x-0.5 px-2 py-0.5' : 'space-x-1 px-3 py-1'
          }`}>
          <Timer className={isMobile ? 'h-2.5 w-2.5' : 'h-3 w-3'} />
          <span className={`font-medium ${isMobile ? 'text-xs' : ''}`}>Auto-stop: {autoStopTimer}m</span>
        </div>
      )}
    </div>
  );
});

export default RecordingStatusDisplay;
