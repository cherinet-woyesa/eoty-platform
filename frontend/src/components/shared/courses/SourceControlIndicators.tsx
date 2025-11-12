// frontend/src/components/courses/SourceControlIndicators.tsx
import type { FC } from 'react';
import { Camera, Monitor, Mic, MicOff } from 'lucide-react';

interface RecordingSources {
  camera: MediaStream | null;
  screen: MediaStream | null;
  microphone: MediaStream | null;
}

interface SourceControlIndicatorsProps {
  recordingSources: RecordingSources;
  onToggleCamera: () => void;
  onToggleScreen: () => void;
  onToggleMicrophone?: () => void;
  disabled?: boolean;
  isRecording?: boolean;
  micLevel?: number;
}

const SourceControlIndicators: FC<SourceControlIndicatorsProps> = ({
  recordingSources,
  onToggleCamera,
  onToggleScreen,
  onToggleMicrophone,
  disabled = false,
  isRecording = false,
  micLevel = 0
}) => {
  const isCameraActive = !!recordingSources.camera;
  const isScreenActive = !!recordingSources.screen;
  const isMicActive = !!recordingSources.microphone || 
    (recordingSources.camera?.getAudioTracks().length ?? 0) > 0;

  return (
    <div className="flex items-center gap-3">
      {/* Active sources label */}
      <span className="text-sm font-medium text-gray-700">Sources:</span>

      {/* Camera toggle button */}
      <button
        onClick={onToggleCamera}
        disabled={disabled}
        className={`
          group relative flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium
          transition-all duration-200
          ${isCameraActive
            ? 'bg-green-100 text-green-700 border-2 border-green-300 shadow-sm'
            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
        title={isCameraActive ? 'Camera active - Click to stop' : 'Camera inactive - Click to start'}
      >
        <Camera className="h-4 w-4" />
        <span>Camera</span>
        
        {/* Active indicator dot */}
        {isCameraActive && (
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
        )}

        {/* Tooltip */}
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
          {isCameraActive ? 'Stop camera' : 'Start camera'}
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900" />
        </div>
      </button>

      {/* Screen share toggle button */}
      {/* Allow screen sharing toggle even during recording as per project requirements */}
      <button
        onClick={onToggleScreen}
        disabled={disabled && !isRecording} // Only disable if not recording or globally disabled
        className={`
          group relative flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium
          transition-all duration-200
          ${isScreenActive
            ? 'bg-blue-100 text-blue-700 border-2 border-blue-300 shadow-sm'
            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }
          ${(disabled && !isRecording) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
        title={isScreenActive ? 'Screen sharing active - Click to stop' : 'Screen sharing inactive - Click to start'}
      >
        <Monitor className="h-4 w-4" />
        <span>Screen</span>
        
        {/* Active indicator dot */}
        {isScreenActive && (
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
        )}

        {/* Tooltip */}
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
          {isScreenActive ? 'Stop screen sharing' : 'Start screen sharing'}
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900" />
        </div>
      </button>

      {/* Microphone indicator (optional) */}
      {onToggleMicrophone && (
        <button
          onClick={onToggleMicrophone}
          disabled={disabled}
          className={`
            group relative flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium
            transition-all duration-200
            ${isMicActive
              ? 'bg-purple-100 text-purple-700 border-2 border-purple-300 shadow-sm'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          `}
          title={isMicActive ? 'Microphone active - Click to mute' : 'Microphone muted - Click to unmute'}
        >
          {isMicActive ? (
            <Mic className="h-4 w-4" />
          ) : (
            <MicOff className="h-4 w-4" />
          )}
          <span>Mic</span>
          
          {/* Audio level indicator */}
          {isMicActive && micLevel > 0 && (
            <div className="flex items-center gap-1">
              <div className="w-12 h-1.5 bg-gray-300 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-purple-500 rounded-full transition-all duration-100"
                  style={{ width: `${Math.min(micLevel * 100, 100)}%` }}
                />
              </div>
            </div>
          )}

          {/* Tooltip */}
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
            {isMicActive ? 'Mute microphone' : 'Unmute microphone'}
            <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900" />
          </div>
        </button>
      )}

      {/* Recording indicator */}
      {isRecording && (
        <div className="flex items-center gap-2 px-3 py-2 bg-red-100 text-red-700 rounded-lg text-sm font-medium border-2 border-red-300">
          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          <span>Recording</span>
        </div>
      )}

      {/* Status summary */}
      <div className="ml-2 text-xs text-gray-500">
        {isCameraActive && isScreenActive && '(Both sources active)'}
        {isCameraActive && !isScreenActive && '(Camera only)'}
        {!isCameraActive && isScreenActive && '(Screen only)'}
        {!isCameraActive && !isScreenActive && '(No sources)'}
      </div>
    </div>
  );
};

export default SourceControlIndicators;