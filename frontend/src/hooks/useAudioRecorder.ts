// frontend/src/hooks/useAudioRecorder.ts

import { useState, useRef, useCallback, useEffect } from 'react';

interface UseAudioRecorderReturn {
  isRecording: boolean;
  audioBlob: Blob | null;
  audioUrl: string | null;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  error: string | null;
  detectedLanguage: string | null;
  setDetectedLanguage: (language: string | null) => void;
  recordingTime: number;
  audioQuality: {
    sampleRate: number;
    channels: number;
    bitDepth: number;
  } | null;
  resetRecording: () => void;
}

interface AudioConstraints extends MediaTrackConstraints {
  echoCancellation: boolean;
  noiseSuppression: boolean;
  autoGainControl: boolean;
  sampleRate: number;
  channelCount: number;
  sampleSize: number;
}

export const useAudioRecorder = (): UseAudioRecorderReturn => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [detectedLanguage, setDetectedLanguage] = useState<string | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioQuality, setAudioQuality] = useState<{
    sampleRate: number;
    channels: number;
    bitDepth: number;
  } | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup function
  const cleanup = useCallback(() => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
        track.enabled = false;
      });
      streamRef.current = null;
    }
    
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(console.warn);
      audioContextRef.current = null;
    }
    
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
  }, [audioUrl]);

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  const resetRecording = useCallback(() => {
    setAudioBlob(null);
    setAudioUrl(null);
    setError(null);
    setRecordingTime(0);
    setAudioQuality(null);
    chunksRef.current = [];
  }, []);

  const startRecording = useCallback(async () => {
    try {
      setError(null);
      setDetectedLanguage(null);
      setRecordingTime(0);
      setAudioQuality(null);
      chunksRef.current = [];

      // Use simpler constraints to ensure compatibility across devices
      const audioConstraints: any = {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      };

      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: audioConstraints,
        video: false
      });

      streamRef.current = stream;

      // Analyze audio quality and setup audio context
      try {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        analyserRef.current = audioContextRef.current.createAnalyser();
        const source = audioContextRef.current.createMediaStreamSource(stream);
        source.connect(analyserRef.current);
        
        setAudioQuality({
          sampleRate: audioContextRef.current.sampleRate,
          channels: 1,
          bitDepth: 16
        });
      } catch (audioError) {
        console.warn('Audio context not supported:', audioError);
        // Continue without audio context
      }

      // Determine optimal MIME type
      let mimeType = 'audio/webm';
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        mimeType = 'audio/webm;codecs=opus';
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
        mimeType = 'audio/mp4';
      } else if (MediaRecorder.isTypeSupported('audio/wav')) {
        mimeType = 'audio/wav';
      }

      console.log(`Using audio format: ${mimeType}`);

      const mediaRecorderOptions: MediaRecorderOptions = {
        mimeType,
        audioBitsPerSecond: 128000 // 128 kbps for good quality
      };

      const mediaRecorder = new MediaRecorder(stream, mediaRecorderOptions);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        if (chunksRef.current.length > 0) {
          const blob = new Blob(chunksRef.current, { 
            type: mimeType 
          });
          
          const url = URL.createObjectURL(blob);
          setAudioBlob(blob);
          setAudioUrl(url);
        }
        
        cleanup();
      };

      mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder error:', event);
        setError('Recording error occurred. Please try again.');
        stopRecording();
      };

      mediaRecorder.onstart = () => {
        console.log('MediaRecorder started successfully');
      };

      // Start recording with 1-second chunks for better progress tracking
      mediaRecorder.start(1000);
      setIsRecording(true);

      // Start recording timer - ensure previous timer is cleared
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
      
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(prev => {
          // Auto-stop after 2 minutes to prevent very long recordings
          if (prev >= 120) {
            stopRecording();
            return prev;
          }
          return prev + 1;
        });
      }, 1000);

      console.log('Recording started successfully');

    } catch (err: any) {
      console.error('Error starting recording:', err);
      
      let errorMessage = 'Failed to access microphone. ';
      
      if (err.name === 'NotAllowedError') {
        errorMessage += 'Please allow microphone permissions in your browser settings.';
      } else if (err.name === 'NotFoundError') {
        errorMessage += 'No microphone detected. Please check your audio device.';
      } else if (err.name === 'NotSupportedError') {
        errorMessage += 'Audio recording not supported in this browser.';
      } else if (err.name === 'OverconstrainedError') {
        errorMessage += 'Cannot satisfy audio constraints. Please try different settings.';
      } else {
        errorMessage += 'Please check your microphone and try again.';
      }
      
      setError(errorMessage);
      cleanup();
    }
  }, [cleanup]);

  const stopRecording = useCallback(() => {
    console.log('Stopping recording...');
    
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    
    setIsRecording(false);
    
    // Clear timer
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
  }, []);

  return {
    isRecording,
    audioBlob,
    audioUrl,
    startRecording,
    stopRecording,
    error,
    detectedLanguage,
    setDetectedLanguage,
    recordingTime,
    audioQuality,
    resetRecording
  };
};