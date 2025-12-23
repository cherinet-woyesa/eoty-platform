// frontend/src/components/courses/VideoProcessingStatus.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Loader, CheckCircle, XCircle, AlertCircle, Clock, Sparkles } from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import { coursesApi } from '@/services/api';
import { videoApi as videosApi } from '@/services/api/videos';
import { brandColors } from '@/theme/brand';

interface VideoProcessingStatusProps {
  lessonId: string;
  isOpen: boolean;
  onClose: () => void;
  onProcessingComplete: () => void;
  onViewLesson?: () => void;
  videoProvider?: 'mux' | 's3';
}

interface ProcessingState {
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress: number;
  currentStep: string;
  error: string | null;
  provider?: 'mux' | 's3';
  assetId?: string;
  playbackId?: string;
}

const VideoProcessingStatus: React.FC<VideoProcessingStatusProps> = React.memo(({
  lessonId,
  isOpen,
  onClose,
  onProcessingComplete,
  onViewLesson,
  videoProvider = 's3'
}) => {
  const DEBUG = false;
  const [processingState, setProcessingState] = useState<ProcessingState>({
    status: 'queued',
    progress: 0,
    currentStep: videoProvider === 'mux' ? 'Uploading...' : 'Initializing...',
    error: null,
    provider: videoProvider
  });
  const startTimeRef = useRef<number>(Date.now());
  
  const [retryCount, setRetryCount] = useState(0);
  const socketRef = useRef<Socket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isConnectingRef = useRef(false);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [usePolling, setUsePolling] = useState(false);
  const pollCountRef = useRef<number>(0);
  const maxPollTimeRef = useRef<number>(15 * 60 * 1000);
  const maxPollCountRef = useRef<number>(180);

  const connectWebSocket = useCallback(() => {
    if (!isOpen || !lessonId || isConnectingRef.current || socketRef.current?.connected) return;

    isConnectingRef.current = true;
    
    try {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }

      let wsBase: string;
      if (import.meta.env.VITE_WS_URL) {
        wsBase = import.meta.env.VITE_WS_URL;
      } else {
        const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
        if (apiBase.startsWith('/')) {
          wsBase = '/';
        } else {
          wsBase = apiBase.replace('/api', '').replace('http://', 'ws://').replace('https://', 'wss://');
        }
      }
      
      if (DEBUG) console.log('Connecting to WebSocket:', wsBase);
      
      const socket = io(wsBase, {
        transports: ['websocket', 'polling'],
        query: { lessonId },
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      });
      socketRef.current = socket;

      socket.on('connect', () => {
        if (DEBUG) console.log('WebSocket connected for progress updates');
        isConnectingRef.current = false;
        setProcessingState(prev => ({
          ...prev,
          status: 'processing',
          currentStep: 'Connected to processing server'
        }));
        setRetryCount(0);
      });

      socket.on('progress', (data) => {
        try {
          if (DEBUG) console.log('Progress update:', data);

          switch (data.type) {
            case 'progress':
              const newProgress = Math.max(data.progress || 0, 0);
              const newStep = data.currentStep || 'Processing...';
              if (DEBUG) console.log(`Updating progress: ${newProgress}% - ${newStep}`);
              
              setProcessingState(prev => {
                if (prev.progress === newProgress && prev.currentStep === newStep) {
                  return prev;
                }
                return {
                  ...prev,
                  progress: newProgress,
                  currentStep: newStep,
                  status: 'processing',
                  provider: data.provider || prev.provider,
                  assetId: data.assetId || prev.assetId
                };
              });
              break;
            
            case 'complete':
              setProcessingState(prev => ({
                ...prev,
                status: 'completed',
                progress: 100,
                currentStep: prev.provider === 'mux' 
                  ? 'Mux processing complete' 
                  : 'Processing complete',
                error: null,
                playbackId: data.playbackId || prev.playbackId
              }));
              
              setTimeout(() => {
                onProcessingComplete();
              }, 1500);
              break;
            
            case 'failed':
              setProcessingState(prev => ({
                ...prev,
                status: 'failed',
                error: data.error || 'Processing failed',
                currentStep: prev.provider === 'mux'
                  ? 'Mux processing failed'
                  : 'Processing failed'
              }));
              break;

            default:
              if (DEBUG) console.log('Unknown message type:', data.type);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
          setProcessingState(prev => ({
            ...prev,
            error: 'Invalid server response'
          }));
        }
      });

      socket.on('connect_error', (error) => {
        if (DEBUG) console.error('WebSocket error:', error);
        isConnectingRef.current = false;
        setProcessingState(prev => ({
          ...prev,
          error: 'Connection error - retrying...'
        }));
      });

      socket.on('disconnect', (reason) => {
        if (DEBUG) console.log('WebSocket disconnected:', reason);
        isConnectingRef.current = false;
        
        if (processingState.status === 'processing' && reason !== 'io client disconnect') {
          if (DEBUG) console.log('Disconnected during processing - will attempt reconnect');
        }
        
        if (reason !== 'io client disconnect' && isOpen && retryCount < 5) {
          if (DEBUG) console.log(`Attempting to reconnect... (${retryCount + 1}/5)`);
          
          setProcessingState(prev => ({
            ...prev,
            currentStep: `Reconnecting... (${retryCount + 1}/5)`
          }));
          
          reconnectTimeoutRef.current = setTimeout(() => {
            setRetryCount(prev => prev + 1);
            connectWebSocket();
          }, 2000 * (retryCount + 1));
        } else if (retryCount >= 5) {
          if (DEBUG) console.log('WebSocket failed after max retries - switching to polling');
          setUsePolling(true);
          setProcessingState(prev => ({
            ...prev,
            currentStep: 'Checking status via API...',
            error: null
          }));
        }
      });

      socket.on('error', (error) => {
        if (DEBUG) console.error('Socket.io error:', error);
        setProcessingState(prev => ({
          ...prev,
          error: `Connection error: ${error.message || 'Unknown error'}`
        }));
      });

    } catch (error) {
      if (DEBUG) console.error('Failed to create WebSocket connection:', error);
      isConnectingRef.current = false;
      setProcessingState(prev => ({
        ...prev,
        status: 'failed',
        error: 'Failed to establish connection'
      }));
    }
  }, [lessonId, isOpen, retryCount, onProcessingComplete]);

  const cleanupWebSocket = useCallback(() => {
    isConnectingRef.current = false;
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
  }, []);

  const pollMuxStatus = useCallback(async () => {
    if (!lessonId || !isOpen) return;

    const elapsedTime = Date.now() - startTimeRef.current;
    if (elapsedTime > maxPollTimeRef.current) {
      if (DEBUG) console.warn('[VideoProcessingStatus] Processing timeout exceeded (15 minutes)');
      setProcessingState(prev => ({
        ...prev,
        status: 'failed',
        error: 'Video processing is taking longer than expected. Please check back later or contact support.',
        currentStep: 'Processing timeout - video may still be processing in the background'
      }));
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      return;
    }

    pollCountRef.current += 1;
    if (pollCountRef.current > maxPollCountRef.current) {
      if (DEBUG) console.warn('[VideoProcessingStatus] Maximum poll count reached');
      setProcessingState(prev => ({
        ...prev,
        status: 'failed',
        error: 'Video processing is taking longer than expected. Please check back later.',
        currentStep: 'Maximum retry limit reached'
      }));
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      return;
    }

    try {
      let muxPlaybackId: string | undefined;
      let muxStatus: string | undefined;

      try {
        const muxResp = await videosApi.getMuxAssetStatus(lessonId);
        muxPlaybackId = muxResp?.data?.playbackId || muxResp?.playbackId;
        muxStatus = muxResp?.data?.status || muxResp?.status;
      } catch (e) {
        // Non-fatal; fall back to course status
      }

      const response = await coursesApi.getVideoStatus(lessonId);
      if (DEBUG) console.log('[VideoProcessingStatus] Poll response:', response);
      
      const statusData = (response as any)?.data || response || {};
      const videoStatus = statusData.videoStatus;
      muxStatus = muxStatus || statusData.muxStatus;
      muxPlaybackId = muxPlaybackId || statusData.muxPlaybackId;
      
      const elapsedSeconds = Math.floor((Date.now() - startTimeRef.current) / 1000);

      if (DEBUG) console.log('[VideoProcessingStatus] Status data:', {
        videoStatus,
        muxStatus,
        muxPlaybackId,
        fullData: statusData,
        pollCount: pollCountRef.current,
        elapsedSeconds
      });

      let currentStatus = muxStatus || videoStatus;

      if (!muxPlaybackId && (!currentStatus || currentStatus === 'processing' || currentStatus === 'preparing')) {
        try {
          const info = await videosApi.getPlaybackInfo(lessonId);
          const provider = info?.data?.provider;
          const playbackIdFromInfo = info?.data?.mux?.playbackId || info?.data?.playbackId;
          if (provider === 'mux' && playbackIdFromInfo) {
            muxPlaybackId = playbackIdFromInfo;
            currentStatus = 'ready';
          }
        } catch (e) {
          // Ignore 404/not ready
        }
      }

      if (currentStatus === 'ready' && muxPlaybackId) {
        if (DEBUG) console.log('[VideoProcessingStatus] Video ready!');
        setProcessingState(prev => ({
          ...prev,
          status: 'completed',
          progress: 100,
          currentStep: 'Video processing complete! Your video is ready to view.',
          provider: 'mux',
          playbackId: muxPlaybackId
        }));
        
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }

        onProcessingComplete();
        return;
      }

      if (muxPlaybackId) {
        if (DEBUG) console.log('[VideoProcessingStatus] Playback ID found, marking as complete!');
        setProcessingState(prev => ({
          ...prev,
          status: 'completed',
          progress: 100,
          currentStep: 'Video processing complete! Your video is ready to view.',
          provider: 'mux',
          playbackId: muxPlaybackId
        }));
        
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }

        onProcessingComplete();
        return;
      }

      if (currentStatus === 'errored' || currentStatus === 'failed') {
        if (DEBUG) console.log('[VideoProcessingStatus] Video failed');
        setProcessingState(prev => ({
          ...prev,
          status: 'failed',
          error: 'Video processing failed',
          currentStep: 'Processing failed'
        }));
        return;
      }

      if (currentStatus === 'processing') {
        if (DEBUG) console.log('[VideoProcessingStatus] Video processing...');
        setProcessingState(prev => ({
          ...prev,
          status: 'processing',
          progress: Math.min(prev.progress + 5, 95),
          currentStep: 'Upload complete. Processing in background...',
          provider: 'mux'
        }));
      } else if (currentStatus === 'preparing') {
        if (DEBUG) console.log('[VideoProcessingStatus] Video preparing...');
        
        if (elapsedSeconds > 600) {
          setProcessingState(prev => ({
            ...prev,
            status: 'processing',
            progress: Math.min(prev.progress + 1, 90),
            currentStep: 'Video is still preparing. This may take a while for large files. You can close this window and check back later.',
            provider: 'mux'
          }));
        } else {
          setProcessingState(prev => {
            let timeBasedProgress = 10;
            if (elapsedSeconds < 30) {
              timeBasedProgress = 10 + (elapsedSeconds / 30) * 20;
            } else if (elapsedSeconds < 60) {
              timeBasedProgress = 30 + ((elapsedSeconds - 30) / 30) * 20;
            } else if (elapsedSeconds < 120) {
              timeBasedProgress = 50 + ((elapsedSeconds - 60) / 60) * 20;
            } else {
              timeBasedProgress = 70 + Math.min((elapsedSeconds - 120) / 60 * 15, 15);
            }
            
            const newProgress = Math.max(prev.progress, Math.min(Math.floor(timeBasedProgress), 85));
            
            return {
              ...prev,
              status: 'processing',
              progress: newProgress,
              currentStep: elapsedSeconds > 60 
                ? 'Processing video...' 
                : 'Preparing video for processing...',
              provider: 'mux'
            };
          });
        }
      } else {
        if (DEBUG) console.log('[VideoProcessingStatus] Unknown status:', currentStatus);
        if (statusData.hasVideo) {
          setProcessingState(prev => ({
            ...prev,
            status: 'processing',
            progress: Math.max(prev.progress, 5),
            currentStep: 'Processing video...',
            provider: 'mux'
          }));
        }
      }
    } catch (error) {
      if (DEBUG) console.error('[VideoProcessingStatus] Failed to poll Mux status:', error);
    }
  }, [lessonId, isOpen, onProcessingComplete]);

  useEffect(() => {
    if (isOpen && lessonId) {
      const intervalMs = usePolling ? 3000 : 5000;
      
      pollMuxStatus();
      
      const id = setInterval(pollMuxStatus, intervalMs);
      pollingIntervalRef.current = id;

      return () => {
        clearInterval(id);
        pollingIntervalRef.current = null;
      };
    }
  }, [usePolling, isOpen, lessonId, pollMuxStatus]);

  useEffect(() => {
    if (isOpen && lessonId) {
      if (DEBUG) console.log('Opening WebSocket connection for lesson:', lessonId);
      
      startTimeRef.current = Date.now();
      pollCountRef.current = 0;
      
      if (!socketRef.current) {
        connectWebSocket();
      }
      
      return () => {
        // Don't cleanup WebSocket here - let it stay connected
      };
    }

    return () => {
      if (!isOpen) {
        cleanupWebSocket();
      }
    };
  }, [isOpen, lessonId]);

  useEffect(() => {
    if (processingState.status === 'failed' && retryCount >= 5) {
      setUsePolling(true);
      let simulatedProgress = processingState.progress;
      const isMux = processingState.provider === 'mux';
      
      const fallbackInterval = setInterval(() => {
        simulatedProgress = Math.min(simulatedProgress + 10, 100);
        
        setProcessingState(prev => {
          if (simulatedProgress >= 100) {
            clearInterval(fallbackInterval);
            return {
              ...prev,
              status: 'completed',
              progress: 100,
              currentStep: isMux 
                ? 'Mux processing completed (simulated)' 
                : 'Processing completed (simulated)',
              error: null
            };
          }
          
          const steps = isMux 
            ? [
                'Upload to Mux complete',
                'Mux is encoding video',
                'Generating adaptive streams',
                'Finalizing'
              ]
            : [
                'Upload complete',
                'Validating video',
                'Finalizing'
              ];
          
          const stepIndex = Math.floor(simulatedProgress / 25);
          
          return {
            ...prev,
            progress: simulatedProgress,
            currentStep: steps[stepIndex] || (isMux ? 'Processing with Mux...' : 'Processing...'),
            status: 'processing'
          };
        });
      }, 1500);

      return () => clearInterval(fallbackInterval);
    }
  }, [processingState.status, retryCount, processingState.progress, processingState.provider]);

  // Auto-minimize disabled - keep modal visible for better UX as requested

  const handleRetry = () => {
    setRetryCount(0);
    setProcessingState({
      status: 'queued',
      progress: 0,
      currentStep: 'Reconnecting...',
      error: null
    });
    connectWebSocket();
  };

  const handleManualClose = () => {
    cleanupWebSocket();
    onClose();
  };

  const getStatusIcon = () => {
    switch (processingState.status) {
      case 'queued':
        return <Clock className="h-8 w-8 text-yellow-500" />;
      case 'processing':
        return <Loader className="h-8 w-8 animate-spin" style={{ color: brandColors.primaryHex }} />;
      case 'completed':
        return <CheckCircle className="h-8 w-8" style={{ color: brandColors.accentHex }} />;
      case 'failed':
        return <XCircle className="h-8 w-8 text-red-500" />;
      default:
        return <AlertCircle className="h-8 w-8 text-gray-500" />;
    }
  };

  const getStatusText = () => {
    switch (processingState.status) {
      case 'queued':
        return 'Video queued for processing';
      case 'processing':
        return 'Processing video...';
      case 'completed':
        return 'Video processing completed successfully!';
      case 'failed':
        return 'Processing failed';
      default:
        return 'Unknown status';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
      <div 
        className="w-full max-w-md p-8 relative transform transition-all duration-300"
        style={{
          background: 'linear-gradient(135deg, rgba(255,255,255,0.98) 0%, rgba(255,255,255,0.95) 100%)',
          borderRadius: '24px',
          boxShadow: `0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px ${brandColors.primaryHex}20, inset 0 1px 0 rgba(255,255,255,0.8)`
        }}
      >
        <div className="flex flex-col items-center text-center space-y-6">
          <div className="relative">
            <div 
              className="absolute inset-0 rounded-full animate-pulse"
              style={{
                background: `linear-gradient(135deg, ${brandColors.primaryHex}20, ${brandColors.accentHex}20)`,
                transform: 'scale(1.5)'
              }}
            />
            {getStatusIcon()}
          </div>
          
          <div className="space-y-2">
            <h3 
              className="text-2xl font-bold mb-3"
              style={{ 
                background: `linear-gradient(135deg, ${brandColors.primaryHex}, ${brandColors.accentHex})`,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text'
              }}
            >
              {getStatusText()}
            </h3>
            <p className="text-lg" style={{ color: '#64748b', fontWeight: '500' }}>
              {processingState.currentStep}
            </p>
          </div>

          {processingState.status === 'processing' && (
            <div className="w-full space-y-3">
              <div className="w-full rounded-full h-3" style={{ backgroundColor: `${brandColors.primaryHex}15` }}>
                <div
                  className="h-3 rounded-full transition-all duration-500 relative overflow-hidden"
                  style={{ 
                    width: `${processingState.progress}%`,
                    background: `linear-gradient(90deg, ${brandColors.primaryHex}, ${brandColors.accentHex})`,
                    boxShadow: `0 4px 6px -1px ${brandColors.primaryHex}40`
                  }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full animate-shimmer" />
                </div>
              </div>
              <div className="flex justify-between items-center">
                <p className="text-sm" style={{ color: '#64748b' }}>{processingState.currentStep}</p>
                <p className="text-lg font-bold" style={{ color: brandColors.primaryHex }}>{processingState.progress}%</p>
              </div>
            </div>
          )}

          {processingState.error && (
            <div 
              className="p-4 w-full rounded-xl border"
              style={{
                backgroundColor: '#fef2f2',
                borderColor: '#ef444420',
                boxShadow: 'inset 0 1px 0 rgba(239, 68, 68, 0.1)'
              }}
            >
              <div className="flex items-center space-x-3 justify-center">
                <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                <p className="text-red-800 text-sm font-medium">{processingState.error}</p>
              </div>
            </div>
          )}

          {processingState.status === 'completed' && (
            <div 
              className="p-6 w-full rounded-xl text-center space-y-3"
              style={{
                background: `linear-gradient(135deg, ${brandColors.accentHex}15, ${brandColors.primaryHex}15)`,
                border: `1px solid ${brandColors.accentHex}30`,
                boxShadow: `inset 0 1px 0 ${brandColors.accentHex}20`
              }}
            >
              <CheckCircle className="h-8 w-8 mx-auto" style={{ color: brandColors.accentHex }} />
              <p className="font-semibold text-lg" style={{ color: brandColors.accentHex }}>
                Video processing completed successfully!
              </p>
              <p className="text-sm" style={{ color: '#64748b' }}>
                Your video is now available for viewing.
              </p>
            </div>
          )}

          <div className="flex flex-col space-y-3 w-full mt-6">
            {processingState.status === 'failed' && (
              <div className="flex space-x-3 justify-center">
                <button
                  onClick={handleRetry}
                  className="px-6 py-3 text-white rounded-xl transition-all duration-200 font-medium transform hover:scale-105"
                  style={{
                    background: `linear-gradient(135deg, ${brandColors.primaryHex}, ${brandColors.accentHex})`,
                    boxShadow: `0 4px 6px -1px ${brandColors.primaryHex}40`
                  }}
                >
                  Try Again
                </button>
                <button
                  onClick={handleManualClose}
                  className="px-6 py-3 rounded-xl transition-all duration-200 font-medium transform hover:scale-105"
                  style={{
                    backgroundColor: '#f8fafc',
                    color: '#64748b',
                    border: `1px solid #e2e8f0`
                  }}
                >
                  Close
                </button>
              </div>
            )}
            
            {processingState.status === 'completed' && (
              <div className="flex flex-col space-y-3 w-full">
                {onViewLesson && (
                  <button
                    onClick={() => {
                      onViewLesson();
                      onClose();
                    }}
                    className="w-full px-8 py-4 text-white rounded-xl transition-all duration-200 font-medium text-lg transform hover:scale-105 shadow-lg"
                    style={{
                      background: `linear-gradient(135deg, ${brandColors.primaryHex}, ${brandColors.accentHex})`,
                      boxShadow: `0 10px 15px -3px ${brandColors.primaryHex}40, 0 4px 6px -2px ${brandColors.primaryHex}30`
                    }}
                  >
                    View Lesson
                  </button>
                )}
                <button
                  onClick={handleManualClose}
                  className="w-full px-8 py-3 rounded-xl transition-all duration-200 font-medium transform hover:scale-105"
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.9)',
                    color: brandColors.primaryHex,
                    border: `2px solid ${brandColors.primaryHex}`
                  }}
                >
                  Close
                </button>
              </div>
            )}
            
            {(processingState.status === 'queued' || processingState.status === 'processing') && (
              <div className="flex flex-col items-center w-full space-y-3">
                <div className="flex items-center space-x-2">
                  <Loader className="h-4 w-4 animate-spin" style={{ color: brandColors.primaryHex }} />
                  <p className="text-sm font-medium" style={{ color: '#64748b' }}>
                    Please wait while your video is being processed...
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

export default VideoProcessingStatus;
