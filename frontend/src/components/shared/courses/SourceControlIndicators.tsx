// frontend/src/components/courses/SourceControlIndicators.tsx
import type { FC } from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
  const isCameraActive = !!recordingSources.camera;
  const isScreenActive = !!recordingSources.screen;
  const isMicActive = !!recordingSources.microphone || 
    (recordingSources.camera?.getAudioTracks().length ?? 0) > 0;

  return (
    <div className="flex items-center gap-2">
      {/* Camera toggle button */}
      <button
        onClick={onToggleCamera}
        disabled={disabled}
        className={`
          group relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium
          transition-all duration-200
          ${isCameraActive
            ? 'bg-green-100 text-green-700 border border-green-300 shadow-sm'
            : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-transparent'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
        title={isCameraActive ? t('record_video.stop_camera') : t('record_video.start_camera')}
      >
        <Camera className="h-3.5 w-3.5" />
        <span>{t('record_video.camera')}</span>
        
        {/* Active indicator dot */}
        {isCameraActive && (
          <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
        )}
      </button>

      {/* Screen share toggle button */}
      {/* Allow screen sharing toggle even during recording as per project requirements */}
      <button
        onClick={onToggleScreen}
        disabled={disabled && !isRecording} // Only disable if not recording or globally disabled
        className={`
          group relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium
          transition-all duration-200
          ${isScreenActive
            ? 'bg-blue-100 text-blue-700 border border-blue-300 shadow-sm'
            : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-transparent'
          }
          ${(disabled && !isRecording) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
        title={isScreenActive ? t('record_video.stop_screen') : t('record_video.start_screen')}
      >
        <Monitor className="h-3.5 w-3.5" />
        <span>{t('record_video.screen')}</span>
        
        {/* Active indicator dot */}
        {isScreenActive && (
          <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
        )}
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
          title={isMicActive ? t('record_video.mute_mic') : t('record_video.unmute_mic')}
        >
          {isMicActive ? (
            <Mic className="h-4 w-4" />
          ) : (
            <MicOff className="h-4 w-4" />
          )}
          <span>{t('record_video.mic')}</span>
          
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
            {isMicActive ? t('record_video.mute_mic') : t('record_video.unmute_mic')}
            <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900" />
          </div>
        </button>
      )}

      {/* Recording indicator */}
      {isRecording && (
        <div className="flex items-center gap-2 px-3 py-2 bg-red-100 text-red-700 rounded-lg text-sm font-medium border-2 border-red-300">
          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          <span>{t('record_video.recording_indicator')}</span>
        </div>
      )}

      {/* Status summary */}
      <div className="ml-2 text-xs text-gray-500">
        {isCameraActive && isScreenActive && `(${t('record_video.both_sources_active')})`}
        {isCameraActive && !isScreenActive && `(${t('record_video.camera_only')})`}
        {!isCameraActive && isScreenActive && `(${t('record_video.screen_only')})`}
        {!isCameraActive && !isScreenActive && `(${t('record_video.no_sources')})`}
      </div>
    </div>
  );
};

export default SourceControlIndicators;