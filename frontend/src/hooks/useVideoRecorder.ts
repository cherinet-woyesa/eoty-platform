import { useState, useRef, useCallback, useEffect } from 'react';

interface RecorderOptions {
  videoDeviceId?: string;
  audioDeviceId?: string;
  resolution?: '720p' | '1080p';
  screen?: boolean;
}

interface UseVideoRecorderReturn {
  isRecording: boolean;
  recordedVideo: string | null;
  videoBlob: Blob | null;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  pauseRecording: () => void;
  resumeRecording: () => void;
  resetRecording: () => void;
  error: string | null;
  stream: MediaStream | null;
  options: RecorderOptions;
  setOptions: (opts: Partial<RecorderOptions>) => void;
  devices: { cameras: MediaDeviceInfo[]; microphones: MediaDeviceInfo[] };
  initializeCamera: () => Promise<void>;
  closeCamera: () => void;
  cameraInitialized: boolean;
}

// FIX: Global stream reference to prevent multiple camera instances
let globalStream: MediaStream | null = null;
let streamUsers = 0;

export const useVideoRecorder = (): UseVideoRecorderReturn => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordedVideo, setRecordedVideo] = useState<string | null>(null);
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [options, setOptionsState] = useState<RecorderOptions>({
    resolution: '720p',
    screen: false
  });
  const [devices, setDevices] = useState<{
    cameras: MediaDeviceInfo[];
    microphones: MediaDeviceInfo[]
  }>({ cameras: [], microphones: [] });
  const [cameraInitialized, setCameraInitialized] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  // FIXED: Enhanced cleanup function that doesn't interfere with global stream
  const cleanupLocalStreams = useCallback(() => {
    console.log('Cleaning up local recorder state (not camera)');
    
    // Only clean up local state, not the global camera stream
    mediaRecorderRef.current = null;
    recordedChunksRef.current = [];
    streamRef.current = null;
    
    // Don't set stream to null here - let global manager handle it
  }, []);

  // FIXED: Initialize camera with global stream management
  const initializeCamera = useCallback(async () => {
    try {
      setError(null);
      console.log('Initializing camera...');

      // If global stream exists and is active, reuse it
      if (globalStream && globalStream.active) {
        console.log('Reusing existing camera stream');
        streamRef.current = globalStream;
        setCameraInitialized(true);
        streamUsers++;
        return;
      }

      const constraints = {
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 }
        },
        audio: true
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      
      console.log('Camera initialized successfully:', {
        videoTracks: mediaStream.getVideoTracks().length,
        audioTracks: mediaStream.getAudioTracks().length,
        active: mediaStream.active
      });

      // Set global stream reference
      globalStream = mediaStream;
      streamRef.current = mediaStream;
      streamUsers = 1;
      
      setCameraInitialized(true);
      
    } catch (err: any) {
      console.error('Error initializing camera:', err);
      let errorMessage = 'Failed to initialize camera. ';
      
      if (err.name === 'NotAllowedError') {
        errorMessage += 'Please allow camera and microphone permissions.';
      } else if (err.name === 'NotFoundError') {
        errorMessage += 'No camera found on your device.';
      } else if (err.name === 'NotSupportedError') {
        errorMessage += 'Your browser does not support camera access.';
      } else {
        errorMessage += 'Please check your camera and try again.';
      }
      
      setError(errorMessage);
      cleanupLocalStreams();
    }
  }, [cleanupLocalStreams]);

  // FIXED: Close camera with global reference counting
  const closeCamera = useCallback(() => {
    console.log('Closing camera - users:', streamUsers);
    
    if (streamUsers > 0) {
      streamUsers--;
    }
    
    // Only close global stream if no users left
    if (streamUsers === 0 && globalStream) {
      console.log('No users left - closing global camera stream');
      globalStream.getTracks().forEach(track => {
        console.log(`Stopping track: ${track.kind} - ${track.label}`);
        track.stop();
      });
      globalStream = null;
    }
    
    // Always clean up local state
    cleanupLocalStreams();
    setCameraInitialized(false);
    setIsRecording(false);
  }, [cleanupLocalStreams]);

  // FIXED: Start recording with stable stream reference
  const startRecording = useCallback(async () => {
    const currentStream = streamRef.current;
    if (!currentStream || !currentStream.active) {
      setError('Camera not initialized or stream inactive');
      return;
    }

    try {
      setError(null);
      recordedChunksRef.current = [];
      
      // Get supported MIME types
      const mimeType = MediaRecorder.isTypeSupported('video/webm; codecs=vp9') 
        ? 'video/webm; codecs=vp9'
        : MediaRecorder.isTypeSupported('video/webm') 
          ? 'video/webm'
          : 'video/mp4';

      console.log('Starting recording with MIME type:', mimeType);

      const mediaRecorder = new MediaRecorder(currentStream, {
        mimeType: mimeType,
        videoBitsPerSecond: 2500000 // 2.5 Mbps
      });

      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          console.log('Data available:', event.data.size, 'bytes');
          recordedChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        console.log('Recording stopped, chunks:', recordedChunksRef.current.length);
        
        if (recordedChunksRef.current.length > 0) {
          const blob = new Blob(recordedChunksRef.current, { 
            type: recordedChunksRef.current[0].type || 'video/webm'
          });
          
          console.log('Created video blob:', {
            size: blob.size,
            type: blob.type
          });

          const url = URL.createObjectURL(blob);
          setRecordedVideo(url);
          setVideoBlob(blob);
        } else {
          console.warn('No recording chunks available');
          setError('Recording failed - no video data captured');
        }
        
        setIsRecording(false);
      };

      mediaRecorder.onstart = () => {
        console.log('Recording started');
        setIsRecording(true);
      };

      mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder error:', event);
        setError('Recording error occurred');
        setIsRecording(false);
      };

      // Start recording with timeslice to ensure data availability
      mediaRecorder.start(1000); // Collect data every second
      console.log('Recording started successfully');

    } catch (err: any) {
      console.error('Error starting recording:', err);
      setError('Failed to start recording: ' + err.message);
      setIsRecording(false);
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      console.log('Stopping recording...');
      mediaRecorderRef.current.stop();
    }
  }, [isRecording]);

  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.pause();
    }
  }, [isRecording]);

  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.resume();
    }
  }, [isRecording]);

  // FIXED: Reset recording without closing camera
  const resetRecording = useCallback(() => {
    console.log('Resetting recorder state (keeping camera alive)');
    
    if (isRecording) {
      stopRecording();
    }
    
    // Clean up recorded video URLs
    if (recordedVideo) {
      URL.revokeObjectURL(recordedVideo);
    }
    
    setRecordedVideo(null);
    setVideoBlob(null);
    recordedChunksRef.current = [];
    setError(null);
    // Don't set isRecording to false here - let onstop handle it
  }, [isRecording, stopRecording, recordedVideo]);

  // FIXED: Enhanced device enumeration
  useEffect(() => {
    const enumerateDevices = async () => {
      try {
        const deviceList = await navigator.mediaDevices.enumerateDevices();
        setDevices({
          cameras: deviceList.filter(d => d.kind === 'videoinput'),
          microphones: deviceList.filter(d => d.kind === 'audioinput')
        });
      } catch (err) {
        console.warn('Device enumeration failed:', err);
      }
    };
    enumerateDevices();
  }, []);

  // FIXED: Stable stream reference management
  useEffect(() => {
    // Set stream from global reference if available
    if (globalStream && globalStream.active) {
      streamRef.current = globalStream;
      setCameraInitialized(true);
      if (streamUsers === 0) {
        streamUsers = 1;
      }
    }

    return () => {
      console.log('useVideoRecorder cleanup - users:', streamUsers);
      // Don't close camera on unmount - let the component decide when to close
      cleanupLocalStreams();
    };
  }, [cleanupLocalStreams]);

  return {
    isRecording,
    recordedVideo,
    videoBlob,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    resetRecording,
    error,
    stream: streamRef.current,
    options,
    setOptions: setOptionsState,
    devices,
    initializeCamera,
    closeCamera,
    cameraInitialized
  };
};