// frontend/src/components/courses/VideoProcessingStatus.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Loader, CheckCircle, XCircle, AlertCircle, Clock } from 'lucide-react';
import { io, Socket } from 'socket.io-client'; // Import io and Socket type
import { coursesApi } from '@/services/api';

interface VideoProcessingStatusProps {
  lessonId: string;
  isOpen: boolean;
  onClose: () => void;
  onProcessingComplete: () => void;
  videoProvider?: 'mux' | 's3'; // Optional: specify video provider
}

interface ProcessingState {
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress: number;
  currentStep: string;
  error: string | null;
  provider?: 'mux' | 's3'; // Track which provider is being used
  assetId?: string; // Mux asset ID
  playbackId?: string; // Mux playback ID
}

const VideoProcessingStatus: React.FC<VideoProcessingStatusProps> = ({
  lessonId,
  isOpen,
  onClose,
  onProcessingComplete,
  videoProvider = 's3' // Default to S3 for backward compatibility
}) => {
  const [processingState, setProcessingState] = useState<ProcessingState>({
    status: 'queued',
    progress: 0,
    currentStep: videoProvider === 'mux' ? 'Uploading to Mux...' : 'Initializing...',
    error: null,
    provider: videoProvider
  });
  const startTimeRef = useRef<number>(Date.now());
  
  const [retryCount, setRetryCount] = useState(0);
  const socketRef = useRef<Socket | null>(null); // Change to Socket type
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isConnectingRef = useRef(false);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [usePolling, setUsePolling] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const pollCountRef = useRef<number>(0);
  const maxPollTimeRef = useRef<number>(15 * 60 * 1000); // 15 minutes max
  const maxPollCountRef = useRef<number>(180); // Max 180 polls (15 min / 5 sec intervals)

  // Enhanced WebSocket connection with retry logic
  const connectWebSocket = useCallback(() => {
    if (!isOpen || !lessonId || isConnectingRef.current || socketRef.current?.connected) return;

    isConnectingRef.current = true;
    
    try {
      // Close existing connection
      if (socketRef.current) {
        socketRef.current.disconnect(); // Use socket.io disconnect
        socketRef.current = null;
      }

      // Connect to the socket.io server
      // Get API base URL and convert to WebSocket URL
      const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
      const wsBase = apiBase.replace('/api', '').replace('http://', 'ws://').replace('https://', 'wss://');
      // Socket.IO automatically handles the path, just use the base URL
      console.log('Connecting to WebSocket:', wsBase);
      
      const socket = io(wsBase, {
        transports: ['websocket', 'polling'], // Allow both transports
        query: { lessonId }, // Pass lessonId as query parameter
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      });
      socketRef.current = socket;

      socket.on('connect', () => {
        console.log('WebSocket connected for progress updates');
        isConnectingRef.current = false;
        setProcessingState(prev => ({
          ...prev,
          status: 'processing',
          currentStep: 'Connected to processing server'
        }));
        setRetryCount(0); // Reset retry count on successful connection
      });

      socket.on('progress', (data) => { // Listen for 'progress' event
        try {
          console.log('Progress update:', data);

          switch (data.type) {
            case 'progress': {
              const newProgress = Math.max(data.progress || 0, 0);
              const newStep = data.currentStep || 'Processing...';

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
            }

            case 'complete': {
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

              // Notify parent component after a short delay
              setTimeout(() => {
                onProcessingComplete();
              }, 1500);
              break;
            }

            case 'failed': {
              setProcessingState(prev => ({
                ...prev,
                status: 'failed',
                error: data.error || 'Processing failed',
                currentStep: prev.provider === 'mux'
                  ? 'Mux processing failed'
                  : 'Processing failed'
              }));
              break;
            }

            default:
              console.log('Unknown message type:', data.type);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
          setProcessingState(prev => ({
            ...prev,
            error: 'Invalid server response'
          }));
        }
      });

      // Add error handler for socket.io errors
      socket.on('error', (error) => {
        console.error('Socket.io error:', error);
        setProcessingState(prev => ({
          ...prev,
          error: `Connection error: ${error.message || 'Unknown error'}`
        }));
      });

    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      isConnectingRef.current = false;
      setProcessingState(prev => ({
        ...prev,
        status: 'failed',
        error: 'Failed to establish connection'
      }));
    }
  }, [lessonId, isOpen, retryCount, onProcessingComplete]);

  // Enhanced cleanup
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
      socketRef.current.disconnect(); // Use socket.io disconnect
      socketRef.current = null;
    }
  }, []);

  // Polling fallback to check Mux status via API
  const pollMuxStatus = useCallback(async () => {
    if (!lessonId || !isOpen) return;

    // Check timeout - if processing has been going for more than 15 minutes, stop
    const elapsedTime = Date.now() - startTimeRef.current;
    if (elapsedTime > maxPollTimeRef.current) {
      console.warn('[VideoProcessingStatus] Processing timeout exceeded (15 minutes)');
      setProcessingState(prev => ({
        ...prev,
        status: 'failed',
        error: 'Video processing is taking longer than expected. Please check back later or contact support.',
        currentStep: 'Processing timeout - video may still be processing in the background'
      }));
      // Stop polling
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      return;
    }

    // Check max poll count
    pollCountRef.current += 1;
    if (pollCountRef.current > maxPollCountRef.current) {
      console.warn('[VideoProcessingStatus] Maximum poll count reached');
      setProcessingState(prev => ({
        ...prev,
        status: 'failed',
        error: 'Video processing is taking longer than expected. Please check back later.',
        currentStep: 'Maximum retry limit reached'
      }));
      // Stop polling
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      return;
    }

    try {
      const response = await coursesApi.getVideoStatus(lessonId);
      console.log('[VideoProcessingStatus] Poll response:', response);
      
      // coursesApi.getVideoStatus returns response.data from axios
      // Backend returns: { success: true, data: { ... } }
      // So response is: { success: true, data: { ... } }
      // We need response.data to get the status data object
      const statusData = (response as any)?.data || response || {};
      const { videoStatus, muxStatus, muxPlaybackId } = statusData;
      
      // Calculate elapsed time for time-based progress
      const elapsedSeconds = Math.floor((Date.now() - startTimeRef.current) / 1000);

      console.log('[VideoProcessingStatus] Status data:', {
        videoStatus,
        muxStatus,
        muxPlaybackId,
        fullData: statusData,
        pollCount: pollCountRef.current,
        elapsedSeconds: Math.floor((Date.now() - startTimeRef.current) / 1000)
      });

      // Use muxStatus if available, otherwise fall back to videoStatus
      const currentStatus = muxStatus || videoStatus;

      if (currentStatus === 'ready' && muxPlaybackId) {
        console.log('[VideoProcessingStatus] Video ready!');
        setProcessingState(prev => ({
          ...prev,
          status: 'completed',
          progress: 100,
          currentStep: 'Video processing complete! Your video is ready to view.',
          provider: 'mux',
          playbackId: muxPlaybackId
        }));
        
        // Trigger success notification via callback
        onProcessingComplete();
        return;
      }

      if (currentStatus === 'errored' || currentStatus === 'failed') {
        console.log('[VideoProcessingStatus] Video failed');
        setProcessingState(prev => ({
          ...prev,
          status: 'failed',
          error: 'Video processing failed',
          currentStep: 'Processing failed'
        }));
        return;
      }

      // Update progress based on status
      if (currentStatus === 'processing') {
        console.log('[VideoProcessingStatus] Video processing...');
        setProcessingState(prev => ({
          ...prev,
          status: 'processing',
          progress: Math.min(prev.progress + 5, 90), // Gradually increase to 90%
          currentStep: 'Mux is processing your video...',
          provider: 'mux'
        }));
      } else if (currentStatus === 'preparing') {
        console.log('[VideoProcessingStatus] Video preparing...');
        
        // If stuck in preparing for more than 10 minutes, show warning
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
            // Calculate time-based progress if stuck at preparing
            // Progress increases based on elapsed time:
            // - 0-30s: 10-30%
            // - 30-60s: 30-50%
            // - 60-120s: 50-70%
            // - 120s+: 70-85% (max while preparing)
            let timeBasedProgress = 10;
            if (elapsedSeconds < 30) {
              timeBasedProgress = 10 + (elapsedSeconds / 30) * 20; // 10-30%
            } else if (elapsedSeconds < 60) {
              timeBasedProgress = 30 + ((elapsedSeconds - 30) / 30) * 20; // 30-50%
            } else if (elapsedSeconds < 120) {
              timeBasedProgress = 50 + ((elapsedSeconds - 60) / 60) * 20; // 50-70%
            } else {
              timeBasedProgress = 70 + Math.min((elapsedSeconds - 120) / 60 * 15, 15); // 70-85%
            }
            
            // Use the higher of time-based or current progress
            const newProgress = Math.max(prev.progress, Math.min(Math.floor(timeBasedProgress), 85));
            
            return {
              ...prev,
              status: 'processing',
              progress: newProgress,
              currentStep: elapsedSeconds > 60 
                ? 'Mux is processing your video...' 
                : 'Preparing video for processing...',
              provider: 'mux'
            };
          });
        }
      } else {
        console.log('[VideoProcessingStatus] Unknown status:', currentStatus);
        // If status is unknown but we have a video, assume it's processing
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
      console.error('[VideoProcessingStatus] Failed to poll Mux status:', error);
    }
  }, [lessonId, isOpen, onProcessingComplete]);

  // Start polling if WebSocket fails
  useEffect(() => {
    if (usePolling && isOpen && lessonId) {
      // Poll immediately, then every 3 seconds
      pollMuxStatus();
      pollingIntervalRef.current = setInterval(pollMuxStatus, 3000);

      return () => {
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
      };
    }
  }, [usePolling, isOpen, lessonId, pollMuxStatus]);

  // Main effect for WebSocket connection
  useEffect(() => {
    if (isOpen && lessonId) {
      console.log('Opening WebSocket connection for lesson:', lessonId);
      
      // Reset start time when component opens
      startTimeRef.current = Date.now();
      pollCountRef.current = 0; // Reset poll count
      
      // Only connect WebSocket once, don't reconnect on every render
      if (!socketRef.current) {
        connectWebSocket();
      }
      
      // Start polling immediately as a backup
      // This ensures we get updates even if WebSocket fails
      // Use a single polling interval to avoid duplicate requests
      if (!pollingIntervalRef.current) {
        pollMuxStatus(); // Poll immediately
        pollingIntervalRef.current = setInterval(pollMuxStatus, 5000); // Poll every 5 seconds
      }
      
      return () => {
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
        // Don't cleanup WebSocket here - let it stay connected
      };
    }

    return () => {
      // Only cleanup when component unmounts or isOpen becomes false
      if (!isOpen) {
        cleanupWebSocket();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, lessonId]);

  // Simulate progress if WebSocket fails completely
  useEffect(() => {
    if (processingState.status === 'failed' && retryCount >= 5) {
      // Enable polling as fallback
      setUsePolling(true);
      // Fallback to simulated progress after all retries fail
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

  // Auto-close on completion after delay (increased to 8 seconds to show success message)
  useEffect(() => {
    if (processingState.status === 'completed') {
      // Show success notification
      console.log('✅ Video processing completed successfully!');
      
      const timer = setTimeout(() => {
        onClose();
      }, 8000); // Increased from 3s to 8s to give users time to see success
      
      return () => clearTimeout(timer);
    }
  }, [processingState.status, onClose]);

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
        return <Loader className="h-8 w-8 text-blue-500 animate-spin" />;
      case 'completed':
        return <CheckCircle className="h-8 w-8 text-green-500" />;
      case 'failed':
        return <XCircle className="h-8 w-8 text-red-500" />;
      default:
        return <AlertCircle className="h-8 w-8 text-gray-500" />;
    }
  };

  const getStatusText = () => {
    const isMux = processingState.provider === 'mux';
    
    switch (processingState.status) {
      case 'queued':
        return isMux ? 'Video queued for Mux upload' : 'Video queued for processing';
      case 'processing':
        return isMux ? 'Mux is processing your video...' : 'Processing video...';
      case 'completed':
        return isMux ? 'Mux processing complete!' : 'Processing complete!';
      case 'failed':
        return isMux ? 'Mux processing failed' : 'Processing failed';
      default:
        return 'Unknown status';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
        {/* Simplified UI - Just show icon and message */}
        <div className="flex flex-col items-center text-center space-y-4">
          {getStatusIcon()}
          
          <div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              {getStatusText()}
            </h3>
            <p className="text-gray-600">
              {processingState.currentStep}
            </p>
          </div>

          {/* Simple Progress Bar */}
          {processingState.status === 'processing' && (
            <div className="w-full">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="h-2 rounded-full transition-all duration-300 bg-blue-600"
                  style={{ width: `${processingState.progress}%` }}
                />
              </div>
              <p className="text-sm text-gray-500 mt-2">{processingState.progress}%</p>
            </div>
          )}

          {/* Error Message - Simplified */}
          {processingState.error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 w-full">
              <div className="flex items-center space-x-2 justify-center">
                <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                <p className="text-red-800 text-sm">{processingState.error}</p>
              </div>
            </div>
          )}

          {/* Success Message */}
          {processingState.status === 'completed' && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 w-full">
              <p className="text-green-800 text-center font-medium">
                ✅ Your video is ready and available for viewing!
              </p>
              {processingState.provider === 'mux' && (
                <p className="text-green-700 text-center text-sm mt-2">
                  Powered by Mux - Adaptive streaming enabled
                </p>
              )}
            </div>
          )}

          {/* Simplified Action Buttons */}
          <div className="flex justify-center space-x-3 w-full mt-4">
            {processingState.status === 'failed' && (
              <>
                <button
                  onClick={handleRetry}
                  className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium"
                >
                  Try Again
                </button>
                <button
                  onClick={handleManualClose}
                  className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-colors font-medium"
                >
                  Close
                </button>
              </>
            )}
            
            {processingState.status === 'completed' && (
              <button
                onClick={handleManualClose}
                className="px-8 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors font-medium text-lg"
              >
                Done
              </button>
            )}
            
            {(processingState.status === 'queued' || processingState.status === 'processing') && (
              <button
                onClick={handleManualClose}
                className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium"
              >
                Close
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoProcessingStatus;