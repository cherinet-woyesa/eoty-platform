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
}

export const useVideoRecorder = (): UseVideoRecorderReturn => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordedVideo, setRecordedVideo] = useState<string | null>(null);
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [options, setOptionsState] = useState<RecorderOptions>({ resolution: '720p', screen: false });
  const [devices, setDevices] = useState<{ cameras: MediaDeviceInfo[]; microphones: MediaDeviceInfo[] }>({ cameras: [], microphones: [] });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  const initStream = useCallback(async () => {
    try {
      setError(null);
      let videoConstraints: MediaTrackConstraints | boolean = true;
      if (options.screen) {
        // Use display media for screen capture then add mic if selected
        // @ts-ignore
        const display: MediaStream = await (navigator.mediaDevices as any).getDisplayMedia({ video: true, audio: false });
        let mixedStream = display;
        if (options.audioDeviceId) {
          const mic = await navigator.mediaDevices.getUserMedia({ audio: { deviceId: options.audioDeviceId ? { exact: options.audioDeviceId } : undefined } });
          mic.getAudioTracks().forEach(t => mixedStream.addTrack(t));
        } else {
          const mic = await navigator.mediaDevices.getUserMedia({ audio: true });
          mic.getAudioTracks().forEach(t => mixedStream.addTrack(t));
        }
        setStream(mixedStream);
        return mixedStream;
      } else {
        const res = options.resolution === '1080p' ? { width: { ideal: 1920 }, height: { ideal: 1080 } } : { width: { ideal: 1280 }, height: { ideal: 720 } };
        videoConstraints = {
          ...res,
          frameRate: { ideal: 30 },
          deviceId: options.videoDeviceId ? { exact: options.videoDeviceId } : undefined
        };
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: videoConstraints,
          audio: options.audioDeviceId ? { deviceId: { exact: options.audioDeviceId } } : true
        });
        setStream(mediaStream);
        return mediaStream;
      }
    } catch (err) {
      setError('Failed to access media devices. Please check permissions.');
      console.error('Error initializing stream:', err);
      throw err;
    }
  }, [options]);

  const startRecording = useCallback(async () => {
    try {
      const mediaStream = stream ?? (await initStream());

      const mediaRecorder = new MediaRecorder(mediaStream, {
        mimeType: 'video/webm;codecs=vp9,opus'
      });

      mediaRecorderRef.current = mediaRecorder;
      recordedChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
        const videoUrl = URL.createObjectURL(blob);
        setRecordedVideo(videoUrl);
        setVideoBlob(blob);
        setIsRecording(false);
      };

      mediaRecorder.start(1000); // Collect data every second
      setIsRecording(true);
    } catch (err) {
      if (!error) setError('Failed to start recording. Please check permissions.');
      console.error('Error starting recording:', err);
    }
  }, [initStream, stream, error]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    }
  }, [isRecording, stream]);

  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.pause();
    }
  }, [isRecording]);

  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
      mediaRecorderRef.current.resume();
    }
  }, []);

  const resetRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
    }
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    setRecordedVideo(null);
    setVideoBlob(null);
    setError(null);
    setStream(null);
    setIsRecording(false);
  }, [isRecording, stream]);

  const setOptions = useCallback((opts: Partial<RecorderOptions>) => {
    setOptionsState(prev => ({ ...prev, ...opts }));
  }, []);

  useEffect(() => {
    // Enumerate devices for settings UI
    (async () => {
      try {
        const list = await navigator.mediaDevices.enumerateDevices();
        setDevices({
          cameras: list.filter(d => d.kind === 'videoinput'),
          microphones: list.filter(d => d.kind === 'audioinput')
        });
      } catch (e) {
        // ignore
      }
    })();
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
    setOptions,
    devices
  };
};