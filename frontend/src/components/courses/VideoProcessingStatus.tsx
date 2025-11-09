// frontend/src/components/courses/VideoProcessingStatus.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Loader, CheckCircle, XCircle, AlertCircle, Clock } from 'lucide-react';
import { io, Socket } from 'socket.io-client'; // Import io and Socket type
import { apiClient } from '../../services/api/apiClient';

interface VideoProcessingStatusProps {
  lessonId: string;
  isOpen: boolean;
  onClose: () => void;
  onProcessingComplete: (videoUrl?: string) => void; // Optional: pass transcoded video URL
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
  
  const [retryCount, setRetryCount] = useState(0);
  const socketRef = useRef<Socket | null>(null); // Change to Socket type
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isConnectingRef = useRef(false);

  // Enhanced WebSocket connection with retry logic
  const connectWebSocket = useCallback(() => {
    if (!isOpen || !lessonId || isConnectingRef.current) return;

    isConnectingRef.current = true;
    
    try {
      // Close existing connection only if it's connected
      if (socketRef.current && socketRef.current.connected) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }

      // Get API base URL and prepare for socket.io
      // Socket.io can use http/https URLs directly and will handle protocol upgrade
      const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
      // Remove /api suffix if present - socket.io needs the base server URL
      let socketUrl = apiBase.replace('/api', '').replace(/\/$/, ''); // Remove /api and trailing slash
      
      // Socket.io works with http/https URLs and handles WebSocket upgrade internally
      console.log('Connecting to WebSocket at:', socketUrl, 'for lesson:', lessonId);
      
      const socket = io(socketUrl, {
        transports: ['websocket', 'polling'], // Allow both transports (polling fallback)
        query: { lessonId }, // Pass lessonId as query parameter
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5,
        timeout: 20000, // 20 second connection timeout
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
            case 'progress':
              setProcessingState(prev => ({
                ...prev,
                progress: data.progress,
                currentStep: data.currentStep || prev.currentStep,
                status: 'processing',
                provider: data.provider || prev.provider,
                assetId: data.assetId || prev.assetId
              }));
              break;
            
            case 'complete':
              const transcodedVideoUrl = data.videoUrl || data.playbackId;
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
              
              // Notify parent component with transcoded video URL after a short delay
              setTimeout(() => {
                onProcessingComplete(transcodedVideoUrl);
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

      socket.on('connect_error', (error) => { // Listen for 'connect_error'
        console.error('WebSocket error:', error);
        isConnectingRef.current = false;
        setProcessingState(prev => ({
          ...prev,
          error: 'Connection error - retrying...'
        }));
      });

      socket.on('disconnect', (reason) => { // Listen for 'disconnect'
        console.log('WebSocket disconnected:', reason);
        isConnectingRef.current = false;
        
        // Only attempt reconnect if not a normal closure and component is still open
        if (reason !== 'io client disconnect' && isOpen && retryCount < 5) { // Check reason
          console.log(`Attempting to reconnect... (${retryCount + 1}/5)`);
          
          setProcessingState(prev => ({
            ...prev,
            currentStep: `Reconnecting... (${retryCount + 1}/5)`
          }));
          
          reconnectTimeoutRef.current = setTimeout(() => {
            setRetryCount(prev => prev + 1);
            connectWebSocket();
          }, 2000 * (retryCount + 1)); // Exponential backoff
        } else if (retryCount >= 5) {
          setProcessingState(prev => ({
            ...prev,
            status: 'failed',
            error: 'Failed to connect to processing server after multiple attempts'
          }));
        }
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
    
    if (socketRef.current) {
      // Only disconnect if connected or connecting
      if (socketRef.current.connected || socketRef.current.connecting) {
        socketRef.current.removeAllListeners(); // Remove all listeners first
        socketRef.current.disconnect();
      }
      socketRef.current = null;
    }
  }, []);

  // Main effect for WebSocket connection
  useEffect(() => {
    if (isOpen && lessonId) {
      console.log('Opening WebSocket connection for lesson:', lessonId);
      // Small delay to ensure component is fully mounted
      const timeoutId = setTimeout(() => {
        connectWebSocket();
      }, 100);

      return () => {
        clearTimeout(timeoutId);
        cleanupWebSocket();
      };
    } else {
      // Component is closing, cleanup
      cleanupWebSocket();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, lessonId]);

  // Polling fallback: Check lesson status periodically if WebSocket doesn't provide updates
  useEffect(() => {
    if (!isOpen || !lessonId || processingState.status === 'completed') return;

    let pollInterval: NodeJS.Timeout | null = null;
    
    // Start polling after 5 seconds if no WebSocket updates received
    const pollDelay = setTimeout(() => {
      // Only start polling if we're still processing and haven't received updates
      if (processingState.status === 'processing' && processingState.progress <= 10) {
        console.log('Starting polling fallback for lesson status (no WebSocket updates received)...');
        
        pollInterval = setInterval(async () => {
          try {
            // Poll lesson status from backend
            const response = await apiClient.get(`/courses/video-status/${lessonId}`);
            
            if (response.data.success) {
              const statusData = response.data.data;
              
              // Check Mux status
              if (statusData.videoStatus === 'ready' && statusData.metadata?.playbackId) {
                console.log('Lesson ready via polling:', statusData.metadata.playbackId);
                setProcessingState(prev => ({
                  ...prev,
                  status: 'completed',
                  progress: 100,
                  currentStep: 'Mux processing complete',
                  playbackId: statusData.metadata.playbackId
                }));
                
                clearInterval(pollInterval);
                setTimeout(() => {
                  onProcessingComplete();
                }, 1500);
              } else if (statusData.videoStatus === 'processing' || statusData.videoStatus === 'preparing') {
                // Update progress to show we're checking
                setProcessingState(prev => ({
                  ...prev,
                  progress: Math.min(prev.progress + 2, 90), // Gradually increase to 90%
                  currentStep: 'Mux is processing your video...'
                }));
              } else if (statusData.videoStatus === 'errored') {
                setProcessingState(prev => ({
                  ...prev,
                  status: 'failed',
                  error: statusData.errorMessage || 'Video processing failed'
                }));
                clearInterval(pollInterval);
              }
            }
          } catch (error: any) {
            console.error('Polling error:', error);
            // Don't stop polling on error, just log it
            // But update progress to show we're still checking
            setProcessingState(prev => ({
              ...prev,
              progress: Math.min(prev.progress + 1, 95)
            }));
          }
        }, 5000); // Poll every 5 seconds
      }
    }, 5000); // Wait 5 seconds before starting to poll

    return () => {
      clearTimeout(pollDelay);
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    };
  }, [isOpen, lessonId, processingState.status, processingState.progress, onProcessingComplete]);

  // Simulate progress if WebSocket fails completely
  useEffect(() => {
    if (processingState.status === 'failed' && retryCount >= 5) {
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

  // Auto-close on completion after delay
  useEffect(() => {
    if (processingState.status === 'completed') {
      const timer = setTimeout(() => {
        onClose();
      }, 3000);
      
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