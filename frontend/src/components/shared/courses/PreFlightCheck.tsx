import React, { useState, useEffect, useRef } from 'react';
import { 
  Camera, Mic, Monitor, CheckCircle, XCircle, 
  AlertTriangle, ArrowRight, RefreshCw, Volume2 
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface PreFlightCheckProps {
  isOpen: boolean;
  onComplete: () => void;
  onCancel: () => void;
}

type CheckStep = 'camera' | 'microphone' | 'speaker';
type CheckStatus = 'idle' | 'checking' | 'success' | 'error';

const PreFlightCheck: React.FC<PreFlightCheckProps> = ({ isOpen, onComplete, onCancel }) => {
  const { t } = useTranslation();
  const [currentStep, setCurrentStep] = useState<CheckStep>('camera');
  const [cameraStatus, setCameraStatus] = useState<CheckStatus>('idle');
  const [micStatus, setMicStatus] = useState<CheckStatus>('idle');
  const [micLevel, setMicLevel] = useState(0);
  const [activeStream, setActiveStream] = useState<MediaStream | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Cleanup on unmount or close
  useEffect(() => {
    return () => {
      stopMedia();
    };
  }, []);

  const stopMedia = () => {
    if (activeStream) {
      activeStream.getTracks().forEach(track => track.stop());
      setActiveStream(null);
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  };

  // Initialize Camera Check
  useEffect(() => {
    if (isOpen && currentStep === 'camera') {
      checkCamera();
    } else if (isOpen && currentStep === 'microphone') {
      checkMicrophone();
    }
  }, [isOpen, currentStep]);

  const checkCamera = async () => {
    setCameraStatus('checking');
    setErrorMsg(null);
    stopMedia();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      setActiveStream(stream);
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraStatus('success');
    } catch (err) {
      console.error('Camera check failed:', err);
      setCameraStatus('error');
      setErrorMsg(t('preflight.camera_error', 'Could not access camera. Please check permissions.'));
    }
  };

  const checkMicrophone = async () => {
    setMicStatus('checking');
    setErrorMsg(null);
    stopMedia();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setActiveStream(stream);
      
      // Setup audio analysis
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const analyser = audioCtx.createAnalyser();
      const source = audioCtx.createMediaStreamSource(stream);
      
      source.connect(analyser);
      analyser.fftSize = 256;
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      
      audioContextRef.current = audioCtx;
      analyserRef.current = analyser;

      const updateLevel = () => {
        if (!analyserRef.current) return;
        
        analyserRef.current.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const average = sum / bufferLength;
        setMicLevel(average / 128); // Normalize to 0-1 approx
        
        animationFrameRef.current = requestAnimationFrame(updateLevel);
      };

      updateLevel();
      setMicStatus('success');
    } catch (err) {
      console.error('Microphone check failed:', err);
      setMicStatus('error');
      setErrorMsg(t('preflight.mic_error', 'Could not access microphone. Please check permissions.'));
    }
  };

  const handleNext = () => {
    if (currentStep === 'camera') {
      setCurrentStep('microphone');
    } else if (currentStep === 'microphone') {
      setCurrentStep('speaker');
    } else {
      stopMedia();
      onComplete();
    }
  };

  const playTestSound = () => {
    const audio = new Audio('/sounds/notification.mp3'); // Assuming this exists or use a generated beep
    // Fallback to generated beep if file doesn't exist
    if (!audio.canPlayType('audio/mpeg')) {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      gain.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + 0.5);
      osc.stop(ctx.currentTime + 0.5);
    } else {
      audio.play().catch(e => console.log('Audio play failed', e));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div>
            <h2 className="text-lg font-bold text-slate-800">{t('preflight.title', 'System Check')}</h2>
            <p className="text-sm text-slate-500">{t('preflight.subtitle', 'Let\'s make sure everything is working')}</p>
          </div>
          <div className="flex gap-1">
            <div className={`h-2 w-2 rounded-full ${currentStep === 'camera' ? 'bg-sky-500' : 'bg-slate-200'}`} />
            <div className={`h-2 w-2 rounded-full ${currentStep === 'microphone' ? 'bg-sky-500' : 'bg-slate-200'}`} />
            <div className={`h-2 w-2 rounded-full ${currentStep === 'speaker' ? 'bg-sky-500' : 'bg-slate-200'}`} />
          </div>
        </div>

        {/* Content */}
        <div className="p-6 flex-1 overflow-y-auto">
          {currentStep === 'camera' && (
            <div className="space-y-4">
              <div className="aspect-video bg-slate-900 rounded-xl overflow-hidden relative flex items-center justify-center">
                {cameraStatus === 'checking' && <RefreshCw className="h-8 w-8 text-white/50 animate-spin" />}
                {cameraStatus === 'error' && (
                  <div className="text-center p-4">
                    <AlertTriangle className="h-10 w-10 text-red-500 mx-auto mb-2" />
                    <p className="text-white text-sm">{errorMsg}</p>
                  </div>
                )}
                <video 
                  ref={videoRef} 
                  autoPlay 
                  muted 
                  playsInline 
                  className={`w-full h-full object-cover ${cameraStatus === 'success' ? 'opacity-100' : 'opacity-0'}`} 
                />
              </div>
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
                <Camera className="h-5 w-5 text-slate-500" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-700">{t('preflight.camera_check', 'Camera Check')}</p>
                  <p className="text-xs text-slate-500">
                    {cameraStatus === 'success' ? t('preflight.camera_ok', 'Camera is working properly') : t('preflight.checking', 'Checking...')}
                  </p>
                </div>
                {cameraStatus === 'success' && <CheckCircle className="h-5 w-5 text-green-500" />}
                {cameraStatus === 'error' && <XCircle className="h-5 w-5 text-red-500" />}
              </div>
            </div>
          )}

          {currentStep === 'microphone' && (
            <div className="space-y-6 py-4">
              <div className="flex justify-center">
                <div className="relative">
                  <div 
                    className="absolute inset-0 bg-sky-500/20 rounded-full transition-all duration-75"
                    style={{ transform: `scale(${1 + micLevel * 1.5})` }}
                  />
                  <div className="relative bg-sky-100 p-6 rounded-full">
                    <Mic className={`h-10 w-10 ${micLevel > 0.1 ? 'text-sky-600' : 'text-slate-400'} transition-colors`} />
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-green-400 to-green-600 transition-all duration-75"
                    style={{ width: `${Math.min(micLevel * 100, 100)}%` }}
                  />
                </div>
                <p className="text-center text-xs text-slate-500">{t('preflight.speak_test', 'Speak to test your microphone')}</p>
              </div>

              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
                <Mic className="h-5 w-5 text-slate-500" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-700">{t('preflight.mic_check', 'Microphone Check')}</p>
                  <p className="text-xs text-slate-500">
                    {micStatus === 'success' ? t('preflight.mic_ok', 'Microphone is active') : t('preflight.checking', 'Checking...')}
                  </p>
                </div>
                {micStatus === 'success' && <CheckCircle className="h-5 w-5 text-green-500" />}
              </div>
            </div>
          )}

          {currentStep === 'speaker' && (
            <div className="space-y-6 py-4">
              <div className="flex justify-center">
                <button 
                  onClick={playTestSound}
                  className="bg-indigo-100 p-6 rounded-full hover:bg-indigo-200 transition-colors group"
                >
                  <Volume2 className="h-10 w-10 text-indigo-600 group-hover:scale-110 transition-transform" />
                </button>
              </div>
              
              <p className="text-center text-sm text-slate-600">
                {t('preflight.sound_test', 'Click the icon above to play a test sound')}
              </p>

              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
                <Volume2 className="h-5 w-5 text-slate-500" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-700">{t('preflight.speaker_check', 'Speaker Check')}</p>
                  <p className="text-xs text-slate-500">{t('preflight.confirm_hear', 'Can you hear the sound?')}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex justify-between">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800"
          >
            {t('common.skip', 'Skip Check')}
          </button>
          
          <button
            onClick={handleNext}
            disabled={
              (currentStep === 'camera' && cameraStatus !== 'success') ||
              (currentStep === 'microphone' && micStatus !== 'success')
            }
            className="px-6 py-2 bg-sky-600 text-white rounded-lg text-sm font-medium hover:bg-sky-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all"
          >
            {currentStep === 'speaker' ? (
              <>
                {t('preflight.finish', 'Start Recording')}
                <ArrowRight className="h-4 w-4" />
              </>
            ) : (
              <>
                {t('preflight.next', 'Next')}
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PreFlightCheck;
