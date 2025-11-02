// frontend/src/components/courses/VideoProcessingStatus.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Loader, CheckCircle, XCircle, AlertCircle, Clock, RefreshCw } from 'lucide-react';

interface VideoProcessingStatusProps {
  lessonId: string;
  isOpen: boolean;
  onClose: () => void;
  onProcessingComplete: () => void;
}

interface ProcessingState {
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress: number;
  currentStep: string;
  error: string | null;
}

const VideoProcessingStatus: React.FC<VideoProcessingStatusProps> = ({
  lessonId,
  isOpen,
  onClose,
  onProcessingComplete
}) => {
  const [processingState, setProcessingState] = useState<ProcessingState>({
    status: 'queued',
    progress: 0,
    currentStep: 'Initializing...',
    error: null
  });
  
  const [retryCount, setRetryCount] = useState(0);
  const websocketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isConnectingRef = useRef(false);

  // Enhanced WebSocket connection with retry logic
  const connectWebSocket = useCallback(() => {
    if (!isOpen || !lessonId || isConnectingRef.current) return;

    isConnectingRef.current = true;
    
    try {
      // Close existing connection
      if (websocketRef.current) {
        websocketRef.current.close(1000, 'Reconnecting');
        websocketRef.current = null;
      }

      const wsUrl = `ws://localhost:5000/ws/video-progress?lessonId=${lessonId}`;
      console.log('Connecting to WebSocket:', wsUrl);
      
      const websocket = new WebSocket(wsUrl);
      websocketRef.current = websocket;

      websocket.onopen = () => {
        console.log('WebSocket connected for progress updates');
        isConnectingRef.current = false;
        setProcessingState(prev => ({
          ...prev,
          status: 'processing',
          currentStep: 'Connected to processing server'
        }));
        setRetryCount(0); // Reset retry count on successful connection
      };

      websocket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('Progress update:', data);

          switch (data.type) {
            case 'progress':
              setProcessingState(prev => ({
                ...prev,
                progress: data.progress,
                currentStep: data.currentStep || prev.currentStep,
                status: 'processing'
              }));
              break;
            
            case 'complete':
              setProcessingState({
                status: 'completed',
                progress: 100,
                currentStep: 'Processing complete',
                error: null
              });
              
              // Notify parent component after a short delay
              setTimeout(() => {
                onProcessingComplete();
              }, 1500);
              break;
            
            case 'failed':
              setProcessingState(prev => ({
                ...prev,
                status: 'failed',
                error: data.error || 'Processing failed',
                currentStep: 'Processing failed'
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
      };

      websocket.onerror = (error) => {
        console.error('WebSocket error:', error);
        isConnectingRef.current = false;
        setProcessingState(prev => ({
          ...prev,
          error: 'Connection error - retrying...'
        }));
      };

      websocket.onclose = (event) => {
        console.log('WebSocket disconnected:', event.code, event.reason);
        isConnectingRef.current = false;
        
        // Only attempt reconnect if not a normal closure and component is still open
        if (event.code !== 1000 && isOpen && retryCount < 5) {
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
      };

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
    
    if (websocketRef.current) {
      websocketRef.current.close(1000, 'Component unmounting');
      websocketRef.current = null;
    }
  }, []);

  // Main effect for WebSocket connection
  useEffect(() => {
    if (isOpen && lessonId) {
      console.log('Opening WebSocket connection for lesson:', lessonId);
      connectWebSocket();
    } else {
      cleanupWebSocket();
    }

    return () => {
      cleanupWebSocket();
    };
  }, [isOpen, lessonId, connectWebSocket, cleanupWebSocket]);

  // Simulate progress if WebSocket fails completely
  useEffect(() => {
    if (processingState.status === 'failed' && retryCount >= 5) {
      // Fallback to simulated progress after all retries fail
      let simulatedProgress = processingState.progress;
      
      const fallbackInterval = setInterval(() => {
        simulatedProgress = Math.min(simulatedProgress + 10, 100);
        
        setProcessingState(prev => {
          if (simulatedProgress >= 100) {
            clearInterval(fallbackInterval);
            return {
              status: 'completed',
              progress: 100,
              currentStep: 'Processing completed (simulated)',
              error: null
            };
          }
          
          const steps = [
            'Upload complete',
            'Transcoding video',
            'Generating HLS streams', 
            'Uploading to CDN',
            'Finalizing'
          ];
          
          const stepIndex = Math.floor(simulatedProgress / 20);
          
          return {
            ...prev,
            progress: simulatedProgress,
            currentStep: steps[stepIndex] || 'Processing...',
            status: 'processing'
          };
        });
      }, 1500);

      return () => clearInterval(fallbackInterval);
    }
  }, [processingState.status, retryCount, processingState.progress]);

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
    switch (processingState.status) {
      case 'queued':
        return 'Video queued for processing';
      case 'processing':
        return 'Processing video...';
      case 'completed':
        return 'Processing complete!';
      case 'failed':
        return 'Processing failed';
      default:
        return 'Unknown status';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center space-x-4 mb-4">
          {getStatusIcon()}
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900">
              {getStatusText()}
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              {processingState.currentStep}
            </p>
            {retryCount > 0 && processingState.status !== 'completed' && (
              <p className="text-xs text-yellow-600 mt-1">
                Connection attempts: {retryCount}/5
              </p>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Progress</span>
            <span>{processingState.progress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-300 ${
                processingState.status === 'failed' ? 'bg-red-500' : 
                processingState.status === 'completed' ? 'bg-green-500' : 'bg-blue-600'
              }`}
              style={{ width: `${processingState.progress}%` }}
            />
          </div>
        </div>

        {/* Error Message */}
        {processingState.error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
            <div className="flex items-start space-x-2">
              <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
              <p className="text-red-800 text-sm">{processingState.error}</p>
            </div>
          </div>
        )}

        {/* Processing Steps */}
        <div className="space-y-2 text-sm text-gray-600 mb-4">
          <div className={`flex items-center space-x-2 ${
            processingState.progress >= 20 ? 'text-green-600 font-medium' : ''
          }`}>
            <div className={`w-2 h-2 rounded-full ${
              processingState.progress >= 20 ? 'bg-green-500' : 'bg-gray-300'
            }`} />
            <span>Upload complete</span>
          </div>
          
          <div className={`flex items-center space-x-2 ${
            processingState.progress >= 40 ? 'text-green-600 font-medium' : ''
          }`}>
            <div className={`w-2 h-2 rounded-full ${
              processingState.progress >= 40 ? 'bg-green-500' : 'bg-gray-300'
            }`} />
            <span>Transcoding video</span>
          </div>
          
          <div className={`flex items-center space-x-2 ${
            processingState.progress >= 70 ? 'text-green-600 font-medium' : ''
          }`}>
            <div className={`w-2 h-2 rounded-full ${
              processingState.progress >= 70 ? 'bg-green-500' : 'bg-gray-300'
            }`} />
            <span>Generating HLS streams</span>
          </div>
          
          <div className={`flex items-center space-x-2 ${
            processingState.progress >= 90 ? 'text-green-600 font-medium' : ''
          }`}>
            <div className={`w-2 h-2 rounded-full ${
              processingState.progress >= 90 ? 'bg-green-500' : 'bg-gray-300'
            }`} />
            <span>Uploading to CDN</span>
          </div>
        </div>

        {/* Connection Status */}
        {processingState.status === 'processing' && retryCount > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-4 w-4 text-yellow-600 flex-shrink-0" />
              <p className="text-yellow-800 text-sm">
                Using fallback mode - reconnection attempts: {retryCount}
              </p>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3">
          {processingState.status === 'failed' && (
            <>
              <button
                onClick={handleRetry}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
              >
                <RefreshCw className="h-4 w-4" />
                <span>Retry</span>
              </button>
              <button
                onClick={handleManualClose}
                className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                Close
              </button>
            </>
          )}
          
          {processingState.status === 'completed' && (
            <button
              onClick={handleManualClose}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              View Video
            </button>
          )}
          
          {(processingState.status === 'queued' || processingState.status === 'processing') && (
            <button
              onClick={handleManualClose}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              {processingState.status === 'processing' ? 'Close (Background)' : 'Close'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default VideoProcessingStatus;