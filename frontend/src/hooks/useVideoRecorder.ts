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

export const useVideoRecorder = (): UseVideoRecorderReturn => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordedVideo, setRecordedVideo] = useState<string | null>(null);
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
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

  const cleanupStreams = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setCameraInitialized(false);
  }, [stream]);

  const initializeCamera = useCallback(async () => {
    try {
      setError(null);
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });
      setStream(mediaStream);
      setCameraInitialized(true);
    } catch (err: any) {
      setError('Failed to initialize camera. Please check permissions.');
      console.error('Error initializing camera:', err);
    }
  }, []);

  const startRecording = useCallback(async () => {
    if (!stream) {
      setError('Camera not initialized');
      return;
    }

    try {
      setError(null);
      recordedChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        setRecordedVideo(url);
        setVideoBlob(blob);
        setIsRecording(false);
      };

      mediaRecorder.onstart = () => {
        setIsRecording(true);
      };

      mediaRecorder.start();

    } catch (err: any) {
      setError('Failed to start recording.');
      console.error('Error starting recording:', err);
    }
  }, [stream]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
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

  const resetRecording = useCallback(() => {
    if (isRecording) {
      stopRecording();
    }
    setRecordedVideo(null);
    setVideoBlob(null);
    recordedChunksRef.current = [];
    cleanupStreams();
  }, [isRecording, stopRecording, cleanupStreams]);

  const closeCamera = useCallback(() => {
    cleanupStreams();
  }, [cleanupStreams]);

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
    stream,
    options,
    setOptions: setOptionsState,
    devices,
    initializeCamera,
    closeCamera,
    cameraInitialized
  };
};